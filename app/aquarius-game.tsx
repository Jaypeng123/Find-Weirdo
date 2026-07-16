"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  AQUARIUS_OBJECTS,
  CHARACTER_ASSETS,
  DIALOGUE_QUESTIONS,
  NPCS,
  PLAYER_MODEL,
  WORLD_CONFIG,
  WORLD_REGIONS,
  type ArchetypeId,
  type AquariusObjectData,
  type AquariusObjectId,
  type NpcData,
} from "./game-data";

type Phase = "loading" | "intro" | "playing";
type TutorialStage = "move" | "look" | "interact" | "done";
type Quality = "low" | "medium" | "high";

type DialogueState = {
  npcId: ArchetypeId;
  lineIndex: number;
  answer?: string;
};

type ArtifactState = {
  objectId: AquariusObjectId;
};

type InteractionTarget =
  | { kind: "npc"; id: ArchetypeId; distance: number }
  | { kind: "object"; id: AquariusObjectId; distance: number };

type Runtime = {
  THREE: typeof THREE;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  clock: THREE.Clock;
  ground: THREE.Mesh;
  worldRoot: THREE.Group;
  npcRoot: THREE.Group;
  objectRoot: THREE.Group;
  player: THREE.Group;
  playerModel: THREE.Group;
  particles: THREE.Points;
  velocity: THREE.Vector3;
  jumpVelocity: number;
  grounded: boolean;
  clickTarget: THREE.Vector3 | null;
  pendingNpcId: ArchetypeId | null;
  pendingObjectId: AquariusObjectId | null;
  keys: Set<string>;
  joystick: { x: number; y: number };
  pointerDown: { x: number; y: number };
  draggedCamera: boolean;
  npcGroups: Map<ArchetypeId, THREE.Group>;
  npcLabels: Map<ArchetypeId, THREE.Sprite>;
  npcPositions: Map<ArchetypeId, THREE.Vector3>;
  objectGroups: Map<AquariusObjectId, THREE.Group>;
  objectLabels: Map<AquariusObjectId, THREE.Sprite>;
  objectPositions: Map<AquariusObjectId, THREE.Vector3>;
  obstacles: Array<{ x: number; z: number; radius: number }>;
  frame: number;
  lastStepAt: number;
  animationId: number;
  resize: () => void;
  dispose: () => void;
};

const INTERACTION_KEYS = new Set(["KeyE"]);
const JUMP_KEYS = new Set(["Space"]);
const MOVEMENT_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight",
]);
const JOURNAL_KEYS = new Set(["Tab", "KeyJ"]);

function loadStoredIds() {
  if (typeof window === "undefined") {
    return new Set<ArchetypeId>();
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem("aquarius-archive-unlocked") ?? "[]"
    ) as ArchetypeId[];
    return new Set(parsed);
  } catch {
    return new Set<ArchetypeId>();
  }
}

function loadTutorialStage(): TutorialStage {
  if (typeof window === "undefined") {
    return "move";
  }
  return window.localStorage.getItem("aquarius-archive-tutorial") === "done"
    ? "done"
    : "move";
}

function loadQuality(): Quality {
  if (typeof window === "undefined") {
    return "medium";
  }
  const value = window.localStorage.getItem("aquarius-archive-quality");
  return value === "low" || value === "high" ? value : "medium";
}

function loadMuted() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem("aquarius-archive-muted") === "true";
}

function getNpc(id: ArchetypeId) {
  return NPCS.find((npc) => npc.id === id) ?? NPCS[0];
}

function getAquariusObject(id: AquariusObjectId) {
  return AQUARIUS_OBJECTS.find((item) => item.id === id) ?? AQUARIUS_OBJECTS[0];
}

function getRegionName(x: number, z: number) {
  let best = WORLD_REGIONS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const region of WORLD_REGIONS) {
    const distance = Math.hypot(x - region.x, z - region.z) / region.radius;
    if (distance < bestDistance) {
      best = region;
      bestDistance = distance;
    }
  }
  return best.name;
}

function clampToWorld(x: number, z: number) {
  const radius = WORLD_CONFIG.worldRadius;
  const distance = Math.hypot(x, z);
  if (distance <= radius) {
    return { x, z };
  }
  const scale = radius / distance;
  return { x: x * scale, z: z * scale };
}

