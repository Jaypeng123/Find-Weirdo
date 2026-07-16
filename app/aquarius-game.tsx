"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type ArchetypeId =
  | "futurist"
  | "inventor"
  | "rebel"
  | "observer"
  | "humanitarian"
  | "wanderer"
  | "visionary"
  | "hacker"
  | "social"
  | "receiver";

type ObjectType = "crystal" | "beacon" | "lounge" | "water" | "mural";

type SavedRoomObject = {
  id: string;
  type: ObjectType;
  x: number;
  z: number;
  rotation: number;
  owner: string;
  createdAt: string;
};

type RoomMessage = {
  id: number | string;
  roomId?: string;
  author: string;
  body: string;
  kind: string;
  createdAt: string;
};

type RoomPlayer = {
  id?: number | string;
  roomId?: string;
  playerName: string;
  avatarColor: string;
  positionX: number;
  positionZ: number;
  lastSeenAt: string;
};

type RoomSnapshot = {
  id: string;
  code: string;
  name: string;
  objects: SavedRoomObject[];
  messages: RoomMessage[];
  players: RoomPlayer[];
  updatedAt: string;
};

type Session = {
  roomId: string;
  roomName: string;
  code: string;
  password: string;
  playerName: string;
  api: boolean;
};

type ChatLine = {
  role: "user" | "assistant";
  content: string;
  mode?: "ai" | "scripted";
};

type Runtime = {
  THREE: typeof THREE;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  ground: THREE.Mesh;
  objectRoot: THREE.Group;
  peerRoot: THREE.Group;
  npcRoot: THREE.Group;
  player: THREE.Group;
  target: THREE.Vector3;
  downPoint: { x: number; y: number };
  animationId: number;
  resize: () => void;
  dispose: () => void;
};

const archetypes: Array<{
  id: ArchetypeId;
  title: string;
  en: string;
  quote: string;
  keywords: string;
  persona: string;
  color: string;
  accent: string;
  rare?: boolean;
}> = [
  {
    id: "futurist",
    title: "未來派",
    en: "The Futurist",
    quote: "未來不是等待，而是設計出來的。",
    keywords: "科技 / AI / 宇宙 / 前瞻 / 理性",
    persona: "永遠在談五年後的事情，對現在流行不感興趣。",
    color: "#7dd3fc",
    accent: "#dbeafe",
  },
  {
    id: "inventor",
    title: "怪點子發明家",
    en: "The Inventor",
    quote: "如果沒有這個東西，那就做一個。",
    keywords: "創意 / DIY / 實驗 / 腦洞",
    persona: "身上永遠帶著奇怪工具，什麼都想改造。",
    color: "#facc15",
    accent: "#fef3c7",
  },
  {
    id: "rebel",
    title: "叛逆藝術家",
    en: "The Rebel Artist",
    quote: "規則只是上一代人的習慣。",
    keywords: "藝術 / 反骨 / 自由 / 街頭文化",
    persona: "討厭被定義，喜歡顛覆美學與既定秩序。",
    color: "#fb7185",
    accent: "#ffe4e6",
  },
  {
    id: "observer",
    title: "冷靜觀察者",
    en: "The Observer",
    quote: "我不是不說話，我只是還在分析。",
    keywords: "分析 / 邏輯 / 心理學 / 觀察",
    persona: "幾乎不聊天，一開口就是重點。",
    color: "#a7f3d0",
    accent: "#ecfdf5",
  },
  {
    id: "humanitarian",
    title: "人道主義者",
    en: "The Humanitarian",
    quote: "真正的進步，是讓所有人一起前進。",
    keywords: "公益 / 平等 / 理想 / 社會",
    persona: "善良而堅定，相信世界可以更好。",
    color: "#bef264",
    accent: "#f7fee7",
  },
  {
    id: "wanderer",
    title: "自由旅人",
    en: "The Wanderer",
    quote: "人生沒有固定路線。",
    keywords: "旅行 / 探索 / 體驗 / 自由",
    persona: "今天在沙漠，明天去冰島，從不做固定規劃。",
    color: "#fbbf24",
    accent: "#fffbeb",
  },
  {
    id: "visionary",
    title: "星際哲學家",
    en: "The Visionary",
    quote: "如果宇宙是一場實驗，我們正在其中。",
    keywords: "哲學 / 宇宙 / 時間 / 文明",
    persona: "聊天像哲學課，總把日常問題推向宇宙尺度。",
    color: "#c4b5fd",
    accent: "#f5f3ff",
  },
  {
    id: "hacker",
    title: "系統駭客",
    en: "The Hacker",
    quote: "每個系統，都有漏洞。",
    keywords: "破解 / 資訊 / 黑客 / 規則漏洞",
    persona: "研究系統並尋找更聰明的捷徑。",
    color: "#5eead4",
    accent: "#ccfbf1",
  },
  {
    id: "social",
    title: "社交實驗家",
    en: "The Social Experimenter",
    quote: "不是因為喜歡人，而是對人很好奇。",
    keywords: "心理實驗 / 反應 / 群體 / 問題",
    persona: "故意測試人的反應，常問奇怪但精準的問題。",
    color: "#f9a8d4",
    accent: "#fdf2f8",
    rare: true,
  },
  {
    id: "receiver",
    title: "異世界信號接收者",
    en: "The Cosmic Receiver",
    quote: "靈感是宇宙傳來的未讀訊息。",
    keywords: "靈感 / 宇宙同步 / 夢境 / 未來訊號",
    persona: "偏神祕，像在接收另一個頻道的訊息。",
    color: "#93c5fd",
    accent: "#eff6ff",
    rare: true,
  },
];