export function AquariusGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const phaseRef = useRef<Phase>("loading");
  const dialogueRef = useRef<DialogueState | null>(null);
  const artifactRef = useRef<ArtifactState | null>(null);
  const nearestNpcRef = useRef<ArchetypeId | null>(null);
  const nearestTargetRef = useRef<InteractionTarget | null>(null);
  const journalOpenRef = useRef(false);
  const tutorialStageRef = useRef<TutorialStage>("move");
  const qualityRef = useRef<Quality>("medium");
  const openDialogueRef = useRef<(id: ArchetypeId) => void>(() => undefined);
  const openArtifactRef = useRef<(id: AquariusObjectId) => void>(() => undefined);
  const playToneRef = useRef<(frequency: number, duration?: number) => void>(() => undefined);
  const mutedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("正在校準星象……");
  const [currentRegion, setCurrentRegion] = useState("生命之泉");
  const [nearestNpcId, setNearestNpcId] = useState<ArchetypeId | null>(null);
  const [nearestTarget, setNearestTarget] = useState<InteractionTarget | null>(null);
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [artifact, setArtifact] = useState<ArtifactState | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [unlocked, setUnlocked] = useState<Set<ArchetypeId>>(() => loadStoredIds());
  const [toast, setToast] = useState("");
  const [tutorialStage, setTutorialStage] = useState<TutorialStage>(() =>
    loadTutorialStage()
  );
  const [muted, setMuted] = useState(() => loadMuted());
  const [quality, setQuality] = useState<Quality>(() => loadQuality());
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickKnob, setJoystickKnob] = useState({ x: 0, y: 0 });

  const nearestNpc = nearestNpcId ? getNpc(nearestNpcId) : null;
  const nearestObject =
    nearestTarget?.kind === "object" ? getAquariusObject(nearestTarget.id) : null;
  const dialogueNpc = dialogue ? getNpc(dialogue.npcId) : null;
  const activeArtifact = artifact ? getAquariusObject(artifact.objectId) : null;
  const dialogueLines = useMemo(() => {
    if (!dialogueNpc) {
      return [];
    }
    return [
      dialogueNpc.quote,
      `${dialogueNpc.title}代表${dialogueNpc.keywords.join("、")}。${dialogueNpc.core}`,
      `你獲得了「${dialogueNpc.fragment}」。這段人格已被記入星象手札。`,
    ];
  }, [dialogueNpc]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    dialogueRef.current = dialogue;
  }, [dialogue]);

  useEffect(() => {
    artifactRef.current = artifact;
  }, [artifact]);

  useEffect(() => {
    nearestNpcRef.current = nearestNpcId;
  }, [nearestNpcId]);

  useEffect(() => {
    nearestTargetRef.current = nearestTarget;
  }, [nearestTarget]);

  useEffect(() => {
    journalOpenRef.current = journalOpen;
  }, [journalOpen]);

  useEffect(() => {
    tutorialStageRef.current = tutorialStage;
  }, [tutorialStage]);

  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  useEffect(() => {
    mutedRef.current = muted;
    window.localStorage.setItem("aquarius-archive-muted", String(muted));
  }, [muted]);

  const playTone = useCallback((frequency: number, duration = 0.12) => {
    if (mutedRef.current) {
      return;
    }
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }
    const context = audioRef.current ?? new AudioContextCtor();
    audioRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.03);
  }, []);

  useEffect(() => {
    playToneRef.current = playTone;
  }, [playTone]);

  const unlockNpc = useCallback(
    (npcId: ArchetypeId) => {
      setUnlocked((current) => {
        if (current.has(npcId)) {
          return current;
        }
        const next = new Set(current);
        next.add(npcId);
        window.localStorage.setItem(
          "aquarius-archive-unlocked",
          JSON.stringify(Array.from(next))
        );
        const npc = getNpc(npcId);
        setToast(`已記錄：${npc.title}`);
        window.setTimeout(() => setToast(""), 2200);
        playTone(740, 0.18);
        return next;
      });

      if (tutorialStage !== "done") {
        setTutorialStage("done");
        window.localStorage.setItem("aquarius-archive-tutorial", "done");
      }
    },
    [playTone, tutorialStage]
  );

  const openDialogue = useCallback(
    (npcId: ArchetypeId) => {
      unlockNpc(npcId);
      setDialogue({ npcId, lineIndex: 0 });
      playTone(520, 0.12);
      const runtime = runtimeRef.current;
      if (runtime) {
        runtime.clickTarget = null;
        runtime.pendingNpcId = null;
        runtime.pendingObjectId = null;
        runtime.velocity.set(0, 0, 0);
        runtime.controls.enableRotate = false;
      }
    },
    [playTone, unlockNpc]
  );

  const openArtifact = useCallback(
    (objectId: AquariusObjectId) => {
      const item = getAquariusObject(objectId);
      setArtifact({ objectId });
      setToast(item.prompt);
      window.setTimeout(() => setToast(""), 1800);
      playTone(item.kind === "creature" ? 680 : 470, 0.14);
      const runtime = runtimeRef.current;
      if (runtime) {
        runtime.clickTarget = null;
        runtime.pendingNpcId = null;
        runtime.pendingObjectId = null;
        runtime.velocity.set(0, 0, 0);
        runtime.controls.enableRotate = false;
      }
    },
    [playTone]
  );

  useEffect(() => {
    openArtifactRef.current = openArtifact;
  }, [openArtifact]);

  useEffect(() => {
    openDialogueRef.current = openDialogue;
  }, [openDialogue]);

  const closeDialogue = useCallback(() => {
    setDialogue(null);
    const runtime = runtimeRef.current;
    if (runtime) {
      runtime.controls.enableRotate = true;
    }
  }, []);

  const closeArtifact = useCallback(() => {
    setArtifact(null);
    const runtime = runtimeRef.current;
    if (runtime) {
      runtime.controls.enableRotate = true;
    }
  }, []);

  const activateNearest = useCallback(() => {
    const target = nearestTargetRef.current;
    if (!target || target.distance > WORLD_CONFIG.interactDistance) {
      return;
    }
    if (target.kind === "npc") {
      openDialogue(target.id);
      return;
    }
    openArtifact(target.id);
  }, [openArtifact, openDialogue]);

  const requestJump = useCallback(() => {
    const runtime = runtimeRef.current;
    if (
      !runtime ||
      phaseRef.current !== "playing" ||
      dialogueRef.current ||
      artifactRef.current ||
      journalOpenRef.current ||
      !runtime.grounded
    ) {
      return;
    }
    runtime.jumpVelocity = WORLD_CONFIG.jumpPower;
    runtime.grounded = false;
    playTone(720, 0.09);
  }, [playTone]);

  const advanceDialogue = useCallback(() => {
    const current = dialogueRef.current;
    if (!current) {
      if (artifactRef.current) {
        closeArtifact();
      } else {
        activateNearest();
      }
      return;
    }

    const maxIntroLine = 2;
    if (current.answer) {
      setDialogue({ npcId: current.npcId, lineIndex: maxIntroLine });
      playTone(430, 0.08);
      return;
    }

    if (current.lineIndex < maxIntroLine) {
      setDialogue({ ...current, lineIndex: current.lineIndex + 1 });
      playTone(430, 0.08);
      return;
    }

    closeDialogue();
  }, [activateNearest, closeArtifact, closeDialogue, playTone]);

  const chooseQuestion = useCallback(
    (questionId: string) => {
      const current = dialogueRef.current;
      if (!current) {
        return;
      }
      const npc = getNpc(current.npcId);
      const answer =
        questionId === "strength"
          ? npc.strength
          : questionId === "shadow"
            ? npc.shadow
            : npc.relation;
      setDialogue({ npcId: npc.id, lineIndex: 3, answer });
      playTone(560, 0.1);
    },
    [playTone]
  );

  const toggleJournal = useCallback(() => {
    setJournalOpen((value) => {
      const next = !value;
      if (next) {
        playTone(360, 0.1);
      }
      return next;
    });
  }, [playTone]);

  useEffect(() => {
    window.localStorage.setItem("aquarius-archive-quality", quality);
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const ratio =
      quality === "low" ? 1 : quality === "medium" ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
    runtime.renderer.setPixelRatio(ratio);
    runtime.particles.visible = quality !== "low";
  }, [quality]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    let cancelled = false;

    async function boot() {
      const THREE_MODULE = await import("three");
      const { OrbitControls: OrbitControlsCtor } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const THREE_REF = THREE_MODULE;

      setLoadingText("正在載入水瓶座旅人……");
      const manager = new THREE_REF.LoadingManager();
      manager.onProgress = (_url, loaded, total) => {
        const percent = total > 0 ? Math.round((loaded / total) * 88) : 30;
        setProgress(Math.max(8, percent));
        if (percent > 45) {
          setLoadingText("正在點亮觀測所星圖……");
        }
      };
      const loader = new GLTFLoader(manager);
      const uniqueAssets = Array.from(new Set([PLAYER_MODEL, ...CHARACTER_ASSETS]));
      const loadedModels = new Map<string, THREE.Group>();

      await Promise.all(
        uniqueAssets.map(
          (path) =>
            new Promise<void>((resolve, reject) => {
              loader.load(
                path,
                (gltf) => {
                  const model = gltf.scene as THREE.Group;
                  model.traverse((child) => {
                    child.castShadow = false;
                    child.receiveShadow = false;
                  });
                  loadedModels.set(path, model);
                  resolve();
                },
                undefined,
                reject
              );
            })
        )
      );

      if (cancelled || !canvasRef.current) {
        return;
      }

      setProgress(92);
      setLoadingText("正在開啟水瓶座觀測所……");

      const scene = new THREE_REF.Scene();
      scene.background = new THREE_REF.Color("#060917");
      scene.fog = new THREE_REF.FogExp2("#070a18", 0.035);

      const renderer = new THREE_REF.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
      });
      renderer.outputColorSpace = THREE_REF.SRGBColorSpace;
      const initialQuality = qualityRef.current;
      renderer.setPixelRatio(
        initialQuality === "low"
          ? 1
          : initialQuality === "medium"
            ? Math.min(window.devicePixelRatio, 1.5)
            : Math.min(window.devicePixelRatio, 2)
      );

      const camera = new THREE_REF.PerspectiveCamera(48, 1, 0.1, 120);
      camera.position.set(-8.5, 7.4, 13.2);

      const controls = new OrbitControlsCtor(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.minDistance = WORLD_CONFIG.cameraMin;
      controls.maxDistance = WORLD_CONFIG.cameraMax;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.minPolarAngle = Math.PI * 0.18;
      controls.target.set(0, 1, 0);

      const worldRoot = new THREE_REF.Group();
      scene.add(worldRoot);
      const npcRoot = new THREE_REF.Group();
      scene.add(npcRoot);
      const objectRoot = new THREE_REF.Group();
      scene.add(objectRoot);

      createLighting(THREE_REF, scene);
      const ground = createWorld(THREE_REF, worldRoot);
      scene.add(createStars(THREE_REF));
      const particles = createParticles(THREE_REF);
      particles.visible = qualityRef.current !== "low";
      scene.add(particles);

      const player = new THREE_REF.Group();
      player.name = "player";
      const playerModelSource = loadedModels.get(PLAYER_MODEL);
      const playerModel = playerModelSource
        ? cloneModel(THREE_REF, playerModelSource)
        : new THREE_REF.Group();
      playerModel.scale.setScalar(WORLD_CONFIG.playerScale);
      playerModel.rotation.y = Math.PI;
      player.add(playerModel);
      player.position.set(0, 0, 5.4);
      scene.add(player);

      const npcGroups = new Map<ArchetypeId, THREE.Group>();
      const npcLabels = new Map<ArchetypeId, THREE.Sprite>();
      const npcPositions = new Map<ArchetypeId, THREE.Vector3>();
      const objectGroups = new Map<AquariusObjectId, THREE.Group>();
      const objectLabels = new Map<AquariusObjectId, THREE.Sprite>();
      const objectPositions = new Map<AquariusObjectId, THREE.Vector3>();

      NPCS.forEach((npc) => {
        const source = loadedModels.get(npc.model);
        const group = createNpcGroup(THREE_REF, npc, source);
        npcRoot.add(group);
        npcGroups.set(npc.id, group);
        npcLabels.set(npc.id, group.userData.label as THREE.Sprite);
        npcPositions.set(npc.id, new THREE_REF.Vector3(...npc.position));
      });

      AQUARIUS_OBJECTS.forEach((item) => {
        const group = createAquariusObjectGroup(THREE_REF, item);
        objectRoot.add(group);
        objectGroups.set(item.id, group);
        objectLabels.set(item.id, group.userData.label as THREE.Sprite);
        objectPositions.set(item.id, new THREE_REF.Vector3(item.position[0], 0, item.position[2]));
      });

      const obstacles = [
        { x: 0, z: 0, radius: 3.25 },
        { x: -13.5, z: 0.6, radius: 1.15 },
        { x: -14.6, z: -7.3, radius: 1.15 },
        { x: 13.4, z: 1.2, radius: 1.15 },
        { x: 0, z: -17.2, radius: 1.15 },
        { x: 7.1, z: -11.8, radius: 1.15 },
        { x: -6.6, z: -14.4, radius: 1.15 },
        { x: 5.7, z: 15.5, radius: 1.15 },
        { x: -10.6, z: 4.4, radius: 1.35 },
        { x: 11.1, z: -2.8, radius: 1.35 },
        { x: 2.8, z: -10.2, radius: 1.55 },
        ...AQUARIUS_OBJECTS.filter((item) => item.collisionRadius > 0).map((item) => ({
          x: item.position[0],
          z: item.position[2],
          radius: item.collisionRadius,
        })),
      ];

      const runtime: Runtime = {
        THREE: THREE_REF,
        renderer,
        scene,
        camera,
        controls,
        raycaster: new THREE_REF.Raycaster(),
        mouse: new THREE_REF.Vector2(),
        clock: new THREE_REF.Clock(),
        ground,
        worldRoot,
        npcRoot,
        objectRoot,
        player,
        playerModel,
        particles,
        velocity: new THREE_REF.Vector3(),
        jumpVelocity: 0,
        grounded: true,
        clickTarget: null,
        pendingNpcId: null,
        pendingObjectId: null,
        keys: new Set(),
        joystick: { x: 0, y: 0 },
        pointerDown: { x: 0, y: 0 },
        draggedCamera: false,
        npcGroups,
        npcLabels,
        npcPositions,
        objectGroups,
        objectLabels,
        objectPositions,
        obstacles,
        frame: 0,
        lastStepAt: 0,
        animationId: 0,
        resize: () => {
          const parent = canvas.parentElement;
          const width = parent?.clientWidth || window.innerWidth;
          const height = parent?.clientHeight || window.innerHeight;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        },
        dispose: () => undefined,
      };

      const handlePointerDown = (event: PointerEvent) => {
        runtime.pointerDown = { x: event.clientX, y: event.clientY };
        runtime.draggedCamera = false;
      };

      const handlePointerMove = (event: PointerEvent) => {
        const distance =
          Math.abs(event.clientX - runtime.pointerDown.x) +
          Math.abs(event.clientY - runtime.pointerDown.y);
        if (distance > 12 && tutorialStageRef.current !== "done") {
          setTutorialStage((current) => (current === "look" ? "interact" : current));
        }
      };

      const handlePointerUp = (event: PointerEvent) => {
        const moved =
          Math.abs(event.clientX - runtime.pointerDown.x) +
          Math.abs(event.clientY - runtime.pointerDown.y);
        if (moved > 10 || phaseRef.current !== "playing" || dialogueRef.current) {
          return;
        }

        const rect = renderer.domElement.getBoundingClientRect();
        runtime.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        runtime.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        runtime.raycaster.setFromCamera(runtime.mouse, camera);
        const hits = runtime.raycaster.intersectObjects([npcRoot, objectRoot, ground], true);
        const npcHit = hits.find((hit) => findNpcId(hit.object));
        if (npcHit) {
          const npcId = findNpcId(npcHit.object) as ArchetypeId;
          const npcPosition = runtime.npcPositions.get(npcId);
          if (npcPosition) {
            const away = new THREE_REF.Vector3()
              .subVectors(runtime.player.position, npcPosition)
              .setY(0);
            if (away.lengthSq() < 0.01) {
              away.set(1, 0, 0);
            }
            away.normalize();
            runtime.clickTarget = npcPosition
              .clone()
              .add(away.multiplyScalar(WORLD_CONFIG.interactDistance - 0.35));
            runtime.pendingNpcId = npcId;
            runtime.pendingObjectId = null;
          }
          return;
        }

        const objectHit = hits.find((hit) => findObjectId(hit.object));
        if (objectHit) {
          const objectId = findObjectId(objectHit.object) as AquariusObjectId;
          const objectPosition = runtime.objectPositions.get(objectId);
          if (objectPosition) {
            const away = new THREE_REF.Vector3()
              .subVectors(runtime.player.position, objectPosition)
              .setY(0);
            if (away.lengthSq() < 0.01) {
              away.set(1, 0, 0);
            }
            away.normalize();
            runtime.clickTarget = objectPosition
              .clone()
              .add(away.multiplyScalar(WORLD_CONFIG.interactDistance - 0.35));
            runtime.pendingObjectId = objectId;
            runtime.pendingNpcId = null;
          }
          return;
        }

        const groundHit = hits.find((hit) => hit.object === ground);
        if (groundHit) {
          const point = clampToWorld(groundHit.point.x, groundHit.point.z);
          runtime.clickTarget = new THREE_REF.Vector3(point.x, 0, point.z);
          runtime.pendingNpcId = null;
          runtime.pendingObjectId = null;
        }
      };

      const resize = () => runtime.resize();
      window.addEventListener("resize", resize);
      canvas.addEventListener("pointerdown", handlePointerDown);
      canvas.addEventListener("pointermove", handlePointerMove);
      canvas.addEventListener("pointerup", handlePointerUp);

      runtime.dispose = () => {
        window.cancelAnimationFrame(runtime.animationId);
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("pointerup", handlePointerUp);
        controls.dispose();
        renderer.dispose();
      };

      runtimeRef.current = runtime;
      runtime.resize();
      setProgress(100);
      setPhase("intro");

      const animate = () => {
        const delta = Math.min(runtime.clock.getDelta(), 0.05);
        runtime.frame += 1;
        updateRuntime(runtime, delta, {
          phase: phaseRef.current,
          dialogue: dialogueRef.current,
          artifact: artifactRef.current,
          onRegion: setCurrentRegion,
          onNearestNpc: setNearestNpcId,
          onNearestTarget: setNearestTarget,
          onOpenDialogue: (id) => openDialogueRef.current(id),
          onOpenArtifact: (id) => openArtifactRef.current(id),
          isJournalOpen: () => journalOpenRef.current,
          onTutorialMove: () => {
            setTutorialStage((current) => (current === "move" ? "look" : current));
          },
          onFootstep: () => playToneRef.current(180, 0.035),
        });
        renderer.render(scene, camera);
        runtime.animationId = window.requestAnimationFrame(animate);
      };
      animate();
    }

    void boot();

    return () => {
      cancelled = true;
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const runtime = runtimeRef.current;
      if (
        MOVEMENT_KEYS.has(event.code) ||
        INTERACTION_KEYS.has(event.code) ||
        JUMP_KEYS.has(event.code) ||
        JOURNAL_KEYS.has(event.code)
      ) {
        event.preventDefault();
      }

      if (runtime && MOVEMENT_KEYS.has(event.code)) {
        runtime.keys.add(event.code);
        runtime.clickTarget = null;
        runtime.pendingNpcId = null;
        runtime.pendingObjectId = null;
      }

      if (event.repeat) {
        return;
      }

      if (event.code === "Escape") {
        if (dialogueRef.current) {
          closeDialogue();
          return;
        }
        if (artifactRef.current) {
          closeArtifact();
          return;
        }
        if (journalOpenRef.current) {
          setJournalOpen(false);
          return;
        }
      }

      if (JOURNAL_KEYS.has(event.code) && phaseRef.current === "playing") {
        toggleJournal();
        return;
      }

      if (JUMP_KEYS.has(event.code) && phaseRef.current === "playing") {
        requestJump();
        return;
      }

      if (INTERACTION_KEYS.has(event.code) && phaseRef.current === "playing" && !journalOpenRef.current) {
        advanceDialogue();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      runtimeRef.current?.keys.delete(event.code);
    };

    const clearKeys = () => {
      runtimeRef.current?.keys.clear();
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearKeys);
    document.addEventListener("visibilitychange", clearKeys);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", clearKeys);
    };
  }, [advanceDialogue, closeArtifact, closeDialogue, requestJump, toggleJournal]);

  const enterWorld = useCallback(() => {
    setPhase("playing");
    setToast("觀測所已開啟");
    window.setTimeout(() => setToast(""), 1800);
    playTone(620, 0.16);
  }, [playTone]);

  const cycleQuality = useCallback(() => {
    setQuality((current) =>
      current === "low" ? "medium" : current === "medium" ? "high" : "low"
    );
  }, []);

  const handleJoystickStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setJoystickActive(true);
  }, []);

  const handleJoystickMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawX = event.clientX - centerX;
    const rawY = event.clientY - centerY;
    const length = Math.min(1, Math.hypot(rawX, rawY) / 42);
    const angle = Math.atan2(rawY, rawX);
    const x = Math.cos(angle) * length;
    const y = Math.sin(angle) * length;
    setJoystickKnob({ x: x * 32, y: y * 32 });
    if (runtimeRef.current) {
      runtimeRef.current.joystick = { x, y };
      runtimeRef.current.clickTarget = null;
      runtimeRef.current.pendingNpcId = null;
      runtimeRef.current.pendingObjectId = null;
    }
  }, []);

  const handleJoystickEnd = useCallback(() => {
    setJoystickActive(false);
    setJoystickKnob({ x: 0, y: 0 });
    if (runtimeRef.current) {
      runtimeRef.current.joystick = { x: 0, y: 0 };
    }
  }, []);

  const interactionLabel =
    nearestTarget?.kind === "npc" && nearestNpc && phase === "playing"
      ? `E｜與 ${nearestNpc.title} 交談`
      : nearestTarget?.kind === "object" && nearestObject && phase === "playing"
        ? `E｜觀察 ${nearestObject.title}`
      : tutorialStage === "move"
        ? "使用 WASD 或方向鍵移動，Space 跳躍"
        : tutorialStage === "look"
          ? "按住滑鼠拖曳，可以環視觀測所"
          : tutorialStage === "interact"
            ? "靠近發光的人物或怪物件，按 E 互動"
            : "點擊地面移動，Space 跳躍，Tab 開啟星象手札";

  return (
    <main className="archive-shell">
      <section className="scene-stage" aria-label="The Aquarius Observatory">
        <canvas ref={canvasRef} className="game-canvas" />
      </section>

      {phase === "loading" ? (
        <section className="loading-screen" aria-label="載入中">
          <div className="astro-loader" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p>{loadingText}</p>
          <div className="load-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <strong>{progress}%</strong>
          <small>Kenney Blocky Characters / CC0</small>
        </section>
      ) : null}

      {phase === "intro" ? (
        <section className="intro-screen" aria-label="進入觀測所">
          <p className="eyebrow">THE AQUARIUS OBSERVATORY</p>
          <h1>AQUARIUS ARCHIVE</h1>
          <h2>水瓶座人格原型博物館</h2>
          <p>在星海深處，每一種自由都有自己的形狀。</p>
          <button type="button" onClick={enterWorld}>
            進入觀測所
          </button>
          <div className="intro-controls" aria-label="基本操作">
            <span>WASD / 方向鍵：移動</span>
            <span>滑鼠拖曳：旋轉鏡頭</span>
            <span>Space：跳躍</span>
            <span>E：互動</span>
          </div>
        </section>
      ) : null}

      {phase === "playing" ? (
        <>
          <header className="minimal-hud" aria-label="目前狀態">
            <div>
              <span>♒</span>
              <strong>{currentRegion}</strong>
            </div>
            <nav aria-label="遊戲設定">
              <button type="button" onClick={toggleJournal} title="星象手札">
                手札
              </button>
              <button
                type="button"
                onClick={() => setMuted((value) => !value)}
                title="音效"
              >
                {muted ? "靜音" : "音效"}
              </button>
              <button type="button" onClick={cycleQuality} title="畫質">
                {quality.toUpperCase()}
              </button>
            </nav>
          </header>

          <div className="interaction-hint" aria-live="polite">
            {interactionLabel}
          </div>

          <div className="mobile-joystick">
            <div
              className={joystickActive ? "joystick-base active" : "joystick-base"}
              onPointerDown={handleJoystickStart}
              onPointerMove={handleJoystickMove}
              onPointerUp={handleJoystickEnd}
              onPointerCancel={handleJoystickEnd}
            >
              <span
                style={{
                  transform: `translate(${joystickKnob.x}px, ${joystickKnob.y}px)`,
                }}
              />
            </div>
          </div>

          <button
            className="mobile-action"
            type="button"
            onClick={advanceDialogue}
            aria-label="互動"
          >
            E
          </button>

          <button
            className="mobile-jump"
            type="button"
            onClick={requestJump}
            aria-label="跳躍"
          >
            跳
          </button>
        </>
      ) : null}

      {dialogue && dialogueNpc ? (
        <section className="dialogue-panel" aria-label={`${dialogueNpc.title} 對話`}>
          <div className="dialogue-title">
            <div>
              <span>{dialogueNpc.english}</span>
              <h2>{dialogueNpc.title}</h2>
            </div>
            <button type="button" onClick={closeDialogue} aria-label="關閉對話">
              Esc
            </button>
          </div>
          <p className="dialogue-text">
            {dialogue.answer ?? dialogueLines[dialogue.lineIndex] ?? dialogueNpc.quote}
          </p>
          {dialogue.lineIndex >= 2 ? (
            <div className="dialogue-choices">
              {DIALOGUE_QUESTIONS.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => chooseQuestion(question.id)}
                >
                  {question.label}
                </button>
              ))}
              <button type="button" onClick={closeDialogue}>
                離開
              </button>
            </div>
          ) : (
            <button className="continue-dialogue" type="button" onClick={advanceDialogue}>
              繼續
            </button>
          )}
        </section>
      ) : null}

      {artifact && activeArtifact ? (
        <section className="artifact-panel" aria-label={`${activeArtifact.title} 互動`}>
          <div className="dialogue-title">
            <div>
              <span>{activeArtifact.english}</span>
              <h2>{activeArtifact.title}</h2>
            </div>
            <button type="button" onClick={closeArtifact} aria-label="關閉物件">
              Esc
            </button>
          </div>
          <p className="artifact-trait">{activeArtifact.trait}</p>
          <p className="dialogue-text">{activeArtifact.response}</p>
          <button className="continue-dialogue" type="button" onClick={closeArtifact}>
            收起
          </button>
        </section>
      ) : null}

      {journalOpen ? (
        <section className="journal-panel" aria-label="星象手札">
          <div className="journal-heading">
            <div>
              <p className="eyebrow">ASTRAL FIELD NOTES</p>
              <h2>星象手札</h2>
            </div>
            <button type="button" onClick={() => setJournalOpen(false)}>
              Esc
            </button>
          </div>
          <div className="constellation-progress">
            {NPCS.map((npc, index) => (
              <span
                key={npc.id}
                className={unlocked.has(npc.id) ? "unlocked" : ""}
                style={
                  {
                    "--node-x": `${12 + (index % 4) * 25}%`,
                    "--node-y": `${index < 4 ? 30 : 70}%`,
                } as CSSProperties
                }
              />
            ))}
            <strong>
              已遇見 {unlocked.size} / {NPCS.length} 位水瓶人格
            </strong>
          </div>
          <div className="journal-grid">
            {NPCS.map((npc) => {
              const isUnlocked = unlocked.has(npc.id);
              return (
                <article className={isUnlocked ? "journal-card" : "journal-card locked"} key={npc.id}>
                  <span className="fragment" style={{ background: npc.accent }} />
                  <h3>{isUnlocked ? npc.title : "未知人格"}</h3>
                  <p>{isUnlocked ? npc.english : "????"}</p>
                  <small>{isUnlocked ? npc.keywords.join(" / ") : "尚未記錄"}</small>
                  <blockquote>{isUnlocked ? npc.quote : "靠近觀測所中的發光人物，解鎖這段星象記錄。"}</blockquote>
                  {isUnlocked ? (
                    <dl>
                      <dt>優勢</dt>
                      <dd>{npc.strength}</dd>
                      <dt>陰影</dt>
                      <dd>{npc.shadow}</dd>
                    </dl>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

function createLighting(THREE_REF: typeof THREE, scene: THREE.Scene) {
  scene.add(new THREE_REF.HemisphereLight("#dbeafe", "#130f1f", 1.7));
  const moon = new THREE_REF.DirectionalLight("#dbeafe", 2.6);
  moon.position.set(10, 16, 9);
  scene.add(moon);

  const fountain = new THREE_REF.PointLight("#5eead4", 16, 22);
  fountain.position.set(0, 2.2, 0);
  scene.add(fountain);

  const workshop = new THREE_REF.PointLight("#f6b04d", 10, 18);
  workshop.position.set(-13, 3, 0);
  scene.add(workshop);

  const temple = new THREE_REF.PointLight("#fb7185", 10, 18);
  temple.position.set(13, 3, 1);
  scene.add(temple);

  const observatory = new THREE_REF.SpotLight("#93c5fd", 34, 34, Math.PI / 5, 0.65, 1.3);
  observatory.position.set(0, 12, -13);
  observatory.target.position.set(0, 0, -17);
  scene.add(observatory);
  scene.add(observatory.target);
}

function createWorld(THREE_REF: typeof THREE, root: THREE.Group) {
  const stone = new THREE_REF.MeshStandardMaterial({
    color: "#263040",
    roughness: 0.86,
    metalness: 0.06,
  });
  const brass = new THREE_REF.MeshStandardMaterial({
    color: "#b8894a",
    roughness: 0.42,
    metalness: 0.68,
  });
  const glowBlue = new THREE_REF.MeshStandardMaterial({
    color: "#73d6ff",
    emissive: "#0ea5e9",
    emissiveIntensity: 0.75,
    roughness: 0.35,
  });
  const water = new THREE_REF.MeshStandardMaterial({
    color: "#2dd4bf",
    emissive: "#0f766e",
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.72,
    roughness: 0.18,
    metalness: 0.18,
  });

  const ground = new THREE_REF.Mesh(
    new THREE_REF.CircleGeometry(WORLD_CONFIG.worldRadius + 1, 128),
    new THREE_REF.MeshStandardMaterial({
      color: "#111827",
      roughness: 0.92,
      metalness: 0.04,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.name = "archive-ground";
  root.add(ground);

  const ring = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(5.2, 0.035, 8, 144), glowBlue);
  ring.position.y = 0.035;
  ring.rotation.x = Math.PI / 2;
  root.add(ring);

  const fountainBase = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(3.2, 3.55, 0.42, 64), stone);
  fountainBase.position.y = 0.2;
  root.add(fountainBase);
  const fountainWater = new THREE_REF.Mesh(new THREE_REF.CircleGeometry(2.75, 64), water);
  fountainWater.rotation.x = -Math.PI / 2;
  fountainWater.position.y = 0.45;
  root.add(fountainWater);
  const statue = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.36, 0.52, 2.45, 8), glowBlue);
  statue.position.set(0, 1.45, 0);
  root.add(statue);
  const vessel = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.9, 0.08, 8, 48), glowBlue);
  vessel.position.set(0, 2.72, 0);
  vessel.rotation.x = Math.PI / 2;
  root.add(vessel);

  addPath(root, THREE_REF, [[0, 0], [-13, 0], [-15, -7], [0, -17], [7, -12], [13, 1], [5, 15], [0, 0]]);
  addColumns(THREE_REF, root, stone);
  addWorkshop(THREE_REF, root, stone, brass, glowBlue);
  addArtTemple(THREE_REF, root, stone);
  addObservatory(THREE_REF, root, stone, brass, glowBlue);
  addWindBridge(THREE_REF, root, stone, glowBlue);

  return ground;
}

function addPath(root: THREE.Group, THREE_REF: typeof THREE, points: number[][]) {
  const material = new THREE_REF.LineBasicMaterial({
    color: "#5eead4",
    transparent: true,
    opacity: 0.34,
  });
  const positions: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    positions.push(points[index][0], 0.08, points[index][1], points[index + 1][0], 0.08, points[index + 1][1]);
  }
  const geometry = new THREE_REF.BufferGeometry();
  geometry.setAttribute("position", new THREE_REF.Float32BufferAttribute(positions, 3));
  root.add(new THREE_REF.LineSegments(geometry, material));
}

function addColumns(THREE_REF: typeof THREE, root: THREE.Group, stone: THREE.Material) {
  const positions = [
    [-5.2, 0, 5.2],
    [5.2, 0, 5.2],
    [-5.2, 0, -5.2],
    [5.2, 0, -5.2],
    [10.8, 0, -2.8],
    [12.6, 0, 4.7],
    [-10.8, 0, 4.4],
  ];
  positions.forEach(([x, y, z], index) => {
    const height = index === 4 ? 1.35 : 2.4;
    const column = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.28, 0.36, height, 12), stone);
    column.position.set(x, y + height / 2, z);
    column.rotation.z = index === 4 ? 0.45 : 0;
    root.add(column);
    const cap = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.9, 0.16, 0.9), stone);
    cap.position.set(x, y + height + 0.09, z);
    cap.rotation.z = column.rotation.z;
    root.add(cap);
  });
}

function addWorkshop(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  stone: THREE.Material,
  brass: THREE.Material,
  glow: THREE.Material
) {
  const base = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(7.2, 0.28, 5.4), stone);
  base.position.set(-13.5, 0.12, -2.4);
  root.add(base);
  for (let i = 0; i < 5; i += 1) {
    const gear = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.52 + i * 0.08, 0.045, 8, 32), brass);
    gear.position.set(-16 + i * 1.2, 1.2 + (i % 2) * 0.42, -3.6 + (i % 3) * 1.2);
    gear.rotation.set(Math.PI / 2, 0.4 * i, 0);
    root.add(gear);
  }
  const tube = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.08, 0.08, 5.8, 12), glow);
  tube.position.set(-12.4, 0.7, -2.4);
  tube.rotation.z = Math.PI / 2;
  root.add(tube);
}

function addArtTemple(THREE_REF: typeof THREE, root: THREE.Group, stone: THREE.Material) {
  const wallMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#31233b",
    roughness: 0.88,
    metalness: 0.08,
  });
  const wall = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(6.6, 2.4, 0.34), wallMaterial);
  wall.position.set(14.5, 1.2, -1.7);
  wall.rotation.y = -0.32;
  root.add(wall);
  const graffitiColors = ["#fb7185", "#c084fc", "#5eead4"];
  graffitiColors.forEach((color, index) => {
    const mark = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(1.4 - index * 0.18, 0.08, 0.08),
      new THREE_REF.MeshBasicMaterial({ color })
    );
    mark.position.set(13.3 + index * 0.85, 1.28 + index * 0.26, -1.47 + index * 0.07);
    mark.rotation.z = -0.5 + index * 0.55;
    mark.rotation.y = -0.32;
    root.add(mark);
  });
  const broken = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.34, 0.4, 2.8, 9), stone);
  broken.position.set(11.1, 1.2, -2.8);
  broken.rotation.z = 0.65;
  root.add(broken);
}