const objectCatalog: Array<{
  type: ObjectType;
  label: string;
  short: string;
  color: string;
}> = [
  { type: "crystal", label: "靈感晶體", short: "CR", color: "#7dd3fc" },
  { type: "beacon", label: "信號塔", short: "SG", color: "#bef264" },
  { type: "lounge", label: "漂浮座", short: "LO", color: "#fbbf24" },
  { type: "water", label: "水流節點", short: "WA", color: "#5eead4" },
  { type: "mural", label: "反骨牆", short: "AR", color: "#fb7185" },
];

const localStoragePrefix = "aquarius-commons-room:";

function localRoomKey(roomId: string) {
  return `${localStoragePrefix}${roomId}`;
}

function cleanDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function randomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function colorForName(name: string) {
  const colors = ["#7dd3fc", "#fb7185", "#bef264", "#facc15", "#c4b5fd", "#5eead4"];
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return colors[hash % colors.length];
}

function makeLocalSnapshot(session: Session): RoomSnapshot {
  return {
    id: session.roomId,
    code: session.code,
    name: session.roomName,
    objects: [],
    messages: [
      {
        id: crypto.randomUUID(),
        author: "system",
        body: `${session.playerName} 建立了 ${session.roomName}`,
        kind: "system",
        createdAt: new Date().toISOString(),
      },
    ],
    players: [
      {
        id: crypto.randomUUID(),
        playerName: session.playerName,
        avatarColor: colorForName(session.playerName),
        positionX: 0,
        positionZ: 0,
        lastSeenAt: new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

function readLocalSnapshot(session: Session) {
  const raw = window.localStorage.getItem(localRoomKey(session.roomId));
  if (!raw) {
    const snapshot = makeLocalSnapshot(session);
    window.localStorage.setItem(localRoomKey(session.roomId), JSON.stringify(snapshot));
    return snapshot;
  }

  try {
    return JSON.parse(raw) as RoomSnapshot;
  } catch {
    const snapshot = makeLocalSnapshot(session);
    window.localStorage.setItem(localRoomKey(session.roomId), JSON.stringify(snapshot));
    return snapshot;
  }
}

function writeLocalSnapshot(snapshot: RoomSnapshot) {
  window.localStorage.setItem(localRoomKey(snapshot.id), JSON.stringify(snapshot));
}

function formatClock(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
}

export function AquariusGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const roomRef = useRef<RoomSnapshot | null>(null);
  const objectsRef = useRef<SavedRoomObject[]>([]);
  const buildModeRef = useRef(false);
  const buildTypeRef = useRef<ObjectType>("crystal");
  const placeObjectRef = useRef<(x: number, z: number) => void>(() => undefined);

  const [mode, setMode] = useState<"create" | "join">("create");
  const [playerName, setPlayerName] = useState("");
  const [roomName, setRoomName] = useState("Aquarius Commons");
  const [roomCode, setRoomCode] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [objects, setObjects] = useState<SavedRoomObject[]>([]);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [buildMode, setBuildMode] = useState(false);
  const [buildType, setBuildType] = useState<ObjectType>("crystal");
  const [selectedNpcId, setSelectedNpcId] = useState<ArchetypeId>("futurist");
  const [chatInput, setChatInput] = useState("");
  const [npcInput, setNpcInput] = useState("");
  const [npcChats, setNpcChats] = useState<Record<string, ChatLine[]>>({});
  const [aiBusy, setAiBusy] = useState(false);

  const selectedNpc = useMemo(
    () => archetypes.find((item) => item.id === selectedNpcId) ?? archetypes[0],
    [selectedNpcId]
  );
  const selectedObject = useMemo(
    () => objectCatalog.find((item) => item.type === buildType) ?? objectCatalog[0],
    [buildType]
  );

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    objectsRef.current = objects;
    if (runtimeRef.current) {
      renderSavedObjects(runtimeRef.current, objects);
    }
  }, [objects]);

  useEffect(() => {
    buildModeRef.current = buildMode;
  }, [buildMode]);

  useEffect(() => {
    buildTypeRef.current = buildType;
  }, [buildType]);

  const loadSnapshot = useCallback((snapshot: RoomSnapshot) => {
    setRoom(snapshot);
    setObjects(snapshot.objects);
    setPlayers(snapshot.players);
    setMessages(snapshot.messages);
  }, []);

  const broadcastSnapshot = useCallback((snapshot: RoomSnapshot) => {
    channelRef.current?.postMessage({ type: "snapshot", snapshot });
  }, []);

  const persistLocalSnapshot = useCallback(
    (snapshot: RoomSnapshot) => {
      writeLocalSnapshot(snapshot);
      loadSnapshot(snapshot);
      broadcastSnapshot(snapshot);
    },
    [broadcastSnapshot, loadSnapshot]
  );

  const refreshRoom = useCallback(async () => {
    const activeSession = sessionRef.current;
    if (!activeSession) {
      return;
    }

    if (!activeSession.api) {
      loadSnapshot(readLocalSnapshot(activeSession));
      return;
    }

    const response = await fetch(
      `/api/rooms/${activeSession.roomId}?password=${activeSession.password}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      setStatus("房間同步暫時中斷");
      return;
    }
    const data = (await response.json()) as { room: RoomSnapshot };
    loadSnapshot(data.room);
  }, [loadSnapshot]);

  const persistObjects = useCallback(
    async (nextObjects: SavedRoomObject[]) => {
      const activeSession = sessionRef.current;
      const activeRoom = roomRef.current;
      if (!activeSession || !activeRoom) {
        return;
      }

      const nextSnapshot = {
        ...activeRoom,
        objects: nextObjects,
        updatedAt: new Date().toISOString(),
      };
      loadSnapshot(nextSnapshot);

      if (!activeSession.api) {
        persistLocalSnapshot(nextSnapshot);
        return;
      }

      const response = await fetch(`/api/rooms/${activeSession.roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: activeSession.password,
          objects: nextObjects,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { room: RoomSnapshot };
        loadSnapshot(data.room);
      } else {
        setStatus("作品已保留在畫面中，遠端保存稍後重試");
      }
    },
    [loadSnapshot, persistLocalSnapshot]
  );

  useEffect(() => {
    placeObjectRef.current = (x: number, z: number) => {
      const activeSession = sessionRef.current;
      if (!activeSession) {
        return;
      }
      const next: SavedRoomObject = {
        id: crypto.randomUUID(),
        type: buildTypeRef.current,
        x: Number(x.toFixed(2)),
        z: Number(z.toFixed(2)),
        rotation: Number((Math.random() * Math.PI * 2).toFixed(2)),
        owner: activeSession.playerName,
        createdAt: new Date().toISOString(),
      };
      void persistObjects([...objectsRef.current, next]);
    };
  }, [persistObjects]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let disposed = false;

    async function boot() {
      const THREE_MODULE = await import("three");
      const { OrbitControls: OrbitControlsCtor } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );

      if (disposed || !canvasRef.current) {
        return;
      }

      const THREE_REF = THREE_MODULE;
      const scene = new THREE_REF.Scene();
      scene.background = new THREE_REF.Color("#080a10");
      scene.fog = new THREE_REF.Fog("#080a10", 18, 58);

      const renderer = new THREE_REF.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE_REF.SRGBColorSpace;

      const camera = new THREE_REF.PerspectiveCamera(48, 1, 0.1, 120);
      camera.position.set(12, 10, 15);

      const controls = new OrbitControlsCtor(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.maxPolarAngle = Math.PI * 0.46;
      controls.minDistance = 8;
      controls.maxDistance = 30;
      controls.target.set(0, 0.6, 0);

      const ambient = new THREE_REF.HemisphereLight("#dbeafe", "#0f172a", 1.8);
      scene.add(ambient);
      const keyLight = new THREE_REF.DirectionalLight("#ffffff", 2.2);
      keyLight.position.set(9, 14, 5);
      scene.add(keyLight);
      const magentaLight = new THREE_REF.PointLight("#fb7185", 18, 30);
      magentaLight.position.set(-8, 4, 8);
      scene.add(magentaLight);
      const greenLight = new THREE_REF.PointLight("#bef264", 14, 28);
      greenLight.position.set(8, 4, -8);
      scene.add(greenLight);

      const ground = makeGround(THREE_REF);
      scene.add(ground);
      scene.add(makeStarField(THREE_REF));
      scene.add(makeConstellation(THREE_REF));
      scene.add(makeCenterPortal(THREE_REF));

      const npcRoot = new THREE_REF.Group();
      scene.add(npcRoot);
      archetypes.forEach((archetype, index) => {
        const npc = makeNpc(THREE_REF, archetype, index);
        npcRoot.add(npc);
      });

      const objectRoot = new THREE_REF.Group();
      scene.add(objectRoot);
      const peerRoot = new THREE_REF.Group();
      scene.add(peerRoot);
      const player = makePlayer(THREE_REF, "#ffffff", "YOU");
      scene.add(player);

      const runtime: Runtime = {
        THREE: THREE_REF,
        renderer,
        scene,
        camera,
        controls,
        raycaster: new THREE_REF.Raycaster(),
        mouse: new THREE_REF.Vector2(),
        ground,
        objectRoot,
        peerRoot,
        npcRoot,
        player,
        target: new THREE_REF.Vector3(0, 0, 0),
        downPoint: { x: 0, y: 0 },
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
        runtime.downPoint = { x: event.clientX, y: event.clientY };
      };

      const handlePointerUp = (event: PointerEvent) => {
        const moved =
          Math.abs(event.clientX - runtime.downPoint.x) +
          Math.abs(event.clientY - runtime.downPoint.y);
        if (moved > 9) {
          return;
        }

        const rect = renderer.domElement.getBoundingClientRect();
        runtime.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        runtime.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        runtime.raycaster.setFromCamera(runtime.mouse, camera);

        const intersections = runtime.raycaster.intersectObjects(
          [npcRoot, ground],
          true
        );

        const npcHit = intersections.find((hit) => findNpcId(hit.object));
        if (npcHit) {
          const npcId = findNpcId(npcHit.object);
          if (npcId) {
            setSelectedNpcId(npcId as ArchetypeId);
          }
          return;
        }

        const groundHit = intersections.find((hit) => hit.object === ground);
        if (!groundHit) {
          return;
        }

        if (buildModeRef.current) {
          placeObjectRef.current(groundHit.point.x, groundHit.point.z);
          return;
        }

        runtime.target.set(groundHit.point.x, 0, groundHit.point.z);
      };

      canvas.addEventListener("pointerdown", handlePointerDown);
      canvas.addEventListener("pointerup", handlePointerUp);

      const resize = () => runtime.resize();
      window.addEventListener("resize", resize);
      runtime.resize();
      renderSavedObjects(runtime, objectsRef.current);

      const animate = () => {
        const elapsed = performance.now() * 0.001;
        npcRoot.children.forEach((group, index) => {
          group.position.y = Math.sin(elapsed * 1.4 + index) * 0.16;
          group.rotation.y += 0.003;
        });

        const delta = new THREE_REF.Vector3().subVectors(runtime.target, player.position);
        if (delta.length() > 0.05) {
          player.position.add(delta.multiplyScalar(0.045));
          player.lookAt(runtime.target.x, 0.8, runtime.target.z);
        }

        const ring = scene.getObjectByName("center-ring");
        if (ring) {
          ring.rotation.z += 0.0035;
          ring.rotation.y += 0.002;
        }

        controls.update();
        renderer.render(scene, camera);
        runtime.animationId = window.requestAnimationFrame(animate);
      };

      runtime.dispose = () => {
        window.cancelAnimationFrame(runtime.animationId);
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("pointerup", handlePointerUp);
        controls.dispose();
        renderer.dispose();
      };

      runtimeRef.current = runtime;
      animate();
    }

    void boot();

    return () => {
      disposed = true;
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (runtimeRef.current) {
      renderPeers(runtimeRef.current, players, session?.playerName ?? "");
    }
  }, [players, session?.playerName]);

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    channelRef.current?.close();
    if (!session.api && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(`aquarius-room-${session.roomId}`);
      channel.onmessage = (event: MessageEvent<{ type: string; snapshot: RoomSnapshot }>) => {
        if (event.data?.type === "snapshot") {
          loadSnapshot(event.data.snapshot);
        }
      };
      channelRef.current = channel;
    }

    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [loadSnapshot, session]);

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void refreshRoom();
    }, 3500);

    return () => window.clearInterval(interval);
  }, [refreshRoom, session]);

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    const report = async () => {
      const runtime = runtimeRef.current;
      const currentSession = sessionRef.current;
      if (!runtime || !currentSession) {
        return;
      }

      const positionX = Number(runtime.player.position.x.toFixed(2));
      const positionZ = Number(runtime.player.position.z.toFixed(2));

      if (!currentSession.api) {
        const snapshot = readLocalSnapshot(currentSession);
        const nextPlayers = [
          ...snapshot.players.filter((item) => item.playerName !== currentSession.playerName),
          {
            id: currentSession.playerName,
            playerName: currentSession.playerName,
            avatarColor: colorForName(currentSession.playerName),
            positionX,
            positionZ,
            lastSeenAt: new Date().toISOString(),
          },
        ];
        persistLocalSnapshot({ ...snapshot, players: nextPlayers });
        return;
      }

      await fetch(`/api/rooms/${currentSession.roomId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: currentSession.password,
          playerName: currentSession.playerName,
          color: colorForName(currentSession.playerName),
          positionX,
          positionZ,
        }),
      });
    };

    const interval = window.setInterval(() => {
      void report();
    }, 5000);
    void report();

    return () => window.clearInterval(interval);
  }, [persistLocalSnapshot, session]);

  const enterRoom = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const cleanPlayerName = playerName.trim().slice(0, 28);
      const cleanPassword = cleanDigits(password);
      const cleanCode = cleanDigits(roomCode);

      if (!cleanPlayerName || cleanPassword.length !== 4 || (mode === "join" && cleanCode.length !== 4)) {
        setStatus("請確認名字、房號與四位數密碼");
        return;
      }

      setLoading(true);
      setStatus("");

      try {
        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            roomName,
            code: cleanCode,
            password: cleanPassword,
            playerName: cleanPlayerName,
          }),
        });

        if (!response.ok) {
          throw new Error("api unavailable");
        }

        const data = (await response.json()) as {
          room: RoomSnapshot;
          playerName: string;
        };
        const nextSession: Session = {
          roomId: data.room.id,
          roomName: data.room.name,
          code: data.room.code,
          password: cleanPassword,
          playerName: data.playerName,
          api: true,
        };
        setSession(nextSession);
        loadSnapshot(data.room);
        setStatus("已進入協作房間");
      } catch {
        const fallbackCode = mode === "create" ? randomCode() : cleanCode;
        const nextSession: Session = {
          roomId: `local-${fallbackCode}-${cleanPassword}`,
          roomName: mode === "create" ? roomName.trim() || "Aquarius Commons" : "Aquarius Commons",
          code: fallbackCode,
          password: cleanPassword,
          playerName: cleanPlayerName,
          api: false,
        };
        setSession(nextSession);
        loadSnapshot(readLocalSnapshot(nextSession));
        setStatus("目前使用本機協作模式");
      } finally {
        setLoading(false);
      }
    },
    [loadSnapshot, mode, password, playerName, roomCode, roomName]
  );

  const sendMessage = useCallback(async () => {
    const activeSession = sessionRef.current;
    const activeRoom = roomRef.current;
    const body = chatInput.trim().slice(0, 240);
    if (!activeSession || !activeRoom || !body) {
      return;
    }
    setChatInput("");

    if (!activeSession.api) {
      const snapshot = readLocalSnapshot(activeSession);
      const nextSnapshot = {
        ...snapshot,
        messages: [
          ...snapshot.messages,
          {
            id: crypto.randomUUID(),
            author: activeSession.playerName,
            body,
            kind: "chat",
            createdAt: new Date().toISOString(),
          },
        ].slice(-60),
      };
      persistLocalSnapshot(nextSnapshot);
      return;
    }

    const response = await fetch(`/api/rooms/${activeSession.roomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: activeSession.password,
        author: activeSession.playerName,
        body,
      }),
    });

    if (response.ok) {
      await refreshRoom();
    }
  }, [chatInput, persistLocalSnapshot, refreshRoom]);

  const sendNpcMessage = useCallback(async () => {
    const activeSession = sessionRef.current;
    const body = npcInput.trim().slice(0, 600);
    if (!activeSession || !body || aiBusy) {
      return;
    }

    setNpcInput("");
    const previous = npcChats[selectedNpc.id] ?? [];
    const withUser: ChatLine[] = [...previous, { role: "user", content: body }];
    setNpcChats((current) => ({ ...current, [selectedNpc.id]: withUser }));
    setAiBusy(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archetypeId: selectedNpc.id,
          archetypeName: selectedNpc.title,
          playerName: activeSession.playerName,
          message: body,
          history: previous,
        }),
      });
      const data = (await response.json()) as {
        reply?: string;
        mode?: "ai" | "scripted";
      };
      setNpcChats((current) => ({
        ...current,
        [selectedNpc.id]: [
          ...(current[selectedNpc.id] ?? withUser),
          {
            role: "assistant",
            content: data.reply || "訊號暫時微弱，但我還在。",
            mode: data.mode,
          },
        ].slice(-10),
      }));
    } finally {
      setAiBusy(false);
    }
  }, [aiBusy, npcChats, npcInput, selectedNpc]);

  const clearRoomObjects = useCallback(() => {
    void persistObjects([]);
  }, [persistObjects]);

  const removeLastObject = useCallback(() => {
    void persistObjects(objectsRef.current.slice(0, -1));
  }, [persistObjects]);

  const npcChat = npcChats[selectedNpc.id] ?? [
    {
      role: "assistant",
      content: selectedNpc.quote,
      mode: "scripted",
    },
  ];

  return (
    <main className="game-shell">
      <section className="scene-stage" aria-label="Aquarius 3D game space">
        <canvas ref={canvasRef} className="game-canvas" />
      </section>

      {!session ? (
        <section className="entry-panel" aria-label="進入房間">
          <div className="entry-title">
            <p className="kicker">Aquarius Commons</p>
            <h1>水瓶座共創星域</h1>
          </div>

          <form className="entry-form" onSubmit={enterRoom}>
            <div className="mode-switch" role="tablist" aria-label="房間模式">
              <button
                type="button"
                className={mode === "create" ? "is-active" : ""}
                onClick={() => setMode("create")}
              >
                創建房間
              </button>
              <button
                type="button"
                className={mode === "join" ? "is-active" : ""}
                onClick={() => setMode("join")}
              >
                加入房間
              </button>
            </div>

            <label>
              <span>玩家名稱</span>
              <input
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                maxLength={28}
                placeholder="輸入你的名字"
              />
            </label>

            {mode === "create" ? (
              <label>
                <span>房間名稱</span>
                <input
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  maxLength={36}
                  placeholder="Aquarius Commons"
                />
              </label>
            ) : (
              <label>
                <span>房間代碼</span>
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(cleanDigits(event.target.value))}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                />
              </label>
            )}

            <label>
              <span>四位數密碼</span>
              <input
                value={password}
                onChange={(event) => setPassword(cleanDigits(event.target.value))}
                inputMode="numeric"
                maxLength={4}
                placeholder="1234"
              />
            </label>

            <button className="primary-action" type="submit" disabled={loading}>
              {loading ? "連線中" : mode === "create" ? "創建並進入" : "加入星域"}
            </button>
          </form>

          {status ? <p className="entry-status">{status}</p> : null}
        </section>
      ) : (
        <>
          <aside className="room-panel panel" aria-label="房間狀態">
            <div>
              <p className="kicker">ROOM {session.code}</p>
              <h2>{room?.name ?? session.roomName}</h2>
            </div>
            <div className="status-row">
              <span>{session.api ? "遠端保存" : "本機模式"}</span>
              <span>{objects.length} 件作品</span>
            </div>
            <div className="player-list">
              {players.slice(0, 6).map((player) => (
                <div className="player-pill" key={`${player.playerName}-${player.id}`}>
                  <span style={{ background: player.avatarColor }} />
                  {player.playerName}
                </div>
              ))}
            </div>
          </aside>

          <aside className="build-panel panel" aria-label="建造工具">
            <div className="toolbar-title">
              <p className="kicker">BUILD</p>
              <button
                className={buildMode ? "toggle is-active" : "toggle"}
                type="button"
                onClick={() => setBuildMode((value) => !value)}
              >
                {buildMode ? "建造中" : "探索中"}
              </button>
            </div>

            <div className="object-grid" aria-label="物件選擇">
              {objectCatalog.map((item) => (
                <button
                  key={item.type}
                  className={item.type === buildType ? "object-button is-active" : "object-button"}
                  style={{ "--swatch": item.color } as React.CSSProperties}
                  type="button"
                  onClick={() => setBuildType(item.type)}
                  title={item.label}
                >
                  <span>{item.short}</span>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="build-actions">
              <button type="button" onClick={removeLastObject}>
                復原
              </button>
              <button type="button" onClick={clearRoomObjects}>
                清空
              </button>
            </div>
            <p className="selected-object">{selectedObject.label}</p>
          </aside>

          <aside className="npc-panel panel" aria-label="水瓶座角色">
            <div className="npc-heading">
              <div>
                <p className="kicker">{selectedNpc.en}</p>
                <h2>{selectedNpc.title}</h2>
              </div>
              {selectedNpc.rare ? <span className="rare-tag">稀有</span> : null}
            </div>
            <blockquote>{selectedNpc.quote}</blockquote>
            <p className="npc-keywords">{selectedNpc.keywords}</p>
            <p className="npc-persona">{selectedNpc.persona}</p>

            <div className="npc-tabs" aria-label="角色列表">
              {archetypes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === selectedNpc.id ? "is-active" : ""}
                  onClick={() => setSelectedNpcId(item.id)}
                  title={item.en}
                >
                  {item.title}
                </button>
              ))}
            </div>

            <div className="npc-chat" aria-live="polite">
              {npcChat.map((line, index) => (
                <div className={`npc-line ${line.role}`} key={`${line.role}-${index}`}>
                  <span>{line.role === "assistant" ? selectedNpc.title : session.playerName}</span>
                  <p>{line.content}</p>
                </div>
              ))}
            </div>

            <div className="input-row">
              <input
                value={npcInput}
                onChange={(event) => setNpcInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void sendNpcMessage();
                  }
                }}
                placeholder={`和${selectedNpc.title}對話`}
              />
              <button type="button" disabled={aiBusy} onClick={() => void sendNpcMessage()}>
                送出
              </button>
            </div>
          </aside>

          <aside className="chat-panel panel" aria-label="房間留言">
            <div className="toolbar-title">
              <p className="kicker">CHAT</p>
              <span>{messages.length}</span>
            </div>
            <div className="message-list" aria-live="polite">
              {messages.slice(-8).map((message) => (
                <div className={message.kind === "system" ? "message system" : "message"} key={message.id}>
                  <span>
                    {message.author} {formatClock(message.createdAt)}
                  </span>
                  <p>{message.body}</p>
                </div>
              ))}
            </div>
            <div className="input-row">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void sendMessage();
                  }
                }}
                placeholder="留下訊息"
              />
              <button type="button" onClick={() => void sendMessage()}>
                發送
              </button>
            </div>
          </aside>
        </>
      )}
    </main>
  );
}