function addObservatory(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  stone: THREE.Material,
  brass: THREE.Material,
  glow: THREE.Material
) {
  const platform = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(6.2, 6.8, 0.38, 64), stone);
  platform.position.set(0, 0.08, -15);
  root.add(platform);
  const armillary = new THREE_REF.Group();
  armillary.position.set(0, 2.1, -15.6);
  [0, Math.PI / 3, -Math.PI / 3].forEach((rotation) => {
    const ring = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(1.45, 0.035, 8, 72), brass);
    ring.rotation.set(Math.PI / 2, rotation, 0);
    armillary.add(ring);
  });
  const core = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.28, 24, 24), glow);
  armillary.add(core);
  root.add(armillary);
  const telescope = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.18, 0.26, 2.4, 14), brass);
  telescope.position.set(3.2, 1.55, -13.1);
  telescope.rotation.set(Math.PI / 2.7, 0, -0.55);
  root.add(telescope);
}

function addWindBridge(THREE_REF: typeof THREE, root: THREE.Group, stone: THREE.Material, glow: THREE.Material) {
  for (let index = 0; index < 8; index += 1) {
    const step = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.4, 0.18, 1.05), stone);
    step.position.set(1.8 + index * 1.1, 0.16 + Math.sin(index) * 0.1, 9.2 + index * 1.08);
    step.rotation.y = 0.32 + Math.sin(index) * 0.18;
    root.add(step);
  }
  const portal = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(1.45, 0.07, 12, 72), glow);
  portal.position.set(8.8, 1.7, 17.8);
  portal.rotation.y = Math.PI / 2;
  root.add(portal);
}

function createStars(THREE_REF: typeof THREE) {
  const positions: number[] = [];
  const colors: number[] = [];
  const palette = ["#7dd3fc", "#f7d9ff", "#fff7db", "#5eead4"];
  for (let i = 0; i < 720; i += 1) {
    const radius = 34 + Math.random() * 36;
    const theta = Math.random() * Math.PI * 2;
    const y = 8 + Math.random() * 24;
    positions.push(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
    const color = new THREE_REF.Color(palette[i % palette.length]);
    colors.push(color.r, color.g, color.b);
  }
  const geometry = new THREE_REF.BufferGeometry();
  geometry.setAttribute("position", new THREE_REF.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE_REF.Float32BufferAttribute(colors, 3));
  return new THREE_REF.Points(
    geometry,
    new THREE_REF.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
    })
  );
}

function createParticles(THREE_REF: typeof THREE) {
  const positions: number[] = [];
  for (let i = 0; i < 160; i += 1) {
    positions.push((Math.random() - 0.5) * 46, 0.5 + Math.random() * 5, (Math.random() - 0.5) * 46);
  }
  const geometry = new THREE_REF.BufferGeometry();
  geometry.setAttribute("position", new THREE_REF.Float32BufferAttribute(positions, 3));
  return new THREE_REF.Points(
    geometry,
    new THREE_REF.PointsMaterial({
      color: "#dbeafe",
      size: 0.045,
      transparent: true,
      opacity: 0.42,
    })
  );
}

function cloneModel(THREE_REF: typeof THREE, model: THREE.Group) {
  const clone = model.clone(true);
  clone.traverse((child) => {
    if ("material" in child && child.material) {
      const material = child.material as THREE.Material | THREE.Material[];
      if (Array.isArray(material)) {
        child.material = material.map((item) => item.clone());
      } else {
        child.material = material.clone();
      }
    }
  });
  const box = new THREE_REF.Box3().setFromObject(clone);
  const center = box.getCenter(new THREE_REF.Vector3());
  clone.position.sub(center);
  clone.position.y -= box.min.y - center.y;
  return clone;
}