function makeGround(THREE_REF: typeof THREE) {
  const geometry = new THREE_REF.CircleGeometry(22, 96);
  const material = new THREE_REF.MeshStandardMaterial({
    color: "#111827",
    roughness: 0.72,
    metalness: 0.1,
  });
  const ground = new THREE_REF.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.name = "ground";

  const grid = new THREE_REF.GridHelper(40, 40, "#1f7a85", "#1f2937");
  grid.position.y = 0.012;
  ground.add(grid);
  return ground;
}

function makeStarField(THREE_REF: typeof THREE) {
  const positions: number[] = [];
  const colors: number[] = [];
  const colorSet = ["#7dd3fc", "#f9a8d4", "#bef264", "#facc15", "#dbeafe"];
  for (let index = 0; index < 520; index += 1) {
    const radius = 32 + Math.random() * 28;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi) + 8,
      radius * Math.sin(phi) * Math.sin(theta)
    );
    const color = new THREE_REF.Color(colorSet[index % colorSet.length]);
    colors.push(color.r, color.g, color.b);
  }

  const geometry = new THREE_REF.BufferGeometry();
  geometry.setAttribute("position", new THREE_REF.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE_REF.Float32BufferAttribute(colors, 3));
  const material = new THREE_REF.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.82,
  });
  return new THREE_REF.Points(geometry, material);
}