function createNpcGroup(THREE_REF: typeof THREE, npc: NpcData, source?: THREE.Group) {
  const group = new THREE_REF.Group();
  group.position.set(...npc.position);
  group.rotation.y = npc.facing;
  group.userData.npcId = npc.id;

  const model = source ? cloneModel(THREE_REF, source) : new THREE_REF.Group();
  model.scale.setScalar(WORLD_CONFIG.modelScale);
  group.add(model);

  const floorRing = new THREE_REF.Mesh(
    new THREE_REF.TorusGeometry(1.15, 0.025, 8, 72),
    new THREE_REF.MeshBasicMaterial({ color: npc.accent, transparent: true, opacity: 0.58 })
  );
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = 0.035;
  group.add(floorRing);

  addNpcAccessory(THREE_REF, group, npc);
  const label = makeNpcLabel(THREE_REF, npc);
  label.position.set(0, 2.55, 0);
  label.visible = false;
  group.add(label);
  group.userData.label = label;

  const light = new THREE_REF.PointLight(npc.accent, 3.8, 6);
  light.position.y = 1.6;
  group.add(light);

  group.traverse((child) => {
    child.userData.npcId = npc.id;
  });
  return group;
}

function addNpcAccessory(THREE_REF: typeof THREE, group: THREE.Group, npc: NpcData) {
  const material = new THREE_REF.MeshStandardMaterial({
    color: npc.accent,
    emissive: npc.accent,
    emissiveIntensity: 0.55,
    roughness: 0.34,
    metalness: 0.28,
  });
  if (npc.id === "futurist") {
    const ring = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.52, 0.035, 8, 56), material);
    ring.position.set(0.7, 1.65, 0.1);
    ring.rotation.set(Math.PI / 2, 0.2, 0);
    group.add(ring);
  } else if (npc.id === "rebel") {
    const brush = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.045, 0.065, 0.92, 8), material);
    brush.position.set(0.72, 1.05, 0.18);
    brush.rotation.z = -0.7;
    group.add(brush);
  } else if (npc.id === "observer") {
    for (let i = 0; i < 3; i += 1) {
      const shard = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.34, 0.22, 0.035), material);
      shard.position.set(-0.7 + i * 0.22, 1.35 + i * 0.22, -0.3);
      shard.rotation.set(0.4, i, 0.2);
      group.add(shard);
    }
  } else if (npc.id === "humanitarian") {
    const bowl = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.44, 0.055, 8, 48), material);
    bowl.position.set(0.55, 1.05, 0.2);
    bowl.rotation.x = Math.PI / 2;
    group.add(bowl);
  } else if (npc.id === "inventor") {
    const gear = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.38, 0.045, 8, 36), material);
    gear.position.set(0.62, 1.45, 0.25);
    gear.rotation.x = Math.PI / 2;
    group.add(gear);
  } else if (npc.id === "wanderer") {
    const star = new THREE_REF.Mesh(new THREE_REF.OctahedronGeometry(0.22, 0), material);
    star.position.set(0.72, 1.65, -0.25);
    group.add(star);
  } else if (npc.id === "visionary") {
    const halo = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.52, 0.025, 8, 56), material);
    halo.position.set(0, 1.88, 0);
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
  } else {
    const panel = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.58, 0.34, 0.035), material);
    panel.position.set(0.7, 1.34, 0.2);
    panel.rotation.y = -0.5;
    group.add(panel);
  }
}

function makeNpcLabel(THREE_REF: typeof THREE, npc: NpcData) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(7, 10, 18, 0.72)";
    context.fillRect(24, 34, 464, 112);
    context.strokeStyle = npc.accent;
    context.lineWidth = 4;
    context.strokeRect(32, 42, 448, 96);
    context.fillStyle = "#f8fafc";
    context.font = "700 36px serif";
    context.textAlign = "center";
    context.fillText(npc.title, 256, 86);
    context.fillStyle = npc.accent;
    context.font = "700 20px sans-serif";
    context.fillText(npc.english, 256, 116);
  }
  const texture = new THREE_REF.CanvasTexture(canvas);
  const sprite = new THREE_REF.Sprite(
    new THREE_REF.SpriteMaterial({ map: texture, transparent: true })
  );
  sprite.scale.set(2.65, 1, 1);
  return sprite;
}

function createAquariusObjectGroup(THREE_REF: typeof THREE, item: AquariusObjectData) {
  const group = new THREE_REF.Group();
  group.position.set(...item.position);
  group.userData.objectId = item.id;

  const baseMaterial = new THREE_REF.MeshStandardMaterial({
    color: item.kind === "creature" ? "#dbeafe" : "#273347",
    roughness: 0.72,
    metalness: item.kind === "creature" ? 0.02 : 0.28,
  });
  const accentMaterial = new THREE_REF.MeshStandardMaterial({
    color: item.accent,
    emissive: item.accent,
    emissiveIntensity: 0.62,
    roughness: 0.36,
    metalness: 0.18,
  });
  const darkMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#111827",
    roughness: 0.82,
    metalness: 0.08,
  });

  if (item.id === "reverse-clock") {
    addReverseClockObject(THREE_REF, group, baseMaterial, accentMaterial);
  } else if (item.id === "contrarian-vending") {
    addContrarianVendingObject(THREE_REF, group, darkMaterial, accentMaterial);
  } else if (item.id === "crowd-antenna") {
    addCrowdAntennaObject(THREE_REF, group, baseMaterial, accentMaterial);
  } else if (item.id === "unwritten-chair") {
    addUnwrittenChairObject(THREE_REF, group, darkMaterial, accentMaterial);
  } else if (item.id === "flying-cow") {
    addFlyingCowObject(THREE_REF, group, darkMaterial, accentMaterial);
  } else if (item.id === "signal-jellyfish") {
    addSignalJellyfishObject(THREE_REF, group, accentMaterial);
  } else {
    addQuantumDeerObject(THREE_REF, group, darkMaterial, accentMaterial);
  }

  const floorRing = new THREE_REF.Mesh(
    new THREE_REF.TorusGeometry(item.kind === "creature" ? 1.35 : 1.05, 0.024, 8, 64),
    new THREE_REF.MeshBasicMaterial({ color: item.accent, transparent: true, opacity: 0.48 })
  );
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = item.kind === "creature" ? -item.position[1] + 0.06 : 0.04;
  group.add(floorRing);

  const label = makeObjectLabel(THREE_REF, item);
  label.position.set(0, item.kind === "creature" ? 1.75 : 2.2, 0);
  label.visible = false;
  group.add(label);
  group.userData.label = label;

  const light = new THREE_REF.PointLight(item.accent, item.kind === "creature" ? 3.2 : 2.4, 7);
  light.position.y = item.kind === "creature" ? 0.4 : 1.2;
  group.add(light);

  group.traverse((child) => {
    child.userData.objectId = item.id;
  });
  return group;
}

function addReverseClockObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  baseMaterial: THREE.Material,
  accentMaterial: THREE.Material
) {
  const pedestal = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.5, 0.7, 0.55, 10), baseMaterial);
  pedestal.position.y = 0.28;
  group.add(pedestal);
  const hourglass = new THREE_REF.Mesh(new THREE_REF.OctahedronGeometry(0.58, 0), accentMaterial);
  hourglass.position.y = 1.12;
  hourglass.scale.set(0.72, 1.2, 0.72);
  group.add(hourglass);
  const ring = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.72, 0.035, 8, 54), accentMaterial);
  ring.position.y = 1.12;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  for (let index = 0; index < 3; index += 1) {
    const drop = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.08, 12, 12), accentMaterial);
    drop.position.set(-0.16 + index * 0.16, 1.76 - index * 0.3, 0.1);
    group.add(drop);
  }
}

function addContrarianVendingObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  darkMaterial: THREE.Material,
  accentMaterial: THREE.Material
) {
  const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.25, 2.05, 0.72), darkMaterial);
  body.position.y = 1.05;
  body.rotation.y = -0.25;
  group.add(body);
  const screen = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.72, 0.36, 0.035), accentMaterial);
  screen.position.set(-0.1, 1.62, 0.38);
  screen.rotation.y = -0.25;
  group.add(screen);
  for (let index = 0; index < 6; index += 1) {
    const button = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.12, 0.12, 0.04), accentMaterial);
    button.position.set(0.36, 1.2 - (index % 3) * 0.18, 0.4 + Math.floor(index / 3) * 0.015);
    button.rotation.y = -0.25;
    group.add(button);
  }
  const ideaCube = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.3, 0.16, 0.3), accentMaterial);
  ideaCube.position.set(-0.22, 0.42, 0.5);
  ideaCube.rotation.set(0.4, 0.2, 0.5);
  group.add(ideaCube);
}

function addCrowdAntennaObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  baseMaterial: THREE.Material,
  accentMaterial: THREE.Material
) {
  const mast = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.06, 0.08, 1.8, 10), baseMaterial);
  mast.position.y = 0.9;
  group.add(mast);
  const dish = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(0.72, 0.34, 32, 1, true), accentMaterial);
  dish.position.y = 1.74;
  dish.rotation.x = Math.PI / 2.7;
  group.add(dish);
  for (let index = 0; index < 5; index += 1) {
    const thought = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.16, 0.16, 0.16), accentMaterial);
    const theta = (index / 5) * Math.PI * 2;
    thought.position.set(Math.cos(theta) * 0.95, 1.7 + Math.sin(index) * 0.22, Math.sin(theta) * 0.95);
    thought.rotation.set(index * 0.4, index * 0.6, 0.2);
    group.add(thought);
  }
}

function addUnwrittenChairObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  darkMaterial: THREE.Material,
  accentMaterial: THREE.Material
) {
  const seat = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.1, 0.16, 1), darkMaterial);
  seat.position.y = 0.72;
  seat.rotation.set(0.08, -0.42, 0.12);
  group.add(seat);
  const back = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.1, 1.05, 0.14), accentMaterial);
  back.position.set(0.08, 1.2, -0.44);
  back.rotation.set(-0.3, -0.42, 0.05);
  group.add(back);
  for (let index = 0; index < 4; index += 1) {
    const leg = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.045, 0.055, 0.7, 8), darkMaterial);
    leg.position.set(index < 2 ? -0.42 : 0.42, 0.34, index % 2 === 0 ? -0.34 : 0.34);
    leg.rotation.z = index % 2 === 0 ? 0.16 : -0.16;
    group.add(leg);
  }
  const stage = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.78, 0.035, 8, 48), accentMaterial);
  stage.position.y = 0.58;
  stage.rotation.x = Math.PI / 2;
  group.add(stage);
}

function addFlyingCowObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  darkMaterial: THREE.Material,
  accentMaterial: THREE.Material
) {
  const cowWhite = new THREE_REF.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.72 });
  const cowBlack = new THREE_REF.MeshStandardMaterial({ color: "#1f2937", roughness: 0.7 });
  const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.45, 0.68, 0.72), cowWhite);
  body.position.y = 0.15;
  group.add(body);
  const head = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.48, 0.5, 0.5), cowWhite);
  head.position.set(0.92, 0.22, 0.02);
  group.add(head);
  [-0.34, 0.26].forEach((z, index) => {
    const spot = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.18 + index * 0.03, 12, 12), cowBlack);
    spot.position.set(-0.22 + index * 0.24, 0.24, z);
    spot.scale.set(1.1, 0.46, 0.3);
    group.add(spot);
  });
  [-0.18, 0.18].forEach((z) => {
    const horn = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(0.08, 0.22, 8), accentMaterial);
    horn.position.set(1.16, 0.56, z);
    horn.rotation.z = -Math.PI / 2;
    group.add(horn);
  });
  const wings = [-1, 1].map((side) => {
    const wing = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.78, 0.08, 0.42), accentMaterial);
    wing.position.set(-0.22, 0.32, side * 0.55);
    wing.rotation.y = side * 0.25;
    group.add(wing);
    return wing;
  });
  for (let index = 0; index < 4; index += 1) {
    const leg = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.14, 0.42, 0.14), darkMaterial);
    leg.position.set(index < 2 ? -0.42 : 0.38, -0.46, index % 2 === 0 ? -0.22 : 0.22);
    group.add(leg);
  }
  group.userData.wings = wings;
}

function addSignalJellyfishObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  accentMaterial: THREE.Material
) {
  const bellMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#d8b4fe",
    emissive: "#7c3aed",
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.72,
    roughness: 0.24,
  });
  const bell = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.58, 24, 16), bellMaterial);
  bell.scale.set(1, 0.58, 1);
  group.add(bell);
  const tendrils: THREE.Object3D[] = [];
  for (let index = 0; index < 6; index += 1) {
    const theta = (index / 6) * Math.PI * 2;
    const tendril = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.018, 0.028, 1.25, 6), accentMaterial);
    tendril.position.set(Math.cos(theta) * 0.3, -0.72, Math.sin(theta) * 0.3);
    tendril.rotation.z = Math.cos(theta) * 0.22;
    group.add(tendril);
    tendrils.push(tendril);
  }
  group.userData.tendrils = tendrils;
}

function addQuantumDeerObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  darkMaterial: THREE.Material,
  accentMaterial: THREE.Material
) {
  const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.2, 0.55, 0.48), darkMaterial);
  body.position.y = 0.78;
  group.add(body);
  const neck = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.24, 0.58, 0.24), darkMaterial);
  neck.position.set(0.55, 1.12, 0);
  neck.rotation.z = -0.18;
  group.add(neck);
  const head = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.42, 0.34, 0.34), darkMaterial);
  head.position.set(0.83, 1.42, 0);
  group.add(head);
  for (let index = 0; index < 4; index += 1) {
    const leg = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.045, 0.06, 0.72, 7), darkMaterial);
    leg.position.set(index < 2 ? -0.36 : 0.36, 0.34, index % 2 === 0 ? -0.17 : 0.17);
    group.add(leg);
  }
  [-1, 1].forEach((side) => {
    const antler = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.08, 0.78, 0.08), accentMaterial);
    antler.position.set(0.82, 1.86, side * 0.15);
    antler.rotation.z = side * 0.34;
    group.add(antler);
    const branch = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.06, 0.44, 0.06), accentMaterial);
    branch.position.set(0.7, 1.95, side * 0.34);
    branch.rotation.set(0.18, 0, side * 0.85);
    group.add(branch);
  });
  const ghost = new THREE_REF.Mesh(
    new THREE_REF.BoxGeometry(1.24, 0.58, 0.5),
    new THREE_REF.MeshBasicMaterial({ color: "#7dd3fc", transparent: true, opacity: 0.16 })
  );
  ghost.position.set(-0.18, 0.82, 0.18);
  group.add(ghost);
}

function makeObjectLabel(THREE_REF: typeof THREE, item: AquariusObjectData) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 184;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(7, 10, 18, 0.74)";
    context.fillRect(28, 32, 456, 110);
    context.strokeStyle = item.accent;
    context.lineWidth = 4;
    context.strokeRect(36, 40, 440, 94);
    context.fillStyle = "#f8fafc";
    context.font = "700 34px serif";
    context.textAlign = "center";
    context.fillText(item.title, 256, 82);
    context.fillStyle = item.accent;
    context.font = "700 18px sans-serif";
    context.fillText(item.trait, 256, 116);
  }
  const texture = new THREE_REF.CanvasTexture(canvas);
  const sprite = new THREE_REF.Sprite(
    new THREE_REF.SpriteMaterial({ map: texture, transparent: true })
  );
  sprite.scale.set(2.55, 0.92, 1);
  return sprite;
}

function updateRuntime(
  runtime: Runtime,
  delta: number,
  callbacks: {
    phase: Phase;
    dialogue: DialogueState | null;
    artifact: ArtifactState | null;
    onRegion: (region: string) => void;
    onNearestNpc: (id: ArchetypeId | null) => void;
    onNearestTarget: (target: InteractionTarget | null) => void;
    onOpenDialogue: (id: ArchetypeId) => void;
    onOpenArtifact: (id: AquariusObjectId) => void;
    isJournalOpen: () => boolean;
    onTutorialMove: () => void;
    onFootstep: () => void;
  }
) {
  const { THREE: THREE_REF, player, controls } = runtime;
  const time = performance.now() * 0.001;
  runtime.particles.rotation.y += delta * 0.018;

  runtime.npcGroups.forEach((group, id) => {
    const label = runtime.npcLabels.get(id);
    const distance = player.position.distanceTo(group.position);
    group.position.y = Math.sin(time * 1.8 + group.position.x) * 0.075;
    group.rotation.y += Math.sin(time * 0.7 + group.position.z) * 0.0015;
    if (label) {
      label.visible = distance < WORLD_CONFIG.revealDistance || callbacks.dialogue?.npcId === id;
    }
  });

  runtime.objectGroups.forEach((group, id) => {
    const item = getAquariusObject(id);
    const label = runtime.objectLabels.get(id);
    const distance = player.position.distanceTo(runtime.objectPositions.get(id) ?? group.position);
    const floatBase = item.position[1];
    group.position.y = floatBase + Math.sin(time * (item.kind === "creature" ? 1.5 : 1.05) + group.position.x) * 0.14;
    group.rotation.y += delta * (item.kind === "creature" ? 0.18 : 0.08);
    const wings = group.userData.wings as THREE.Object3D[] | undefined;
    wings?.forEach((wing, index) => {
      wing.rotation.z = (index === 0 ? 0.45 : -0.45) + Math.sin(time * 6.2) * (index === 0 ? 0.42 : -0.42);
    });
    const tendrils = group.userData.tendrils as THREE.Object3D[] | undefined;
    tendrils?.forEach((tendril, index) => {
      tendril.rotation.x = Math.sin(time * 2.4 + index) * 0.22;
    });
    if (label) {
      label.visible = distance < WORLD_CONFIG.revealDistance || callbacks.artifact?.objectId === id;
    }
  });

  if (callbacks.phase === "playing" && !callbacks.dialogue && !callbacks.artifact && !callbacks.isJournalOpen()) {
    updatePlayerMovement(runtime, delta, callbacks.onTutorialMove, callbacks.onFootstep);
  } else {
    runtime.velocity.lerp(new THREE_REF.Vector3(0, 0, 0), Math.min(1, delta * 8));
    updateJump(runtime, delta);
  }

  const region = getRegionName(player.position.x, player.position.z);
  if (runtime.frame % 12 === 0) {
    callbacks.onRegion(region);
  }

  const nearestNpc = findNearestNpc(runtime);
  const nearestTarget = findNearestInteraction(runtime);
  if (runtime.frame % 8 === 0) {
    callbacks.onNearestNpc(nearestNpc && nearestNpc.distance < WORLD_CONFIG.interactDistance ? nearestNpc.id : null);
    callbacks.onNearestTarget(
      nearestTarget && nearestTarget.distance < WORLD_CONFIG.interactDistance ? nearestTarget : null
    );
  }

  if (
    runtime.pendingNpcId &&
    nearestTarget?.kind === "npc" &&
    nearestTarget.id === runtime.pendingNpcId &&
    nearestTarget.distance < WORLD_CONFIG.interactDistance
  ) {
    callbacks.onOpenDialogue(runtime.pendingNpcId);
  }

  if (
    runtime.pendingObjectId &&
    nearestTarget?.kind === "object" &&
    nearestTarget.id === runtime.pendingObjectId &&
    nearestTarget.distance < WORLD_CONFIG.interactDistance
  ) {
    callbacks.onOpenArtifact(runtime.pendingObjectId);
  }

  if (callbacks.dialogue) {
    focusDialogueCamera(runtime, callbacks.dialogue.npcId, delta);
  } else {
    followPlayerCamera(runtime, delta);
  }

  controls.update();
}