function makeConstellation(THREE_REF: typeof THREE) {
  const group = new THREE_REF.Group();
  const material = new THREE_REF.LineBasicMaterial({
    color: "#5eead4",
    transparent: true,
    opacity: 0.36,
  });
  const points = [
    [-12, 0.08, -2],
    [-8, 0.08, 5],
    [-4, 0.08, 1],
    [0, 0.08, 7],
    [4, 0.08, 0],
    [9, 0.08, 6],
    [13, 0.08, -3],
  ];
  const positions: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    positions.push(...points[index], ...points[index + 1]);
  }
  const geometry = new THREE_REF.BufferGeometry();
  geometry.setAttribute("position", new THREE_REF.Float32BufferAttribute(positions, 3));
  group.add(new THREE_REF.LineSegments(geometry, material));

  points.forEach(([x, y, z]) => {
    const node = new THREE_REF.Mesh(
      new THREE_REF.SphereGeometry(0.12, 16, 16),
      new THREE_REF.MeshStandardMaterial({
        color: "#dbeafe",
        emissive: "#5eead4",
        emissiveIntensity: 1.4,
      })
    );
    node.position.set(x, y, z);
    group.add(node);
  });
  return group;
}

function makeCenterPortal(THREE_REF: typeof THREE) {
  const group = new THREE_REF.Group();
  const ring = new THREE_REF.Mesh(
    new THREE_REF.TorusGeometry(2.6, 0.035, 8, 160),
    new THREE_REF.MeshStandardMaterial({
      color: "#7dd3fc",
      emissive: "#0ea5e9",
      emissiveIntensity: 1.2,
      metalness: 0.4,
    })
  );
  ring.name = "center-ring";
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.14;
  group.add(ring);

  const core = new THREE_REF.Mesh(
    new THREE_REF.IcosahedronGeometry(0.8, 1),
    new THREE_REF.MeshStandardMaterial({
      color: "#f8fafc",
      emissive: "#7dd3fc",
      emissiveIntensity: 0.75,
      roughness: 0.24,
    })
  );
  core.position.y = 1.15;
  group.add(core);
  return group;
}