function updatePlayerMovement(
  runtime: Runtime,
  delta: number,
  onTutorialMove: () => void,
  onFootstep: () => void
) {
  const { THREE: THREE_REF, player, camera, controls } = runtime;
  let horizontal = 0;
  let vertical = 0;
  if (runtime.keys.has("KeyW") || runtime.keys.has("ArrowUp")) vertical += 1;
  if (runtime.keys.has("KeyS") || runtime.keys.has("ArrowDown")) vertical -= 1;
  if (runtime.keys.has("KeyA") || runtime.keys.has("ArrowLeft")) horizontal -= 1;
  if (runtime.keys.has("KeyD") || runtime.keys.has("ArrowRight")) horizontal += 1;
  horizontal += runtime.joystick.x;
  vertical += -runtime.joystick.y;

  const cameraForward = new THREE_REF.Vector3()
    .subVectors(controls.target, camera.position)
    .setY(0)
    .normalize();
  const cameraRight = new THREE_REF.Vector3().crossVectors(cameraForward, new THREE_REF.Vector3(0, 1, 0)).normalize();
  const desired = new THREE_REF.Vector3();
  let usingKeyboard = Math.abs(horizontal) + Math.abs(vertical) > 0.05;

  if (usingKeyboard) {
    desired.addScaledVector(cameraForward, vertical);
    desired.addScaledVector(cameraRight, horizontal);
    if (desired.lengthSq() > 0.001) {
      desired.normalize();
    }
    runtime.clickTarget = null;
    runtime.pendingNpcId = null;
    runtime.pendingObjectId = null;
  } else if (runtime.clickTarget) {
    desired.subVectors(runtime.clickTarget, player.position).setY(0);
    if (desired.length() < 0.22) {
      runtime.clickTarget = null;
      desired.set(0, 0, 0);
    } else {
      desired.normalize();
      usingKeyboard = true;
    }
  }

  const speed =
    runtime.keys.has("ShiftLeft") || runtime.keys.has("ShiftRight")
      ? WORLD_CONFIG.runSpeed
      : WORLD_CONFIG.moveSpeed;
  const desiredVelocity = desired.multiplyScalar(speed);
  runtime.velocity.lerp(
    desiredVelocity,
    Math.min(1, delta * (usingKeyboard ? WORLD_CONFIG.acceleration : WORLD_CONFIG.damping))
  );

  if (!usingKeyboard && runtime.velocity.length() < 0.02) {
    runtime.velocity.set(0, 0, 0);
  }

  const next = player.position.clone().addScaledVector(runtime.velocity, delta);
  const clamped = clampToWorld(next.x, next.z);
  next.x = clamped.x;
  next.z = clamped.z;

  if (!collides(runtime, next.x, next.z)) {
    player.position.copy(next);
  } else {
    const tryX = player.position.clone();
    tryX.x = next.x;
    const tryZ = player.position.clone();
    tryZ.z = next.z;
    if (!collides(runtime, tryX.x, tryX.z)) {
      player.position.copy(tryX);
    } else if (!collides(runtime, tryZ.x, tryZ.z)) {
      player.position.copy(tryZ);
    } else {
      runtime.velocity.multiplyScalar(0.2);
    }
  }

  const moving = runtime.velocity.length() > 0.12;
  if (moving) {
    onTutorialMove();
    const angle = Math.atan2(runtime.velocity.x, runtime.velocity.z);
    runtime.playerModel.rotation.y = angle;
    const bob = Math.sin(performance.now() * 0.016 * (speed > WORLD_CONFIG.moveSpeed ? 1.4 : 1)) * 0.05;
    runtime.playerModel.position.y = bob;
    const now = performance.now();
    if (now - runtime.lastStepAt > (speed > WORLD_CONFIG.moveSpeed ? 260 : 390)) {
      runtime.lastStepAt = now;
      onFootstep();
    }
  } else {
    runtime.playerModel.position.y = Math.sin(performance.now() * 0.0025) * 0.025;
  }

  updateJump(runtime, delta);
}

function updateJump(runtime: Runtime, delta: number) {
  if (!runtime.grounded || runtime.player.position.y > 0) {
    runtime.jumpVelocity -= WORLD_CONFIG.gravity * delta;
    runtime.player.position.y += runtime.jumpVelocity * delta;
    if (runtime.player.position.y <= 0) {
      runtime.player.position.y = 0;
      runtime.jumpVelocity = 0;
      runtime.grounded = true;
    }
  }
}

function collides(runtime: Runtime, x: number, z: number) {
  for (const obstacle of runtime.obstacles) {
    if (Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.radius + 0.42) {
      return true;
    }
  }
  return false;
}

function findNearestNpc(runtime: Runtime) {
  let nearest: { id: ArchetypeId; distance: number } | null = null;
  runtime.npcPositions.forEach((position, id) => {
    const distance = runtime.player.position.distanceTo(position);
    if (!nearest || distance < nearest.distance) {
      nearest = { id, distance };
    }
  });
  return nearest;
}

function findNearestInteraction(runtime: Runtime): InteractionTarget | null {
  let nearest: InteractionTarget | null = null;
  runtime.npcPositions.forEach((position, id) => {
    const distance = runtime.player.position.distanceTo(position);
    if (!nearest || distance < nearest.distance) {
      nearest = { kind: "npc", id, distance };
    }
  });
  runtime.objectPositions.forEach((position, id) => {
    const distance = runtime.player.position.distanceTo(position);
    if (!nearest || distance < nearest.distance) {
      nearest = { kind: "object", id, distance };
    }
  });
  return nearest;
}

function followPlayerCamera(runtime: Runtime, delta: number) {
  const desiredTarget = runtime.player.position.clone().add(new runtime.THREE.Vector3(0, 1.05, 0));
  const factor = Math.min(1, delta * 5.2);
  const previous = runtime.controls.target.clone();
  runtime.controls.target.lerp(desiredTarget, factor);
  const movement = runtime.controls.target.clone().sub(previous);
  runtime.camera.position.add(movement);
  runtime.controls.enableRotate = true;
}

function focusDialogueCamera(runtime: Runtime, npcId: ArchetypeId, delta: number) {
  const npcPosition = runtime.npcPositions.get(npcId);
  if (!npcPosition) {
    return;
  }
  const midpoint = runtime.player.position.clone().lerp(npcPosition, 0.5);
  midpoint.y = 1.35;
  const direction = runtime.player.position.clone().sub(npcPosition).setY(0).normalize();
  const side = new runtime.THREE.Vector3(-direction.z, 0, direction.x);
  const desiredPosition = midpoint.clone().add(side.multiplyScalar(3.3)).add(new runtime.THREE.Vector3(0, 2.25, 3.1));
  runtime.camera.position.lerp(desiredPosition, Math.min(1, delta * 3.8));
  runtime.controls.target.lerp(midpoint, Math.min(1, delta * 5));
  runtime.controls.enableRotate = false;
}

function findNpcId(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (typeof current.userData.npcId === "string") {
      return current.userData.npcId;
    }
    current = current.parent;
  }
  return null;
}

function findObjectId(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (typeof current.userData.objectId === "string") {
      return current.userData.objectId;
    }
    current = current.parent;
  }
  return null;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