function makeNpc(
  THREE_REF: typeof THREE,
  archetype: (typeof archetypes)[number],
  index: number
) {
  const angle = (index / archetypes.length) * Math.PI * 2 - Math.PI / 2;
  const radius = archetype.rare ? 14.8 : 10.8;
  const group = new THREE_REF.Group();
  group.position.set(Math.cos(angle) * radius, 0.65, Math.sin(angle) * radius);
  group.userData.npcId = archetype.id;

  const base = new THREE_REF.Mesh(
    new THREE_REF.CylinderGeometry(0.72, 0.94, 0.18, 6),
    new THREE_REF.MeshStandardMaterial({
      color: "#111827",
      metalness: 0.35,
      roughness: 0.42,
    })
  );
  base.position.y = -0.48;
  base.userData.npcId = archetype.id;
  group.add(base);

  const body = new THREE_REF.Mesh(
    archetype.id === "futurist"
      ? new THREE_REF.OctahedronGeometry(0.6, 0)
      : new THREE_REF.CapsuleGeometry(0.36, 0.78, 5, 12),
    new THREE_REF.MeshStandardMaterial({
      color: archetype.color,
      emissive: archetype.color,
      emissiveIntensity: archetype.rare ? 0.55 : 0.28,
      metalness: 0.25,
      roughness: 0.36,
    })
  );
  body.position.y = 0.15;
  body.userData.npcId = archetype.id;
  group.add(body);

  const halo = new THREE_REF.Mesh(
    new THREE_REF.TorusGeometry(0.76, 0.018, 6, 64),
    new THREE_REF.MeshBasicMaterial({
      color: archetype.accent,
      transparent: true,
      opacity: 0.62,
    })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.82;
  halo.userData.npcId = archetype.id;
  group.add(halo);

  const label = makeLabel(THREE_REF, archetype.title, archetype.color);
  label.position.set(0, 1.45, 0);
  label.userData.npcId = archetype.id;
  group.add(label);

  group.traverse((child) => {
    child.userData.npcId = archetype.id;
  });
  return group;
}

function makeLabel(THREE_REF: typeof THREE, text: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(7, 10, 18, 0.72)";
    context.fillRect(0, 34, canvas.width, 92);
    context.strokeStyle = color;
    context.lineWidth = 4;
    context.strokeRect(8, 42, canvas.width - 16, 76);
    context.fillStyle = "#f8fafc";
    context.font = "600 42px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE_REF.CanvasTexture(canvas);
  const material = new THREE_REF.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE_REF.Sprite(material);
  sprite.scale.set(2.6, 0.82, 1);
  return sprite;
}

function makePlayer(THREE_REF: typeof THREE, color: string, label: string) {
  const group = new THREE_REF.Group();
  const body = new THREE_REF.Mesh(
    new THREE_REF.CapsuleGeometry(0.24, 0.58, 5, 12),
    new THREE_REF.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.35,
      roughness: 0.32,
    })
  );
  body.position.y = 0.52;
  group.add(body);
  const ring = new THREE_REF.Mesh(
    new THREE_REF.TorusGeometry(0.52, 0.018, 6, 48),
    new THREE_REF.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  group.add(ring);
  const name = makeLabel(THREE_REF, label, color);
  name.position.y = 1.36;
  name.scale.set(1.45, 0.45, 1);
  group.add(name);
  return group;
}

function makeObjectMesh(
  THREE_REF: typeof THREE,
  item: SavedRoomObject,
  color: string
) {
  const group = new THREE_REF.Group();
  const material = new THREE_REF.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.18,
    roughness: 0.38,
    metalness: 0.18,
  });

  if (item.type === "crystal") {
    const mesh = new THREE_REF.Mesh(new THREE_REF.OctahedronGeometry(0.46, 0), material);
    mesh.position.y = 0.62;
    group.add(mesh);
  } else if (item.type === "beacon") {
    const pole = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.12, 0.18, 1.45, 10), material);
    pole.position.y = 0.82;
    group.add(pole);
    const top = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.48, 0.035, 8, 42), material);
    top.position.y = 1.58;
    top.rotation.x = Math.PI / 2;
    group.add(top);
  } else if (item.type === "lounge") {
    const seat = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.2, 0.28, 0.82), material);
    seat.position.y = 0.38;
    group.add(seat);
    const back = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.2, 0.68, 0.18), material);
    back.position.set(0, 0.74, -0.42);
    group.add(back);
  } else if (item.type === "water") {
    const pool = new THREE_REF.Mesh(
      new THREE_REF.TorusGeometry(0.66, 0.06, 8, 64),
      new THREE_REF.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.42,
        transparent: true,
        opacity: 0.86,
      })
    );
    pool.rotation.x = Math.PI / 2;
    pool.position.y = 0.1;
    group.add(pool);
    const drop = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.22, 24, 24), material);
    drop.position.y = 0.68;
    group.add(drop);
  } else {
    const wall = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.5, 1.1, 0.12), material);
    wall.position.y = 0.72;
    group.add(wall);
    const slash = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(1.36, 0.08, 0.16),
      new THREE_REF.MeshBasicMaterial({ color: "#111827" })
    );
    slash.position.y = 0.73;
    slash.rotation.z = -0.58;
    group.add(slash);
  }

  group.position.set(item.x, 0, item.z);
  group.rotation.y = item.rotation;
  return group;
}

function renderSavedObjects(runtime: Runtime, items: SavedRoomObject[]) {
  const { THREE: THREE_REF, objectRoot } = runtime;
  objectRoot.clear();
  items.forEach((item) => {
    const catalog = objectCatalog.find((entry) => entry.type === item.type) ?? objectCatalog[0];
    objectRoot.add(makeObjectMesh(THREE_REF, item, catalog.color));
  });
}

function renderPeers(runtime: Runtime, players: RoomPlayer[], currentPlayer: string) {
  const { THREE: THREE_REF, peerRoot } = runtime;
  peerRoot.clear();
  players
    .filter((player) => player.playerName !== currentPlayer)
    .slice(0, 12)
    .forEach((player) => {
      const marker = makePlayer(THREE_REF, player.avatarColor, player.playerName.slice(0, 10));
      marker.position.set(player.positionX, 0, player.positionZ);
      peerRoot.add(marker);
    });
}

function findNpcId(object: THREE.Object3D): string | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (typeof current.userData.npcId === "string") {
      return current.userData.npcId;
    }
    current = current.parent;
  }
  return null;
}
