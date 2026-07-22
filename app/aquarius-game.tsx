"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  AQUARIUS_CASCADE_INSTALLATION_ID,
  ACTIVE_CITY_MODEL_ASSETS as CITY_MODEL_ASSETS,
  CITY_BRIDGES,
  CITY_BUILDINGS,
  CITY_CANALS,
  CITY_PLATFORMS,
  CITY_PROPS,
  CITY_ROADS,
  type CityBuildingSpec,
  type CityBridgeSpec,
  type CityCanalSpec,
  type CityModelAssetSpec,
  type CityPlatformSpec,
  type CityPropSpec,
  type CityRoadSpec,
} from "./city/city-layout";
import {
  AQUARIUS_OBJECTS,
  CHARACTER_ASSETS,
  DIALOGUE_QUESTIONS,
  HUMANS,
  NPCS,
  PLAYER_AVATARS,
  PLAYER_MODEL,
  WORLD_CONFIG,
  WORLD_REGIONS,
  type ArchetypeId,
  type AquariusObjectData,
  type AquariusObjectId,
  type HumanData,
  type HumanId,
  type NpcData,
  type PlayerAvatarData,
  type PlayerAvatarId,
} from "./game-data";

type Phase = "loading" | "intro" | "playing";
type IntroStep = "landing" | "story" | "setup";
type TutorialStage = "move" | "look" | "interact" | "done";
type Quality = "low" | "medium" | "high";
type GameState = "start" | "playing" | "win" | "lose";
type WeirdoId =
  | "weirdo_1"
  | "weirdo_2"
  | "weirdo_3"
  | "weirdo_4"
  | "weirdo_5"
  | "weirdo_6"
  | "weirdo_7"
  | "weirdo_8";
type WeirdoBehavior =
  | "airball"
  | "jumping-jack"
  | "floor-crawl"
  | "butt-walk"
  | "ballet-spin"
  | "handstand-walk"
  | "tree-climber"
  | "umbrella-receiver";

type DialogueState = {
  npcId: ArchetypeId;
  lineIndex: number;
  answer?: string;
};

type HumanDialogueState = {
  humanId: HumanId;
  lineIndex: number;
};

type WeirdoDialogueState = {
  weirdoId: WeirdoId;
  lineIndex: number;
  justFound: boolean;
};

type CollectionPopupState = {
  weirdoId: WeirdoId;
  count: number;
};

type ArtifactState = {
  objectId: AquariusObjectId;
};

type InteractionTarget =
  | { kind: "npc"; id: ArchetypeId; distance: number }
  | { kind: "human"; id: HumanId; distance: number }
  | { kind: "object"; id: AquariusObjectId; distance: number }
  | { kind: "weirdo"; id: WeirdoId; distance: number };

type WeirdoData = {
  id: WeirdoId;
  title: string;
  english: string;
  action: string;
  model: string;
  animationAssets?: string[];
  specialAnimation: WeirdoSpecialAnimation;
  behavior: WeirdoBehavior;
  position: [number, number, number];
  facing: number;
  accent: string;
  clue: string;
  quote: string;
  foundLine: string;
  profile: string;
  weirdness: string;
};

type WeirdoSpecialAnimation =
  | "air_shot"
  | "jumping_jack"
  | "floor_crawl"
  | "butt_walk"
  | "gravity_spin"
  | "handstand_walk"
  | "tree_hug_climb"
  | "umbrella_receiver";

type WeirdoNodeName =
  | "RootBody"
  | "Head"
  | "Arm_L"
  | "Arm_R"
  | "Leg_L"
  | "Leg_R"
  | "Shoe_L"
  | "Shoe_R"
  | "Basketball"
  | "BallSeamA"
  | "UmbrellaHandle"
  | "UmbrellaCanopy"
  | "SignalRing"
  | "ReceiverPack";

type WeirdoNodeState = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
};

type WeirdoNodeMap = Partial<Record<WeirdoNodeName, THREE.Object3D>>;

type FoodId = "apple" | "pizza" | "donut" | "burger" | "sushi";

type FoodData = {
  id: FoodId;
  title: string;
  asset: string;
  position: [number, number, number];
  scale: number;
  accent: string;
};

type ModelResource = {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
};

type CloneModelFn = (model: THREE.Object3D) => THREE.Object3D;

type ActorActionName =
  | "idle"
  | "walk"
  | "run"
  | "jump"
  | "intro"
  | "talk"
  | "wave"
  | "dance"
  | "fix"
  | "interact"
  | "agree"
  | "cheer"
  | "spinJump"
  | "backflipExtra"
  | "backflip"
  | "vault"
  | "kick";

type ActorAnimator = {
  mixer: THREE.AnimationMixer;
  actions: Partial<Record<ActorActionName, THREE.AnimationAction>>;
  current: ActorActionName | null;
  idleCycle?: ActorActionName[];
  idleCycleIndex?: number;
  nextIdleActionAt?: number;
  lockedUntil?: number;
};

const AUTHOR_MESHY_ANIMATION_ASSETS = {
  intro: "/assets/characters/author/author-dive-land.glb",
  agree: "/assets/characters/author/author-agree.glb",
  dance: "/assets/characters/author/author-dance.glb",
  cheer: "/assets/characters/author/author-cheer.glb",
  spinJump: "/assets/characters/author/author-spin-jump.glb",
  backflipExtra: "/assets/characters/author/author-backflip-extra.glb",
  backflip: "/assets/characters/author/author-backflip.glb",
  vault: "/assets/characters/author/author-vault.glb",
  kick: "/assets/characters/author/author-kick.glb",
  walk: "/assets/characters/author/author-walk.glb",
  run: "/assets/characters/author/author-run.glb",
  runFast: "/assets/characters/author/author-run-fast.glb",
  jump: "/assets/characters/author/author-jump.glb",
  jumpArms: "/assets/characters/author/author-jump-arms.glb",
  jumpOver: "/assets/characters/author/author-jump-over.glb",
} as const;

const AUTHOR_MESHY_ANIMATION_ASSET_LIST = Object.values(AUTHOR_MESHY_ANIMATION_ASSETS);
const AUTHOR_IDLE_ACTIONS: ActorActionName[] = [
  "agree",
  "cheer",
  "dance",
  "kick",
  "backflipExtra",
];
const AUTHOR_IDLE_ACTION_INTERVAL_MS = 3000;
const AUTHOR_MESHY_RUNTIME_SCALE = 0.011;
const AUTHOR_MESHY_PREVIEW_SCALE = 0.0088;

type WanderState = {
  home: THREE.Vector3;
  target: THREE.Vector3;
  radius: number;
  speed: number;
  pauseUntil: number;
  nextGestureAt: number;
  idleAction: ActorActionName;
};

type AmbientModel = {
  group: THREE.Group;
  home: THREE.Vector3;
  target: THREE.Vector3;
  mode: "idle" | "wander" | "float" | "spin";
  radius: number;
  speed: number;
  pauseUntil: number;
  animator?: ActorAnimator;
  motionAction: ActorActionName;
};

type FloatingPickupText = {
  sprite: THREE.Sprite;
  base: THREE.Vector3;
  bornAt: number;
  duration: number;
};

type JumpPlatform = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
};

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
  humanRoot: THREE.Group;
  objectRoot: THREE.Group;
  foodRoot: THREE.Group;
  player: THREE.Group;
  playerModel: THREE.Group;
  playerLabel: THREE.Sprite;
  playerAnimator: ActorAnimator | null;
  loadedModels: Map<string, ModelResource>;
  cloneAnimatedModel: CloneModelFn;
  animationLibrary: THREE.AnimationClip[];
  stars: THREE.Points;
  particles: THREE.Points;
  skyWorlds: THREE.Group;
  hemiLight: THREE.HemisphereLight;
  sunLight: THREE.DirectionalLight;
  velocity: THREE.Vector3;
  jumpVelocity: number;
  grounded: boolean;
  clickTarget: THREE.Vector3 | null;
  pendingNpcId: ArchetypeId | null;
  pendingHumanId: HumanId | null;
  pendingObjectId: AquariusObjectId | null;
  pendingWeirdoId: WeirdoId | null;
  keys: Set<string>;
  joystick: { x: number; y: number };
  pointerDown: { x: number; y: number };
  draggedCamera: boolean;
  npcGroups: Map<ArchetypeId, THREE.Group>;
  npcLabels: Map<ArchetypeId, THREE.Sprite>;
  npcPositions: Map<ArchetypeId, THREE.Vector3>;
  npcAnimators: Map<ArchetypeId, ActorAnimator>;
  npcMotion: Map<ArchetypeId, WanderState>;
  humanGroups: Map<HumanId, THREE.Group>;
  humanLabels: Map<HumanId, THREE.Sprite>;
  humanPrompts: Map<HumanId, THREE.Sprite>;
  humanPositions: Map<HumanId, THREE.Vector3>;
  humanAnimators: Map<HumanId, ActorAnimator>;
  humanMotion: Map<HumanId, WanderState>;
  objectGroups: Map<AquariusObjectId, THREE.Group>;
  objectLabels: Map<AquariusObjectId, THREE.Sprite>;
  objectPrompts: Map<AquariusObjectId, THREE.Sprite>;
  objectPositions: Map<AquariusObjectId, THREE.Vector3>;
  foodGroups: Map<FoodId, THREE.Group>;
  foodPositions: Map<FoodId, THREE.Vector3>;
  floatingPickupTexts: FloatingPickupText[];
  weirdoRoot: THREE.Group;
  weirdoGroups: Map<WeirdoId, THREE.Group>;
  weirdoLabels: Map<WeirdoId, THREE.Sprite>;
  weirdoPrompts: Map<WeirdoId, THREE.Sprite>;
  weirdoFoundBadges: Map<WeirdoId, THREE.Sprite>;
  weirdoPositions: Map<WeirdoId, THREE.Vector3>;
  npcPrompts: Map<ArchetypeId, THREE.Sprite>;
  actorMixers: THREE.AnimationMixer[];
  ambientModels: AmbientModel[];
  obstacles: Array<{ x: number; z: number; radius: number }>;
  jumpPlatforms: JumpPlatform[];
  cameraReturnToDefault: boolean;
  autoQualitySlowFrames: number;
  lastAutoQualityAt: number;
  inputPausedUntil: number;
  frame: number;
  lastStepAt: number;
  animationId: number;
  resize: () => void;
  dispose: () => void;
};

const INTERACTION_KEYS = new Set(["KeyE"]);
const JUMP_KEYS = new Set(["Space"]);
const RESET_CAMERA_KEYS = new Set(["KeyR"]);
const UNIVERSAL_ANIMATION_LIBRARY = "/assets/animations/UAL1_Standard.glb";
const MODEL_FORWARD_OFFSET = 0;
const CITY_LAYOUT_SCALE = 2.2;
const AQUARIUS_CASCADE_INSTALLATION_TARGET_HEIGHT = 7;
const PLAYER_FLOOR_OFFSET = 0.48;
const PLAYER_AVATAR_RUNTIME_SCALE = 1;
const PLAYER_RUNTIME_TARGET_HEIGHT = 1.68;
const FLOOR_CRAWLER_STATIC_TARGET_MAX_DIMENSION = 0.022;
const FLOOR_CRAWLER_RUNTIME_MAX_DIMENSION = 1.05;
const FLOOR_CRAWLER_RUNTIME_TARGET_DIMENSION = 0.88;
const FLOOR_CRAWLER_GROUND_LIFT = 0.26;
const CUSTOM_EMBEDDED_WEIRDO_TARGET_HEIGHT = PLAYER_RUNTIME_TARGET_HEIGHT;
const CUSTOM_EMBEDDED_WEIRDO_GROUND_Y = 0;
const CUSTOM_EMBEDDED_WEIRDO_MAX_DIMENSION = 3.25;
type EmbeddedWeirdoRuntimeScaleRule = {
  maxDimension: number;
  targetDimension: number;
  targetHeight?: number;
  preciseBox?: boolean;
};
const EMBEDDED_WEIRDO_RUNTIME_SCALE_RULES: Partial<
  Record<WeirdoId, EmbeddedWeirdoRuntimeScaleRule>
> = {
  weirdo_3: {
    maxDimension: FLOOR_CRAWLER_RUNTIME_MAX_DIMENSION,
    targetDimension: FLOOR_CRAWLER_RUNTIME_TARGET_DIMENSION,
  },
  weirdo_5: {
    maxDimension: CUSTOM_EMBEDDED_WEIRDO_MAX_DIMENSION,
    targetDimension: CUSTOM_EMBEDDED_WEIRDO_TARGET_HEIGHT,
    targetHeight: CUSTOM_EMBEDDED_WEIRDO_TARGET_HEIGHT,
    preciseBox: true,
  },
  weirdo_7: {
    maxDimension: CUSTOM_EMBEDDED_WEIRDO_MAX_DIMENSION,
    targetDimension: CUSTOM_EMBEDDED_WEIRDO_TARGET_HEIGHT,
    targetHeight: CUSTOM_EMBEDDED_WEIRDO_TARGET_HEIGHT,
    preciseBox: true,
  },
};
const PLAYER_START = { x: 0, z: 26 };
const DEFAULT_CAMERA_OFFSET = { x: -1.05, y: 2.65, z: -6.75 };
const GAME_DURATION_SECONDS = 180;
const BGM_SRC = "/audio/lith-harbor-above-the-treetops.mp3";
const SCRAMBLE_SFX_SRC = "/audio/noise-scramble.mp3";
const SCRAMBLE_CHARS = "!<>-_/[]{}=+*^?#";
const LANDING_TAGS = [
  "尋找野生水瓶座",
  "迷幻行為",
  "古怪城市",
  "珍愛生命",
  "遠離水瓶",
  "怪人吸引機",
] as const;
const AQUARIUS_ORIGIN_STORY = [
  {
    chapter: "ORIGIN 01",
    title: "脆弱的思維平衡",
    copy:
      "歡迎來到「霓虹浮島」。在這裡，普通人類正與這群古怪的水瓶座居民維持著某種微妙的生態平衡。然而，這個世界秩序極其脆弱——一旦天秤倒向任何一邊，島上的所有人將會面臨被徹底同化、失去自我意識的可能性。",
  },
  {
    chapter: "ORIGIN 02",
    title: "⚠️ 突發！怪異能量警報",
    copy:
      "就在剛剛，中央觀測台偵測到島的四周突然爆發出某種強烈且怪異的能量波！根據數據猜測，極可能是有 8 位「野生水瓶座怪人」集體陷入了腦波暴走。如果不立刻對他們展開觀測，整座島都將面臨不可逆的全面同化危機！",
  },
  {
    chapter: "ORIGIN 03",
    title: "限時潛入觀測任務",
    copy:
      "你的終極任務是立刻潛入這座「霓虹浮島」，在時間倒數結束前，徹底揪出這 8 位走失的怪人。在進城後，請務必密切留意街道上其他 NPC 提供的關鍵線索，並仔細搜尋那些動作怪異、不合常理的野生水瓶怪人。",
  },
  {
    chapter: "ORIGIN 04",
    title: "偽裝成同類，即刻登島",
    copy:
      "為了成功接近他們，你必須裝扮成他們的同類，混入其中去安撫他們過載的情緒，並嘗試理解他們那些匪夷所思的怪異行為。現在，請選一個你的 3D 虛擬化身，進島觀測他們吧！",
  },
] as const;
const JUMP_PLATFORM_SPECS = [
  { x: -4.2, z: 2.8, width: 1.08, depth: 1.08, height: 0.18 },
  { x: -3.5, z: 2.8, width: 1.08, depth: 1.08, height: 0.46 },
  { x: -2.8, z: 2.8, width: 1.2, depth: 1.2, height: 0.78 },
  { x: 2.4, z: 17.2, width: 1.04, depth: 1.04, height: 0.18 },
  { x: 3.1, z: 18, width: 1.06, depth: 1.06, height: 0.48 },
  { x: 3.8, z: 18.8, width: 1.2, depth: 1.2, height: 0.82 },
  { x: 9.2, z: 17.2, width: 1.04, depth: 1.04, height: 0.2 },
  { x: 9.8, z: 17.9, width: 1.08, depth: 1.08, height: 0.52 },
  { x: 10.5, z: 18.6, width: 1.22, depth: 1.22, height: 0.84 },
  { x: -18.6, z: -13.2, width: 1.28, depth: 1.08, height: 0.16 },
  { x: -18.6, z: -12.5, width: 1.28, depth: 1.08, height: 0.36 },
  { x: -18.6, z: -11.8, width: 1.34, depth: 1.14, height: 0.64 },
  { x: -18.2, z: -11.8, width: 2.8, depth: 2.45, height: 1.18 },
  { x: -14.9, z: 7.1, width: 1.08, depth: 1.08, height: 0.22 },
  { x: -14.3, z: 7.8, width: 1.1, depth: 1.1, height: 0.52 },
  { x: -13.8, z: 8.5, width: 1.16, depth: 1.16, height: 0.82 },
  { x: -14.4, z: 8.2, width: 2.8, depth: 2.45, height: 1.42 },
  { x: 11.7, z: 10.3, width: 1.02, depth: 1.02, height: 0.24 },
  { x: 12.2, z: 10.9, width: 1.04, depth: 1.04, height: 0.54 },
  { x: 12.6, z: 11.5, width: 1.12, depth: 1.12, height: 0.94 },
  { x: 12.6, z: 11.8, width: 1.9, depth: 1.65, height: 1.28 },
] as const;
const WEIRDOS: WeirdoData[] = [
  {
    id: "weirdo_1",
    title: "虛空灌籃高手",
    english: "INVISIBLE MVP",
    action: "空氣投籃",
    model: "/assets/weirdos/weirdo_1_invisible_mvp.glb",
    specialAnimation: "air_shot",
    behavior: "airball",
    position: [-18.2, 1.2, -11.8],
    facing: 0.5,
    accent: "#f6d365",
    clue: "「籃球架空地那邊有個小夥子，竟然對著虛空瘋狂交叉運球，還自己配音大喊：『唰！空心三分！』」",
    quote: "「防守！防守啊！看到沒有？剛剛那個後撤步加上三分絕殺，連外星人都在為我起立鼓掌！球進啦！全場為我歡呼！」",
    foundLine: "觀測完成：虛空中的籃網彷彿被他射穿了。他露出了寂寞高手的微笑，留在原地繼續練習無球勝利學。",
    profile: "堅信只要心中有球，全宇宙的馬路都是他的麥迪遜花園廣場。",
    weirdness: "在發光的霓虹柏油路上瘋狂變向運球（Crossover），然後對著虛空做出極度完美的空氣三分球出手與定格動作。",
  },
  {
    id: "weirdo_2",
    title: "量子燃脂傳教士",
    english: "QUANTUM JUMPING JACK",
    action: "開合跳",
    model: "/assets/weirdos/weirdo_2_quantum_jumping_jack.glb",
    specialAnimation: "jumping_jack",
    behavior: "jumping-jack",
    position: [2.4, 0, 2.1],
    facing: -2.6,
    accent: "#fb7185",
    clue: "「島嶼中心有個過動兒在發光地板上瘋狂做開合跳，一邊跳還一邊大聲數著奇奇怪怪的數字。」",
    quote: "「一！二！三！快跟我一起跳！只要我們在空氣中摩擦得夠激烈，同化危機的腦波就追不上我們！動起來啊！」",
    foundLine: "觀測完成：他跳到差點吐出來，但眼神充滿了得道成仙的清澈。他留在原地，把量子燃脂課調成低強度模式。",
    profile: "企圖透過肉體的劇烈開合，與宇宙脈搏達到同頻共振的熱血過動兒。",
    weirdness: "無視所有路人的白眼，在島嶼中心以快要擦出火花的超高頻率瘋狂做開合跳，嘴裡還在大聲數著質數。",
  },
  {
    id: "weirdo_3",
    title: "地板星人",
    english: "FLOOR CRAWLER",
    action: "匍匐前進",
    model: "/assets/weirdos/weirdo_3_floor_person_crawl_inplace_v6.glb",
    animationAssets: [
      "/assets/weirdos/weirdo_3_floor_person_lie_spread_v6.glb",
      "/assets/weirdos/weirdo_3_floor_person_wake_lookup_v6.glb",
    ],
    specialAnimation: "floor_crawl",
    behavior: "floor-crawl",
    position: [-6.4, 0, 10.4],
    facing: 1.2,
    accent: "#7dd3fc",
    clue: "「霓虹街道那邊有個傢伙整個人像條壁虎一樣趴在地上匍匐前進，差點被我當成地毯踩過去。」",
    quote: "「噓！小聲點！我正在偷聽地板的秘密。它剛剛悄悄跟我說，對面那盞路燈今天出門忘記擦防曬油了...」",
    foundLine: "觀測完成：你配合他一起趴了一下，他驚為知音。他爬起來拍拍衣服，決定暫時停止偷聽地板八卦。",
    profile: "嫌棄站著走路太主流、太沒創意，決定用肚子去感受霓虹島嶼的體溫。",
    weirdness: "整個人死死趴在發光的霓虹地板上，像在拍二戰大片一樣，表情極其嚴肅且絲滑地在大街上匍匐前進。",
  },
  {
    id: "weirdo_4",
    title: "臀動列車長",
    english: "BUTT TRAIN CONDUCTOR",
    action: "屁股走路",
    model: "/assets/weirdos/weirdo_4_butt_train_conductor.glb",
    specialAnimation: "butt_walk",
    behavior: "butt-walk",
    position: [-2.8, 0, 13.6],
    facing: 0.1,
    accent: "#5eead4",
    clue: "「數據橋正中央有個怪咖死不站起來，整個人坐在地上用屁股一左一右魔性地挪著走路。」",
    quote: "「用雙腳走路簡直是缺乏創意的表現！看我的『屁股推進引擎』，這才是新世紀的逆向科技！你要搭便車嗎？」",
    foundLine: "觀測完成：他的暴走思緒成功被你敷衍過去。他決定保持坐在地上的姿勢，原地展示屁股推進引擎。",
    profile: "用生命在證明：只要姿勢夠有自信，人類的屁股其實就是隱藏版的雙腳。",
    weirdness: "坐在數據橋樑正中央，雙腿離地，全靠臀部肌肉一左一右地在地上魔性挪動前進，速度還快得像在騎腳踏車。",
  },
  {
    id: "weirdo_5",
    title: "引力波迴旋陀螺",
    english: "GRAVITY SPINNER",
    action: "跳芭蕾轉圈圈",
    model: "/assets/weirdos/weirdo_5_gravity_spinner_custom_v3.glb",
    specialAnimation: "gravity_spin",
    behavior: "ballet-spin",
    position: [9.4, 0, -16.6],
    facing: -0.6,
    accent: "#c4b5fd",
    clue: "「科學島圓頂那邊有個白色人影，手舉高高在跳芭蕾，整個人像個永動陀螺一樣瘋狂原地轉圈圈。」",
    quote: "「轉圈圈～轉圈圈～只要我轉得夠完美，全島被同化的混亂腦波就會被我彈開！看我的超級大迴旋！」",
    foundLine: "觀測完成：她停下來後竟然完全沒吐。她傲嬌地行了個芭蕾舞禮，繼續在觀星穹頂旁穩定旋轉。",
    profile: "試圖用無休止的原地自轉，把自己轉成一個抗衡同化危機的人工黑洞。",
    weirdness: "墊著腳尖、雙手在頭頂高舉成圓，在觀星穹頂下像個停不下來的陀螺一樣瘋狂原地轉圈圈。",
  },
  {
    id: "weirdo_6",
    title: "天地顛倒觀察家",
    english: "INVERTED OBSERVER",
    action: "倒立走路",
    model: "/assets/weirdos/weirdo_6_inverted_observer.glb",
    specialAnimation: "handstand_walk",
    behavior: "handstand-walk",
    position: [15.5, 0, -3.6],
    facing: -1.55,
    accent: "#38bdf8",
    clue: "「連通橋上有個奇葩雙腳朝天，鞋子還掛在手上，完全用雙手在倒立走路，而且平衡感好到走超快！」",
    quote: "「天啊！原來從這個角度看過去，你們這群用腳走路的人，腦袋都在往下滴水耶！這真是一個偉大的逆向發現！」",
    foundLine: "觀測完成：你配合他歪著脖子講話，成功安撫了他的情緒。他決定留在橋邊，繼續用倒立角度研究世界。",
    profile: "主張全世界的正常人都瘋了，只有把整個人倒過來才能看清這座島的真相。",
    weirdness: "雙腳朝天，鞋子甚至掛在手上，完全用雙手在懸空橋樑上走得比正常人還快，平衡感驚人。",
  },
  {
    id: "weirdo_7",
    title: "積木樹靈魂伴侶",
    english: "TREE HUGGER",
    action: "爬樹",
    model: "/assets/weirdos/weirdo_7_tree_hugger_custom_v3.glb",
    specialAnimation: "tree_hug_climb",
    behavior: "tree-climber",
    position: [12.6, 0, 11.8],
    facing: -2.2,
    accent: "#86efac",
    clue: "「街角那棵低面數積木樹上面吊著一個人，像隻無尾熊一樣死死抱著樹幹、拼了命扭動身體往上爬。」",
    quote: "「走開啦！別打擾我們！這棵積木松樹剛剛答應要跟我結婚，我們正熱烈討論婚禮要邀請哪顆外星物種！」",
    foundLine: "觀測完成：你提醒他樹也需要個人空間，他才依依不捨地滑下來，留在樹旁繼續遠距離告白。",
    profile: "拒絕與智商低於宇宙平均值的人類溝通，只願意跟島上的低面數積木樹談戀愛。",
    weirdness: "像隻無尾熊一樣死死抱著街邊的霓虹積木樹，雙腿夾緊樹幹，拼了命扭動身體往最上面的樹冠爬。",
  },
  {
    id: "weirdo_8",
    title: "外星迷因解碼器",
    english: "UMBRELLA RECEIVER",
    action: "拿雨傘接收訊號",
    model: "/assets/weirdos/weirdo_8_umbrella_receiver.glb",
    specialAnimation: "umbrella_receiver",
    behavior: "umbrella-receiver",
    position: [0.8, 0, -6.2],
    facing: 0,
    accent: "#a7f3d0",
    clue: "「中央塔那邊有人撐著一把大雨傘，還把傘當成螺旋槳在頭頂瘋狂旋轉。」",
    quote: "「別動！你擋到我的 Wi-Fi 了！外星電台正在同步直播『如何做出一碗好吃的宇宙炒飯』，訊號快被你卡斷了！」",
    foundLine: "觀測完成：你裝模作樣幫他掐指算了一下方位，他直呼內行。隨後他高舉雨傘，在中央塔旁重新校準外星頻道。",
    profile: "把普通雨傘當成 NASA 級衛星天線，24 小時強行接收外星宇宙的電台廣播。",
    weirdness: "在萬里無雲的大晴天下撐著一把發光的雨傘，雙手緊握傘柄，不停地把雨傘像螺旋槳一樣旋轉來對準天空。",
  },
];
const FOOD_PICKUPS: FoodData[] = [
  { id: "apple", title: "星蘋果", asset: "/assets/food/apple.glb", position: [-6.8, 0.45, 2.8], scale: 0.82, accent: "#fb7185" },
  { id: "pizza", title: "月光披薩", asset: "/assets/food/pizza.glb", position: [6.6, 0.45, -4.4], scale: 0.78, accent: "#f6d365" },
  { id: "donut", title: "軌道甜甜圈", asset: "/assets/food/donut-sprinkles.glb", position: [-14.6, 0.45, 12.8], scale: 0.86, accent: "#f472b6" },
  { id: "burger", title: "能量漢堡", asset: "/assets/food/burger-double.glb", position: [13.8, 0.45, 8.4], scale: 0.74, accent: "#5eead4" },
  { id: "sushi", title: "水道壽司", asset: "/assets/food/sushi-salmon.glb", position: [0.8, 0.45, -12.6], scale: 0.82, accent: "#7dd3fc" },
];
const GUIDE_HUMAN_CLUES: Partial<Record<HumanId, string[]>> = {
  guide_1: [HUMANS[0].legend, HUMANS[0].rumor],
  guide_2: [HUMANS[1].legend, HUMANS[1].rumor],
  guide_3: [HUMANS[2].legend, HUMANS[2].rumor],
  guide_4: [HUMANS[3].legend, HUMANS[3].rumor],
  guide_5: [HUMANS[4].legend, HUMANS[4].rumor],
  guide_6: [HUMANS[5].legend, HUMANS[5].rumor],
  guide_7: [HUMANS[6].legend, HUMANS[6].rumor],
  guide_8: [HUMANS[7].legend, HUMANS[7].rumor],
};
const COMPLETE_CITY_HOUSES = [
  { id: "north-row-house-a", position: [-4.4, -12.4], rotation: 0, color: "#b9d8ff", roof: "#d9a7ff", accent: "#7dd3fc", width: 2.3, depth: 2.0, height: 1.72 },
  { id: "north-row-house-b", position: [4.4, -12.4], rotation: 0, color: "#b7f7e6", roof: "#a6b8ff", accent: "#c4b5fd", width: 2.35, depth: 2.05, height: 1.68 },
  { id: "west-maker-house-a", position: [-14.4, -13.2], rotation: Math.PI / 2, color: "#f2a36f", roof: "#8f5fd7", accent: "#f6d365", width: 2.5, depth: 2.15, height: 1.62 },
  { id: "west-maker-house-b", position: [-14.4, -1.8], rotation: Math.PI / 2, color: "#8fb7ff", roof: "#f59e5f", accent: "#7dd3fc", width: 2.35, depth: 2.1, height: 1.56 },
  { id: "west-maker-house-c", position: [-14.4, 8.2], rotation: Math.PI / 2, color: "#fb9ab4", roof: "#5f70d7", accent: "#fb7185", width: 2.3, depth: 2.0, height: 1.58 },
  { id: "east-residence-house-a", position: [14.4, -6.8], rotation: -Math.PI / 2, color: "#bdf3e7", roof: "#e8c4ff", accent: "#5eead4", width: 2.42, depth: 2.05, height: 1.62 },
  { id: "east-residence-house-b", position: [14.4, 4.8], rotation: -Math.PI / 2, color: "#f7d9ff", roof: "#7dd3fc", accent: "#5eead4", width: 2.35, depth: 2.05, height: 1.6 },
  { id: "east-residence-house-c", position: [14.4, 12.6], rotation: -Math.PI / 2, color: "#93e6d2", roof: "#b9a7ff", accent: "#f7d9ff", width: 2.28, depth: 2.0, height: 1.56 },
  { id: "south-market-house-a", position: [-3.8, 18.8], rotation: Math.PI, color: "#f6d365", roof: "#fb7185", accent: "#7dd3fc", width: 2.2, depth: 1.95, height: 1.48 },
  { id: "south-market-house-b", position: [3.8, 18.8], rotation: Math.PI, color: "#c4b5fd", roof: "#5eead4", accent: "#f6d365", width: 2.22, depth: 1.95, height: 1.5 },
] as const;

const COMMUNITY_BASES = [
  { x: -17.8, z: -14.2, color: "#9fd3ff", roof: "#f0a7d2", accent: "#5eead4", rotation: 0 },
  { x: 9.2, z: 8.6, color: "#c9b7ff", roof: "#7dd3fc", accent: "#f6d365", rotation: Math.PI / 2 },
  { x: -17.2, z: 11.8, color: "#f6d365", roof: "#fb7185", accent: "#7dd3fc", rotation: -Math.PI / 2 },
  { x: 5.8, z: 20.2, color: "#93e6d2", roof: "#c4b5fd", accent: "#f7d9ff", rotation: Math.PI },
  { x: 18.8, z: -16.2, color: "#a7f3d0", roof: "#60a5fa", accent: "#fbbf24", rotation: -Math.PI / 2 },
  { x: -4.2, z: -22.4, color: "#f7d9ff", roof: "#475569", accent: "#5eead4", rotation: 0 },
] as const;

const EXTRA_COMMUNITY_HOUSES = Array.from({ length: 96 }, (_, index) => {
  const base = COMMUNITY_BASES[Math.floor(index / 16) % COMMUNITY_BASES.length];
  const local = index % 16;
  const col = local % 4;
  const row = Math.floor(local / 4);
  const stagger = row % 2 ? 0.45 : 0;
  return {
    id: `neon-community-house-${index + 1}`,
    position: [base.x + (col - 1.5) * 2.62 + stagger, base.z + (row - 1.5) * 2.92],
    rotation: base.rotation,
    color: index % 3 === 0 ? base.color : index % 3 === 1 ? "#a7f3d0" : "#d8b4fe",
    roof: index % 2 ? base.roof : "#475569",
    accent: index % 4 === 0 ? "#5eead4" : base.accent,
    width: 1.68 + (index % 3) * 0.14,
    depth: 1.58 + (index % 4) * 0.08,
    height: 1.08 + (index % 5) * 0.08,
  };
});

const EXTRA_TREE_SPECS = Array.from({ length: 118 }, (_, index) => {
  const roadLines = [
    { axis: "x", fixed: -6.8, from: -25, step: 2.35, offset: -1.18 },
    { axis: "x", fixed: 6.8, from: -25, step: 2.35, offset: 1.18 },
    { axis: "z", fixed: -6.8, from: -23, step: 2.2, offset: 1.12 },
    { axis: "z", fixed: 6.8, from: -23, step: 2.2, offset: -1.12 },
  ] as const;
  if (index < 56) {
    const line = roadLines[index % roadLines.length];
    const slot = Math.floor(index / roadLines.length);
    const drift = (slot % 3 - 1) * 0.16;
    const along = line.from + slot * line.step;
    return {
      id: `aquarius-road-tree-${index + 1}`,
      x: line.axis === "x" ? along : line.fixed + line.offset + drift,
      z: line.axis === "x" ? line.fixed + line.offset + drift : along,
      height: 1.55 + (index % 5) * 0.14,
      color: index % 2 ? "#2f7d42" : "#3f8f34",
      glow: index % 4 === 0 ? "#5eead4" : "#b8f7ff",
    };
  }
  const clusters = [
    { x: -24, z: 9 },
    { x: 17, z: 15 },
    { x: -8, z: -18 },
    { x: 22, z: -6 },
    { x: -5, z: 23 },
    { x: 1, z: 2 },
  ];
  const localIndex = index - 56;
  const cluster = clusters[localIndex % clusters.length];
  const ring = Math.floor(localIndex / clusters.length);
  const angle = (localIndex * 1.37) % (Math.PI * 2);
  const radius = 1.2 + ring * 1.35 + (index % 3) * 0.4;
  return {
    id: `aquarius-tree-${index + 1}`,
    x: cluster.x + Math.cos(angle) * radius,
    z: cluster.z + Math.sin(angle) * radius,
    height: 1.35 + (index % 5) * 0.18,
    color: index % 2 ? "#2f7d42" : "#4f8f2f",
    glow: index % 3 === 0 ? "#5eead4" : "#b8f7ff",
  };
});

const EXTRA_GRASS_PATCHES = [
  { x: -23, z: 8.5, rx: 8.6, rz: 5.5, color: "#4ade80" },
  { x: 17.5, z: 14.5, rx: 9.8, rz: 6.2, color: "#22c55e" },
  { x: -7.5, z: -18.4, rx: 8.2, rz: 4.7, color: "#86efac" },
  { x: 22.4, z: -6.2, rx: 7.4, rz: 4.8, color: "#65a30d" },
  { x: -4.8, z: 23.2, rx: 7.8, rz: 5.2, color: "#34d399" },
] as const;

const EXTRA_LIGHTHOUSE_SPECS = [
  { id: "north-lighthouse", x: -7.2, z: -19.4, height: 3.1, accent: "#7dd3fc" },
  { id: "harbor-lighthouse", x: 9.5, z: 18.2, height: 2.7, accent: "#5eead4" },
  { id: "garden-lighthouse", x: 21.8, z: 2.8, height: 2.45, accent: "#d8b4fe" },
  { id: "maker-lighthouse", x: -20.2, z: -7.8, height: 2.6, accent: "#f6d365" },
  { id: "river-lighthouse", x: 23.8, z: 18.4, height: 2.8, accent: "#93c5fd" },
  { id: "plaza-lighthouse", x: -23.6, z: -18.6, height: 2.7, accent: "#f0abfc" },
] as const;

const EXTRA_FOUNTAIN_SPECS = [
  { id: "plaza-mini-fountain", x: -3.2, z: 5.8, radius: 0.82, accent: "#7dd3fc" },
  { id: "market-mini-fountain", x: 6.8, z: 12.8, radius: 0.68, accent: "#5eead4" },
  { id: "garden-mini-fountain", x: 19.7, z: 12.6, radius: 0.72, accent: "#a7f3d0" },
  { id: "science-mini-fountain", x: 6.8, z: -18.8, radius: 0.62, accent: "#c4b5fd" },
  { id: "maker-mini-fountain", x: -19.4, z: 4.2, radius: 0.62, accent: "#f6d365" },
  { id: "harbor-step-fountain", x: -18.4, z: 18.6, radius: 0.78, accent: "#93c5fd" },
  { id: "tech-court-fountain", x: 18.2, z: -18.4, radius: 0.74, accent: "#c4b5fd" },
] as const;

const AQUARIUS_ANIMALS = [
  { type: "sheep", name: "逆向咩咩", x: -25.2, z: 10.6, color: "#f8fafc", accent: "#5eead4" },
  { type: "snake", name: "量子滑蛇", x: -21.6, z: 6.5, color: "#4ade80", accent: "#f6d365" },
  { type: "frog", name: "霓虹蛙", x: 16.8, z: 17.5, color: "#22c55e", accent: "#7dd3fc" },
  { type: "rhino", name: "反骨犀牛", x: 20.4, z: 12.5, color: "#94a3b8", accent: "#c4b5fd" },
  { type: "cow", name: "月光乳牛", x: -8.6, z: -19.9, color: "#f8fafc", accent: "#111827" },
  { type: "chicken", name: "晨跑雞司令", x: -4.8, z: -16.6, color: "#fde68a", accent: "#fb7185" },
  { type: "dog", name: "訊號狗", x: 22.6, z: -8.7, color: "#a16207", accent: "#5eead4" },
  { type: "cat", name: "靜電貓", x: 25.2, z: -4.2, color: "#334155", accent: "#f0a7d2" },
  { type: "bird", name: "雲端鳥", x: 18.2, z: -2.4, color: "#60a5fa", accent: "#f8fafc" },
  { type: "pig", name: "泡泡豬", x: -6.4, z: 25.4, color: "#f9a8d4", accent: "#7dd3fc" },
  { type: "rabbit", name: "跳頻兔", x: -2.2, z: 21.6, color: "#e0f2fe", accent: "#c4b5fd" },
  { type: "horse", name: "時差馬", x: 6.8, z: 23.6, color: "#92400e", accent: "#f6d365" },
  { type: "monkey", name: "社交實驗猴", x: 2.8, z: 18.6, color: "#a16207", accent: "#5eead4" },
] as const;
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
const ACTIVE_AQUARIUS_OBJECT_IDS = new Set<AquariusObjectId>([
  "reverse-clock",
  "contrarian-vending",
  "crowd-antenna",
  "unwritten-chair",
  "habitat-dome",
  "oxygen-tree",
  "hydroponic-kitchen",
  "memory-market",
  "monorail-station",
  "flying-cow",
  "signal-jellyfish",
  "quantum-deer",
  "bubble-dog",
  "solar-sheep",
  "paper-ray",
]);

const UNIVERSAL_BONE_MAP: Record<string, string> = {
  root: "Root",
  pelvis: "Hips",
  spine_01: "Abdomen",
  spine_02: "Torso",
  neck_01: "Neck",
  Head: "Head",
  clavicle_l: "Shoulder.L",
  upperarm_l: "UpperArm.L",
  lowerarm_l: "LowerArm.L",
  hand_l: "Fist.L",
  clavicle_r: "Shoulder.R",
  upperarm_r: "UpperArm.R",
  lowerarm_r: "LowerArm.R",
  hand_r: "Fist.R",
  thigh_l: "UpperLeg.L",
  calf_l: "LowerLeg.L",
  foot_l: "Foot.L",
  thigh_r: "UpperLeg.R",
  calf_r: "LowerLeg.R",
  foot_r: "Foot.R",
};

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

function loadMusicEnabled() {
  if (typeof window === "undefined") {
    return true;
  }
  return window.localStorage.getItem("aquarius-archive-music") !== "false";
}

function loadPlayerName() {
  if (typeof window === "undefined") {
    return "player1";
  }
  return window.localStorage.getItem("aquarius-player-name") || "player1";
}

function loadPlayerAvatar(): PlayerAvatarId {
  if (typeof window === "undefined") {
    return "neutral-human";
  }
  const value = window.localStorage.getItem("aquarius-player-avatar") as PlayerAvatarId | null;
  return PLAYER_AVATARS.some((avatar) => avatar.id === value) ? value : "neutral-human";
}

function getNpc(id: ArchetypeId) {
  return NPCS.find((npc) => npc.id === id) ?? NPCS[0];
}

function getHuman(id: HumanId) {
  return HUMANS.find((human) => human.id === id) ?? HUMANS[0];
}

function getAquariusObject(id: AquariusObjectId) {
  return AQUARIUS_OBJECTS.find((item) => item.id === id) ?? AQUARIUS_OBJECTS[0];
}

function getActiveAquariusObjects() {
  return AQUARIUS_OBJECTS.filter((item) => ACTIVE_AQUARIUS_OBJECT_IDS.has(item.id));
}

function getAvatar(id: PlayerAvatarId) {
  return PLAYER_AVATARS.find((avatar) => avatar.id === id) ?? PLAYER_AVATARS[0];
}

function getWeirdo(id: WeirdoId) {
  return WEIRDOS.find((weirdo) => weirdo.id === id) ?? WEIRDOS[0];
}

function getHumanClueLines(human: HumanData) {
  return GUIDE_HUMAN_CLUES[human.id] ?? [human.legend, human.rumor];
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function useScramble(text: string, onStart?: () => void, onEnd?: () => void) {
  const [display, setDisplay] = useState(text);
  const intervalRef = useRef<number | null>(null);

  const play = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
    }
    onStart?.();
    let frame = 0;
    const total = 24;
    intervalRef.current = window.setInterval(() => {
      frame += 1;
      setDisplay(
        text
          .split("")
          .map((character, index) => {
            if (character === " ") {
              return " ";
            }
            const progress = frame - index * 1.2;
            return progress > total * 0.6
              ? character
              : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          })
          .join("")
      );
      if (frame > total + text.length) {
        if (intervalRef.current !== null) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setDisplay(text);
        onEnd?.();
      }
    }, 35);
  }, [onEnd, onStart, text]);

  useEffect(() => {
    play();
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
      onEnd?.();
    };
  }, [onEnd, play]);

  return [display, play] as const;
}

function MarqueeTags({ items }: { items: readonly string[] }) {
  const [paused, setPaused] = useState(false);
  return (
    <div
      className="marquee-zone"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="marquee-track"
        style={{ animationPlayState: paused ? "paused" : "running" }}
      >
        {[...items, ...items].map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function clearRuntimeInteractionState(runtime: Runtime) {
  runtime.keys.clear();
  runtime.joystick = { x: 0, y: 0 };
  runtime.velocity.set(0, 0, 0);
  runtime.clickTarget = null;
  runtime.pendingNpcId = null;
  runtime.pendingHumanId = null;
  runtime.pendingObjectId = null;
  runtime.pendingWeirdoId = null;
}

function prepareRuntimeInteractionModal(runtime: Runtime) {
  clearRuntimeInteractionState(runtime);
  runtime.inputPausedUntil = performance.now() + 120;
  runtime.controls.enableRotate = false;
}

function resumeRuntimeInteractionModal(runtime: Runtime) {
  clearRuntimeInteractionState(runtime);
  runtime.inputPausedUntil = performance.now() + 260;
  runtime.controls.enableRotate = true;
  runtime.cameraReturnToDefault = true;
}

function shouldSkipLooseCityAsset(asset: CityModelAssetSpec) {
  const path = asset.asset.toLowerCase();
  return (
    path.includes("/medieval-village/wall_") ||
    path.includes("/medieval-village/roof_") ||
    path.includes("/medieval-village/corner_") ||
    path.includes("/medieval-village/prop_chimney") ||
    path.includes("/medieval-village/prop_vine")
  );
}

function estimateModelCollisionRadius(asset: CityModelAssetSpec) {
  if (asset.id === AQUARIUS_CASCADE_INSTALLATION_ID) {
    return 1.65;
  }
  if (asset.category === "building-small" || asset.category === "building-medium") {
    return Math.max(1.35, Math.max(asset.scale[0], asset.scale[2]) * 1.85);
  }
  if (asset.id.includes("wagon")) {
    return 1.05;
  }
  return Math.max(0.72, Math.max(asset.scale[0], asset.scale[2]) * 1.15);
}

function fitCityAssetToWorldHeight(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  targetPosition: THREE.Vector3,
  targetHeight: number
) {
  group.updateMatrixWorld(true);
  const initialBox = new THREE_REF.Box3().setFromObject(group);
  const initialSize = initialBox.getSize(new THREE_REF.Vector3());
  if (!Number.isFinite(initialSize.y) || initialSize.y <= 0.0001) {
    return;
  }

  group.scale.multiplyScalar(targetHeight / initialSize.y);
  group.updateMatrixWorld(true);

  const fittedBox = new THREE_REF.Box3().setFromObject(group);
  const fittedCenter = fittedBox.getCenter(new THREE_REF.Vector3());
  group.position.x += targetPosition.x - fittedCenter.x;
  group.position.z += targetPosition.z - fittedCenter.z;
  group.position.y += targetPosition.y - fittedBox.min.y;
  group.userData.normalizedTargetHeight = targetHeight;
  group.updateMatrixWorld(true);
}

function scaleWorldValue(value: number) {
  return value * CITY_LAYOUT_SCALE;
}

function scaleWorldPoint(x: number, z: number): [number, number] {
  return [scaleWorldValue(x), scaleWorldValue(z)];
}

function scaleWorldPosition(position: [number, number, number]): [number, number, number] {
  return [scaleWorldValue(position[0]), position[1], scaleWorldValue(position[2])];
}

function createJumpPlatformColliders(): JumpPlatform[] {
  const routePlatforms = JUMP_PLATFORM_SPECS.map((platform) => ({
    x: scaleWorldValue(platform.x),
    z: scaleWorldValue(platform.z),
    width: scaleWorldValue(platform.width),
    depth: scaleWorldValue(platform.depth),
    height: platform.height,
  }));
  const houseRoofs = COMPLETE_CITY_HOUSES.map((house) => ({
    x: scaleWorldValue(house.position[0]),
    z: scaleWorldValue(house.position[1]),
    width: scaleWorldValue(house.width * 1.05),
    depth: scaleWorldValue(house.depth * 1.05),
    height: house.height + 0.68,
  }));
  const communityRoofs = EXTRA_COMMUNITY_HOUSES
    .filter((_, index) => index % 4 === 0)
    .map((house) => ({
      x: scaleWorldValue(house.position[0]),
      z: scaleWorldValue(house.position[1]),
      width: scaleWorldValue(house.width * 1.05),
      depth: scaleWorldValue(house.depth * 1.05),
      height: house.height + 0.58,
    }));
  return [...routePlatforms, ...houseRoofs, ...communityRoofs];
}

function getRegionName(x: number, z: number) {
  if (z < -30) {
    return "Ice Research 冰湖寒冷區";
  }
  if (x < -30 && z < 4) {
    return "Desert Maker 沙漠工坊區";
  }
  if (x > 28 && z > 8) {
    return "Rainforest Habitat 熱地雨林區";
  }
  if (z > 28) {
    return "Canal Harbor 水道港灣區";
  }
  if (x > 26 && z < -8) {
    return "Cosmic Research 星際研究區";
  }
  if (Math.hypot(x, z) < 12) {
    return "Neon Core 霓虹中樞區";
  }
  let best = WORLD_REGIONS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const region of WORLD_REGIONS) {
    const distance =
      Math.hypot(x - scaleWorldValue(region.x), z - scaleWorldValue(region.z)) /
      scaleWorldValue(region.radius);
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

function worldToMiniMapX(x: number) {
  return ((x + WORLD_CONFIG.worldRadius) / (WORLD_CONFIG.worldRadius * 2)) * 100;
}

function worldToMiniMapY(z: number) {
  return ((WORLD_CONFIG.worldRadius - z) / (WORLD_CONFIG.worldRadius * 2)) * 100;
}

export function AquariusGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewDisposeRef = useRef<(() => void) | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const phaseRef = useRef<Phase>("loading");
  const gameStateRef = useRef<GameState>("start");
  const dialogueRef = useRef<DialogueState | null>(null);
  const humanDialogueRef = useRef<HumanDialogueState | null>(null);
  const weirdoDialogueRef = useRef<WeirdoDialogueState | null>(null);
  const collectionPopupRef = useRef<CollectionPopupState | null>(null);
  const artifactRef = useRef<ArtifactState | null>(null);
  const nearestNpcRef = useRef<ArchetypeId | null>(null);
  const nearestTargetRef = useRef<InteractionTarget | null>(null);
  const tutorialStageRef = useRef<TutorialStage>("move");
  const qualityRef = useRef<Quality>("medium");
  const selectedAvatarRef = useRef<PlayerAvatarId>("neutral-human");
  const checkedWeirdosRef = useRef<WeirdoId[]>([]);
  const playerNameRef = useRef(loadPlayerName());
  const openDialogueRef = useRef<(id: ArchetypeId) => void>(() => undefined);
  const openHumanDialogueRef = useRef<(id: HumanId) => void>(() => undefined);
  const openWeirdoDialogueRef = useRef<(id: WeirdoId) => void>(() => undefined);
  const openArtifactRef = useRef<(id: AquariusObjectId) => void>(() => undefined);
  const playToneRef = useRef<(frequency: number, duration?: number) => void>(() => undefined);
  const mutedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const scrambleAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicEnabledRef = useRef(loadMusicEnabled());
  const musicGestureRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("loading");
  const [introStep, setIntroStep] = useState<IntroStep>("landing");
  const [gameState, setGameState] = useState<GameState>("start");
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);
  const [foundCount, setFoundCount] = useState(0);
  const [checkedWeirdos, setCheckedWeirdos] = useState<WeirdoId[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("正在校準星象……");
  const [currentRegion, setCurrentRegion] = useState("星光水道市中心");
  const [nearestNpcId, setNearestNpcId] = useState<ArchetypeId | null>(null);
  const [nearestTarget, setNearestTarget] = useState<InteractionTarget | null>(null);
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [humanDialogue, setHumanDialogue] = useState<HumanDialogueState | null>(null);
  const [weirdoDialogue, setWeirdoDialogue] = useState<WeirdoDialogueState | null>(null);
  const [collectionPopup, setCollectionPopup] = useState<CollectionPopupState | null>(null);
  const [artifact, setArtifact] = useState<ArtifactState | null>(null);
  const [, setUnlocked] = useState<Set<ArchetypeId>>(() => loadStoredIds());
  const [toast, setToast] = useState("");
  const [tutorialStage, setTutorialStage] = useState<TutorialStage>(() =>
    loadTutorialStage()
  );
  const [muted] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(() => loadMusicEnabled());
  const [quality, setQuality] = useState<Quality>(() => loadQuality());
  const [playerName, setPlayerName] = useState(() => loadPlayerName());
  const [selectedAvatar, setSelectedAvatar] = useState<PlayerAvatarId>(() =>
    loadPlayerAvatar()
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickKnob, setJoystickKnob] = useState({ x: 0, y: 0 });
  const [shareUrl] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin
  );
  const [copiedShare, setCopiedShare] = useState(false);
  const [miniMap, setMiniMap] = useState({
    x: PLAYER_START.x,
    z: PLAYER_START.z,
    angle: 0,
  });

  const selectedAvatarData = getAvatar(selectedAvatar);
  const startScrambleSfx = useCallback(() => {
    let audio = scrambleAudioRef.current;
    if (!audio) {
      audio = new Audio(SCRAMBLE_SFX_SRC);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0.28;
      scrambleAudioRef.current = audio;
    }
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, []);
  const stopScrambleSfx = useCallback(() => {
    const audio = scrambleAudioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = 0;
  }, []);
  const [scrambledTitle, playTitleScramble] = useScramble(
    "FIND WEIRDO",
    startScrambleSfx,
    stopScrambleSfx
  );
  const nearestNpc = nearestNpcId ? getNpc(nearestNpcId) : null;
  const nearestObject =
    nearestTarget?.kind === "object" ? getAquariusObject(nearestTarget.id) : null;
  const nearestHuman =
    nearestTarget?.kind === "human" ? getHuman(nearestTarget.id) : null;
  const nearestWeirdo =
    nearestTarget?.kind === "weirdo" ? getWeirdo(nearestTarget.id) : null;
  const dialogueNpc = dialogue ? getNpc(dialogue.npcId) : null;
  const dialogueHuman = humanDialogue ? getHuman(humanDialogue.humanId) : null;
  const dialogueWeirdo = weirdoDialogue ? getWeirdo(weirdoDialogue.weirdoId) : null;
  const collectedWeirdo = collectionPopup ? getWeirdo(collectionPopup.weirdoId) : null;
  const activeArtifact = artifact ? getAquariusObject(artifact.objectId) : null;
  const dialogueLines = useMemo(() => {
    if (!dialogueNpc) {
      return [];
    }
    return [
      dialogueNpc.quote,
      `${dialogueNpc.title}代表${dialogueNpc.keywords.join("、")}。${dialogueNpc.core}`,
      `你獲得了「${dialogueNpc.fragment}」。這段人格已被記入觀測紀錄。`,
    ];
  }, [dialogueNpc]);
  const humanDialogueLines = useMemo(() => {
    if (!dialogueHuman) {
      return [];
    }
    return getHumanClueLines(dialogueHuman);
  }, [dialogueHuman]);
  const weirdoDialogueLines = useMemo(() => {
    if (!dialogueWeirdo || !weirdoDialogue) {
      return [];
    }
    return [
      dialogueWeirdo.quote,
      weirdoDialogue.justFound
        ? dialogueWeirdo.foundLine
        : `這位怪人已經被觀測過了。${dialogueWeirdo.title}仍在原地把荒謬維持得很穩。`,
    ];
  }, [dialogueWeirdo, weirdoDialogue]);
  const isTimerPaused = Boolean(
    dialogue ||
      humanDialogue ||
      weirdoDialogue ||
      collectionPopup ||
      artifact
  );

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    dialogueRef.current = dialogue;
  }, [dialogue]);

  useEffect(() => {
    humanDialogueRef.current = humanDialogue;
  }, [humanDialogue]);

  useEffect(() => {
    weirdoDialogueRef.current = weirdoDialogue;
  }, [weirdoDialogue]);

  useEffect(() => {
    collectionPopupRef.current = collectionPopup;
  }, [collectionPopup]);

  useEffect(() => {
    if (!collectionPopup) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setCollectionPopup(null);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [collectionPopup]);

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
    tutorialStageRef.current = tutorialStage;
  }, [tutorialStage]);

  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  useEffect(() => {
    checkedWeirdosRef.current = checkedWeirdos;
    const runtime = runtimeRef.current;
    if (runtime) {
      updateWeirdoFoundVisuals(runtime, new Set(checkedWeirdos));
    }
  }, [checkedWeirdos]);

  useEffect(() => {
    if (phase !== "playing" || gameState !== "playing" || isTimerPaused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          setDialogue(null);
          setHumanDialogue(null);
          setWeirdoDialogue(null);
          setCollectionPopup(null);
          setArtifact(null);
          gameStateRef.current = "lose";
          setGameState("lose");
          setToast("城市已被怪異腦波淹沒");
          window.setTimeout(() => setToast(""), 1800);
          const runtime = runtimeRef.current;
          if (runtime) {
            runtime.velocity.set(0, 0, 0);
            runtime.keys.clear();
            runtime.joystick = { x: 0, y: 0 };
            runtime.controls.enableRotate = true;
            runtime.cameraReturnToDefault = true;
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [gameState, isTimerPaused, phase]);

  useEffect(() => {
    if (gameState !== "playing" || foundCount < WEIRDOS.length || collectionPopup) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setDialogue(null);
      setHumanDialogue(null);
      setWeirdoDialogue(null);
      setCollectionPopup(null);
      setArtifact(null);
      gameStateRef.current = "win";
      setGameState("win");
      setToast("8/8 水瓶座怪人已重新觀測");
      window.setTimeout(() => setToast(""), 2000);
      const runtime = runtimeRef.current;
      if (runtime) {
        runtime.velocity.set(0, 0, 0);
        runtime.keys.clear();
        runtime.controls.enableRotate = true;
        runtime.cameraReturnToDefault = true;
      }
      playToneRef.current(880, 0.22);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [collectionPopup, foundCount, gameState]);

  useEffect(() => {
    selectedAvatarRef.current = selectedAvatar;
    window.localStorage.setItem("aquarius-player-avatar", selectedAvatar);
    const runtime = runtimeRef.current;
    if (runtime) {
      setRuntimePlayerAvatar(runtime, getAvatar(selectedAvatar));
    }
  }, [selectedAvatar]);

  useEffect(() => {
    previewDisposeRef.current?.();
    previewDisposeRef.current = null;
    const runtime = runtimeRef.current;
    const canvas = previewCanvasRef.current;
    if (phase !== "intro" || introStep !== "setup" || !runtime || !canvas) {
      return undefined;
    }
    previewDisposeRef.current = mountAvatarPreview(canvas, runtime, getAvatar(selectedAvatar));
    return () => {
      previewDisposeRef.current?.();
      previewDisposeRef.current = null;
    };
  }, [phase, introStep, selectedAvatar]);

  useEffect(() => {
    const displayName = playerName.trim() || "player1";
    playerNameRef.current = displayName;
    window.localStorage.setItem("aquarius-player-name", displayName);
    const runtime = runtimeRef.current;
    if (runtime) {
      updatePlayerNameLabel(runtime.THREE, runtime.playerLabel, displayName);
    }
  }, [playerName]);

  useEffect(() => {
    mutedRef.current = muted;
    window.localStorage.setItem("aquarius-archive-muted", String(muted));
  }, [muted]);

  const stopBackgroundMusic = useCallback(() => {
    const music = musicRef.current;
    if (!music) {
      return;
    }
    music.pause();
  }, []);

  const startBackgroundMusic = useCallback(() => {
    if (!musicEnabledRef.current) {
      return;
    }
    if (!musicRef.current) {
      const audio = new Audio(BGM_SRC);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0.44;
      musicRef.current = audio;
    }
    void musicRef.current.play().catch(() => undefined);
  }, []);

  const requestMusicStart = useCallback(() => {
    musicGestureRef.current = true;
    if (musicEnabledRef.current) {
      startBackgroundMusic();
    }
  }, [startBackgroundMusic]);

  const toggleMusic = useCallback(() => {
    musicGestureRef.current = true;
    const next = !musicEnabledRef.current;
    musicEnabledRef.current = next;
    setMusicEnabled(next);
    if (next) {
      startBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
    playToneRef.current(next ? 520 : 260, 0.08);
  }, [startBackgroundMusic, stopBackgroundMusic]);

  useEffect(() => {
    musicEnabledRef.current = musicEnabled;
    window.localStorage.setItem("aquarius-archive-music", String(musicEnabled));
    if (!musicEnabled) {
      stopBackgroundMusic();
    } else if (musicGestureRef.current) {
      startBackgroundMusic();
    }
  }, [musicEnabled, startBackgroundMusic, stopBackgroundMusic]);

  useEffect(
    () => () => {
      const music = musicRef.current;
      if (music) {
        music.pause();
        musicRef.current = null;
      }
      const scrambleAudio = scrambleAudioRef.current;
      if (scrambleAudio) {
        scrambleAudio.pause();
        scrambleAudioRef.current = null;
      }
    },
    []
  );

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

  const playPositiveJingle = useCallback(() => {
    playTone(660, 0.08);
    window.setTimeout(() => playTone(880, 0.08), 90);
    window.setTimeout(() => playTone(1180, 0.12), 190);
  }, [playTone]);

  const copyShareUrl = useCallback(async () => {
    const link = shareUrl || window.location.origin;
    try {
      await navigator.clipboard?.writeText(link);
    } catch {
      const field = document.createElement("textarea");
      field.value = link;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopiedShare(true);
    window.setTimeout(() => setCopiedShare(false), 1400);
  }, [shareUrl]);

  const prepareRuntimeForModal = useCallback(
    (runtime: Runtime | null = runtimeRef.current) => {
      if (!runtime) {
        return;
      }
      prepareRuntimeInteractionModal(runtime);
      setJoystickActive(false);
      setJoystickKnob({ x: 0, y: 0 });
    },
    []
  );

  const resumeRuntimeAfterModal = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    resumeRuntimeInteractionModal(runtime);
    setJoystickActive(false);
    setJoystickKnob({ x: 0, y: 0 });
  }, []);

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
      setHumanDialogue(null);
      setWeirdoDialogue(null);
      setCollectionPopup(null);
      setArtifact(null);
      playTone(520, 0.12);
      prepareRuntimeForModal();
    },
    [playTone, prepareRuntimeForModal, unlockNpc]
  );

  const openHumanDialogue = useCallback(
    (humanId: HumanId) => {
      const human = getHuman(humanId);
      setHumanDialogue({ humanId, lineIndex: 0 });
      setDialogue(null);
      setWeirdoDialogue(null);
      setCollectionPopup(null);
      setArtifact(null);
      setToast(`${human.title} 想起一則城市傳說`);
      window.setTimeout(() => setToast(""), 1600);
      playTone(610, 0.12);
      prepareRuntimeForModal();
    },
    [playTone, prepareRuntimeForModal]
  );

  const openWeirdoDialogue = useCallback(
    (weirdoId: WeirdoId) => {
      const weirdo = getWeirdo(weirdoId);
      const wasFound = checkedWeirdosRef.current.includes(weirdoId);
      if (!wasFound) {
        const next = [...checkedWeirdosRef.current, weirdoId];
        checkedWeirdosRef.current = next;
        setCheckedWeirdos(next);
        setFoundCount(next.length);
        const runtime = runtimeRef.current;
        if (runtime) {
          updateWeirdoFoundVisuals(runtime, new Set(next));
          showFloatingTimeBonus(runtime, "+30 sec");
        }
        setTimeLeft((current) => current + 30);
        setToast(`觀測成功：${weirdo.title} (${next.length}/${WEIRDOS.length})`);
        setCollectionPopup({ weirdoId, count: next.length });
        window.setTimeout(() => setToast(""), 1900);
        playPositiveJingle();
      } else {
        playTone(520, 0.1);
      }

      setWeirdoDialogue({ weirdoId, lineIndex: 0, justFound: !wasFound });
      setDialogue(null);
      setHumanDialogue(null);
      setArtifact(null);
      prepareRuntimeForModal();
    },
    [playPositiveJingle, playTone, prepareRuntimeForModal]
  );

  const openArtifact = useCallback(
    (objectId: AquariusObjectId) => {
      const item = getAquariusObject(objectId);
      setArtifact({ objectId });
      setDialogue(null);
      setHumanDialogue(null);
      setWeirdoDialogue(null);
      setCollectionPopup(null);
      setToast(item.prompt);
      window.setTimeout(() => setToast(""), 1800);
      playTone(item.kind === "creature" ? 680 : 470, 0.14);
      prepareRuntimeForModal();
    },
    [playTone, prepareRuntimeForModal]
  );

  useEffect(() => {
    openArtifactRef.current = openArtifact;
  }, [openArtifact]);

  useEffect(() => {
    openHumanDialogueRef.current = openHumanDialogue;
  }, [openHumanDialogue]);

  useEffect(() => {
    openWeirdoDialogueRef.current = openWeirdoDialogue;
  }, [openWeirdoDialogue]);

  useEffect(() => {
    openDialogueRef.current = openDialogue;
  }, [openDialogue]);

  const closeDialogue = useCallback(() => {
    setDialogue(null);
    resumeRuntimeAfterModal();
  }, [resumeRuntimeAfterModal]);

  const closeHumanDialogue = useCallback(() => {
    setHumanDialogue(null);
    resumeRuntimeAfterModal();
  }, [resumeRuntimeAfterModal]);

  const closeWeirdoDialogue = useCallback(() => {
    setWeirdoDialogue(null);
    resumeRuntimeAfterModal();
  }, [resumeRuntimeAfterModal]);

  const closeCollectionPopup = useCallback(() => {
    setCollectionPopup(null);
    playTone(460, 0.08);
  }, [playTone]);

  const closeArtifact = useCallback(() => {
    setArtifact(null);
    resumeRuntimeAfterModal();
  }, [resumeRuntimeAfterModal]);

  const activateNearest = useCallback(() => {
    const target = nearestTargetRef.current;
    if (
      !target ||
      target.distance > WORLD_CONFIG.interactDistance ||
      gameStateRef.current !== "playing" ||
      collectionPopupRef.current
    ) {
      return;
    }
    if (target.kind === "npc") {
      openDialogue(target.id);
      return;
    }
    if (target.kind === "human") {
      openHumanDialogue(target.id);
      return;
    }
    if (target.kind === "weirdo") {
      openWeirdoDialogue(target.id);
      return;
    }
    openArtifact(target.id);
  }, [openArtifact, openDialogue, openHumanDialogue, openWeirdoDialogue]);

  const requestJump = useCallback(() => {
    const runtime = runtimeRef.current;
    if (
      !runtime ||
      phaseRef.current !== "playing" ||
      gameStateRef.current !== "playing" ||
      dialogueRef.current ||
      humanDialogueRef.current ||
      weirdoDialogueRef.current ||
      collectionPopupRef.current ||
      artifactRef.current ||
      !runtime.grounded
    ) {
      return;
    }
    runtime.jumpVelocity = WORLD_CONFIG.jumpPower;
    runtime.grounded = false;
    playTone(720, 0.09);
  }, [playTone]);

  const advanceDialogue = useCallback(() => {
    if (collectionPopupRef.current) {
      closeCollectionPopup();
      return;
    }

    const currentWeirdo = weirdoDialogueRef.current;
    if (currentWeirdo) {
      if (currentWeirdo.lineIndex < 1) {
        setWeirdoDialogue({ ...currentWeirdo, lineIndex: currentWeirdo.lineIndex + 1 });
        playTone(620, 0.08);
        return;
      }
      closeWeirdoDialogue();
      return;
    }

    const currentHuman = humanDialogueRef.current;
    if (currentHuman) {
      const maxHumanLine = getHumanClueLines(getHuman(currentHuman.humanId)).length - 1;
      if (currentHuman.lineIndex < maxHumanLine) {
        setHumanDialogue({ ...currentHuman, lineIndex: currentHuman.lineIndex + 1 });
        playTone(500, 0.08);
        return;
      }
      closeHumanDialogue();
      return;
    }

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
  }, [activateNearest, closeArtifact, closeCollectionPopup, closeDialogue, closeHumanDialogue, closeWeirdoDialogue, playTone]);

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
      const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
      const { MTLLoader } = await import("three/examples/jsm/loaders/MTLLoader.js");
      const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
      const { clone: cloneSkinnedModel } = await import(
        "three/examples/jsm/utils/SkeletonUtils.js"
      );
      const THREE_REF = THREE_MODULE;

      setLoadingText("正在前往霓虹浮島...");
      const manager = new THREE_REF.LoadingManager();
      manager.setURLModifier((url) => {
        const normalizedUrl = url.replaceAll("\\", "/");
        if (normalizedUrl.endsWith("Textures/colormap.png")) {
          return "/Textures/colormap.png";
        }
        if (normalizedUrl.includes("model.fbm/base_color.jpg")) {
          return "/assets/landmarks/aquarius-cascade/model.fbm/base_color.jpg";
        }
        if (normalizedUrl.includes("model.fbm/emissive.jpg")) {
          return "/assets/landmarks/aquarius-cascade/model.fbm/emissive.jpg";
        }
        if (normalizedUrl.includes("model.fbm/normal.jpg")) {
          return "/assets/landmarks/aquarius-cascade/model.fbm/normal.jpg";
        }
        if (normalizedUrl.includes("model.fbm/texture_0_roughness.png")) {
          return "/assets/landmarks/aquarius-cascade/model.fbm/texture_0_roughness.png";
        }
        if (normalizedUrl.includes("model.fbm/texture_0_metallic.png")) {
          return "/assets/landmarks/aquarius-cascade/model.fbm/texture_0_metallic.png";
        }
        return url;
      });
      manager.onProgress = (_url, loaded, total) => {
        const percent = total > 0 ? Math.round((loaded / total) * 88) : 30;
        setProgress(Math.max(8, percent));
        if (percent > 45) {
          setLoadingText("正在點亮星球地表……");
        }
      };
      const gltfLoader = new GLTFLoader(manager);
      const fbxLoader = new FBXLoader(manager);
      const uniqueAssets = Array.from(
        new Set([
          PLAYER_MODEL,
          UNIVERSAL_ANIMATION_LIBRARY,
          ...CHARACTER_ASSETS,
          ...PLAYER_AVATARS
            .filter((avatar) => !avatar.proceduralOnly && !avatar.runtimeProcedural)
            .map((avatar) => avatar.model),
          ...AUTHOR_MESHY_ANIMATION_ASSET_LIST,
          ...HUMANS.map((human) => human.model),
          ...WEIRDOS.map((weirdo) => weirdo.model),
          ...WEIRDOS.flatMap((weirdo) => weirdo.animationAssets ?? []),
          ...FOOD_PICKUPS.map((food) => food.asset),
          ...CITY_MODEL_ASSETS.filter((asset) => !shouldSkipLooseCityAsset(asset)).map((asset) => asset.asset),
        ])
      );
      const loadedModels = new Map<string, ModelResource>();

      await Promise.all(
        uniqueAssets.map(
          (path) =>
            new Promise<void>((resolve, reject) => {
              const onLoaded = (model: THREE.Group, animations: THREE.AnimationClip[]) => {
                model.traverse((child) => {
                  child.castShadow = false;
                  child.receiveShadow = false;
                });
                loadedModels.set(path, {
                  scene: model,
                  animations,
                });
                resolve();
              };

              const lowerPath = path.toLowerCase();

              if (lowerPath.endsWith(".obj")) {
                const basePath = path.slice(0, path.lastIndexOf("/") + 1);
                const fileName = path.slice(path.lastIndexOf("/") + 1);
                const materialName = fileName.replace(/\.obj$/i, ".mtl");
                const localMtlLoader = new MTLLoader(manager);
                const localObjLoader = new OBJLoader(manager);
                localMtlLoader.setPath(basePath);
                localMtlLoader.setResourcePath(basePath);
                localMtlLoader.load(
                  materialName,
                  (materials) => {
                    materials.preload();
                    localObjLoader.setMaterials(materials);
                    localObjLoader.setPath(basePath);
                    localObjLoader.load(
                      fileName,
                      (obj) => {
                        onLoaded(obj as THREE.Group, []);
                      },
                      undefined,
                      reject
                    );
                  },
                  undefined,
                  () => {
                    const fallbackObjLoader = new OBJLoader(manager);
                    fallbackObjLoader.setPath(basePath);
                    fallbackObjLoader.load(
                      fileName,
                      (obj) => {
                        onLoaded(obj as THREE.Group, []);
                      },
                      undefined,
                      reject
                    );
                  }
                );
                return;
              }

              if (lowerPath.endsWith(".fbx")) {
                fbxLoader.load(
                  path,
                  (fbx) => {
                    onLoaded(fbx as THREE.Group, fbx.animations ?? []);
                  },
                  undefined,
                  reject
                );
                return;
              }

              gltfLoader.load(
                path,
                (gltf) => {
                  const model = gltf.scene as THREE.Group;
                  onLoaded(model, gltf.animations ?? []);
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
      setLoadingText("正在抵達霓虹浮島...");
      const cloneAnimatedModel = cloneSkinnedModel as CloneModelFn;
      const animationLibrary = retargetUniversalAnimationClips(
        THREE_REF,
        loadedModels.get(UNIVERSAL_ANIMATION_LIBRARY)?.animations ?? []
      );

      const scene = new THREE_REF.Scene();
      scene.background = new THREE_REF.Color("#09122d");
      scene.fog = new THREE_REF.FogExp2("#0d1632", 0.027);

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

      const camera = new THREE_REF.PerspectiveCamera(50, 1, 0.1, 160);
      camera.position.set(
        PLAYER_START.x + DEFAULT_CAMERA_OFFSET.x,
        DEFAULT_CAMERA_OFFSET.y,
        PLAYER_START.z + DEFAULT_CAMERA_OFFSET.z
      );

      const controls = new OrbitControlsCtor(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.minDistance = WORLD_CONFIG.cameraMin;
      controls.maxDistance = WORLD_CONFIG.cameraMax;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.minPolarAngle = Math.PI * 0.18;
      controls.target.set(PLAYER_START.x, 1, PLAYER_START.z);

      const worldRoot = new THREE_REF.Group();
      scene.add(worldRoot);
      const npcRoot = new THREE_REF.Group();
      scene.add(npcRoot);
      const humanRoot = new THREE_REF.Group();
      scene.add(humanRoot);
      const objectRoot = new THREE_REF.Group();
      scene.add(objectRoot);
      const foodRoot = new THREE_REF.Group();
      scene.add(foodRoot);
      const weirdoRoot = new THREE_REF.Group();
      scene.add(weirdoRoot);

      const actorMixers: THREE.AnimationMixer[] = [];
      const lighting = createLighting(THREE_REF, scene);
      const ground = createWorld(THREE_REF, worldRoot);
      const ambientModels = addCityModelAssets(
        THREE_REF,
        worldRoot,
        loadedModels,
        cloneAnimatedModel,
        animationLibrary,
        actorMixers
      );
      const stars = createStars(THREE_REF);
      scene.add(stars);
      const particles = createParticles(THREE_REF);
      particles.visible = qualityRef.current !== "low";
      scene.add(particles);
      const skyWorlds = createSkyWorlds(THREE_REF);
      scene.add(skyWorlds);

      const player = new THREE_REF.Group();
      player.name = "player";
      const initialAvatar = getAvatar(selectedAvatarRef.current);
      const playerModel = createRuntimePlayerAvatarModel(
        THREE_REF,
        initialAvatar,
        loadedModels,
        cloneAnimatedModel
      );
      playerModel.rotation.y = getPlayerFacingOffset(playerModel);
      groundModelToFloor(THREE_REF, playerModel, PLAYER_FLOOR_OFFSET);
      player.add(playerModel);
      const playerLabel = makePlayerNameLabel(THREE_REF, playerNameRef.current);
      playerLabel.position.set(0, 2.12, 0);
      player.add(playerLabel);
      player.position.set(PLAYER_START.x, 0, PLAYER_START.z);
      scene.add(player);
      const playerAnimator = createPlayerAvatarAnimator(
        THREE_REF,
        playerModel,
        initialAvatar,
        loadedModels,
        animationLibrary
      );
      if (playerAnimator) {
        actorMixers.push(playerAnimator.mixer);
        playActorAction(playerAnimator, "idle", 0);
      }

      const npcGroups = new Map<ArchetypeId, THREE.Group>();
      const npcLabels = new Map<ArchetypeId, THREE.Sprite>();
      const npcPrompts = new Map<ArchetypeId, THREE.Sprite>();
      const npcPositions = new Map<ArchetypeId, THREE.Vector3>();
      const npcAnimators = new Map<ArchetypeId, ActorAnimator>();
      const npcMotion = new Map<ArchetypeId, WanderState>();
      const humanGroups = new Map<HumanId, THREE.Group>();
      const humanLabels = new Map<HumanId, THREE.Sprite>();
      const humanPrompts = new Map<HumanId, THREE.Sprite>();
      const humanPositions = new Map<HumanId, THREE.Vector3>();
      const humanAnimators = new Map<HumanId, ActorAnimator>();
      const humanMotion = new Map<HumanId, WanderState>();
      const objectGroups = new Map<AquariusObjectId, THREE.Group>();
      const objectLabels = new Map<AquariusObjectId, THREE.Sprite>();
      const objectPrompts = new Map<AquariusObjectId, THREE.Sprite>();
      const objectPositions = new Map<AquariusObjectId, THREE.Vector3>();
      const foodGroups = new Map<FoodId, THREE.Group>();
      const foodPositions = new Map<FoodId, THREE.Vector3>();
      const floatingPickupTexts: FloatingPickupText[] = [];
      const weirdoGroups = new Map<WeirdoId, THREE.Group>();
      const weirdoLabels = new Map<WeirdoId, THREE.Sprite>();
      const weirdoPrompts = new Map<WeirdoId, THREE.Sprite>();
      const weirdoFoundBadges = new Map<WeirdoId, THREE.Sprite>();
      const weirdoPositions = new Map<WeirdoId, THREE.Vector3>();

      NPCS.forEach((npc) => {
        const source = loadedModels.get(npc.model);
        const group = createNpcGroup(THREE_REF, npc, source?.scene, cloneAnimatedModel);
        npcRoot.add(group);
        npcGroups.set(npc.id, group);
        npcLabels.set(npc.id, group.userData.label as THREE.Sprite);
        npcPrompts.set(npc.id, group.userData.prompt as THREE.Sprite);
        npcPositions.set(npc.id, new THREE_REF.Vector3(...scaleWorldPosition(npc.position)));
        const actorModel = group.userData.actorModel as THREE.Group | undefined;
        if (source && actorModel) {
          const animator = createActorAnimator(
            THREE_REF,
            actorModel,
            source.animations,
            animationLibrary
          );
          npcAnimators.set(npc.id, animator);
          actorMixers.push(animator.mixer);
          playActorAction(animator, getNpcIdleAction(npc.id), 0);
        }
        npcMotion.set(
          npc.id,
          createWanderState(
            THREE_REF,
            new THREE_REF.Vector3(...scaleWorldPosition(npc.position)),
            scaleWorldValue(npc.id === "wanderer" ? 2.6 : npc.id === "observer" ? 0.9 : 1.55),
            npc.id === "wanderer" ? 0.72 : npc.id === "inventor" ? 0.48 : 0.56,
            getNpcIdleAction(npc.id)
          )
        );
      });

      HUMANS.forEach((human) => {
        const source = loadedModels.get(human.model);
        const group = createHumanGroup(THREE_REF, human, source?.scene, cloneAnimatedModel);
        humanRoot.add(group);
        humanGroups.set(human.id, group);
        humanLabels.set(human.id, group.userData.label as THREE.Sprite);
        humanPrompts.set(human.id, group.userData.prompt as THREE.Sprite);
        humanPositions.set(human.id, new THREE_REF.Vector3(...scaleWorldPosition(human.position)));
        const actorModel = group.userData.actorModel as THREE.Group | undefined;
        if (source && actorModel) {
          const animator = createActorAnimator(
            THREE_REF,
            actorModel,
            source.animations,
            animationLibrary
          );
          humanAnimators.set(human.id, animator);
          actorMixers.push(animator.mixer);
          playActorAction(animator, "talk", 0);
        }
        humanMotion.set(
          human.id,
          createWanderState(
            THREE_REF,
            new THREE_REF.Vector3(...scaleWorldPosition(human.position)),
            0,
            0,
            "talk"
          )
        );
      });

      getActiveAquariusObjects().forEach((item) => {
        const group = createAquariusObjectGroup(THREE_REF, item);
        objectRoot.add(group);
        objectGroups.set(item.id, group);
        objectLabels.set(item.id, group.userData.label as THREE.Sprite);
        objectPrompts.set(item.id, group.userData.prompt as THREE.Sprite);
        objectPositions.set(item.id, new THREE_REF.Vector3(scaleWorldValue(item.position[0]), 0, scaleWorldValue(item.position[2])));
      });

      FOOD_PICKUPS.forEach((food) => {
        const source = loadedModels.get(food.asset);
        const group = createFoodPickupGroup(
          THREE_REF,
          food,
          source?.scene,
          cloneAnimatedModel
        );
        foodRoot.add(group);
        foodGroups.set(food.id, group);
        foodPositions.set(food.id, new THREE_REF.Vector3(...scaleWorldPosition(food.position)));
      });

      WEIRDOS.forEach((weirdo) => {
        const source = loadedModels.get(weirdo.model);
        const extraAnimations = (weirdo.animationAssets ?? []).flatMap(
          (asset) => loadedModels.get(asset)?.animations ?? []
        );
        const group = createWeirdoGroup(
          THREE_REF,
          weirdo,
          source?.scene,
          cloneAnimatedModel,
          [...(source?.animations ?? []), ...extraAnimations]
        );
        weirdoRoot.add(group);
        weirdoGroups.set(weirdo.id, group);
        weirdoLabels.set(weirdo.id, group.userData.label as THREE.Sprite);
        weirdoPrompts.set(weirdo.id, group.userData.prompt as THREE.Sprite);
        weirdoFoundBadges.set(weirdo.id, group.userData.foundBadge as THREE.Sprite);
        weirdoPositions.set(weirdo.id, new THREE_REF.Vector3(...scaleWorldPosition(weirdo.position)));
      });

      const obstacles = [
        { x: 0, z: 0, radius: 3.25 },
        ...getActiveAquariusObjects().filter((item) => item.collisionRadius > 0).map((item) => ({
          x: scaleWorldValue(item.position[0]),
          z: scaleWorldValue(item.position[2]),
          radius: item.collisionRadius + 0.18,
        })),
        ...CITY_BUILDINGS.map((building) => ({
          x: scaleWorldValue(building.position[0]),
          z: scaleWorldValue(building.position[1]),
          radius: building.collisionRadius + 0.52,
        })),
        ...CITY_MODEL_ASSETS.filter((asset) => asset.collision && !shouldSkipLooseCityAsset(asset)).map((asset) => ({
          x: scaleWorldValue(asset.position[0]),
          z: scaleWorldValue(asset.position[2]),
          radius: estimateModelCollisionRadius(asset),
        })),
        ...COMPLETE_CITY_HOUSES.map((house) => ({
          x: scaleWorldValue(house.position[0]),
          z: scaleWorldValue(house.position[1]),
          radius: Math.max(house.width, house.depth) * 0.68,
        })),
        ...EXTRA_COMMUNITY_HOUSES.map((house) => ({
          x: scaleWorldValue(house.position[0]),
          z: scaleWorldValue(house.position[1]),
          radius: Math.max(house.width, house.depth) * 0.62,
        })),
        ...EXTRA_LIGHTHOUSE_SPECS.map((tower) => ({
          x: scaleWorldValue(tower.x),
          z: scaleWorldValue(tower.z),
          radius: 0.82,
        })),
        ...EXTRA_FOUNTAIN_SPECS.map((fountain) => ({
          x: scaleWorldValue(fountain.x),
          z: scaleWorldValue(fountain.z),
          radius: Math.max(0.76, fountain.radius * 0.9),
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
        humanRoot,
        objectRoot,
        foodRoot,
        player,
        playerModel,
        playerLabel,
        playerAnimator,
        loadedModels,
        cloneAnimatedModel,
        animationLibrary,
        stars,
        particles,
        skyWorlds,
        hemiLight: lighting.hemi,
        sunLight: lighting.sun,
        velocity: new THREE_REF.Vector3(),
        jumpVelocity: 0,
        grounded: true,
        clickTarget: null,
        pendingNpcId: null,
        pendingHumanId: null,
        pendingObjectId: null,
        pendingWeirdoId: null,
        keys: new Set(),
        joystick: { x: 0, y: 0 },
        pointerDown: { x: 0, y: 0 },
        draggedCamera: false,
        npcGroups,
        npcLabels,
        npcPrompts,
        npcPositions,
        npcAnimators,
        npcMotion,
        humanGroups,
        humanLabels,
        humanPrompts,
        humanPositions,
        humanAnimators,
        humanMotion,
        objectGroups,
        objectLabels,
        objectPrompts,
        objectPositions,
        foodGroups,
        foodPositions,
        floatingPickupTexts,
        weirdoRoot,
        weirdoGroups,
        weirdoLabels,
        weirdoPrompts,
        weirdoFoundBadges,
        weirdoPositions,
        actorMixers,
        ambientModels,
        obstacles,
        jumpPlatforms: createJumpPlatformColliders(),
        cameraReturnToDefault: false,
        autoQualitySlowFrames: 0,
        lastAutoQualityAt: 0,
        inputPausedUntil: 0,
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
        if (
          moved > 10 ||
          phaseRef.current !== "playing" ||
          gameStateRef.current !== "playing" ||
          dialogueRef.current ||
          humanDialogueRef.current ||
          weirdoDialogueRef.current ||
          collectionPopupRef.current ||
          artifactRef.current
        ) {
          return;
        }

        const rect = renderer.domElement.getBoundingClientRect();
        runtime.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        runtime.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        runtime.raycaster.setFromCamera(runtime.mouse, camera);
        const hits = runtime.raycaster.intersectObjects([weirdoRoot, npcRoot, humanRoot, objectRoot, ground], true);
        const weirdoHit = hits.find((hit) => findWeirdoId(hit.object));
        if (weirdoHit) {
          const weirdoId = findWeirdoId(weirdoHit.object) as WeirdoId;
          const weirdoPosition = runtime.weirdoPositions.get(weirdoId);
          if (weirdoPosition) {
            const away = new THREE_REF.Vector3()
              .subVectors(runtime.player.position, weirdoPosition)
              .setY(0);
            if (away.lengthSq() < 0.01) {
              away.set(1, 0, 0);
            }
            away.normalize();
            runtime.clickTarget = weirdoPosition
              .clone()
              .add(away.multiplyScalar(WORLD_CONFIG.interactDistance - 0.35));
            runtime.pendingNpcId = null;
            runtime.pendingHumanId = null;
            runtime.pendingObjectId = null;
            runtime.pendingWeirdoId = weirdoId;
          }
          return;
        }
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
            runtime.pendingHumanId = null;
            runtime.pendingObjectId = null;
            runtime.pendingWeirdoId = null;
          }
          return;
        }

        const humanHit = hits.find((hit) => findHumanId(hit.object));
        if (humanHit) {
          const humanId = findHumanId(humanHit.object) as HumanId;
          const humanPosition = runtime.humanPositions.get(humanId);
          if (humanPosition) {
            const away = new THREE_REF.Vector3()
              .subVectors(runtime.player.position, humanPosition)
              .setY(0);
            if (away.lengthSq() < 0.01) {
              away.set(1, 0, 0);
            }
            away.normalize();
            runtime.clickTarget = humanPosition
              .clone()
              .add(away.multiplyScalar(WORLD_CONFIG.interactDistance - 0.35));
            runtime.pendingNpcId = null;
            runtime.pendingHumanId = humanId;
            runtime.pendingObjectId = null;
            runtime.pendingWeirdoId = null;
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
            runtime.pendingHumanId = null;
            runtime.pendingWeirdoId = null;
          }
          return;
        }

        const groundHit = hits.find((hit) => hit.object === ground);
        if (groundHit) {
          const point = clampToWorld(groundHit.point.x, groundHit.point.z);
          runtime.clickTarget = new THREE_REF.Vector3(point.x, 0, point.z);
          runtime.pendingNpcId = null;
          runtime.pendingHumanId = null;
          runtime.pendingObjectId = null;
          runtime.pendingWeirdoId = null;
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

      setDefaultCameraView(runtime, true);
      runtimeRef.current = runtime;
      runtime.resize();
      setProgress(100);
      setPhase("intro");

      const animate = () => {
        const delta = Math.min(runtime.clock.getDelta(), 0.05);
        runtime.frame += 1;
        autoTuneMobileQuality(runtime, delta, qualityRef.current, setQuality);
        updateRuntime(runtime, delta, {
          phase: phaseRef.current,
          gameState: gameStateRef.current,
          dialogue: dialogueRef.current,
          humanDialogue: humanDialogueRef.current,
          weirdoDialogue: weirdoDialogueRef.current,
          collectionPopup: collectionPopupRef.current,
          artifact: artifactRef.current,
          onRegion: setCurrentRegion,
          onMiniMap: setMiniMap,
          onNearestNpc: setNearestNpcId,
          onNearestTarget: setNearestTarget,
          onOpenDialogue: (id) => openDialogueRef.current(id),
          onOpenHumanDialogue: (id) => openHumanDialogueRef.current(id),
          onOpenWeirdoDialogue: (id) => openWeirdoDialogueRef.current(id),
          onOpenArtifact: (id) => openArtifactRef.current(id),
          onTutorialMove: () => {
            setTutorialStage((current) => (current === "move" ? "look" : current));
          },
          onFootstep: () => playToneRef.current(180, 0.035),
          onFoodCollected: (foodId) => {
            const runtimeNow = runtimeRef.current;
            if (runtimeNow) {
              showFloatingTimeBonus(runtimeNow);
            }
            setTimeLeft((current) => current + 60);
            const food = FOOD_PICKUPS.find((item) => item.id === foodId);
            setToast(food ? `${food.title} +1 min` : "+1 min");
            window.setTimeout(() => setToast(""), 1200);
            playToneRef.current(780, 0.12);
          },
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
        RESET_CAMERA_KEYS.has(event.code)
      ) {
        event.preventDefault();
      }

      if (runtime && MOVEMENT_KEYS.has(event.code)) {
        runtime.keys.add(event.code);
        runtime.clickTarget = null;
        runtime.pendingNpcId = null;
        runtime.pendingHumanId = null;
        runtime.pendingObjectId = null;
        runtime.pendingWeirdoId = null;
      }

      if (event.repeat) {
        return;
      }

      if (event.code === "Escape") {
        if (collectionPopupRef.current) {
          closeCollectionPopup();
          return;
        }
        if (dialogueRef.current) {
          closeDialogue();
          return;
        }
        if (humanDialogueRef.current) {
          closeHumanDialogue();
          return;
        }
        if (weirdoDialogueRef.current) {
          closeWeirdoDialogue();
          return;
        }
        if (artifactRef.current) {
          closeArtifact();
          return;
        }
      }

      if (JUMP_KEYS.has(event.code) && phaseRef.current === "playing") {
        if (collectionPopupRef.current || dialogueRef.current || humanDialogueRef.current || weirdoDialogueRef.current || artifactRef.current) {
          advanceDialogue();
          return;
        }
        requestJump();
        return;
      }

      if (RESET_CAMERA_KEYS.has(event.code) && phaseRef.current === "playing" && runtime) {
        runtime.cameraReturnToDefault = true;
        setToast("已回到預設視角");
        window.setTimeout(() => setToast(""), 1200);
        return;
      }

      if (
        INTERACTION_KEYS.has(event.code) &&
        phaseRef.current === "playing" &&
        gameStateRef.current === "playing"
      ) {
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
  }, [advanceDialogue, closeArtifact, closeCollectionPopup, closeDialogue, closeHumanDialogue, closeWeirdoDialogue, requestJump]);

  const openOriginStory = useCallback(() => {
    requestMusicStart();
    setStoryIndex(0);
    setIntroStep("story");
    playTone(520, 0.12);
  }, [playTone, requestMusicStart]);

  const returnToLanding = useCallback(() => {
    setIntroStep("landing");
    playTone(320, 0.08);
  }, [playTone]);

  const advanceStoryPage = useCallback(() => {
    setStoryIndex((current) => {
      if (current >= AQUARIUS_ORIGIN_STORY.length - 1) {
        setIntroStep("setup");
        return current;
      }
      return current + 1;
    });
    playTone(540, 0.08);
  }, [playTone]);

  const previousStoryPage = useCallback(() => {
    setStoryIndex((current) => {
      if (current <= 0) {
        setIntroStep("landing");
        return 0;
      }
      return current - 1;
    });
    playTone(340, 0.08);
  }, [playTone]);

  const enterWorld = useCallback(() => {
    requestMusicStart();
    setPlayerName((current) => current.trim() || "player1");
    selectedAvatarRef.current = selectedAvatar;
    window.localStorage.setItem("aquarius-player-avatar", selectedAvatar);
    checkedWeirdosRef.current = [];
    setCheckedWeirdos([]);
    setFoundCount(0);
    setTimeLeft(GAME_DURATION_SECONDS);
    gameStateRef.current = "playing";
    setGameState("playing");
    setDialogue(null);
    setHumanDialogue(null);
    setWeirdoDialogue(null);
    setCollectionPopup(null);
    setArtifact(null);
    setMiniMap({ x: PLAYER_START.x, z: PLAYER_START.z, angle: 0 });
    const runtime = runtimeRef.current;
    if (runtime) {
      setRuntimePlayerAvatar(runtime, getAvatar(selectedAvatar));
      if (selectedAvatar === "author-self") {
        const introLockMs = playAuthorIntro(runtime.playerAnimator);
        runtime.inputPausedUntil = performance.now() + introLockMs;
      }
      updateWeirdoFoundVisuals(runtime, new Set());
      resetFoodPickups(runtime);
      runtime.player.position.set(PLAYER_START.x, 0, PLAYER_START.z);
      runtime.player.userData.lastSafeWalkable = runtime.player.position.clone();
      runtime.velocity.set(0, 0, 0);
      runtime.clickTarget = null;
      runtime.pendingNpcId = null;
      runtime.pendingHumanId = null;
      runtime.pendingObjectId = null;
      runtime.pendingWeirdoId = null;
      setDefaultCameraView(runtime, true);
    }
    setPhase("playing");
    setToast("星球已開放登陸");
    window.setTimeout(() => setToast(""), 1800);
    playTone(620, 0.16);
  }, [playTone, requestMusicStart, selectedAvatar]);

  const returnToSetupFromGame = useCallback(() => {
    const runtime = runtimeRef.current;
    if (runtime) {
      runtime.keys.clear();
      runtime.joystick = { x: 0, y: 0 };
      runtime.velocity.set(0, 0, 0);
      runtime.controls.enableRotate = true;
      runtime.cameraReturnToDefault = true;
    }
    setHelpOpen(false);
    setDialogue(null);
    setHumanDialogue(null);
    setWeirdoDialogue(null);
    setCollectionPopup(null);
    setArtifact(null);
    gameStateRef.current = "start";
    setGameState("start");
    setPhase("intro");
    setIntroStep("setup");
    playTone(320, 0.08);
  }, [playTone]);

  const restartObservation = useCallback(() => {
    checkedWeirdosRef.current = [];
    setCheckedWeirdos([]);
    setFoundCount(0);
    setTimeLeft(GAME_DURATION_SECONDS);
    gameStateRef.current = "playing";
    setGameState("playing");
    setDialogue(null);
    setHumanDialogue(null);
    setWeirdoDialogue(null);
    setCollectionPopup(null);
    setArtifact(null);
    setHelpOpen(false);
    setMiniMap({ x: PLAYER_START.x, z: PLAYER_START.z, angle: 0 });
    const runtime = runtimeRef.current;
    if (runtime) {
      updateWeirdoFoundVisuals(runtime, new Set());
      resetFoodPickups(runtime);
      runtime.player.position.set(PLAYER_START.x, 0, PLAYER_START.z);
      runtime.player.userData.lastSafeWalkable = runtime.player.position.clone();
      runtime.velocity.set(0, 0, 0);
      runtime.keys.clear();
      runtime.joystick = { x: 0, y: 0 };
      runtime.clickTarget = null;
      runtime.pendingNpcId = null;
      runtime.pendingHumanId = null;
      runtime.pendingObjectId = null;
      runtime.pendingWeirdoId = null;
      runtime.controls.enableRotate = true;
      setDefaultCameraView(runtime, true);
    }
    setToast("重新開始觀測");
    window.setTimeout(() => setToast(""), 1400);
    playTone(620, 0.14);
  }, [playTone]);

  const resetCamera = useCallback(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    runtime.cameraReturnToDefault = true;
    setToast("已回到預設視角");
    window.setTimeout(() => setToast(""), 1200);
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
    let x = Math.cos(angle) * length;
    let y = Math.sin(angle) * length;
    if (Math.abs(x) < 0.16 && Math.abs(y) > 0.28) {
      x = 0;
    }
    if (Math.abs(y) < 0.16 && Math.abs(x) > 0.28) {
      y = 0;
    }
    setJoystickKnob({ x: x * 32, y: y * 32 });
    if (runtimeRef.current) {
      runtimeRef.current.joystick = { x, y };
      runtimeRef.current.clickTarget = null;
      runtimeRef.current.pendingNpcId = null;
      runtimeRef.current.pendingHumanId = null;
      runtimeRef.current.pendingObjectId = null;
      runtimeRef.current.pendingWeirdoId = null;
    }
  }, []);

  const handleJoystickEnd = useCallback(() => {
    setJoystickActive(false);
    setJoystickKnob({ x: 0, y: 0 });
    if (runtimeRef.current) {
      runtimeRef.current.joystick = { x: 0, y: 0 };
    }
  }, []);

  const handleMobileJump = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (gameStateRef.current === "playing") {
        requestJump();
      } else {
        restartObservation();
      }
    },
    [requestJump, restartObservation]
  );

  const selectAdjacentAvatar = useCallback(
    (direction: -1 | 1) => {
      const currentIndex = Math.max(
        0,
        PLAYER_AVATARS.findIndex((avatar) => avatar.id === selectedAvatar)
      );
      const nextIndex = (currentIndex + direction + PLAYER_AVATARS.length) % PLAYER_AVATARS.length;
      setSelectedAvatar(PLAYER_AVATARS[nextIndex].id);
    },
    [selectedAvatar]
  );

  const interactionLabel =
    nearestTarget?.kind === "weirdo" && nearestWeirdo && phase === "playing" && gameState === "playing"
      ? `E｜觀測 ${nearestWeirdo.title}`
      : nearestTarget?.kind === "npc" && nearestNpc && phase === "playing" && gameState === "playing"
      ? `E｜與 ${nearestNpc.title} 交談`
      : nearestTarget?.kind === "human" && nearestHuman && phase === "playing" && gameState === "playing"
        ? `E｜聽 ${nearestHuman.title} 的城市傳說`
      : nearestTarget?.kind === "object" && nearestObject && phase === "playing" && gameState === "playing"
        ? `E｜觀察 ${nearestObject.title}`
        : "";
  const hasBlockingOverlay =
    Boolean(dialogue || humanDialogue || weirdoDialogue || collectionPopup || artifact) ||
    gameState !== "playing";
  const miniMapZones = useMemo(
    () =>
      CITY_PLATFORMS.map((platform) => {
        const x = scaleWorldValue(platform.position[0]);
        const z = scaleWorldValue(platform.position[1]);
        const width = scaleWorldValue(platform.size[0]);
        const depth = scaleWorldValue(platform.size[1]);
        return {
          id: platform.id,
          style: {
            left: `${worldToMiniMapX(x)}%`,
            top: `${worldToMiniMapY(z)}%`,
            width: `${(width / (WORLD_CONFIG.worldRadius * 2)) * 100}%`,
            height: `${(depth / (WORLD_CONFIG.worldRadius * 2)) * 100}%`,
            background: platform.color,
            borderColor: platform.accent,
          } as CSSProperties,
        };
      }),
    []
  );
  const miniMapRoads = useMemo(
    () =>
      CITY_ROADS.map((road) => {
        const from = scaleWorldPoint(road.from[0], road.from[1]);
        const to = scaleWorldPoint(road.to[0], road.to[1]);
        const x1 = worldToMiniMapX(from[0]);
        const y1 = worldToMiniMapY(from[1]);
        const x2 = worldToMiniMapX(to[0]);
        const y2 = worldToMiniMapY(to[1]);
        const width = Math.hypot(x2 - x1, y2 - y1);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        return {
          id: road.id,
          style: {
            left: `${(x1 + x2) / 2}%`,
            top: `${(y1 + y2) / 2}%`,
            width: `${width}%`,
            height: `${Math.max(1.4, (scaleWorldValue(road.width) / (WORLD_CONFIG.worldRadius * 2)) * 100)}%`,
            transform: `translate(-50%, -50%) rotate(${angle}rad)`,
            background: road.kind === "main" ? "#2e3b62" : "#38456e",
          } as CSSProperties,
        };
      }),
    []
  );
  const miniMapPlayerStyle = {
    left: `${Math.max(4, Math.min(96, worldToMiniMapX(miniMap.x)))}%`,
    top: `${Math.max(4, Math.min(96, worldToMiniMapY(miniMap.z)))}%`,
    transform: `translate(-50%, -50%) rotate(${miniMap.angle}rad)`,
  } as CSSProperties;

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
          <small>Jay Peng Made 👽</small>
        </section>
      ) : null}

      {phase === "intro" ? (
        <section
          className={`intro-screen ${
            introStep === "setup"
              ? "setup-screen"
              : introStep === "story"
                ? "story-screen"
                : "landing-screen"
          }`}
          aria-label={
            introStep === "setup"
              ? "選擇角色"
              : introStep === "story"
                ? "水瓶座起源"
                : "登陸星球"
          }
        >
          <div className="intro-audio-control" aria-label="背景音樂控制">
            <button
              type="button"
              onClick={toggleMusic}
              aria-pressed={musicEnabled}
              aria-label={musicEnabled ? "關閉背景音樂" : "開啟背景音樂"}
              title={musicEnabled ? "關閉背景音樂" : "開啟背景音樂"}
            >
              <span className={musicEnabled ? "sound-icon sound-on" : "sound-icon sound-off"} aria-hidden="true" />
            </button>
          </div>
          {introStep === "landing" ? (
            <div className="landing-panel">
              <p className="eyebrow">Developer: Jay Peng</p>
              <h1
                className="scramble-title"
                onMouseEnter={playTitleScramble}
                onFocus={playTitleScramble}
                tabIndex={0}
              >
                {scrambledTitle}
              </h1>
              <h2>水瓶座怪人觀測系統</h2>
              <p>警告：有 8 位行為怪異的『水瓶座怪人』已暴走。需要你在限時內潛入這座霓虹浮島，協助幫我找到他們！</p>
              <MarqueeTags items={LANDING_TAGS} />
              <div className="landing-actions">
                <button className="enter-world-button" type="button" onClick={openOriginStory}>
                  開始遊戲
                </button>
              </div>
            </div>
          ) : introStep === "story" ? (
            <>
              <button
                className="circle-back-button"
                type="button"
                onClick={previousStoryPage}
                aria-label="返回上一頁"
              >
                ←
              </button>
              <div className="story-pager" aria-label="水瓶座起源故事">
                <article className="story-chapter" key={AQUARIUS_ORIGIN_STORY[storyIndex].chapter}>
                  <p className="eyebrow">{AQUARIUS_ORIGIN_STORY[storyIndex].chapter}</p>
                  <h2>{AQUARIUS_ORIGIN_STORY[storyIndex].title}</h2>
                  <p>{AQUARIUS_ORIGIN_STORY[storyIndex].copy}</p>
                </article>
                <div className="story-page-actions">
                  <button className="story-arrow-button" type="button" onClick={previousStoryPage} aria-label="上一頁">
                    &lt;
                  </button>
                  <span>{storyIndex + 1} / {AQUARIUS_ORIGIN_STORY.length}</span>
                  <button
                    className="story-arrow-button"
                    type="button"
                    onClick={advanceStoryPage}
                    aria-label={storyIndex < AQUARIUS_ORIGIN_STORY.length - 1 ? "下一頁" : "選擇角色"}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                className="circle-back-button"
                type="button"
                onClick={returnToLanding}
                aria-label="返回首頁"
              >
                ←
              </button>
              <div className="avatar-setup-layout">
                <aside className="avatar-preview-panel" aria-label={`${selectedAvatarData.title} 3D 預覽`}>
                  <div className="avatar-mobile-switcher" aria-label="手機角色切換">
                    <button
                      type="button"
                      className="avatar-cycle-button"
                      onClick={() => selectAdjacentAvatar(-1)}
                      aria-label="上一個角色"
                    >
                      &lt;
                    </button>
                    <strong aria-live="polite">{selectedAvatarData.title}</strong>
                    <button
                      type="button"
                      className="avatar-cycle-button"
                      onClick={() => selectAdjacentAvatar(1)}
                      aria-label="下一個角色"
                    >
                      &gt;
                    </button>
                  </div>
                  <canvas ref={previewCanvasRef} className="avatar-preview-canvas" />
                  <div className="avatar-preview-copy">
                    <span>SELECTED AVATAR</span>
                    <strong>{selectedAvatarData.title}</strong>
                    <p>{selectedAvatarData.description}</p>
                  </div>
                </aside>
                <div className="player-setup" aria-label="玩家設定">
                  <div className="setup-heading">
                    <p className="eyebrow">CREATE YOUR VISITOR</p>
                    <h2>選擇你的星球角色</h2>
                  </div>
                  <label>
                    <span>玩家名字（可不填）</span>
                    <input
                      value={playerName}
                      onChange={(event) => setPlayerName(event.target.value)}
                      placeholder="player1"
                      maxLength={18}
                    />
                  </label>
                  <div className="avatar-picker" aria-label="角色選擇">
                    {PLAYER_AVATARS.map((avatar) => (
                      <button
                        key={avatar.id}
                        type="button"
                        className={selectedAvatar === avatar.id ? "selected" : ""}
                        onClick={() => setSelectedAvatar(avatar.id)}
                      >
                        <span className="avatar-head" data-avatar={avatar.id} aria-hidden="true" />
                        <span>
                          <strong>{avatar.title}</strong>
                          <small>{avatar.description}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="setup-actions">
                    <button className="enter-world-button" type="button" onClick={enterWorld}>
                      登陸星球
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}

      {phase === "playing" ? (
        <>
          <button
            className="circle-back-button in-game"
            type="button"
            onClick={returnToSetupFromGame}
            aria-label="返回角色選擇"
          >
            ←
          </button>
          <header className="minimal-hud" aria-label="目前狀態">
            <nav aria-label="遊戲設定">
              <button type="button" onClick={resetCamera} title="回到預設視角">
                視角
              </button>
              <button
                className="audio-toggle-button"
                type="button"
                onClick={toggleMusic}
                title="背景音樂"
                aria-pressed={musicEnabled}
                aria-label={musicEnabled ? "關閉背景音樂" : "開啟背景音樂"}
              >
                <span className={musicEnabled ? "sound-icon sound-on" : "sound-icon sound-off"} aria-hidden="true" />
              </button>
            </nav>
          </header>

          <section
            className={`mission-tracker ${timeLeft <= 30 && gameState === "playing" ? "urgent" : ""}`}
            aria-label="水瓶座怪人觀測進度"
          >
            <div>
              <span>時間倒數</span>
              <strong>{formatTimer(timeLeft)}</strong>
            </div>
            <div>
              <span>已觀測怪人</span>
              <strong>{foundCount} / {WEIRDOS.length}</strong>
            </div>
            <div className="mission-progress" aria-hidden="true">
              <span style={{ width: `${Math.max(0, Math.min(100, (timeLeft / GAME_DURATION_SECONDS) * 100))}%` }} />
            </div>
          </section>

          <aside className="mini-map" aria-label="小地圖">
            <strong>MAP</strong>
            <span>{currentRegion}</span>
            <div className="mini-map-grid">
              {miniMapZones.map((zone) => (
                <span key={zone.id} className="mini-map-zone" style={zone.style} />
              ))}
              {miniMapRoads.map((road) => (
                <span key={road.id} className="mini-map-road" style={road.style} />
              ))}
              <i className="mini-map-player" style={miniMapPlayerStyle} aria-hidden="true" />
            </div>
          </aside>

          {interactionLabel ? (
            <div className="interaction-hint" aria-live="polite">
              {interactionLabel}
            </div>
          ) : null}

          <aside className={helpOpen ? "shortcut-help open" : "shortcut-help"} aria-label="快捷指令">
            <button
              className="shortcut-help-toggle"
              type="button"
              onClick={() => setHelpOpen((value) => !value)}
              aria-expanded={helpOpen}
              aria-label="查看快捷指令"
            >
              ?
            </button>
            {helpOpen ? (
              <div className="shortcut-help-panel">
                <strong>快捷指令</strong>
                <span>WASD / 方向鍵：移動</span>
                <span>Shift：按住加速</span>
                <span>滑鼠拖曳：旋轉鏡頭</span>
                <span>Space：跳躍 / 對話繼續</span>
                <span>E：互動</span>
                <span>R：預設視角</span>
                <div className="quality-toggle" role="group" aria-label="效能切換">
                  {(["low", "medium", "high"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={quality === level ? "selected" : ""}
                      onClick={() => setQuality(level)}
                      aria-pressed={quality === level}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <div className={hasBlockingOverlay ? "mobile-joystick hidden" : "mobile-joystick"}>
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
            className={interactionLabel && !hasBlockingOverlay ? "mobile-action visible" : "mobile-action hidden"}
            type="button"
            onClick={gameState === "playing" ? advanceDialogue : restartObservation}
            aria-label="互動"
          >
            {gameState === "playing" ? "E" : "重來"}
          </button>

          <button
            className={hasBlockingOverlay ? "mobile-jump hidden" : "mobile-jump"}
            type="button"
            onPointerDown={handleMobileJump}
            aria-label="跳躍"
          >
            <span className="mobile-jump-icon" aria-hidden="true" />
          </button>

          {gameState === "win" || gameState === "lose" ? (
            <section
              className={`outcome-overlay ${gameState}`}
              aria-label={gameState === "win" ? "觀測成功" : "觀測失敗"}
            >
              <div>
                <p className="eyebrow">
                  {gameState === "win" ? "挑戰成功" : "挑戰失敗"}
                </p>
                <h2>
                  {gameState === "win"
                    ? "霓虹浮島的能量已成功控制"
                    : "島嶼已被怪異腦波淹沒"}
                </h2>
                <p>
                  {gameState === "win"
                    ? "8 位水瓶座怪人全數被重新觀測，中央能源瓶停止過載，城市暫時不會翻轉。"
                    : "水瓶座統治了世界！從今天起你也是水瓶座"}
                </p>
                <div className="share-row">
                  <a className="share-link" href={shareUrl || "#"} target="_blank" rel="noreferrer">
                    {shareUrl || "正在準備網站連結"}
                  </a>
                  <button className="copy-link-button" type="button" onClick={copyShareUrl}>
                    {copiedShare ? "已複製" : "複製連結"}
                  </button>
                </div>
                <button className="enter-world-button" type="button" onClick={restartObservation}>
                  {gameState === "win" ? "再玩一次" : "我不服！再試一次！"}
                </button>
              </div>
            </section>
          ) : null}
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
              繼續聽 <span className="desktop-key-hint">(Space)</span>
            </button>
          )}
        </section>
      ) : null}

      {humanDialogue && dialogueHuman ? (
        <section className="dialogue-panel human-panel" aria-label={`${dialogueHuman.title} 城市傳說`}>
          <div className="dialogue-title">
            <div>
              <span>{dialogueHuman.english}</span>
              <h2>{dialogueHuman.title}</h2>
            </div>
            <button type="button" onClick={closeHumanDialogue} aria-label="關閉人類對話">
              Esc
            </button>
          </div>
          <p className="artifact-trait">{dialogueHuman.role}</p>
          <p className="dialogue-text">
            {humanDialogueLines[humanDialogue.lineIndex] ?? dialogueHuman.legend}
          </p>
          <button className="continue-dialogue" type="button" onClick={advanceDialogue}>
            {humanDialogue.lineIndex < humanDialogueLines.length - 1 ? (
              <>
                繼續聽 <span className="desktop-key-hint">(Space)</span>
              </>
            ) : (
              <>
                確認 <span className="desktop-key-hint">(Space)</span>
              </>
            )}
          </button>
        </section>
      ) : null}

      {collectionPopup && collectedWeirdo ? (
        <section className="collection-popup" aria-label={`收集到${collectedWeirdo.title}`}>
          <article>
            <button
              className="collection-close"
              type="button"
              onClick={closeCollectionPopup}
              aria-label="關閉收集彈窗"
            >
              ×
            </button>
            <p className="eyebrow">AQUARIUS CODEX ENTRY</p>
            <h2>收集到水瓶怪人 ({collectionPopup.count}/{WEIRDOS.length})</h2>
            <div className="collection-card-head">
              <span style={{ background: collectedWeirdo.accent }} />
              <div>
                <strong>{collectedWeirdo.title}</strong>
                <small>{collectedWeirdo.english}</small>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {weirdoDialogue && dialogueWeirdo ? (
        <section className="dialogue-panel weirdo-panel" aria-label={`${dialogueWeirdo.title} 觀測`}>
          <div className="dialogue-title">
            <div>
              <span>{dialogueWeirdo.english}</span>
              <h2>{dialogueWeirdo.title}</h2>
            </div>
            <button type="button" onClick={closeWeirdoDialogue} aria-label="關閉怪人對話">
              Esc
            </button>
          </div>
          <p className="artifact-trait">
            {weirdoDialogue.justFound ? `觀測進度 ${foundCount} / ${WEIRDOS.length}` : "已完成觀測"}
          </p>
          <p className="dialogue-text">
            {weirdoDialogueLines[weirdoDialogue.lineIndex] ?? dialogueWeirdo.quote}
          </p>
          <button className="continue-dialogue" type="button" onClick={advanceDialogue}>
            {weirdoDialogue.lineIndex < 1 ? (
              <>
                繼續聽 <span className="desktop-key-hint">(Space)</span>
              </>
            ) : (
              <>
                確認 <span className="desktop-key-hint">(Space)</span>
              </>
            )}
          </button>
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
            確認 <span className="desktop-key-hint">(Space)</span>
          </button>
        </section>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

function createLighting(THREE_REF: typeof THREE, scene: THREE.Scene) {
  const hemi = new THREE_REF.HemisphereLight("#dbeafe", "#130f1f", 1.7);
  scene.add(hemi);
  const sun = new THREE_REF.DirectionalLight("#dbeafe", 2.6);
  sun.position.set(10, 16, 9);
  scene.add(sun);

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
  return { hemi, sun };
}

function createWorld(THREE_REF: typeof THREE, root: THREE.Group) {
  const ground = new THREE_REF.Mesh(
    new THREE_REF.CircleGeometry(WORLD_CONFIG.worldRadius + 1, 160),
    new THREE_REF.MeshStandardMaterial({
      color: "#071124",
      transparent: true,
      opacity: 0.36,
      roughness: 0.92,
      metalness: 0.04,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.name = "archive-ground";
  root.add(ground);

  addPlanetAtmosphere(THREE_REF, root);
  addAquariusToyCity(THREE_REF, root);

  return ground;
}

function addCityModelAssets(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  loadedModels: Map<string, ModelResource>,
  cloneAnimatedModel: CloneModelFn,
  animationLibrary: THREE.AnimationClip[],
  actorMixers: THREE.AnimationMixer[]
) {
  const ambientModels: AmbientModel[] = [];
  CITY_MODEL_ASSETS.forEach((asset) => {
    if (shouldSkipLooseCityAsset(asset)) {
      return;
    }
    const source = loadedModels.get(asset.asset);
    if (!source) {
      return;
    }
    const group = new THREE_REF.Group();
    const home = new THREE_REF.Vector3(scaleWorldValue(asset.position[0]), asset.position[1], scaleWorldValue(asset.position[2]));
    group.name = asset.id;
    group.position.copy(home);
    group.rotation.set(...asset.rotation);
    group.scale.set(...asset.scale);
    const model = cloneModel(THREE_REF, source.scene, cloneAnimatedModel);
    model.traverse((child) => {
      child.userData.cityAssetId = asset.id;
    });
    group.add(model);
    if (asset.id === AQUARIUS_CASCADE_INSTALLATION_ID) {
      fitCityAssetToWorldHeight(THREE_REF, group, home, AQUARIUS_CASCADE_INSTALLATION_TARGET_HEIGHT);
    }
    root.add(group);
    if (asset.motion) {
      const motionAction = (asset.motionAction ??
        (asset.motion === "wander" ? "walk" : "idle")) as ActorActionName;
      const animator =
        source.animations.length > 0
          ? createActorAnimator(THREE_REF, model, source.animations, animationLibrary)
          : undefined;
      if (animator) {
        actorMixers.push(animator.mixer);
        playActorAction(animator, motionAction, 0);
      }
      ambientModels.push({
        group,
        home,
        target: pickWanderTarget(THREE_REF, home, scaleWorldValue(asset.motionRadius ?? 0.8)),
        mode: asset.motion,
        radius: scaleWorldValue(asset.motionRadius ?? 0.8),
        speed: asset.motionSpeed ?? 0.35,
        pauseUntil: 0,
        animator,
        motionAction,
      });
    }
  });
  [
    { x: -18, y: 7.6, z: -23, scale: 1.35, radius: 28, speed: 1.25 },
    { x: 26, y: 11.5, z: -33, scale: 0.78, radius: 20, speed: 0.86 },
    { x: -34, y: 13.8, z: 18, scale: 0.96, radius: 24, speed: 0.72 },
    { x: 11, y: 9.4, z: 36, scale: 1.12, radius: 22, speed: 0.94 },
    { x: 41, y: 16.5, z: 8, scale: 0.62, radius: 16, speed: 0.68 },
  ].forEach((spec, index) => {
    const skyWhale = createSkyWhale(THREE_REF, spec.scale);
    skyWhale.name = `sky-whale-${index + 1}`;
    const whaleHome = new THREE_REF.Vector3(spec.x, spec.y, spec.z);
    skyWhale.position.copy(whaleHome);
    root.add(skyWhale);
    ambientModels.push({
      group: skyWhale,
      home: whaleHome,
      target: pickWanderTarget(THREE_REF, whaleHome, spec.radius),
      mode: "wander",
      radius: spec.radius,
      speed: spec.speed,
      pauseUntil: 0,
      motionAction: "idle",
    });
  });
  return ambientModels;
}

function addPlanetAtmosphere(THREE_REF: typeof THREE, root: THREE.Group) {
  const rim = new THREE_REF.Mesh(
    new THREE_REF.TorusGeometry(WORLD_CONFIG.worldRadius + 0.9, 0.18, 12, 192),
    new THREE_REF.MeshBasicMaterial({ color: "#7dd3fc", transparent: true, opacity: 0.42 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.08;
  root.add(rim);

  const atmosphere = new THREE_REF.Mesh(
    new THREE_REF.SphereGeometry(WORLD_CONFIG.worldRadius + 5.5, 48, 16),
    new THREE_REF.MeshBasicMaterial({
      color: "#5eead4",
      transparent: true,
      opacity: 0.045,
      side: THREE_REF.BackSide,
      depthWrite: false,
    })
  );
  atmosphere.scale.y = 0.32;
  atmosphere.position.y = 1.8;
  root.add(atmosphere);

  [0.18, -0.22].forEach((tilt, index) => {
    const orbit = new THREE_REF.Mesh(
      new THREE_REF.TorusGeometry(WORLD_CONFIG.worldRadius + 5 + index * 2.2, 0.035, 8, 220),
      new THREE_REF.MeshBasicMaterial({
        color: index === 0 ? "#c4b5fd" : "#f7d9ff",
        transparent: true,
        opacity: 0.28,
      })
    );
    orbit.rotation.set(Math.PI / 2 + tilt, index * 0.42, 0.2);
    orbit.position.y = 2.1 + index * 0.65;
    root.add(orbit);
  });
}

function addHexTerrainTiles(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  soil: THREE.Material,
  stone: THREE.Material,
  water: THREE.Material
) {
  const tiles = [
    [-20, -10, 1.35, stone],
    [-17.4, -12.2, 1.08, stone],
    [-21.2, -6.8, 0.92, soil],
    [-14.8, 8.2, 1.2, soil],
    [-17.8, 11.2, 1.05, water],
    [-11.8, 17.2, 0.86, water],
    [14.8, 9.8, 1.2, soil],
    [18.4, 11.6, 1.08, stone],
    [21.2, 5.4, 0.96, soil],
    [17.6, -10.6, 1.16, stone],
    [21.2, -7.8, 0.92, soil],
    [4.2, 22.4, 0.88, water],
  ] as const;

  tiles.forEach(([x, z, scale, material], index) => {
    const tile = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(1.35 * scale, 1.45 * scale, 0.18, 6), material);
    tile.position.set(x, 0.08 + (index % 3) * 0.02, z);
    tile.rotation.y = index * 0.22;
    root.add(tile);
  });
}

function addHabitableDistricts(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  habitat: THREE.Material,
  glass: THREE.Material,
  glow: THREE.Material
) {
  const homes = [
    [6.4, 6.6, 0.74, "#74f0d4"],
    [-7.1, 6.8, 0.68, "#7dd3fc"],
    [8.2, -4.2, 0.64, "#c4b5fd"],
    [16.4, 8.6, 1.15, "#74f0d4"],
    [19.4, 8.1, 0.88, "#7dd3fc"],
    [17.8, 11.2, 0.72, "#c4b5fd"],
    [-18.6, 7.8, 0.86, "#5eead4"],
  ] as const;

  homes.forEach(([x, z, scale, color], index) => {
    const base = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(1.05 * scale, 1.22 * scale, 0.42, 14), habitat);
    base.position.set(x, 0.22, z);
    root.add(base);

    const dome = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(1.08 * scale, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    dome.position.set(x, 0.45, z);
    root.add(dome);

    const door = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.32 * scale, 0.5 * scale, 0.05),
      new THREE_REF.MeshBasicMaterial({ color })
    );
    door.position.set(x, 0.46, z - 1.08 * scale);
    root.add(door);

    const antenna = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.025, 0.035, 0.78 * scale, 7), glow);
    antenna.position.set(x + 0.5 * scale, 1.25 * scale, z + 0.35 * scale);
    antenna.rotation.z = 0.22 + index * 0.07;
    root.add(antenna);
  });
}

function addAquariusTransitRing(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  stone: THREE.Material,
  glow: THREE.Material
) {
  const rail = new THREE_REF.Mesh(
    new THREE_REF.TorusGeometry(21.2, 0.045, 8, 192),
    new THREE_REF.MeshBasicMaterial({ color: "#7dd3fc", transparent: true, opacity: 0.48 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.48;
  root.add(rail);

  for (let index = 0; index < 20; index += 1) {
    const theta = (index / 20) * Math.PI * 2;
    const support = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.045, 0.065, 0.7, 6), stone);
    support.position.set(Math.cos(theta) * 21.2, 0.35, Math.sin(theta) * 21.2);
    root.add(support);
  }

  const train = new THREE_REF.Group();
  train.position.set(1.2, 0.78, 21.2);
  train.rotation.y = Math.PI / 2;
  for (let index = 0; index < 3; index += 1) {
    const car = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.78, 0.36, 0.42), glow);
    car.position.x = index * 0.82;
    train.add(car);
  }
  root.add(train);
}

function addAlienEcology(THREE_REF: typeof THREE, root: THREE.Group, glow: THREE.Material) {
  const leafMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#3dd7b6",
    emissive: "#0f766e",
    emissiveIntensity: 0.2,
    roughness: 0.58,
  });
  const trunkMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#263040",
    roughness: 0.82,
  });
  const forest = [
    [-19.2, 9.5, 1.2],
    [-16.8, 7.1, 0.9],
    [-18.2, 11.6, 0.72],
    [-8.4, 19.2, 0.82],
    [-4.5, 20.4, 0.68],
    [10.5, 18.6, 0.74],
  ] as const;

  forest.forEach(([x, z, scale], index) => {
    const trunk = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.08 * scale, 0.14 * scale, 1.05 * scale, 7), trunkMaterial);
    trunk.position.set(x, 0.54 * scale, z);
    trunk.rotation.z = Math.sin(index) * 0.18;
    root.add(trunk);

    const crown = new THREE_REF.Mesh(new THREE_REF.OctahedronGeometry(0.62 * scale, 0), leafMaterial);
    crown.position.set(x, 1.22 * scale, z);
    crown.rotation.set(index * 0.2, index * 0.7, 0.28);
    root.add(crown);

    const halo = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.78 * scale, 0.025, 8, 40), glow);
    halo.position.set(x, 1.24 * scale, z);
    halo.rotation.x = Math.PI / 2;
    root.add(halo);
  });
}

function addVoxelCivicDetails(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  glow: THREE.Material,
  stone: THREE.Material,
  water: THREE.Material
) {
  const zombieSkin = new THREE_REF.MeshStandardMaterial({
    color: "#86efac",
    emissive: "#14532d",
    emissiveIntensity: 0.16,
    roughness: 0.72,
  });
  const zombieCloth = new THREE_REF.MeshStandardMaterial({
    color: "#334155",
    roughness: 0.78,
  });
  const petMaterials = ["#fca5a5", "#93c5fd", "#fde68a", "#c4b5fd"].map(
    (color) => new THREE_REF.MeshStandardMaterial({ color, roughness: 0.68 })
  );
  const dark = new THREE_REF.MeshStandardMaterial({ color: "#07111f", roughness: 0.82 });
  const foodColors = ["#f97316", "#facc15", "#ef4444", "#22c55e"];

  [
    [-13.4, 14.6, 0],
    [-12.1, 15.7, 1],
    [14.6, 12.4, 2],
    [16.2, 13.6, 3],
  ].forEach(([x, z, materialIndex], index) => {
    const pet = new THREE_REF.Group();
    pet.position.set(scaleWorldValue(x), 0, scaleWorldValue(z));
    pet.rotation.y = index * 0.7;
    const material = petMaterials[materialIndex % petMaterials.length];
    const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.72, 0.42, 0.42), material);
    body.position.y = 0.36;
    pet.add(body);
    const head = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.38, 0.38, 0.36), material);
    head.position.set(0.52, 0.56, 0);
    pet.add(head);
    const face = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.18, 0.06, 0.035), dark);
    face.position.set(0.72, 0.58, -0.18);
    pet.add(face);
    const tail = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.34, 0.12, 0.12), glow);
    tail.position.set(-0.52, 0.48, 0);
    tail.rotation.z = 0.28;
    pet.add(tail);
    pet.userData.mode = "voxel-pet";
    root.add(pet);
  });

  [
    [18.8, -0.8],
    [20.4, 0.2],
    [19.2, 1.7],
    [-9.8, -16.4],
    [-11.2, -15.3],
  ].forEach(([x, z], index) => {
    const zombie = new THREE_REF.Group();
    zombie.position.set(scaleWorldValue(x), 0, scaleWorldValue(z));
    zombie.rotation.y = -0.5 + index * 0.35;
    const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.48, 0.78, 0.34), zombieCloth);
    body.position.y = 0.74;
    zombie.add(body);
    const head = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.46, 0.42, 0.38), zombieSkin);
    head.position.y = 1.35;
    zombie.add(head);
    const eyes = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.24, 0.055, 0.04), glow);
    eyes.position.set(0, 1.36, -0.22);
    zombie.add(eyes);
    [-1, 1].forEach((side) => {
      const arm = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.15, 0.62, 0.15), zombieSkin);
      arm.position.set(side * 0.42, 0.8, -0.08);
      arm.rotation.z = side * 0.18;
      zombie.add(arm);
      const leg = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.16, 0.48, 0.16), dark);
      leg.position.set(side * 0.13, 0.24, 0);
      zombie.add(leg);
    });
    root.add(zombie);
  });

  [
    [-5.8, 12.3],
    [-4.6, 12.3],
    [5.2, -14.2],
    [6.4, -14.2],
  ].forEach(([x, z], index) => {
    const stall = new THREE_REF.Group();
    stall.position.set(scaleWorldValue(x), 0, scaleWorldValue(z));
    const counter = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.02, 0.38, 0.58), stone);
    counter.position.y = 0.32;
    stall.add(counter);
    const canopy = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(1.22, 0.16, 0.72),
      new THREE_REF.MeshStandardMaterial({
        color: index % 2 ? "#5eead4" : "#f6d365",
        emissive: index % 2 ? "#0f766e" : "#854d0e",
        emissiveIntensity: 0.18,
        roughness: 0.48,
      })
    );
    canopy.position.y = 1.18;
    stall.add(canopy);
    for (let item = 0; item < 4; item += 1) {
      const snack = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(0.16, 0.12, 0.16),
        new THREE_REF.MeshStandardMaterial({ color: foodColors[item], roughness: 0.5 })
      );
      snack.position.set(-0.33 + item * 0.22, 0.62, -0.08);
      stall.add(snack);
    }
    root.add(stall);
  });

  const civicGlow = new THREE_REF.MeshStandardMaterial({
    color: "#5eead4",
    emissive: "#14b8a6",
    emissiveIntensity: 0.28,
    roughness: 0.42,
  });
  const civicPink = new THREE_REF.MeshStandardMaterial({
    color: "#f0abfc",
    emissive: "#c084fc",
    emissiveIntensity: 0.18,
    roughness: 0.48,
  });
  const leafMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#74d66f",
    emissive: "#166534",
    emissiveIntensity: 0.1,
    roughness: 0.72,
  });

  [
    [-2.8, 2.8],
    [7.4, -6.1],
    [-16.8, 3.8],
    [18.4, 15.1],
    [10.2, 10.8],
  ].forEach(([x, z], index) => {
    const plazaKit = new THREE_REF.Group();
    plazaKit.position.set(scaleWorldValue(x), 0, scaleWorldValue(z));
    plazaKit.rotation.y = index * 0.55;
    const base = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.46, 0.16, 1.46), stone);
    base.position.y = 0.09;
    plazaKit.add(base);
    for (let ring = 0; ring < 8; ring += 1) {
      const theta = (ring / 8) * Math.PI * 2;
      const tile = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(0.18, 0.045, 0.28),
        ring % 2 ? civicGlow : civicPink
      );
      tile.position.set(Math.cos(theta) * 0.66, 0.2, Math.sin(theta) * 0.66);
      tile.rotation.y = -theta;
      plazaKit.add(tile);
    }
    const beacon = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.18, 0.72, 0.18), civicGlow);
    beacon.position.y = 0.58;
    plazaKit.add(beacon);
    const cap = new THREE_REF.Mesh(new THREE_REF.OctahedronGeometry(0.28, 0), civicPink);
    cap.position.y = 1.04;
    cap.rotation.y = Math.PI / 4;
    plazaKit.add(cap);
    root.add(plazaKit);
  });

  [
    [-7.2, 4.2],
    [-6.4, 4.8],
    [5.8, 7.2],
    [6.8, 7.6],
    [15.2, -8.8],
    [16.1, -8.2],
    [-18.8, -4.6],
    [-19.4, -3.8],
  ].forEach(([x, z], index) => {
    const garden = new THREE_REF.Group();
    garden.position.set(scaleWorldValue(x), 0, scaleWorldValue(z));
    garden.rotation.y = index * 0.22;
    const planter = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.74, 0.24, 0.46), dark);
    planter.position.y = 0.18;
    garden.add(planter);
    for (let leaf = 0; leaf < 5; leaf += 1) {
      const cube = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.15, 0.18 + leaf * 0.015, 0.12), leafMaterial);
      cube.position.set(-0.26 + leaf * 0.13, 0.42 + Math.sin(leaf) * 0.02, -0.05 + Math.cos(leaf) * 0.08);
      cube.rotation.z = -0.28 + leaf * 0.14;
      garden.add(cube);
    }
    const flower = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.12, 0.12, 0.12), index % 2 ? civicPink : civicGlow);
    flower.position.set(0.18, 0.58, 0.05);
    garden.add(flower);
    root.add(garden);
  });

  for (let index = 0; index < 10; index += 1) {
    const x = -4.8 + index * 1.06;
    const sleeper = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.78, 0.055, 0.12), dark);
    sleeper.position.set(scaleWorldValue(x), 0.14, scaleWorldValue(20.7));
    sleeper.rotation.y = Math.PI / 2;
    root.add(sleeper);
  }
  [-0.18, 0.18].forEach((side) => {
    const rail = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(scaleWorldValue(10.4), 0.05, 0.055), glow);
    rail.position.set(scaleWorldValue(0.1), 0.22, scaleWorldValue(20.7 + side));
    root.add(rail);
  });

  [
    [0, -3.5, 3.2, 0.22],
    [0, 13.8, 2.4, 0.16],
    [-15.4, -1.2, 1.8, 0.14],
  ].forEach(([x, z, radius, height], index) => {
    const pool = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(radius, radius + 0.16, height, 6), water);
    pool.position.set(scaleWorldValue(x), height / 2 + 0.03, scaleWorldValue(z));
    pool.rotation.y = index * 0.28;
    root.add(pool);
    const rim = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(radius + 0.18, 0.035, 8, 6), glow);
    rim.position.set(scaleWorldValue(x), height + 0.08, scaleWorldValue(z));
    rim.rotation.x = Math.PI / 2;
    root.add(rim);
  });
}

function addLifeSupportSystems(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  habitat: THREE.Material,
  glass: THREE.Material,
  water: THREE.Material
) {
  const tower = new THREE_REF.Group();
  tower.position.set(-6.1, 0, 18.3);
  const tank = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.88, 22, 14), glass);
  tank.position.y = 2.05;
  tower.add(tank);
  const stem = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.12, 0.16, 2.2, 10), habitat);
  stem.position.y = 1.1;
  tower.add(stem);
  const basin = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(1.2, 0.06, 8, 60), water);
  basin.position.y = 0.22;
  basin.rotation.x = Math.PI / 2;
  tower.add(basin);
  root.add(tower);

  for (let index = 0; index < 5; index += 1) {
    const pipe = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.035, 0.035, 2.2, 8), water);
    pipe.position.set(-7.5 + index * 0.74, 0.48, 16.7 + Math.sin(index) * 0.25);
    pipe.rotation.z = Math.PI / 2;
    root.add(pipe);

    const crop = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(0.16, 0.5, 5), new THREE_REF.MeshStandardMaterial({
      color: index % 2 ? "#f6d365" : "#5eead4",
      emissive: index % 2 ? "#854d0e" : "#0f766e",
      emissiveIntensity: 0.16,
      roughness: 0.48,
    }));
    crop.position.set(-7.5 + index * 0.74, 0.78, 16.7 + Math.sin(index) * 0.25);
    root.add(crop);
  }
}

function addAquariusToyCity(THREE_REF: typeof THREE, root: THREE.Group) {
  const roadMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#2e3b62",
    roughness: 0.76,
    metalness: 0.18,
  });
  const secondaryRoadMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#38456e",
    roughness: 0.74,
    metalness: 0.14,
  });
  const alleyMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#26314f",
    roughness: 0.82,
    metalness: 0.08,
  });
  const laneMaterial = new THREE_REF.MeshBasicMaterial({
    color: "#b8f7ff",
    transparent: true,
    opacity: 0.86,
  });
  const edgeMaterial = new THREE_REF.MeshBasicMaterial({
    color: "#d8b4fe",
    transparent: true,
    opacity: 0.72,
  });
  const waterMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#55e0ff",
    emissive: "#0284c7",
    emissiveIntensity: 0.32,
    transparent: true,
    opacity: 0.76,
    roughness: 0.18,
    metalness: 0.08,
  });
  const hexSoilMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#6ee7b7",
    emissive: "#0f766e",
    emissiveIntensity: 0.08,
    roughness: 0.68,
  });
  const hexStoneMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#bac8ff",
    emissive: "#6366f1",
    emissiveIntensity: 0.08,
    roughness: 0.58,
  });
  const habitatMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#c4b5fd",
    emissive: "#7c3aed",
    emissiveIntensity: 0.08,
    roughness: 0.48,
  });
  const glassMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#7dd3fc",
    emissive: "#0284c7",
    emissiveIntensity: 0.32,
    transparent: true,
    opacity: 0.68,
    roughness: 0.18,
  });

  CITY_PLATFORMS.forEach((spec) => addCityPlatform(THREE_REF, root, scaleCityPlatform(spec)));
  addHexTerrainTiles(THREE_REF, root, hexSoilMaterial, hexStoneMaterial, waterMaterial);
  CITY_CANALS.forEach((spec) => addCityCanal(THREE_REF, root, scaleCityCanal(spec), waterMaterial, edgeMaterial));
  CITY_ROADS.forEach((spec, index) => {
    const material =
      spec.kind === "main"
        ? roadMaterial
        : spec.kind === "secondary"
          ? secondaryRoadMaterial
          : alleyMaterial;
    addCityRoad(THREE_REF, root, scaleCityRoad(spec), material, laneMaterial, index);
  });
  CITY_BRIDGES.forEach((spec) => addCityBridge(THREE_REF, root, scaleCityBridge(spec)));
  CITY_BUILDINGS.forEach((spec) => addToyBuilding(THREE_REF, root, scaleCityBuilding(spec)));
  addCompleteVillageHouses(THREE_REF, root);
  addAquariusPlazaGlyph(THREE_REF, root);
  CITY_PROPS.forEach((spec) => addCityProp(THREE_REF, root, scaleCityProp(spec)));
  addStreetRhythm(THREE_REF, root);
  addAquariusLandmarks(THREE_REF, root);
  addHabitableDistricts(THREE_REF, root, habitatMaterial, glassMaterial, edgeMaterial);
  addLifeSupportSystems(THREE_REF, root, habitatMaterial, glassMaterial, waterMaterial);
  addAlienEcology(THREE_REF, root, edgeMaterial);
  addAquariusTransitRing(THREE_REF, root, hexStoneMaterial, edgeMaterial);
  addJumpRoutePlatforms(THREE_REF, root, hexStoneMaterial, edgeMaterial);
  addVoxelCivicDetails(THREE_REF, root, edgeMaterial, hexStoneMaterial, waterMaterial);
  addExpandedVoxelLife(THREE_REF, root);
}

function scaleCityPlatform(spec: CityPlatformSpec): CityPlatformSpec {
  const [x, z] = scaleWorldPoint(spec.position[0], spec.position[1]);
  return {
    ...spec,
    position: [x, z],
    size: [scaleWorldValue(spec.size[0]), scaleWorldValue(spec.size[1])],
  };
}

function scaleCityRoad(spec: CityRoadSpec): CityRoadSpec {
  return {
    ...spec,
    from: scaleWorldPoint(spec.from[0], spec.from[1]),
    to: scaleWorldPoint(spec.to[0], spec.to[1]),
  };
}

function scaleCityCanal(spec: CityCanalSpec): CityCanalSpec {
  return {
    ...spec,
    from: scaleWorldPoint(spec.from[0], spec.from[1]),
    to: scaleWorldPoint(spec.to[0], spec.to[1]),
  };
}

function scaleCityBridge(spec: CityBridgeSpec): CityBridgeSpec {
  return {
    ...spec,
    from: scaleWorldPoint(spec.from[0], spec.from[1]),
    to: scaleWorldPoint(spec.to[0], spec.to[1]),
  };
}

function scaleCityBuilding(spec: CityBuildingSpec): CityBuildingSpec {
  const [x, z] = scaleWorldPoint(spec.position[0], spec.position[1]);
  return {
    ...spec,
    position: [x, z],
  };
}

function scaleCityProp(spec: CityPropSpec): CityPropSpec {
  const [x, z] = scaleWorldPoint(spec.position[0], spec.position[1]);
  return {
    ...spec,
    position: [x, z],
  };
}

function addCityPlatform(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  spec: CityPlatformSpec
) {
  const [x, z] = spec.position;
  const [width, depth] = spec.size;
  const group = new THREE_REF.Group();
  group.position.set(x, spec.elevation, z);
  group.rotation.y = spec.rotation ?? 0;
  const slab = new THREE_REF.Mesh(
    new THREE_REF.BoxGeometry(width, 0.24, depth),
    new THREE_REF.MeshStandardMaterial({
      color: spec.color,
      emissive: spec.color,
      emissiveIntensity: 0.08,
      roughness: 0.72,
      metalness: 0.04,
    })
  );
  slab.position.y = -0.05;
  group.add(slab);

  const tint = getDistrictFloorTint(spec.position[0], spec.position[1]);
  if (tint) {
    const overlay = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(width * 0.96, 0.024, depth * 0.96),
      new THREE_REF.MeshBasicMaterial({
        color: tint.color,
        transparent: true,
        opacity: tint.opacity,
        depthWrite: false,
      })
    );
    overlay.position.y = 0.09;
    group.add(overlay);
  }

  const lipMaterial = new THREE_REF.MeshBasicMaterial({
    color: spec.accent,
    transparent: true,
    opacity: 0.72,
  });
  const edgeThickness = 0.08;
  [
    [0, depth / 2, width, edgeThickness],
    [0, -depth / 2, width, edgeThickness],
    [width / 2, 0, edgeThickness, depth],
    [-width / 2, 0, edgeThickness, depth],
  ].forEach(([offsetX, offsetZ, edgeWidth, edgeDepth]) => {
    const edge = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(edgeWidth, 0.035, edgeDepth), lipMaterial);
    edge.position.set(offsetX, 0.09, offsetZ);
    group.add(edge);
  });
  root.add(group);
}

function getDistrictFloorTint(x: number, z: number) {
  if (z < -30) {
    return { color: "#bdefff", opacity: 0.26 };
  }
  if (x < -30 && z < 4) {
    return { color: "#f6c56a", opacity: 0.22 };
  }
  if (x > 28 && z > 8) {
    return { color: "#67e8a5", opacity: 0.2 };
  }
  if (z > 28) {
    return { color: "#38d5ff", opacity: 0.2 };
  }
  if (Math.hypot(x, z) < 12) {
    return { color: "#c084fc", opacity: 0.17 };
  }
  return null;
}

function addCityRoad(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  spec: CityRoadSpec,
  roadMaterial: THREE.Material,
  laneMaterial: THREE.Material,
  index: number
) {
  const length = distance2(spec.from, spec.to);
  const angle = segmentRotation(spec.from, spec.to);
  const midpoint = midpoint2(spec.from, spec.to);
  const road = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(length, 0.06, spec.width), roadMaterial);
  road.position.set(midpoint[0], spec.elevation + 0.08, midpoint[1]);
  road.rotation.y = angle;
  root.add(road);

  const segments = Math.max(3, Math.floor(length / 2.2));
  for (let i = 0; i < segments; i += 1) {
    const lane = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.72, 0.022, 0.055),
      laneMaterial
    );
    const offset = -length / 2 + 0.9 + i * ((length - 1.8) / Math.max(1, segments - 1));
    lane.position.set(midpoint[0], spec.elevation + 0.125, midpoint[1]);
    lane.rotation.y = angle;
    lane.translateX(offset);
    root.add(lane);
  }

  for (let i = 0; i < Math.min(5, segments); i += 1) {
    const wave = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.24, 0.024, 0.055),
      laneMaterial
    );
    const offset = -length / 2 + 1.1 + i * 1.05;
    wave.position.set(midpoint[0], spec.elevation + 0.145, midpoint[1]);
    wave.rotation.y = angle + Math.sin(i + index) * 0.5;
    wave.translateX(offset);
    wave.translateZ((i % 2 ? -1 : 1) * spec.width * 0.22);
    root.add(wave);
  }

  const curbMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#83d7ed",
    emissive: spec.accent,
    emissiveIntensity: 0.16,
    roughness: 0.5,
    metalness: 0.05,
  });
  [-1, 1].forEach((side) => {
    const curb = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(length, 0.095, 0.085), curbMaterial);
    curb.position.set(midpoint[0], spec.elevation + 0.16, midpoint[1]);
    curb.rotation.y = angle;
    curb.translateZ(side * (spec.width / 2 + 0.08));
    root.add(curb);
  });

  const paverMaterial = new THREE_REF.MeshBasicMaterial({
    color: index % 2 ? "#d8b4fe" : "#5eead4",
    transparent: true,
    opacity: 0.48,
  });
  const paverCount = Math.max(4, Math.floor(length / 1.35));
  for (let i = 0; i < paverCount; i += 1) {
    [-1, 1].forEach((side) => {
      const paver = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.2, 0.026, 0.14), paverMaterial);
      const offset = -length / 2 + 0.55 + i * ((length - 1.1) / Math.max(1, paverCount - 1));
      paver.position.set(midpoint[0], spec.elevation + 0.195, midpoint[1]);
      paver.rotation.y = angle;
      paver.translateX(offset);
      paver.translateZ(side * (spec.width / 2 + 0.26));
      root.add(paver);
    });
  }

  if (index % 3 === 0) {
    for (let stripe = -2; stripe <= 2; stripe += 1) {
      const crosswalk = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(0.08, 0.028, spec.width * 0.68),
        laneMaterial
      );
      crosswalk.position.set(midpoint[0], spec.elevation + 0.205, midpoint[1]);
      crosswalk.rotation.y = angle;
      crosswalk.translateX(stripe * 0.24);
      root.add(crosswalk);
    }
  }
}

function addCityCanal(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  spec: CityCanalSpec,
  waterMaterial: THREE.Material,
  edgeMaterial: THREE.Material
) {
  const length = distance2(spec.from, spec.to);
  const angle = segmentRotation(spec.from, spec.to);
  const midpoint = midpoint2(spec.from, spec.to);
  const water = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(length, 0.035, spec.width), waterMaterial);
  water.position.set(midpoint[0], spec.elevation, midpoint[1]);
  water.rotation.y = angle;
  root.add(water);

  [-1, 1].forEach((side) => {
    const edge = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(length, 0.035, 0.055),
      edgeMaterial
    );
    edge.position.set(midpoint[0], spec.elevation + 0.045, midpoint[1]);
    edge.rotation.y = angle;
    edge.translateZ(side * (spec.width / 2 + 0.08));
    root.add(edge);
  });
}

function addCityBridge(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  spec: CityBridgeSpec
) {
  const length = distance2(spec.from, spec.to);
  const angle = segmentRotation(spec.from, spec.to);
  const midpoint = midpoint2(spec.from, spec.to);
  const deckMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#eef2ff",
    emissive: spec.accent,
    emissiveIntensity: 0.18,
    roughness: 0.46,
    metalness: 0.16,
  });
  const deck = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(length, 0.16, spec.width), deckMaterial);
  deck.position.set(midpoint[0], spec.elevation, midpoint[1]);
  deck.rotation.y = angle;
  root.add(deck);
  const railMaterial = new THREE_REF.MeshBasicMaterial({ color: spec.accent, transparent: true, opacity: 0.82 });
  [-1, 1].forEach((side) => {
    const rail = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(length, 0.08, 0.055), railMaterial);
    rail.position.set(midpoint[0], spec.elevation + 0.22, midpoint[1]);
    rail.rotation.y = angle;
    rail.translateZ(side * (spec.width / 2 + 0.12));
    root.add(rail);
  });
}

function addToyBuilding(THREE_REF: typeof THREE, root: THREE.Group, spec: CityBuildingSpec) {
  const [width, depth] = spec.size;
  const group = new THREE_REF.Group();
  group.position.set(spec.position[0], spec.elevation, spec.position[1]);
  group.rotation.y = spec.rotation ?? 0;
  const bodyMaterial = new THREE_REF.MeshStandardMaterial({
    color: spec.color,
    emissive: spec.color,
    emissiveIntensity: 0.05,
    roughness: 0.58,
    metalness: 0.08,
  });
  const capMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#e9d5ff",
    emissive: spec.accent,
    emissiveIntensity: 0.13,
    roughness: 0.42,
    metalness: 0.12,
  });
  const glassMaterial = new THREE_REF.MeshStandardMaterial({
    color: spec.accent,
    emissive: spec.accent,
    emissiveIntensity: 0.34,
    transparent: true,
    opacity: 0.46,
    roughness: 0.14,
  });
  const lightMaterial = new THREE_REF.MeshBasicMaterial({ color: spec.accent });

  const base = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(width, 0.28, depth), capMaterial);
  base.position.y = 0.14;
  group.add(base);

  if (spec.kind === "tower") {
    const levels = Math.max(2, Math.round(spec.height / 1.1));
    for (let level = 0; level < levels; level += 1) {
      const scale = 1 - level * 0.08;
      const body = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(width * scale, spec.height / levels, depth * scale),
        level % 2 ? capMaterial : bodyMaterial
      );
      body.position.y = 0.28 + (spec.height / levels) * (level + 0.5);
      group.add(body);
    }
    const roof = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(width * 0.82, 0.24, depth * 0.82), glassMaterial);
    roof.position.y = spec.height + 0.52;
    group.add(roof);
    addRoofSolarPanels(THREE_REF, group, spec, spec.height + 0.72);
  } else if (spec.kind === "dome") {
    const body = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(width * 0.45, width * 0.52, spec.height * 0.52, 18), bodyMaterial);
    body.position.y = 0.5 + spec.height * 0.26;
    group.add(body);
    const dome = new THREE_REF.Mesh(
      new THREE_REF.SphereGeometry(width * 0.58, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      glassMaterial
    );
    dome.position.y = 0.58 + spec.height * 0.54;
    group.add(dome);
  } else if (spec.kind === "coral") {
    const stems = 4;
    for (let index = 0; index < stems; index += 1) {
      const theta = (index / stems) * Math.PI * 2;
      const height = spec.height * (0.58 + index * 0.11);
      const stem = new THREE_REF.Mesh(
        new THREE_REF.CylinderGeometry(0.26 + index * 0.03, 0.34 + index * 0.03, height, 12),
        bodyMaterial
      );
      stem.position.set(Math.cos(theta) * width * 0.22, 0.32 + height / 2, Math.sin(theta) * depth * 0.2);
      group.add(stem);
      const cap = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.36 + index * 0.04, 16, 12), glassMaterial);
      cap.position.set(stem.position.x, 0.34 + height, stem.position.z);
      group.add(cap);
    }
  } else if (spec.kind === "solar") {
    const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(width, spec.height, depth), bodyMaterial);
    body.position.y = 0.28 + spec.height / 2;
    group.add(body);
    addRoofSolarPanels(THREE_REF, group, spec, spec.height + 0.48);
  } else if (spec.kind === "greenhouse") {
    for (let level = 0; level < 3; level += 1) {
      const tray = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(width, 0.18, depth), bodyMaterial);
      tray.position.y = 0.45 + level * 0.62;
      group.add(tray);
      const glass = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(width * 0.88, 0.42, depth * 0.82), glassMaterial);
      glass.position.y = 0.75 + level * 0.62;
      group.add(glass);
    }
  } else if (spec.kind === "observatory") {
    const body = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(width * 0.43, width * 0.52, spec.height * 0.74, 16), bodyMaterial);
    body.position.y = 0.38 + spec.height * 0.37;
    group.add(body);
    const dome = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(width * 0.47, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassMaterial);
    dome.position.y = spec.height + 0.28;
    group.add(dome);
    const telescope = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.09, 0.15, 1.05, 12), capMaterial);
    telescope.position.set(0.34, spec.height + 0.78, -0.18);
    telescope.rotation.set(Math.PI / 2.5, 0, -0.45);
    group.add(telescope);
  } else if (spec.kind === "workshop") {
    const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(width, spec.height * 0.68, depth), bodyMaterial);
    body.position.y = 0.34 + spec.height * 0.34;
    group.add(body);
    addRoofSolarPanels(THREE_REF, group, spec, spec.height * 0.8);
    for (let index = 0; index < 3; index += 1) {
      const gear = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.28 + index * 0.08, 0.035, 8, 28), capMaterial);
      gear.position.set(-width * 0.28 + index * 0.42, 1.05 + index * 0.25, -depth / 2 - 0.05);
      gear.rotation.x = Math.PI / 2;
      group.add(gear);
    }
  } else if (spec.kind === "art") {
    const wall = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(width, spec.height, depth * 0.28), bodyMaterial);
    wall.position.set(0, 0.34 + spec.height / 2, 0);
    wall.rotation.y = 0.18;
    group.add(wall);
    ["#f6d365", "#7dd3fc", "#c084fc"].forEach((color, index) => {
      const slash = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(width * 0.36, 0.08, 0.05),
        new THREE_REF.MeshBasicMaterial({ color })
      );
      slash.position.set(-width * 0.24 + index * 0.42, 1.1 + index * 0.35, -depth * 0.18);
      slash.rotation.set(0, 0.18, -0.5 + index * 0.38);
      group.add(slash);
    });
  } else if (spec.kind === "harbor") {
    const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(width, spec.height * 0.58, depth), bodyMaterial);
    body.position.y = 0.32 + spec.height * 0.29;
    group.add(body);
    const roof = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(Math.max(width, depth) * 0.5, 0.52, 4), capMaterial);
    roof.position.y = spec.height * 0.72 + 0.42;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
  } else {
    const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(width * 0.92, spec.height * 0.72, depth * 0.86), bodyMaterial);
    body.position.y = 0.34 + spec.height * 0.36;
    group.add(body);
    const roof = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(width, 0.42, depth), capMaterial);
    roof.position.y = 0.48 + spec.height * 0.74;
    group.add(roof);
  }

  const door = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.42, 0.58, 0.045), lightMaterial);
  door.position.set(0, 0.61, -depth / 2 - 0.03);
  group.add(door);
  for (let index = 0; index < 4; index += 1) {
    const window = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.26, 0.22, 0.045), lightMaterial);
    window.position.set(
      -width * 0.28 + (index % 2) * width * 0.56,
      1.1 + Math.floor(index / 2) * 0.56,
      -depth / 2 - 0.04
    );
    group.add(window);
  }

  root.add(group);
}

function addRoofSolarPanels(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  spec: CityBuildingSpec,
  y: number
) {
  const [width, depth] = spec.size;
  const panelMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#596bb5",
    emissive: "#60a5fa",
    emissiveIntensity: 0.12,
    roughness: 0.34,
    metalness: 0.26,
  });
  for (let index = 0; index < 3; index += 1) {
    const panel = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(width * 0.22, 0.035, depth * 0.28), panelMaterial);
    panel.position.set(-width * 0.24 + index * width * 0.24, y, 0);
    panel.rotation.x = -0.48;
    group.add(panel);
  }
}

function addCompleteVillageHouses(THREE_REF: typeof THREE, root: THREE.Group) {
  COMPLETE_CITY_HOUSES.forEach((house, index) => {
    const group = new THREE_REF.Group();
    group.name = house.id;
    group.position.set(scaleWorldValue(house.position[0]), 0.34, scaleWorldValue(house.position[1]));
    group.rotation.y = house.rotation;

    const wallMaterial = new THREE_REF.MeshStandardMaterial({
      color: house.color,
      emissive: house.color,
      emissiveIntensity: 0.045,
      roughness: 0.64,
      metalness: 0.06,
    });
    const roofMaterial = new THREE_REF.MeshStandardMaterial({
      color: house.roof,
      emissive: house.accent,
      emissiveIntensity: 0.09,
      roughness: 0.52,
      metalness: 0.06,
    });
    const trimMaterial = new THREE_REF.MeshBasicMaterial({ color: house.accent });
    const shadowMaterial = new THREE_REF.MeshStandardMaterial({
      color: "#25304c",
      roughness: 0.82,
      metalness: 0.08,
    });
    const voxelTrimMaterial = new THREE_REF.MeshStandardMaterial({
      color: "#f8fafc",
      emissive: house.accent,
      emissiveIntensity: 0.08,
      roughness: 0.5,
      metalness: 0.05,
    });

    const base = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(house.width + 0.42, 0.24, house.depth + 0.34),
      shadowMaterial
    );
    base.position.y = 0.12;
    group.add(base);

    const body = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(house.width, house.height, house.depth),
      wallMaterial
    );
    body.position.y = 0.24 + house.height / 2;
    group.add(body);

    [-1, 1].forEach((side) => {
      const panel = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(house.width * 0.68, 0.24, house.depth * 1.18),
        roofMaterial
      );
      panel.position.set(side * house.width * 0.18, 0.35 + house.height, 0);
      panel.rotation.z = side * 0.62;
      group.add(panel);
    });

    const ridge = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.18, 0.18, house.depth * 1.22),
      trimMaterial
    );
    ridge.position.y = 0.5 + house.height;
    group.add(ridge);

    const door = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.48, 0.78, 0.055), trimMaterial);
    door.position.set(0, 0.64, -house.depth / 2 - 0.032);
    group.add(door);
    const doorLintel = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.64, 0.08, 0.064), voxelTrimMaterial);
    doorLintel.position.set(0, 1.06, -house.depth / 2 - 0.038);
    group.add(doorLintel);
    [-1, 1].forEach((side) => {
      const doorFrame = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.07, 0.84, 0.064), voxelTrimMaterial);
      doorFrame.position.set(side * 0.28, 0.66, -house.depth / 2 - 0.039);
      group.add(doorFrame);
    });

    [-1, 1].forEach((side) => {
      const window = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.32, 0.28, 0.055), trimMaterial);
      window.position.set(side * house.width * 0.28, 1.18, -house.depth / 2 - 0.034);
      group.add(window);
      const sill = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.42, 0.055, 0.064), voxelTrimMaterial);
      sill.position.set(side * house.width * 0.28, 0.99, -house.depth / 2 - 0.04);
      group.add(sill);
      const frameVertical = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.045, 0.34, 0.064), voxelTrimMaterial);
      frameVertical.position.set(side * house.width * 0.28, 1.18, -house.depth / 2 - 0.042);
      group.add(frameVertical);
    });

    [-1, 1].forEach((xSide) => {
      [-1, 1].forEach((zSide) => {
        const pillar = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.12, house.height + 0.12, 0.12), voxelTrimMaterial);
        pillar.position.set(xSide * (house.width / 2 - 0.06), 0.3 + house.height / 2, zSide * (house.depth / 2 - 0.06));
        group.add(pillar);
      });
    });

    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        [-1, 1].forEach((side) => {
          const shingle = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.18, 0.035, 0.12), trimMaterial);
          shingle.position.set(
            side * (-house.width * 0.16 + column * house.width * 0.08),
            house.height + 0.27 + row * 0.09,
            -house.depth * 0.42 + column * 0.01
          );
          shingle.rotation.z = side * 0.62;
          group.add(shingle);
        });
      }
    }

    for (let step = 0; step < 3; step += 1) {
      const stair = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(0.82 + step * 0.16, 0.1, 0.24),
        step % 2 ? voxelTrimMaterial : shadowMaterial
      );
      stair.position.set(0, 0.16 + step * 0.08, -house.depth / 2 - 0.2 - step * 0.2);
      group.add(stair);
    }

    [-1, 1].forEach((side) => {
      const planter = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.42, 0.18, 0.18), shadowMaterial);
      planter.position.set(side * house.width * 0.39, 0.28, -house.depth / 2 - 0.16);
      group.add(planter);
      const sprout = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.12, 0.28, 0.12), trimMaterial);
      sprout.position.set(side * house.width * 0.39, 0.52, -house.depth / 2 - 0.16);
      group.add(sprout);
    });

    const chimney = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.28, 0.62, 0.28), shadowMaterial);
    chimney.position.set(-house.width * 0.22, house.height + 0.62, house.depth * 0.16);
    chimney.rotation.z = Math.sin(index) * 0.06;
    group.add(chimney);

    root.add(group);
  });
}

function addExpandedVoxelLife(THREE_REF: typeof THREE, root: THREE.Group) {
  const grassMaterials = EXTRA_GRASS_PATCHES.map(
    (patch) =>
      new THREE_REF.MeshStandardMaterial({
        color: patch.color,
        emissive: patch.color,
        emissiveIntensity: 0.08,
        roughness: 0.9,
      })
  );
  EXTRA_GRASS_PATCHES.forEach((patch, index) => {
    const grass = new THREE_REF.Mesh(
      new THREE_REF.CylinderGeometry(scaleWorldValue(patch.rx), scaleWorldValue(patch.rx * 0.92), 0.035, 11),
      grassMaterials[index]
    );
    grass.position.set(scaleWorldValue(patch.x), 0.155 + index * 0.002, scaleWorldValue(patch.z));
    grass.scale.z = patch.rz / patch.rx;
    grass.rotation.y = index * 0.42;
    root.add(grass);
  });

  EXTRA_COMMUNITY_HOUSES.forEach((house, index) => {
    addCompactCommunityHouse(THREE_REF, root, house, index);
  });
  EXTRA_TREE_SPECS.forEach((tree, index) => {
    addDenseVoxelTree(THREE_REF, root, tree, index);
  });
  AQUARIUS_ANIMALS.forEach((animal, index) => {
    addNamedAquariusAnimal(THREE_REF, root, animal, index);
  });
  addExtraVoxelLandmarks(THREE_REF, root);
}

function addExtraVoxelLandmarks(THREE_REF: typeof THREE, root: THREE.Group) {
  EXTRA_LIGHTHOUSE_SPECS.forEach((tower, index) => {
    const group = new THREE_REF.Group();
    group.position.set(scaleWorldValue(tower.x), 0.28, scaleWorldValue(tower.z));
    const wall = new THREE_REF.MeshStandardMaterial({ color: index % 2 ? "#e0f2fe" : "#f8fafc", roughness: 0.72 });
    const trim = new THREE_REF.MeshStandardMaterial({
      color: tower.accent,
      emissive: tower.accent,
      emissiveIntensity: 0.28,
      roughness: 0.48,
    });
    const dark = new THREE_REF.MeshStandardMaterial({ color: "#1e293b", roughness: 0.82 });
    for (let level = 0; level < 5; level += 1) {
      const size = 0.82 - level * 0.045;
      const block = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(size, tower.height / 5, size), level % 2 ? trim : wall);
      block.position.y = (tower.height / 10) + level * (tower.height / 5);
      group.add(block);
    }
    const balcony = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.08, 0.14, 1.08), dark);
    balcony.position.y = tower.height + 0.08;
    group.add(balcony);
    const lamp = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.62, 0.42, 0.62), trim);
    lamp.position.y = tower.height + 0.42;
    group.add(lamp);
    const roof = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(0.58, 0.58, 4), dark);
    roof.position.y = tower.height + 0.92;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    root.add(group);
  });

  EXTRA_FOUNTAIN_SPECS.forEach((fountain, index) => {
    const group = new THREE_REF.Group();
    group.position.set(scaleWorldValue(fountain.x), 0.3, scaleWorldValue(fountain.z));
    const stone = new THREE_REF.MeshStandardMaterial({ color: "#c7d2fe", roughness: 0.72 });
    const water = new THREE_REF.MeshBasicMaterial({ color: fountain.accent, transparent: true, opacity: 0.72 });
    const base = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(fountain.radius, fountain.radius * 1.08, 0.22, 8), stone);
    base.position.y = 0.12;
    group.add(base);
    const pool = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(fountain.radius * 0.72, fountain.radius * 0.72, 0.06, 8), water);
    pool.position.y = 0.27;
    group.add(pool);
    for (let jet = 0; jet < 5; jet += 1) {
      const angle = (jet / 5) * Math.PI * 2 + index * 0.2;
      const stream = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.055, 0.62 + (jet % 2) * 0.22, 0.055), water);
      stream.position.set(Math.cos(angle) * fountain.radius * 0.28, 0.6 + (jet % 2) * 0.08, Math.sin(angle) * fountain.radius * 0.28);
      stream.rotation.z = Math.cos(angle) * 0.24;
      stream.rotation.x = Math.sin(angle) * 0.24;
      group.add(stream);
    }
    root.add(group);
  });
}

function addCompactCommunityHouse(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  house: (typeof EXTRA_COMMUNITY_HOUSES)[number],
  index: number
) {
  const group = new THREE_REF.Group();
  group.position.set(scaleWorldValue(house.position[0]), 0.26, scaleWorldValue(house.position[1]));
  group.rotation.y = house.rotation;
  const wall = new THREE_REF.MeshStandardMaterial({
    color: house.color,
    emissive: house.color,
    emissiveIntensity: 0.055,
    roughness: 0.68,
  });
  const roof = new THREE_REF.MeshStandardMaterial({
    color: house.roof,
    emissive: house.accent,
    emissiveIntensity: 0.1,
    roughness: 0.56,
  });
  const trim = new THREE_REF.MeshBasicMaterial({ color: house.accent });
  const dark = new THREE_REF.MeshStandardMaterial({ color: "#1f2a44", roughness: 0.84 });

  const base = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(house.width + 0.28, 0.18, house.depth + 0.28), dark);
  base.position.y = 0.09;
  group.add(base);
  const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(house.width, house.height, house.depth), wall);
  body.position.y = 0.18 + house.height / 2;
  group.add(body);
  const roofBlock = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(house.width + 0.36, 0.24, house.depth + 0.34), roof);
  roofBlock.position.y = house.height + 0.36;
  group.add(roofBlock);

  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const pixel = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.16, 0.14, 0.04), trim);
      pixel.position.set(-house.width * 0.28 + col * house.width * 0.28, 0.76 + row * 0.34, -house.depth / 2 - 0.03);
      group.add(pixel);
    }
  }
  const door = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.34, 0.54, 0.05), trim);
  door.position.set(index % 2 ? -house.width * 0.18 : house.width * 0.18, 0.48, -house.depth / 2 - 0.035);
  group.add(door);
  const antenna = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.08, 0.72, 0.08), trim);
  antenna.position.set(house.width * 0.28, house.height + 0.85, 0);
  group.add(antenna);
  const beacon = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.22, 0.14, 0.22), trim);
  beacon.position.set(house.width * 0.28, house.height + 1.25, 0);
  group.add(beacon);

  if (index % 4 === 0) {
    for (let step = 0; step < 5; step += 1) {
      const stair = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.9, 0.12, 0.38), step % 2 ? trim : dark);
      stair.position.set(0, 0.08 + step * 0.13, -house.depth / 2 - 0.3 - step * 0.34);
      group.add(stair);
    }
  }

  root.add(group);
}

function addDenseVoxelTree(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  tree: (typeof EXTRA_TREE_SPECS)[number],
  index: number
) {
  const group = new THREE_REF.Group();
  group.position.set(scaleWorldValue(tree.x), 0.2, scaleWorldValue(tree.z));
  const trunkMaterial = new THREE_REF.MeshStandardMaterial({ color: "#6b3f22", roughness: 0.88 });
  const leafMaterial = new THREE_REF.MeshStandardMaterial({
    color: tree.color,
    emissive: tree.glow,
    emissiveIntensity: 0.04,
    roughness: 0.9,
  });
  const trunk = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.34, tree.height, 0.34), trunkMaterial);
  trunk.position.y = tree.height / 2;
  group.add(trunk);
  const leafLayers = [
    { y: tree.height + 0.1, s: 1.12 },
    { y: tree.height + 0.52, s: 0.86 },
    { y: tree.height + 0.86, s: 0.56 },
  ];
  leafLayers.forEach((layer, layerIndex) => {
    const crown = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(layer.s + (index % 3) * 0.08, 0.42, layer.s),
      leafMaterial
    );
    crown.position.y = layer.y;
    crown.rotation.y = (layerIndex + index) * 0.42;
    group.add(crown);
  });
  root.add(group);
}

function addNamedAquariusAnimal(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  animal: (typeof AQUARIUS_ANIMALS)[number],
  index: number
) {
  const group = new THREE_REF.Group();
  group.position.set(scaleWorldValue(animal.x), 0.32 + (animal.type === "bird" ? 1.25 : 0), scaleWorldValue(animal.z));
  group.rotation.y = index * 0.37;
  const bodyMaterial = new THREE_REF.MeshStandardMaterial({
    color: animal.color,
    emissive: animal.color,
    emissiveIntensity: 0.04,
    roughness: 0.78,
  });
  const accentMaterial = new THREE_REF.MeshBasicMaterial({ color: animal.accent });
  const darkMaterial = new THREE_REF.MeshStandardMaterial({ color: "#111827", roughness: 0.82 });
  const lightMaterial = new THREE_REF.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.76 });
  const pinkMaterial = new THREE_REF.MeshStandardMaterial({ color: "#f9a8d4", roughness: 0.72 });
  const tanMaterial = new THREE_REF.MeshStandardMaterial({ color: "#f2c29b", roughness: 0.74 });
  const box = (
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    rotation: [number, number, number] = [0, 0, 0]
  ) => {
    const mesh = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(...rotation);
    group.add(mesh);
    return mesh;
  };
  const eye = (x: number, y: number, z: number) => box(0.055, 0.12, 0.055, darkMaterial, x, y, z);
  const quadLegs = (width: number, depth: number, material: THREE.Material = darkMaterial) => {
    [-1, 1].forEach((xSide) => {
      [-1, 1].forEach((zSide) => {
        box(0.14, 0.44, 0.14, material, xSide * width * 0.32, 0.15, zSide * depth * 0.33);
      });
    });
  };

  if (animal.type === "snake") {
    for (let segment = 0; segment < 9; segment += 1) {
      const bend = Math.sin(segment * 0.9) * 0.22;
      box(0.32, 0.22, 0.28, bodyMaterial, bend, 0.38 + segment * 0.012, -0.82 + segment * 0.22);
    }
    box(0.42, 0.32, 0.42, bodyMaterial, 0.28, 0.56, 1.05);
    box(0.55, 0.12, 0.5, accentMaterial, 0.18, 0.68, 0.84);
    eye(0.5, 0.64, 1.15);
    eye(0.23, 0.64, 1.2);
    box(0.16, 0.035, 0.42, pinkMaterial, 0.56, 0.49, 1.14);
  } else if (animal.type === "bird" || animal.type === "chicken") {
    box(0.56, 0.62, 0.48, bodyMaterial, 0, 0.5, 0);
    box(0.42, 0.34, 0.38, bodyMaterial, 0.42, 0.9, 0);
    box(0.18, 0.12, 0.2, accentMaterial, 0.72, 0.9, 0);
    box(0.1, 0.12, 0.1, darkMaterial, 0.6, 0.98, -0.1);
    box(0.1, 0.12, 0.1, darkMaterial, 0.6, 0.98, 0.1);
    box(0.36, 0.12, 0.16, accentMaterial, 0.12, 1.18, 0);
    [-1, 1].forEach((side) => {
      box(0.18, 0.44, 0.12, darkMaterial, -0.12, 0.14, side * 0.12);
      box(0.16, 0.09, 0.56, accentMaterial, -0.1, 0.62, side * 0.36, [0, 0, side * 0.22]);
    });
    box(0.24, 0.28, 0.2, accentMaterial, -0.42, 0.62, 0);
  } else {
    const large = animal.type === "rhino" || animal.type === "horse" || animal.type === "cow";
    const longBody = large ? 1.12 : animal.type === "rabbit" || animal.type === "cat" ? 0.78 : 0.88;
    const bodyDepth = animal.type === "rhino" ? 0.72 : animal.type === "horse" || animal.type === "cow" ? 0.62 : 0.52;
    const bodyHeight = animal.type === "rhino" ? 0.58 : animal.type === "frog" ? 0.38 : 0.5;
    box(longBody, bodyHeight, bodyDepth, bodyMaterial, 0, 0.48, 0);
    box(0.44, 0.42, 0.42, bodyMaterial, longBody * 0.52, 0.74, 0);
    quadLegs(longBody, bodyDepth);
    eye(longBody * 0.52 + 0.22, 0.82, -0.11);
    eye(longBody * 0.52 + 0.22, 0.82, 0.11);
    box(0.14, 0.08, 0.22, accentMaterial, longBody * 0.52 + 0.28, 0.66, 0);

    if (animal.type === "sheep") {
      for (let fluff = 0; fluff < 12; fluff += 1) {
        const fx = -0.36 + (fluff % 4) * 0.22;
        const fz = -0.26 + Math.floor(fluff / 4) * 0.26;
        box(0.2, 0.2, 0.2, lightMaterial, fx, 0.78 + (fluff % 2) * 0.06, fz);
      }
      box(0.18, 0.28, 0.08, accentMaterial, 0.58, 0.98, -0.22);
      box(0.18, 0.28, 0.08, accentMaterial, 0.58, 0.98, 0.22);
    } else if (animal.type === "frog") {
      box(0.18, 0.16, 0.18, accentMaterial, 0.58, 1.02, -0.18);
      box(0.18, 0.16, 0.18, accentMaterial, 0.58, 1.02, 0.18);
      eye(0.66, 1.06, -0.18);
      eye(0.66, 1.06, 0.18);
      box(0.54, 0.08, 0.16, accentMaterial, -0.3, 0.18, -0.36);
      box(0.54, 0.08, 0.16, accentMaterial, -0.3, 0.18, 0.36);
    } else if (animal.type === "rhino") {
      box(0.38, 0.16, 0.18, accentMaterial, 0.86, 0.86, 0);
      box(0.18, 0.24, 0.16, darkMaterial, 0.28, 0.9, -0.4);
      box(0.18, 0.24, 0.16, darkMaterial, 0.28, 0.9, 0.4);
      box(0.22, 0.18, 0.26, darkMaterial, -0.6, 0.52, 0);
    } else if (animal.type === "cow") {
      [-0.28, 0.05, 0.36].forEach((sx, spot) => {
        box(0.24, 0.22, 0.045, darkMaterial, sx, 0.58 + spot * 0.04, spot % 2 ? -0.34 : 0.34);
      });
      box(0.18, 0.18, 0.08, accentMaterial, 0.58, 1.0, -0.24);
      box(0.18, 0.18, 0.08, accentMaterial, 0.58, 1.0, 0.24);
      box(0.18, 0.12, 0.24, pinkMaterial, -0.08, 0.28, 0);
      box(0.12, 0.08, 0.42, darkMaterial, -0.68, 0.6, 0, [0, 0.35, 0]);
    } else if (animal.type === "dog") {
      box(0.18, 0.34, 0.08, darkMaterial, 0.52, 0.88, -0.27);
      box(0.18, 0.34, 0.08, darkMaterial, 0.52, 0.88, 0.27);
      box(0.14, 0.12, 0.52, accentMaterial, 0.02, 0.72, 0);
      box(0.14, 0.12, 0.5, bodyMaterial, -0.56, 0.74, 0, [0, 0, 0.42]);
    } else if (animal.type === "cat") {
      box(0.18, 0.28, 0.08, bodyMaterial, 0.5, 1.03, -0.18, [0, 0, -0.28]);
      box(0.18, 0.28, 0.08, bodyMaterial, 0.5, 1.03, 0.18, [0, 0, 0.28]);
      [-0.16, 0, 0.16].forEach((line) => {
        box(0.04, 0.03, 0.42, accentMaterial, 0.78, 0.72 + line, -0.26, [0, 0.25, 0]);
        box(0.04, 0.03, 0.42, accentMaterial, 0.78, 0.72 + line, 0.26, [0, -0.25, 0]);
      });
      box(0.12, 0.12, 0.78, bodyMaterial, -0.52, 0.72, 0, [0, 0, 0.58]);
    } else if (animal.type === "pig") {
      box(0.24, 0.16, 0.3, pinkMaterial, 0.76, 0.68, 0);
      box(0.06, 0.06, 0.06, darkMaterial, 0.9, 0.69, -0.07);
      box(0.06, 0.06, 0.06, darkMaterial, 0.9, 0.69, 0.07);
      box(0.16, 0.18, 0.08, bodyMaterial, 0.54, 0.98, -0.18);
      box(0.16, 0.18, 0.08, bodyMaterial, 0.54, 0.98, 0.18);
      box(0.1, 0.1, 0.42, pinkMaterial, -0.56, 0.68, 0, [0.4, 0.4, 0]);
    } else if (animal.type === "rabbit") {
      box(0.15, 0.62, 0.11, bodyMaterial, 0.54, 1.18, -0.16);
      box(0.15, 0.62, 0.11, bodyMaterial, 0.54, 1.18, 0.16);
      box(0.16, 0.16, 0.16, lightMaterial, -0.48, 0.66, 0);
      box(0.3, 0.12, 0.2, accentMaterial, -0.26, 0.18, -0.3);
      box(0.3, 0.12, 0.2, accentMaterial, -0.26, 0.18, 0.3);
    } else if (animal.type === "horse") {
      for (let mane = 0; mane < 5; mane += 1) {
        box(0.09, 0.17, 0.12, darkMaterial, 0.48 - mane * 0.08, 0.98 - mane * 0.04, -0.02);
      }
      box(0.2, 0.16, 0.64, accentMaterial, 0.0, 0.74, 0);
      box(0.18, 0.2, 0.64, darkMaterial, -0.62, 0.72, 0, [0, 0, -0.32]);
    } else if (animal.type === "monkey") {
      box(0.34, 0.34, 0.05, tanMaterial, 0.56, 0.76, 0);
      box(0.16, 0.34, 0.1, bodyMaterial, 0.48, 0.78, -0.31);
      box(0.16, 0.34, 0.1, bodyMaterial, 0.48, 0.78, 0.31);
      box(0.14, 0.62, 0.14, bodyMaterial, -0.06, 0.5, -0.4, [0.25, 0, 0]);
      box(0.14, 0.62, 0.14, bodyMaterial, -0.06, 0.5, 0.4, [-0.25, 0, 0]);
      box(0.12, 0.12, 0.92, accentMaterial, -0.58, 0.74, 0, [0, 0.2, 0.5]);
    }
  }

  const label = makeAnimalLabel(THREE_REF, animal.name, animal.accent);
  label.position.set(0, animal.type === "bird" ? 1.45 : 1.42, 0);
  group.add(label);
  root.add(group);
}

function makeAnimalLabel(THREE_REF: typeof THREE, name: string, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(7, 10, 18, 0.58)";
    context.fillRect(28, 34, 328, 58);
    context.strokeStyle = accent;
    context.lineWidth = 3;
    context.strokeRect(34, 40, 316, 46);
    context.fillStyle = "#f8fafc";
    context.font = "700 24px sans-serif";
    context.textAlign = "center";
    context.fillText(name, 192, 72);
  }
  const texture = new THREE_REF.CanvasTexture(canvas);
  const sprite = new THREE_REF.Sprite(new THREE_REF.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(1.8, 0.6, 1);
  return sprite;
}

function addAquariusPlazaGlyph(THREE_REF: typeof THREE, root: THREE.Group) {
  const ringMaterial = new THREE_REF.MeshBasicMaterial({ color: "#d8b4fe", transparent: true, opacity: 0.82 });
  [3.1, 4.45, 5.8].forEach((radius, index) => {
    const ring = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(radius, 0.035, 8, 120), ringMaterial);
    ring.position.y = 0.43 + index * 0.005;
    ring.rotation.x = Math.PI / 2;
    root.add(ring);
  });

  const waveMaterial = new THREE_REF.MeshBasicMaterial({ color: "#7dd3fc", transparent: true, opacity: 0.86 });
  for (let row = 0; row < 2; row += 1) {
    for (let index = 0; index < 5; index += 1) {
      const mark = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.58, 0.028, 0.08), waveMaterial);
      mark.position.set(-1.25 + index * 0.62, 0.48, -0.35 + row * 0.55 + Math.sin(index) * 0.08);
      mark.rotation.y = Math.sin(index * 1.3) * 0.42;
      root.add(mark);
    }
  }
}

function addCityProp(THREE_REF: typeof THREE, root: THREE.Group, spec: CityPropSpec) {
  const group = new THREE_REF.Group();
  group.position.set(spec.position[0], spec.elevation, spec.position[1]);
  group.rotation.y = spec.rotation ?? 0;
  const accent = new THREE_REF.MeshStandardMaterial({
    color: spec.accent,
    emissive: spec.accent,
    emissiveIntensity: 0.36,
    roughness: 0.42,
    metalness: 0.12,
  });
  const dark = new THREE_REF.MeshStandardMaterial({ color: "#1f2a44", roughness: 0.76, metalness: 0.1 });

  if (spec.kind === "lamp") {
    const post = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.035, 0.045, 1.15, 8), dark);
    post.position.y = 0.58;
    group.add(post);
    const bulb = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.14, 14, 14), accent);
    bulb.position.y = 1.22;
    group.add(bulb);
  } else if (spec.kind === "bench") {
    const seat = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.95, 0.12, 0.32), dark);
    seat.position.y = 0.26;
    group.add(seat);
    const back = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.95, 0.35, 0.08), accent);
    back.position.set(0, 0.48, -0.17);
    group.add(back);
  } else if (spec.kind === "planter") {
    const pot = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.22, 0.3, 0.28, 10), dark);
    pot.position.y = 0.16;
    group.add(pot);
    const leaf = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(0.3, 0.72, 5), accent);
    leaf.position.y = 0.64;
    group.add(leaf);
  } else if (spec.kind === "sign") {
    const post = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.035, 0.045, 0.86, 8), dark);
    post.position.y = 0.44;
    group.add(post);
    const board = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.74, 0.4, 0.06), accent);
    board.position.y = 0.93;
    group.add(board);
  } else if (spec.kind === "energy") {
    const box = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.72, 0.62, 0.56), dark);
    box.position.y = 0.36;
    group.add(box);
    const strip = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.58, 0.08, 0.035), accent);
    strip.position.set(0, 0.58, -0.29);
    group.add(strip);
  } else if (spec.kind === "sculpture") {
    const base = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.32, 0.42, 0.28, 10), dark);
    base.position.y = 0.14;
    group.add(base);
    const art = new THREE_REF.Mesh(new THREE_REF.OctahedronGeometry(0.42, 0), accent);
    art.position.y = 0.72;
    art.rotation.set(0.4, 0.6, 0.2);
    group.add(art);
  } else if (spec.kind === "fountain") {
    const base = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.72, 0.86, 0.22, 18), dark);
    base.position.y = 0.12;
    group.add(base);
    const lowerBowl = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.52, 0.62, 0.16, 18), accent);
    lowerBowl.position.y = 0.35;
    group.add(lowerBowl);
    const upperBowl = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.28, 0.34, 0.12, 14), accent);
    upperBowl.position.y = 0.78;
    group.add(upperBowl);
    const water = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.09, 0.15, 1.18, 12), accent);
    water.position.y = 0.78;
    group.add(water);
    for (let jet = 0; jet < 4; jet += 1) {
      const theta = (jet / 4) * Math.PI * 2;
      const stream = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.045, 0.5, 0.045), accent);
      stream.position.set(Math.cos(theta) * 0.32, 0.66, Math.sin(theta) * 0.32);
      stream.rotation.z = Math.cos(theta) * 0.28;
      stream.rotation.x = Math.sin(theta) * 0.28;
      group.add(stream);
    }
    const crystal = new THREE_REF.Mesh(new THREE_REF.OctahedronGeometry(0.18, 0), accent);
    crystal.position.y = 1.45;
    group.add(crystal);
  } else {
    const terminal = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.52, 0.74, 0.18), dark);
    terminal.position.y = 0.42;
    group.add(terminal);
    const screen = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.42, 0.24, 0.035), accent);
    screen.position.set(0, 0.58, -0.1);
    group.add(screen);
  }

  root.add(group);
}

function addStreetRhythm(THREE_REF: typeof THREE, root: THREE.Group) {
  const lampMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#eef2ff",
    emissive: "#7dd3fc",
    emissiveIntensity: 0.14,
    roughness: 0.38,
    metalness: 0.18,
  });
  const matrix = new THREE_REF.Matrix4();
  const lampPositions = [
    [-4.6, 0.48, -4.1],
    [4.4, 0.48, -4.1],
    [-5.3, 0.43, 3.6],
    [5.4, 0.43, 3.5],
    [-11.3, 0.56, -6.4],
    [-16.9, 0.56, -9.4],
    [11.2, 0.58, -6.6],
    [17.3, 0.58, -9.2],
    [-12.5, 0.44, 7.1],
    [-18.4, 0.44, 9.1],
    [12.4, 0.44, 7.3],
    [18.2, 0.44, 9.4],
    [-5.8, 0.33, 16.2],
    [5.8, 0.33, 16.2],
  ] as const;

  const posts = new THREE_REF.InstancedMesh(new THREE_REF.CylinderGeometry(0.035, 0.045, 1.05, 8), lampMaterial, lampPositions.length);
  const bulbs = new THREE_REF.InstancedMesh(new THREE_REF.SphereGeometry(0.12, 12, 12), lampMaterial, lampPositions.length);
  lampPositions.forEach(([x, y, z], index) => {
    matrix.makeTranslation(scaleWorldValue(x), y + 0.52, scaleWorldValue(z));
    posts.setMatrixAt(index, matrix);
    matrix.makeTranslation(scaleWorldValue(x), y + 1.12, scaleWorldValue(z));
    bulbs.setMatrixAt(index, matrix);
  });
  posts.instanceMatrix.needsUpdate = true;
  bulbs.instanceMatrix.needsUpdate = true;
  root.add(posts);
  root.add(bulbs);
}

function addAquariusLandmarks(THREE_REF: typeof THREE, root: THREE.Group) {
  const glass = new THREE_REF.MeshStandardMaterial({
    color: "#7dd3fc",
    emissive: "#0284c7",
    emissiveIntensity: 0.42,
    transparent: true,
    opacity: 0.74,
    roughness: 0.18,
  });
  const pastel = new THREE_REF.MeshStandardMaterial({
    color: "#d8b4fe",
    emissive: "#7c3aed",
    emissiveIntensity: 0.12,
    roughness: 0.48,
    metalness: 0.08,
  });
  const mint = new THREE_REF.MeshStandardMaterial({
    color: "#5eead4",
    emissive: "#0f766e",
    emissiveIntensity: 0.24,
    roughness: 0.42,
  });
  const dark = new THREE_REF.MeshStandardMaterial({
    color: "#1f2a44",
    roughness: 0.78,
    metalness: 0.12,
  });

  const satellite = new THREE_REF.Group();
  satellite.position.set(scaleWorldValue(-20.4), 0.22, scaleWorldValue(-18.6));
  satellite.add(new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.18, 0.28, 1.6, 12), dark));
  const dish = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(1.2, 0.42, 36, 1, true), glass);
  dish.position.set(0, 1.65, 0);
  dish.rotation.x = Math.PI / 2.4;
  satellite.add(dish);
  const signal = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(1.6, 0.025, 8, 80), mint);
  signal.position.y = 1.78;
  signal.rotation.x = Math.PI / 2.4;
  satellite.add(signal);
  root.add(satellite);

  const lighthouse = new THREE_REF.Group();
  lighthouse.position.set(scaleWorldValue(22.2), 0.2, scaleWorldValue(16.6));
  const tower = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.48, 0.72, 3.4, 18), pastel);
  tower.position.y = 1.7;
  lighthouse.add(tower);
  const lantern = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.64, 0.64, 0.48, 18), glass);
  lantern.position.y = 3.58;
  lighthouse.add(lantern);
  const beam = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(2.2, 3.8, 24, 1, true), new THREE_REF.MeshBasicMaterial({
    color: "#bfdbfe",
    transparent: true,
    opacity: 0.14,
    side: THREE_REF.DoubleSide,
  }));
  beam.position.set(-1.8, 3.58, -0.2);
  beam.rotation.z = Math.PI / 2;
  lighthouse.add(beam);
  root.add(lighthouse);

  const school = new THREE_REF.Group();
  school.position.set(scaleWorldValue(-19.3), 0.34, scaleWorldValue(3.2));
  const schoolBase = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(3.9, 1.45, 2.2), pastel);
  schoolBase.position.y = 0.95;
  school.add(schoolBase);
  const roof = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(2.35, 0.72, 4), mint);
  roof.position.y = 1.98;
  roof.rotation.y = Math.PI / 4;
  school.add(roof);
  const sign = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.7, 0.36, 0.06), glass);
  sign.position.set(0, 1.36, -1.14);
  school.add(sign);
  root.add(school);

  const ufo = new THREE_REF.Group();
  ufo.position.set(scaleWorldValue(18.6), 3.8, scaleWorldValue(-18.4));
  const saucer = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(1.65, 32, 12), glass);
  saucer.scale.set(1.45, 0.22, 1);
  ufo.add(saucer);
  const dome = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.72, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), pastel);
  dome.position.y = 0.18;
  ufo.add(dome);
  const landingBeam = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(0.92, 3.2, 28, 1, true), new THREE_REF.MeshBasicMaterial({
    color: "#5eead4",
    transparent: true,
    opacity: 0.18,
    side: THREE_REF.DoubleSide,
  }));
  landingBeam.position.y = -1.65;
  landingBeam.rotation.x = Math.PI;
  ufo.add(landingBeam);
  root.add(ufo);

  const alienMaterial = new THREE_REF.MeshStandardMaterial({ color: "#93e6d2", emissive: "#0f766e", emissiveIntensity: 0.18, roughness: 0.52 });
  [
    [16.8, -16.2],
    [20.1, -15.4],
    [-17.6, 4.8],
    [-21.2, 1.4],
  ].forEach(([x, z], index) => {
    const alien = new THREE_REF.Group();
    alien.position.set(scaleWorldValue(x), 0.4, scaleWorldValue(z));
    const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.42, 0.66, 0.32), alienMaterial);
    body.position.y = 0.48;
    alien.add(body);
    const head = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.3, 18, 14), alienMaterial);
    head.position.y = 1.02;
    alien.add(head);
    const face = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.26, 0.08, 0.035), dark);
    face.position.set(0, 1.03, -0.28);
    alien.add(face);
    alien.rotation.y = index * 0.7;
    root.add(alien);
  });
}

function addJumpRoutePlatforms(
  THREE_REF: typeof THREE,
  root: THREE.Group,
  platformMaterial: THREE.Material,
  glowMaterial: THREE.Material
) {
  JUMP_PLATFORM_SPECS.forEach((platform, index) => {
    const step = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(scaleWorldValue(platform.width), 0.18, scaleWorldValue(platform.depth)),
      platformMaterial
    );
    step.position.set(scaleWorldValue(platform.x), platform.height - 0.08, scaleWorldValue(platform.z));
    step.rotation.y = index % 3 === 0 ? 0 : 0.12;
    root.add(step);

    const edge = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(scaleWorldValue(platform.width) * 0.92, 0.035, 0.035),
      glowMaterial
    );
    edge.position.set(scaleWorldValue(platform.x), platform.height + 0.025, scaleWorldValue(platform.z - platform.depth * 0.48));
    edge.rotation.y = step.rotation.y;
    root.add(edge);

    if (index % 3 === 2) {
      const marker = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.18, 0.78, 0.18), glowMaterial);
      marker.position.set(scaleWorldValue(platform.x + 0.52), platform.height + 0.46, scaleWorldValue(platform.z + 0.52));
      root.add(marker);
    }
  });
}

function createSkyWhale(THREE_REF: typeof THREE, scale = 1.35) {
  const group = new THREE_REF.Group();
  group.name = "sky-whale";
  const bodyMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#8bd3ff",
    emissive: "#0f4f77",
    emissiveIntensity: 0.24,
    roughness: 0.5,
  });
  const bellyMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#e0f2fe",
    emissive: "#38bdf8",
    emissiveIntensity: 0.08,
    roughness: 0.56,
  });
  const body = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(1.4, 28, 16), bodyMaterial);
  body.scale.set(2.2, 0.72, 0.82);
  group.add(body);
  const belly = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(1.04, 24, 12), bellyMaterial);
  belly.position.set(0.2, -0.22, 0);
  belly.scale.set(1.8, 0.32, 0.64);
  group.add(belly);
  const tail = new THREE_REF.Group();
  tail.position.set(-2.95, 0, 0);
  [-1, 1].forEach((side) => {
    const fluke = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.8, 0.1, 0.42), bodyMaterial);
    fluke.position.set(-0.12, 0, side * 0.34);
    fluke.rotation.y = side * 0.55;
    tail.add(fluke);
  });
  group.add(tail);
  const fins = [-1, 1].map((side) => {
    const fin = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.12, 0.08, 0.36), bodyMaterial);
    fin.position.set(0.1, -0.12, side * 0.9);
    fin.rotation.y = side * 0.34;
    group.add(fin);
    return fin;
  });
  const eye = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.08, 12, 12), new THREE_REF.MeshBasicMaterial({ color: "#06111f" }));
  eye.position.set(2.2, 0.16, -0.42);
  group.add(eye);
  group.userData.fins = fins;
  group.userData.tail = tail;
  group.scale.setScalar(scale);
  return group;
}

function distance2(a: [number, number], b: [number, number]) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function midpoint2(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function segmentRotation(a: [number, number], b: [number, number]) {
  return -Math.atan2(b[1] - a[1], b[0] - a[0]);
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
    positions.push((Math.random() - 0.5) * 64, 0.5 + Math.random() * 6, (Math.random() - 0.5) * 64);
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

function createSkyWorlds(THREE_REF: typeof THREE) {
  const root = new THREE_REF.Group();
  root.name = "sky-worlds";
  const islandSeeds = [
    [-34, 14, -28, 1.4],
    [29, 18, -32, 1.1],
    [-42, 23, 8, 0.92],
    [38, 12, 18, 1.22],
    [-18, 27, 36, 0.78],
    [12, 19, 42, 1.04],
    [-52, 31, -4, 0.62],
    [51, 25, -10, 0.72],
  ] as const;
  islandSeeds.forEach(([x, y, z, scale], index) => {
    const island = createFloatingVoxelIsland(THREE_REF, index, scale);
    island.position.set(x, y, z);
    island.rotation.y = index * 0.42;
    island.userData.baseY = y;
    root.add(island);
  });

  const cloudMaterial = new THREE_REF.MeshBasicMaterial({
    color: "#f8fafc",
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  const cloudSeeds = [
    [-28, 17, 14, 1.25],
    [22, 22, -19, 1.0],
    [43, 15, 34, 0.82],
    [-49, 20, -31, 0.9],
    [4, 26, 50, 1.1],
    [-8, 18, -48, 0.72],
  ] as const;
  cloudSeeds.forEach(([x, y, z, scale], index) => {
    const cloud = new THREE_REF.Group();
    cloud.name = "voxel-cloud";
    cloud.position.set(x, y, z);
    cloud.userData.baseY = y;
    for (let block = 0; block < 5; block += 1) {
      const cube = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(1.4 * scale, 0.42 * scale, 0.72 * scale),
        cloudMaterial.clone()
      );
      cube.position.set((block - 2) * 0.78 * scale, Math.sin(block) * 0.12 * scale, (block % 2) * 0.38 * scale);
      cloud.add(cube);
    }
    cloud.userData.drift = index * 0.52;
    root.add(cloud);
  });
  return root;
}

function createFloatingVoxelIsland(THREE_REF: typeof THREE, index: number, scale: number) {
  const island = new THREE_REF.Group();
  const grass = new THREE_REF.MeshStandardMaterial({
    color: index % 2 ? "#79d479" : "#8bdc6b",
    roughness: 0.78,
  });
  const dirt = new THREE_REF.MeshStandardMaterial({ color: "#8a6242", roughness: 0.86 });
  const stone = new THREE_REF.MeshStandardMaterial({ color: "#7b8594", roughness: 0.82 });
  const water = new THREE_REF.MeshStandardMaterial({
    color: "#5eead4",
    emissive: "#0284c7",
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0.64,
    roughness: 0.2,
  });
  const blockSize = 0.72 * scale;
  for (let x = -2; x <= 2; x += 1) {
    for (let z = -2; z <= 2; z += 1) {
      const radius = Math.abs(x) + Math.abs(z);
      if (radius > 3 || (radius === 3 && (index + x + z) % 2 === 0)) {
        continue;
      }
      const top = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(blockSize, blockSize * 0.36, blockSize), grass);
      top.position.set(x * blockSize, 0, z * blockSize);
      island.add(top);
      const depth = 1 + Math.max(0, 3 - radius);
      for (let level = 1; level <= depth; level += 1) {
        const material = level > 1 ? stone : dirt;
        const block = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(blockSize, blockSize * 0.72, blockSize), material);
        block.position.set(x * blockSize, -level * blockSize * 0.62, z * blockSize);
        island.add(block);
      }
    }
  }
  if (index % 3 === 0) {
    const trunk = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.22 * scale, 1.1 * scale, 0.22 * scale), dirt);
    trunk.position.y = 0.62 * scale;
    island.add(trunk);
    const leaves = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.0 * scale, 0.8 * scale, 1.0 * scale), grass);
    leaves.position.y = 1.35 * scale;
    island.add(leaves);
  }
  if (index % 2 === 0) {
    const fall = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.18 * scale, 2.8 * scale, 0.18 * scale), water);
    fall.position.set(0.95 * scale, -1.0 * scale, -0.25 * scale);
    island.add(fall);
  }
  island.userData.floatOffset = index * 0.7;
  return island;
}

function cloneModel(
  THREE_REF: typeof THREE,
  model: THREE.Group,
  cloneAnimatedModel?: CloneModelFn
) {
  const clone = (cloneAnimatedModel ? cloneAnimatedModel(model) : model.clone(true)) as THREE.Group;
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

function groundModelToFloor(
  THREE_REF: typeof THREE,
  model: THREE.Object3D,
  floorOffset = 0,
  precise = false
) {
  const box = precise
    ? getVisibleObjectBox(THREE_REF, model, true)
    : new THREE_REF.Box3().setFromObject(model);
  if (!Number.isFinite(box.min.y)) {
    return;
  }
  model.position.y += floorOffset - box.min.y;
  model.userData.floorY = model.position.y;
}

function getModelFloorY(model: THREE.Object3D) {
  return typeof model.userData.floorY === "number" ? model.userData.floorY : PLAYER_FLOOR_OFFSET;
}

function normalizePlayerAvatarModel(THREE_REF: typeof THREE, model: THREE.Object3D) {
  const box = new THREE_REF.Box3().setFromObject(model);
  if (!Number.isFinite(box.min.y) || !Number.isFinite(box.max.y)) {
    return;
  }
  const size = box.getSize(new THREE_REF.Vector3());
  const height = Math.max(size.y, 0.001);
  const scale = PLAYER_RUNTIME_TARGET_HEIGHT / height;
  if (Number.isFinite(scale) && scale > 0.0001) {
    model.scale.multiplyScalar(scale);
  }
  const normalizedBox = new THREE_REF.Box3().setFromObject(model);
  const center = normalizedBox.getCenter(new THREE_REF.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
}

function registerPlayerWalkParts(model: THREE.Object3D) {
  const parts: Record<string, THREE.Object3D> = {};
  model.traverse((child) => {
    const name = child.name.toLowerCase();
    const compactName = name.replace(/[\s_.:-]+/g, "");
    if (
      name.includes("leg-left") ||
      compactName.includes("leftleg") ||
      compactName.includes("leftupleg") ||
      compactName.includes("leftupperleg") ||
      compactName.includes("leftthigh") ||
      compactName.includes("upperlegl") ||
      compactName.includes("legl") ||
      compactName.includes("legleft") ||
      compactName === "lleg"
    ) {
      parts.leftLeg = child;
    } else if (
      name.includes("leg-right") ||
      compactName.includes("rightleg") ||
      compactName.includes("rightupleg") ||
      compactName.includes("rightupperleg") ||
      compactName.includes("rightthigh") ||
      compactName.includes("upperlegr") ||
      compactName.includes("legr") ||
      compactName.includes("legright") ||
      compactName === "rleg"
    ) {
      parts.rightLeg = child;
    } else if (
      name.includes("arm-left") ||
      compactName.includes("leftarm") ||
      compactName.includes("leftupperarm") ||
      compactName.includes("leftforearm") ||
      compactName.includes("leftshoulder") ||
      compactName.includes("upperarml") ||
      compactName.includes("forearml") ||
      compactName.includes("arml") ||
      compactName.includes("armleft") ||
      compactName === "larm"
    ) {
      parts.leftArm = child;
    } else if (
      name.includes("arm-right") ||
      compactName.includes("rightarm") ||
      compactName.includes("rightupperarm") ||
      compactName.includes("rightforearm") ||
      compactName.includes("rightshoulder") ||
      compactName.includes("upperarmr") ||
      compactName.includes("forearmr") ||
      compactName.includes("armr") ||
      compactName.includes("armright") ||
      compactName === "rarm"
    ) {
      parts.rightArm = child;
    } else if (name === "torso" || name.includes("body")) {
      parts.torso = child;
    } else if (name.includes("head")) {
      parts.head = child;
    }
    if (child.name) {
      child.userData.baseRotation = child.rotation.clone();
    }
  });
  model.userData.walkParts = parts;
}

function applyNaturalPlayerRestPose(model: THREE.Object3D, avatarId: PlayerAvatarId) {
  const parts = model.userData.walkParts as Record<string, THREE.Object3D> | undefined;
  if (!parts || avatarId !== "author-self") {
    return;
  }
  const lowerArm = (part: THREE.Object3D | undefined, side: -1 | 1) => {
    if (!part) {
      return;
    }
    const base = (part.userData.baseRotation as THREE.Euler | undefined)?.clone() ?? part.rotation.clone();
    base.z += side * 0.95;
    base.x += 0.08;
    part.rotation.copy(base);
    part.userData.baseRotation = base.clone();
  };
  lowerArm(parts.leftArm, -1);
  lowerArm(parts.rightArm, 1);
}

function applyPlayerWalkCycle(model: THREE.Object3D, moving: boolean, running: boolean) {
  const parts = model.userData.walkParts as Record<string, THREE.Object3D> | undefined;
  if (!parts) {
    return;
  }
  const time = performance.now() * 0.001;
  const stride = moving ? Math.sin(time * (running ? 12.8 : 9.4)) : 0;
  const swing = moving ? 0.54 : 0.04;
  const avatarId = model.userData.avatarId as PlayerAvatarId | undefined;
  const apply = (part: THREE.Object3D | undefined, value: number, axis: "x" | "z" = "x") => {
    if (!part) {
      return;
    }
    const base = part.userData.baseRotation as THREE.Euler | undefined;
    if (base) {
      part.rotation.copy(base);
    }
    part.rotation[axis] += value;
  };
  apply(parts.leftLeg, stride * swing);
  apply(parts.rightLeg, -stride * swing);
  apply(parts.leftArm, -stride * swing * 0.75);
  apply(parts.rightArm, stride * swing * 0.75);
  apply(parts.torso, Math.sin(time * 5.5) * (moving ? 0.035 : 0.012), "z");
  apply(parts.head, Math.sin(time * 4.2) * (moving ? 0.025 : 0.01), "z");
  if (avatarId === "author-self" && moving && (!parts.leftLeg || !parts.rightLeg)) {
    model.rotation.z += Math.sin(time * (running ? 12.8 : 9.4)) * 0.028;
  }
}

function getPlayerFacingOffset(model: THREE.Object3D) {
  return typeof model.userData.facingOffset === "number"
    ? model.userData.facingOffset
    : 0;
}

function applyNeutralPlayerMaterial(THREE_REF: typeof THREE, model: THREE.Object3D) {
  const skin = new THREE_REF.MeshBasicMaterial({
    color: "#d8a078",
  });
  model.traverse((child) => {
    const mesh = child as THREE.Mesh & { isMesh?: boolean; isSkinnedMesh?: boolean };
    if (mesh.isMesh || mesh.isSkinnedMesh) {
      mesh.material = skin.clone();
    }
  });
}

function createRuntimePlayerAvatarModel(
  THREE_REF: typeof THREE,
  avatar: PlayerAvatarData,
  loadedModels?: Map<string, ModelResource>,
  cloneAnimatedModel?: CloneModelFn
) {
  const source = avatar.proceduralOnly || avatar.runtimeProcedural
    ? undefined
    : loadedModels?.get(avatar.model);
  const loadedModel = source
    ? cloneModel(THREE_REF, source.scene, cloneAnimatedModel)
    : null;
  const usesLoadedModel = Boolean(loadedModel && hasRenderableMesh(loadedModel));
  const model = usesLoadedModel && loadedModel
    ? loadedModel
    : createFallbackPreviewAvatar(THREE_REF, avatar);
  if (avatar.id === "author-self" && usesLoadedModel) {
    prepareAuthorMeshyModel(THREE_REF, model);
  }
  model.name = `player-avatar-${avatar.id}`;
  model.scale.setScalar(avatar.scale * PLAYER_AVATAR_RUNTIME_SCALE);
  normalizePlayerAvatarModel(THREE_REF, model);
  if (avatar.id === "author-self" && usesLoadedModel) {
    model.scale.multiplyScalar(AUTHOR_MESHY_RUNTIME_SCALE);
  }
  registerPlayerWalkParts(model);
  if (!(avatar.id === "author-self" && usesLoadedModel)) {
    applyNaturalPlayerRestPose(model, avatar.id);
  }
  if (avatar.neutralSkin) {
    applyNeutralPlayerMaterial(THREE_REF, model);
  }
  model.userData.avatarId = avatar.id;
  model.userData.runtimePlayerAvatar = true;
  model.userData.facingOffset = source ? avatar.facingOffset ?? 0 : Math.PI;
  return model;
}

function setRuntimePlayerAvatar(runtime: Runtime, avatar: PlayerAvatarData) {
  const nextModel = createRuntimePlayerAvatarModel(
    runtime.THREE,
    avatar,
    runtime.loadedModels,
    runtime.cloneAnimatedModel
  );
  nextModel.rotation.y = getPlayerFacingOffset(nextModel);
  groundModelToFloor(runtime.THREE, nextModel, PLAYER_FLOOR_OFFSET);
  if (runtime.playerAnimator) {
    runtime.playerAnimator.mixer.stopAllAction();
    const mixerIndex = runtime.actorMixers.indexOf(runtime.playerAnimator.mixer);
    if (mixerIndex >= 0) {
      runtime.actorMixers.splice(mixerIndex, 1);
    }
  }
  runtime.player.remove(runtime.playerModel);
  runtime.playerModel = nextModel;
  runtime.player.add(nextModel);

  runtime.playerAnimator = createPlayerAvatarAnimator(
    runtime.THREE,
    nextModel,
    avatar,
    runtime.loadedModels,
    runtime.animationLibrary
  );
  if (runtime.playerAnimator) {
    runtime.actorMixers.push(runtime.playerAnimator.mixer);
    playActorAction(runtime.playerAnimator, "idle", 0);
  }
  runtime.cameraReturnToDefault = true;
}

function setDefaultCameraView(runtime: Runtime, immediate = false) {
  const target = runtime.player.position
    .clone()
    .add(new runtime.THREE.Vector3(0, 0.78, 0));
  const facingAngle =
    runtime.playerModel.rotation.y - getPlayerFacingOffset(runtime.playerModel);
  const forward = new runtime.THREE.Vector3(
    Math.sin(facingAngle),
    0,
    Math.cos(facingAngle)
  ).normalize();
  const side = new runtime.THREE.Vector3(forward.z, 0, -forward.x).multiplyScalar(
    DEFAULT_CAMERA_OFFSET.x
  );
  const desiredPosition = target
    .clone()
    .addScaledVector(forward, -Math.abs(DEFAULT_CAMERA_OFFSET.z))
    .add(side)
    .add(new runtime.THREE.Vector3(0, DEFAULT_CAMERA_OFFSET.y, 0));
  if (immediate) {
    runtime.controls.target.copy(target);
    runtime.camera.position.copy(desiredPosition);
    runtime.cameraReturnToDefault = false;
    return;
  }
  runtime.controls.target.lerp(target, 0.28);
  runtime.camera.position.lerp(desiredPosition, 0.22);
  if (
    runtime.camera.position.distanceTo(desiredPosition) < 0.08 &&
    runtime.controls.target.distanceTo(target) < 0.06
  ) {
    runtime.cameraReturnToDefault = false;
  }
}

function mountAvatarPreview(
  canvas: HTMLCanvasElement,
  runtime: Runtime,
  avatar: PlayerAvatarData
) {
  const THREE_REF = runtime.THREE;
  const source =
    avatar.proceduralOnly || avatar.runtimeProcedural
      ? undefined
      : runtime.loadedModels.get(avatar.model);
  const renderer = new THREE_REF.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.outputColorSpace = THREE_REF.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE_REF.Scene();
  scene.add(new THREE_REF.HemisphereLight("#e0f2fe", "#1e1838", 2.3));
  const key = new THREE_REF.DirectionalLight("#ffffff", 2.1);
  key.position.set(2.6, 4, 3);
  scene.add(key);
  const glow = new THREE_REF.PointLight("#5eead4", 4.5, 7);
  glow.position.set(-2, 1.5, 2.2);
  scene.add(glow);

  const camera = new THREE_REF.PerspectiveCamera(33, 1, 0.1, 40);
  const stage = new THREE_REF.Group();
  const loadedModel = source
    ? cloneModel(THREE_REF, source.scene, runtime.cloneAnimatedModel)
    : createFallbackPreviewAvatar(THREE_REF, avatar);
  const usesLoadedModel = Boolean(source && hasRenderableMesh(loadedModel));
  const model = usesLoadedModel
    ? loadedModel
    : createFallbackPreviewAvatar(THREE_REF, avatar);
  if (avatar.id === "author-self" && usesLoadedModel) {
    prepareAuthorMeshyModel(THREE_REF, model);
  }
  model.scale.setScalar(avatar.scale);
  model.rotation.y = -0.34;
  model.userData.avatarId = avatar.id;
  registerPlayerWalkParts(model);
  if (!(avatar.id === "author-self" && usesLoadedModel)) {
    applyNaturalPlayerRestPose(model, avatar.id);
  }
  if (avatar.neutralSkin) {
    applyNeutralPlayerMaterial(THREE_REF, model);
  }
  groundModelToFloor(THREE_REF, model, 0);
  stage.add(model);
  scene.add(stage);

  const floor = new THREE_REF.Mesh(
    new THREE_REF.CylinderGeometry(1.54, 1.68, 0.1, 48),
    new THREE_REF.MeshStandardMaterial({
      color: "#23345c",
      emissive: "#0e7490",
      emissiveIntensity: 0.16,
      roughness: 0.48,
      metalness: 0.08,
    })
  );
  floor.position.y = -0.08;
  scene.add(floor);

  const ring = new THREE_REF.Mesh(
    new THREE_REF.TorusGeometry(1.68, 0.025, 8, 72),
    new THREE_REF.MeshBasicMaterial({ color: "#5eead4", transparent: true, opacity: 0.74 })
  );
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  const animator = source && usesLoadedModel
    ? createPlayerAvatarAnimator(
        THREE_REF,
        model,
        avatar,
        runtime.loadedModels,
        runtime.animationLibrary
      ) ?? createActorAnimator(THREE_REF, model, source.animations, runtime.animationLibrary)
    : null;
  if (avatar.id === "author-self") {
    updateAuthorIdleCycle(animator);
  } else {
    playActorAction(animator, "idle", 0);
  }

  const initialBox = new THREE_REF.Box3().setFromObject(stage);
  const initialSize = initialBox.getSize(new THREE_REF.Vector3());
  const previewTargetHeight = avatar.id === "aqua-alien" ? 1.22 : 1.36;
  const normalizedScale = previewTargetHeight / Math.max(initialSize.y, 0.001);
  stage.scale.setScalar(Number.isFinite(normalizedScale) && normalizedScale > 0.0001 ? normalizedScale : 1);
  const normalizedBox = new THREE_REF.Box3().setFromObject(stage);
  const normalizedCenter = normalizedBox.getCenter(new THREE_REF.Vector3());
  stage.position.x -= normalizedCenter.x;
  stage.position.z -= normalizedCenter.z;
  stage.position.y -= normalizedBox.min.y;
  if (avatar.id === "author-self" && usesLoadedModel) {
    stage.scale.multiplyScalar(AUTHOR_MESHY_PREVIEW_SCALE);
    stage.position.y += 0.18;
    stage.position.z += 0.34;
  }

  const resize = () => {
    const width = Math.max(260, canvas.clientWidth || 320);
    const height = Math.max(320, canvas.clientHeight || 420);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  const finalBox = new THREE_REF.Box3().setFromObject(stage);
  const finalSize = finalBox.getSize(new THREE_REF.Vector3());
  const finalHeight = Math.max(finalSize.y, 1.2);
  const finalWidth = Math.max(finalSize.x, finalSize.z, 1.2);
  camera.position.set(
    0,
    finalHeight * 0.58,
    Math.max(3.55, finalHeight * 2.45, finalWidth * 2.15)
  );
  camera.lookAt(0, finalHeight * 0.46, 0);

  let animationId = 0;
  let last = performance.now();
  const animate = () => {
    const now = performance.now();
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    stage.rotation.y += delta * 0.32;
    ring.rotation.z += delta * 0.7;
    if (avatar.id === "author-self") {
      if (!updateAuthorIdleCycle(animator)) {
        applyPlayerWalkCycle(model, false, false);
      }
    }
    animator?.mixer.update(delta);
    renderer.render(scene, camera);
    animationId = window.requestAnimationFrame(animate);
  };
  animate();

  return () => {
    window.cancelAnimationFrame(animationId);
    window.removeEventListener("resize", resize);
    animator?.mixer.stopAllAction();
    renderer.dispose();
  };
}

function createFallbackPreviewAvatar(
  THREE_REF: typeof THREE,
  avatar: PlayerAvatarData
) {
  const group = new THREE_REF.Group();
  const palette = getProceduralAvatarPalette(avatar.id);
  const avatarKey = avatar.id as string;
  if (avatarKey === "raptor") {
    const body = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(1.2, 0.44, 0.42),
      new THREE_REF.MeshStandardMaterial({ color: palette.body, roughness: 0.56 })
    );
    body.position.y = 0.66;
    group.add(body);
    const head = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.46, 0.34, 0.32),
      new THREE_REF.MeshStandardMaterial({ color: palette.head, roughness: 0.52 })
    );
    head.position.set(0.78, 0.86, 0);
    group.add(head);
    const eye = new THREE_REF.Mesh(
      new THREE_REF.SphereGeometry(0.055, 12, 8),
      new THREE_REF.MeshBasicMaterial({ color: "#052e16" })
    );
    eye.position.set(0.98, 0.9, -0.16);
    group.add(eye);
    const tail = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.72, 0.16, 0.18),
      new THREE_REF.MeshStandardMaterial({ color: palette.body, roughness: 0.6 })
    );
    tail.position.set(-0.88, 0.72, 0);
    tail.rotation.z = -0.22;
    group.add(tail);
    for (let index = 0; index < 2; index += 1) {
      const arm = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(0.12, 0.36, 0.12),
        new THREE_REF.MeshStandardMaterial({ color: palette.limb, roughness: 0.7 })
      );
      arm.position.set(0.28, 0.58, index === 0 ? -0.3 : 0.3);
      arm.rotation.z = index === 0 ? -0.38 : 0.38;
      group.add(arm);
    }
    for (let index = 0; index < 2; index += 1) {
      const leg = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(0.14, 0.58, 0.14),
        new THREE_REF.MeshStandardMaterial({ color: palette.limb, roughness: 0.7 })
      );
      leg.position.set(index === 0 ? -0.26 : 0.32, 0.28, index === 0 ? -0.14 : 0.14);
      group.add(leg);
    }
    return group;
  }
  const body = new THREE_REF.Mesh(
    new THREE_REF.BoxGeometry(0.48, 0.72, 0.3),
    new THREE_REF.MeshStandardMaterial({ color: palette.body, roughness: 0.58 })
  );
  body.name = "torso";
  body.position.y = 0.54;
  group.add(body);
  const chest = new THREE_REF.Mesh(
    new THREE_REF.BoxGeometry(0.34, 0.2, 0.035),
    new THREE_REF.MeshBasicMaterial({
      color: avatarKey === "aqua-alien"
        ? "#0f172a"
        : avatarKey === "author-self"
          ? "#f8fafc"
          : "#fef3c7",
    })
  );
  chest.position.set(0, 0.66, -0.17);
  group.add(chest);
  const head = new THREE_REF.Mesh(
    new THREE_REF.BoxGeometry(avatar.id.includes("alien") ? 0.6 : 0.5, 0.44, 0.4),
    new THREE_REF.MeshStandardMaterial({ color: palette.head, roughness: 0.52 })
  );
  head.name = "head";
  head.position.y = 1.1;
  group.add(head);
  const eyeMaterial = new THREE_REF.MeshBasicMaterial({ color: palette.eye });
  [-1, 1].forEach((side) => {
    const eye = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.055, 0.14, 0.035), eyeMaterial);
    eye.position.set(side * 0.12, 1.11, -0.22);
    group.add(eye);
  });
  if (avatarKey === "aqua-alien" || avatarKey === "helmet-alien") {
    const helmet = new THREE_REF.Mesh(
      new THREE_REF.SphereGeometry(0.46, 18, 12),
      new THREE_REF.MeshStandardMaterial({
        color: "#a5b4fc",
        emissive: "#38bdf8",
        emissiveIntensity: 0.14,
        transparent: true,
        opacity: 0.28,
        roughness: 0.18,
      })
    );
    helmet.position.y = 1.1;
    helmet.scale.set(1.06, 0.88, 1);
    group.add(helmet);
    const antennaMaterial = new THREE_REF.MeshBasicMaterial({ color: "#5eead4" });
    [-1, 1].forEach((side) => {
      const antenna = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.035, 0.34, 0.035), antennaMaterial);
      antenna.position.set(side * 0.22, 1.48, 0.02);
      antenna.rotation.z = side * -0.32;
      group.add(antenna);
      const dot = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.1, 0.1, 0.1), antennaMaterial);
      dot.position.set(side * 0.28, 1.66, 0.02);
      group.add(dot);
    });
  }
  [-1, 1].forEach((side) => {
    const arm = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.15, 0.54, 0.15),
      new THREE_REF.MeshStandardMaterial({ color: palette.limb, roughness: 0.68 })
    );
    arm.name = side < 0 ? "arm-left" : "arm-right";
    arm.position.set(side * 0.39, 0.56, 0);
    arm.rotation.z = side * -0.16;
    group.add(arm);
    const hand = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.16, 0.12, 0.16),
      new THREE_REF.MeshStandardMaterial({ color: palette.head, roughness: 0.62 })
    );
    hand.position.set(side * 0.43, 0.25, -0.01);
    group.add(hand);
    const leg = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.17, 0.42, 0.18),
      new THREE_REF.MeshStandardMaterial({ color: palette.leg, roughness: 0.68 })
    );
    leg.name = side < 0 ? "leg-left" : "leg-right";
    leg.position.set(side * 0.15, 0.2, 0);
    group.add(leg);
    const foot = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.2, 0.09, 0.26),
      new THREE_REF.MeshStandardMaterial({ color: "#0f172a", roughness: 0.72 })
    );
    foot.position.set(side * 0.15, -0.045, -0.04);
    group.add(foot);
  });
  if (avatarKey === "blocky-boy") {
    const hair = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.58, 0.18, 0.44),
      new THREE_REF.MeshStandardMaterial({ color: "#72512e", roughness: 0.64 })
    );
    hair.position.y = 1.38;
    group.add(hair);
  } else if (avatarKey === "author-self") {
    const hairMaterial = new THREE_REF.MeshStandardMaterial({
      color: "#1f2937",
      roughness: 0.74,
    });
    const hairTop = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.58, 0.18, 0.44),
      hairMaterial
    );
    hairTop.position.y = 1.38;
    group.add(hairTop);
    const hairBack = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.52, 0.2, 0.08),
      hairMaterial
    );
    hairBack.position.set(0, 1.22, 0.24);
    group.add(hairBack);
    const collar = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.52, 0.08, 0.04),
      new THREE_REF.MeshBasicMaterial({ color: "#f8fafc" })
    );
    collar.position.set(0, 0.88, -0.18);
    group.add(collar);
    const belt = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.5, 0.055, 0.33),
      new THREE_REF.MeshStandardMaterial({ color: "#78350f", roughness: 0.7 })
    );
    belt.position.y = 0.18;
    group.add(belt);
    [-1, 1].forEach((side) => {
      const lens = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(0.16, 0.09, 0.035),
        new THREE_REF.MeshBasicMaterial({ color: "#030712" })
      );
      lens.position.set(side * 0.13, 1.13, -0.247);
      group.add(lens);
      const eyebrow = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(0.13, 0.035, 0.032),
        new THREE_REF.MeshBasicMaterial({ color: "#111827" })
      );
      eyebrow.position.set(side * 0.13, 1.2, -0.235);
      eyebrow.rotation.z = side * -0.08;
      group.add(eyebrow);
      const sleeve = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(0.17, 0.2, 0.17),
        new THREE_REF.MeshStandardMaterial({ color: palette.body, roughness: 0.62 })
      );
      sleeve.position.set(side * 0.39, 0.75, 0);
      group.add(sleeve);
      const shoeStripe = new THREE_REF.Mesh(
        new THREE_REF.BoxGeometry(0.16, 0.022, 0.27),
        new THREE_REF.MeshBasicMaterial({ color: "#f8fafc" })
      );
      shoeStripe.position.set(side * 0.15, 0.01, -0.055);
      group.add(shoeStripe);
    });
    const glassesBridge = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.08, 0.026, 0.036),
      new THREE_REF.MeshBasicMaterial({ color: "#030712" })
    );
    glassesBridge.position.set(0, 1.13, -0.248);
    group.add(glassesBridge);
  } else if (avatarKey === "blocky-girl") {
    const hair = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.64, 0.56, 0.46),
      new THREE_REF.MeshStandardMaterial({ color: "#32253e", roughness: 0.68 })
    );
    hair.position.y = 1.12;
    hair.position.z = 0.02;
    group.add(hair);
    head.position.z = -0.035;
  }
  return group;
}

function getProceduralAvatarPalette(id: PlayerAvatarId) {
  const avatarKey = id as string;
  if (avatarKey === "author-self") {
    return { body: "#e5e7eb", head: "#e6ad7c", limb: "#e6ad7c", leg: "#111827", eye: "#111827" };
  }
  if (avatarKey === "blocky-boy") {
    return { body: "#facc15", head: "#f4bf74", limb: "#d8a078", leg: "#4f7ca0", eye: "#1f2937" };
  }
  if (avatarKey === "blocky-girl") {
    return { body: "#f4a8c4", head: "#f5bdd4", limb: "#f4a8c4", leg: "#6d4b8f", eye: "#1f2937" };
  }
  if (avatarKey === "aqua-alien" || avatarKey === "helmet-alien") {
    return { body: "#5eead4", head: "#67e8f9", limb: "#14b8a6", leg: "#0f766e", eye: "#061b2d" };
  }
  if (avatarKey === "raptor") {
    return { body: "#8dd38c", head: "#a7f3a2", limb: "#2f6f3d", leg: "#1f5131", eye: "#052e16" };
  }
  return { body: "#d8a078", head: "#e6ad7c", limb: "#c88a56", leg: "#4f7ca0", eye: "#1f2937" };
}

function hasRenderableMesh(model: THREE.Object3D) {
  let hasMesh = false;
  model.traverse((child) => {
    const mesh = child as THREE.Mesh & { isMesh?: boolean; isSkinnedMesh?: boolean };
    if (mesh.isMesh || mesh.isSkinnedMesh) {
      hasMesh = true;
    }
  });
  return hasMesh;
}

function prepareAuthorMeshyModel(THREE_REF: typeof THREE, model: THREE.Object3D) {
  if (model.userData.authorMeshyPrepared) {
    return;
  }
  model.userData.authorMeshyPrepared = true;
  model.traverse((child) => {
    const mesh = child as THREE.Mesh & { isMesh?: boolean; isSkinnedMesh?: boolean };
    if (!mesh.isMesh && !mesh.isSkinnedMesh) {
      return;
    }
    mesh.visible = true;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.geometry?.computeBoundingBox();
    mesh.geometry?.computeBoundingSphere();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (!material) {
        return;
      }
      material.visible = true;
      material.transparent = false;
      material.opacity = 1;
      material.depthWrite = true;
      material.side = THREE_REF.FrontSide;
      material.needsUpdate = true;
    });
  });
}

function retargetUniversalAnimationClips(
  THREE_REF: typeof THREE,
  clips: THREE.AnimationClip[]
) {
  return clips
    .map((clip) => {
      const tracks = clip.tracks.flatMap((track) => {
        const [nodeName, propertyName] = track.name.split(".");
        const mappedNode = UNIVERSAL_BONE_MAP[nodeName];
        if (!mappedNode || !propertyName) {
          return [];
        }
        const clonedTrack = track.clone();
        clonedTrack.name = `${mappedNode}.${propertyName}`;
        return [clonedTrack];
      });
      if (tracks.length === 0) {
        return null;
      }
      return new THREE_REF.AnimationClip(clip.name, clip.duration, tracks);
    })
    .filter((clip): clip is THREE.AnimationClip => Boolean(clip));
}

function findClip(clips: THREE.AnimationClip[], names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  return (
    clips.find((clip) => normalizedNames.includes(clip.name.toLowerCase())) ??
    clips.find((clip) => {
      const clipName = clip.name.toLowerCase();
      return normalizedNames.some(
        (name) =>
          clipName.includes(`|${name}|`) ||
          clipName.includes(`_${name}_`) ||
          clipName.endsWith(`|${name}`) ||
          clipName.endsWith(`_${name}`) ||
          clipName.endsWith(name)
      );
    })
  );
}

function createActorAnimator(
  THREE_REF: typeof THREE,
  target: THREE.Object3D,
  embeddedClips: THREE.AnimationClip[],
  universalClips: THREE.AnimationClip[]
): ActorAnimator {
  const mixer = new THREE_REF.AnimationMixer(target);
  const clip = (universalNames: string[], embeddedNames: string[]) =>
    findClip(embeddedClips, embeddedNames) ?? findClip(universalClips, universalNames);

  const actions: Partial<Record<ActorActionName, THREE.AnimationAction>> = {};
  const register = (
    actionName: ActorActionName,
    universalNames: string[],
    embeddedNames: string[],
    loopOnce = false
  ) => {
    const resolvedClip = clip(universalNames, embeddedNames);
    if (!resolvedClip) {
      return;
    }
    const action = mixer.clipAction(resolvedClip);
    action.enabled = true;
    if (loopOnce) {
      action.setLoop(THREE_REF.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    actions[actionName] = action;
  };

  register("idle", ["Idle_Loop"], ["Idle", "Idle_Hold", "IdleHold", "Standing", "Agree_Gesture"]);
  register("walk", ["Walk_Loop", "Walk_Formal_Loop"], ["walking_man", "Walking", "Walk", "Walk_Hold"]);
  register("run", ["Jog_Fwd_Loop", "Sprint_Loop"], ["running", "run_fast_3_inplace", "Run", "Run_Hold"]);
  register("jump", ["Jump_Start", "Jump_Loop"], ["Jump_Over_Obstacle_2", "Regular_Jump", "Jump_with_Arms_Open", "Jump", "Jump_Idle", "RunningJump"], true);
  register("intro", [], ["Dive_Down_and_Land_2"], true);
  register("talk", ["Idle_Talking_Loop"], ["Wave", "Yes", "No", "Clapping"]);
  register("wave", ["Interact"], ["Wave"]);
  register("dance", ["Dance_Loop"], ["All_Night_Dance", "Wave", "Yes", "Clapping"]);
  register("fix", ["Fixing_Kneeling"], ["Idle_Attack", "Punch", "Working"]);
  register("interact", ["Interact", "PickUp_Table"], ["Punch", "Idle_Attack", "Attack"]);
  register("agree", [], ["Agree_Gesture"]);
  register("cheer", [], ["Motivational_Cheer"]);
  register("spinJump", [], ["360_Power_Spin_Jump"], true);
  register("backflipExtra", [], ["Backflip"], true);
  register("backflip", [], ["Backflip"], true);
  register("vault", [], ["Unarmed_Vault"], true);
  register("kick", [], ["Lunge_Spin_Kick"], true);

  return { mixer, actions, current: null };
}

type AuthorClipNormalizeOptions = {
  preserveVerticalMotion?: boolean;
};

function normalizeAuthorMeshyClip(
  THREE_REF: typeof THREE,
  clip: THREE.AnimationClip,
  options: AuthorClipNormalizeOptions = {}
) {
  const inPlaceTracks = clip.tracks.map((track) => {
    const clonedTrack = track.clone();
    if (track.name === "Hips.position" && "values" in clonedTrack) {
      const values = clonedTrack.values as ArrayLike<number> & { [index: number]: number };
      const baseX = values[0] ?? 0;
      const baseY = values[1] ?? 0;
      const baseZ = values[2] ?? 0;
      for (let index = 0; index < values.length; index += 3) {
        values[index] = baseX;
        if (!options.preserveVerticalMotion) {
          values[index + 1] = baseY;
        }
        values[index + 2] = baseZ;
      }
    }
    return clonedTrack;
  });
  return new THREE_REF.AnimationClip(clip.name, clip.duration, inPlaceTracks);
}

function getAuthorAnimationClips(
  THREE_REF: typeof THREE,
  loadedModels: Map<string, ModelResource>
) {
  return AUTHOR_MESHY_ANIMATION_ASSET_LIST.flatMap(
    (path) =>
      loadedModels.get(path)?.animations.map((clip) =>
        normalizeAuthorMeshyClip(THREE_REF, clip, {
          preserveVerticalMotion: path === AUTHOR_MESHY_ANIMATION_ASSETS.intro,
        })
      ) ?? []
  );
}

function createPlayerAvatarAnimator(
  THREE_REF: typeof THREE,
  target: THREE.Object3D,
  avatar: PlayerAvatarData,
  loadedModels: Map<string, ModelResource>,
  animationLibrary: THREE.AnimationClip[]
) {
  if (avatar.id !== "author-self" || avatar.proceduralOnly || avatar.runtimeProcedural) {
    return null;
  }
  const baseClips = avatar.proceduralOnly || avatar.runtimeProcedural
    ? []
    : loadedModels.get(avatar.model)?.animations.map((clip) => normalizeAuthorMeshyClip(THREE_REF, clip)) ?? [];
  const clips = [...baseClips, ...getAuthorAnimationClips(THREE_REF, loadedModels)];
  if (clips.length === 0) {
    return null;
  }
  const animator = createActorAnimator(THREE_REF, target, clips, animationLibrary);
  if (Object.keys(animator.actions).length === 0) {
    return null;
  }
  animator.idleCycle = AUTHOR_IDLE_ACTIONS.filter((action) => animator.actions[action]);
  animator.idleCycleIndex = -1;
  animator.nextIdleActionAt = performance.now() + AUTHOR_IDLE_ACTION_INTERVAL_MS;
  return animator;
}

function playAuthorIntro(animator: ActorAnimator | null | undefined) {
  if (!animator) {
    return 0;
  }
  const introAction: ActorActionName = "intro";
  if (!animator.actions[introAction]) {
    return 0;
  }
  playActorAction(animator, introAction, 0.04);
  const duration = animator.actions[introAction]?.getClip().duration ?? 1.2;
  const lockMs = Math.max(900, duration * 1000 + 120);
  animator.lockedUntil = performance.now() + lockMs;
  animator.nextIdleActionAt = (animator.lockedUntil ?? performance.now()) + 450;
  return lockMs;
}

function isClipDrivenPlayerModel(runtime: Runtime) {
  return (
    runtime.playerModel.userData.avatarId === "author-self" &&
    Boolean(runtime.playerAnimator?.actions.walk || runtime.playerAnimator?.actions.run)
  );
}

function resetAuthorIdleCycle(animator: ActorAnimator | null | undefined) {
  if (!animator?.idleCycle?.length) {
    return;
  }
  const now = performance.now();
  if (animator.lockedUntil && now < animator.lockedUntil) {
    return;
  }
  animator.nextIdleActionAt = now + AUTHOR_IDLE_ACTION_INTERVAL_MS;
  animator.lockedUntil = undefined;
}

function updateAuthorIdleCycle(animator: ActorAnimator | null | undefined) {
  if (!animator?.idleCycle?.length) {
    return false;
  }
  const now = performance.now();
  if (animator.lockedUntil && now < animator.lockedUntil) {
    return true;
  }
  if (!animator.nextIdleActionAt || !animator.current || !animator.idleCycle.includes(animator.current)) {
    animator.idleCycleIndex = Math.max(0, animator.idleCycleIndex ?? 0);
    playActorAction(animator, animator.idleCycle[animator.idleCycleIndex], 0.14);
    animator.nextIdleActionAt = now + AUTHOR_IDLE_ACTION_INTERVAL_MS;
    return true;
  }
  if (now >= animator.nextIdleActionAt) {
    animator.idleCycleIndex = ((animator.idleCycleIndex ?? -1) + 1) % animator.idleCycle.length;
    playActorAction(animator, animator.idleCycle[animator.idleCycleIndex], 0.16);
    animator.nextIdleActionAt = now + AUTHOR_IDLE_ACTION_INTERVAL_MS;
  }
  return true;
}

function playActorAction(
  animator: ActorAnimator | null | undefined,
  actionName: ActorActionName,
  fade = 0.18
) {
  if (!animator) {
    return;
  }
  const next = animator.actions[actionName] ?? animator.actions.idle;
  if (!next) {
    return;
  }
  const current = animator.current ? animator.actions[animator.current] : null;
  if (animator.current === actionName && next.isRunning()) {
    return;
  }
  current?.fadeOut(fade);
  next.reset().fadeIn(fade).play();
  animator.current = actionName;
}

function getNpcIdleAction(id: ArchetypeId): ActorActionName {
  if (id === "inventor" || id === "hacker") {
    return "fix";
  }
  if (id === "rebel") {
    return "dance";
  }
  if (id === "humanitarian" || id === "visionary" || id === "futurist") {
    return "talk";
  }
  return "idle";
}

function createWanderState(
  THREE_REF: typeof THREE,
  home: THREE.Vector3,
  radius: number,
  speed: number,
  idleAction: ActorActionName
): WanderState {
  return {
    home: home.clone(),
    target: pickWanderTarget(THREE_REF, home, radius),
    radius,
    speed,
    pauseUntil: 0,
    nextGestureAt: 0,
    idleAction,
  };
}

function pickWanderTarget(
  THREE_REF: typeof THREE,
  home: THREE.Vector3,
  radius: number
) {
  const angle = Math.random() * Math.PI * 2;
  const distance = radius * (0.25 + Math.random() * 0.75);
  const target = home
    .clone()
    .add(new THREE_REF.Vector3(Math.sin(angle) * distance, 0, Math.cos(angle) * distance));
  const clamped = clampToWorld(target.x, target.z);
  target.x = clamped.x;
  target.z = clamped.z;
  return target;
}

function pickWalkableWanderTarget(runtime: Runtime, home: THREE.Vector3, radius: number) {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const target = pickWanderTarget(runtime.THREE, home, radius);
    if (isOnWalkableSurface(runtime, target.x, target.z) && !actorCollides(runtime, target.x, target.z)) {
      return target;
    }
  }
  return home.clone();
}

function lerpAngle(from: number, to: number, amount: number) {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * amount;
}

function faceTowards(
  group: THREE.Group,
  target: THREE.Vector3,
  amount: number
) {
  const direction = target.clone().sub(group.position).setY(0);
  if (direction.lengthSq() < 0.0001) {
    return;
  }
  const angle = Math.atan2(direction.x, direction.z) + MODEL_FORWARD_OFFSET;
  group.rotation.y = lerpAngle(group.rotation.y, angle, amount);
}

function createNpcGroup(
  THREE_REF: typeof THREE,
  npc: NpcData,
  source?: THREE.Group,
  cloneAnimatedModel?: CloneModelFn
) {
  const group = new THREE_REF.Group();
  group.position.set(...scaleWorldPosition(npc.position));
  group.userData.baseY = group.position.y;
  group.rotation.y = npc.facing;
  group.userData.npcId = npc.id;

  const model = source ? cloneModel(THREE_REF, source, cloneAnimatedModel) : new THREE_REF.Group();
  model.scale.setScalar(WORLD_CONFIG.modelScale);
  groundModelToFloor(THREE_REF, model, 0.02);
  group.add(model);
  group.userData.actorModel = model;

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
  const prompt = makeInteractionPrompt(THREE_REF, npc.accent);
  prompt.position.set(0.95, 1.62, 0);
  prompt.visible = false;
  group.add(prompt);
  group.userData.prompt = prompt;

  const light = new THREE_REF.PointLight(npc.accent, 3.8, 6);
  light.position.y = 1.6;
  group.add(light);

  group.traverse((child) => {
    child.userData.npcId = npc.id;
  });
  return group;
}

function createHumanGroup(
  THREE_REF: typeof THREE,
  human: HumanData,
  source?: THREE.Group,
  cloneAnimatedModel?: CloneModelFn
) {
  const group = new THREE_REF.Group();
  group.position.set(...scaleWorldPosition(human.position));
  group.userData.baseY = group.position.y;
  group.rotation.y = human.facing;
  group.userData.humanId = human.id;

  const model = source ? cloneModel(THREE_REF, source, cloneAnimatedModel) : new THREE_REF.Group();
  model.scale.setScalar(WORLD_CONFIG.modelScale * 0.92);
  groundModelToFloor(THREE_REF, model, 0.02);
  group.add(model);
  group.userData.actorModel = model;

  const floorRing = new THREE_REF.Mesh(
    new THREE_REF.TorusGeometry(0.92, 0.022, 8, 64),
    new THREE_REF.MeshBasicMaterial({ color: human.accent, transparent: true, opacity: 0.42 })
  );
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = 0.03;
  group.add(floorRing);

  addHumanAccessory(THREE_REF, group, human);
  const label = makeHumanLabel(THREE_REF, human);
  label.position.set(0, 2.35, 0);
  label.visible = false;
  group.add(label);
  group.userData.label = label;
  const prompt = makeInteractionPrompt(THREE_REF, human.accent);
  prompt.position.set(0.86, 1.46, 0);
  prompt.visible = false;
  group.add(prompt);
  group.userData.prompt = prompt;

  const light = new THREE_REF.PointLight(human.accent, 2.5, 5.4);
  light.position.y = 1.35;
  group.add(light);

  group.traverse((child) => {
    child.userData.humanId = human.id;
  });
  return group;
}

function addHumanAccessory(THREE_REF: typeof THREE, group: THREE.Group, human: HumanData) {
  const accent = new THREE_REF.MeshStandardMaterial({
    color: human.accent,
    emissive: human.accent,
    emissiveIntensity: 0.38,
    roughness: 0.42,
    metalness: 0.18,
  });
  const dark = new THREE_REF.MeshStandardMaterial({
    color: "#172033",
    roughness: 0.82,
    metalness: 0.08,
  });

  if (human.id === "canal-guard") {
    const lamp = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.05, 0.07, 0.82, 8), dark);
    lamp.position.set(0.58, 1.05, 0.1);
    lamp.rotation.z = -0.28;
    group.add(lamp);
    const bulb = new THREE_REF.Mesh(new THREE_REF.SphereGeometry(0.16, 14, 14), accent);
    bulb.position.set(0.72, 1.45, 0.12);
    group.add(bulb);
  } else if (human.id === "solar-seller") {
    const tray = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.72, 0.12, 0.42), accent);
    tray.position.set(0.54, 1.05, 0.18);
    tray.rotation.y = -0.22;
    group.add(tray);
    for (let index = 0; index < 3; index += 1) {
      const panel = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.18, 0.03, 0.22), dark);
      panel.position.set(0.33 + index * 0.18, 1.16, 0.18);
      panel.rotation.set(-0.65, -0.22, 0);
      group.add(panel);
    }
  } else if (human.id === "bubble-commuter") {
    const bubble = new THREE_REF.Mesh(
      new THREE_REF.SphereGeometry(0.36, 20, 14),
      new THREE_REF.MeshStandardMaterial({
        color: human.accent,
        emissive: human.accent,
        emissiveIntensity: 0.16,
        transparent: true,
        opacity: 0.24,
        roughness: 0.16,
      })
    );
    bubble.position.set(0.55, 1.35, -0.08);
    group.add(bubble);
  } else if (human.id === "archive-courier") {
    const satchel = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.42, 0.48, 0.16), dark);
    satchel.position.set(-0.42, 0.92, -0.08);
    satchel.rotation.y = 0.28;
    group.add(satchel);
    const letter = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.36, 0.22, 0.025), accent);
    letter.position.set(0.55, 1.25, 0.18);
    letter.rotation.set(0.25, -0.45, 0.16);
    group.add(letter);
  } else if (human.id === "dome-neighbor") {
    const key = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.18, 0.025, 8, 28), accent);
    key.position.set(0.58, 1.18, 0.12);
    key.rotation.y = -0.45;
    group.add(key);
    const stem = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.28, 0.045, 0.045), accent);
    stem.position.set(0.75, 1.18, 0.12);
    stem.rotation.y = -0.45;
    group.add(stem);
  } else {
    const clipboard = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.42, 0.52, 0.035), dark);
    clipboard.position.set(0.58, 1.16, 0.1);
    clipboard.rotation.y = -0.42;
    group.add(clipboard);
    const stamp = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.09, 0.09, 0.16, 12), accent);
    stamp.position.set(0.75, 1.44, 0.18);
    stamp.rotation.x = Math.PI / 2;
    group.add(stamp);
  }
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

function makeHumanLabel(THREE_REF: typeof THREE, human: HumanData) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 184;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(7, 10, 18, 0.7)";
    context.fillRect(28, 32, 456, 108);
    context.strokeStyle = human.accent;
    context.lineWidth = 4;
    context.strokeRect(36, 40, 440, 92);
    context.fillStyle = "#f8fafc";
    context.font = "700 34px serif";
    context.textAlign = "center";
    context.fillText(human.title, 256, 82);
    context.fillStyle = human.accent;
    context.font = "700 18px sans-serif";
    context.fillText("人類居民 / CITY LEGEND", 256, 114);
  }
  const texture = new THREE_REF.CanvasTexture(canvas);
  const sprite = new THREE_REF.Sprite(
    new THREE_REF.SpriteMaterial({ map: texture, transparent: true })
  );
  sprite.scale.set(2.55, 0.92, 1);
  return sprite;
}

function makeInteractionPrompt(THREE_REF: typeof THREE, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.shadowColor = accent;
    context.shadowBlur = 18;
    context.fillStyle = "rgba(7, 12, 26, 0.86)";
    context.beginPath();
    context.roundRect(34, 34, 124, 124, 34);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = accent;
    context.lineWidth = 7;
    context.stroke();
    context.fillStyle = "#f8fafc";
    context.font = "900 76px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("E", 96, 96);
  }
  const texture = new THREE_REF.CanvasTexture(canvas);
  const sprite = new THREE_REF.Sprite(
    new THREE_REF.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    })
  );
  sprite.scale.set(0.62, 0.62, 0.62);
  return sprite;
}

function createWeirdoGroup(
  THREE_REF: typeof THREE,
  weirdo: WeirdoData,
  source: THREE.Group | undefined,
  cloneAnimatedModel: CloneModelFn,
  animations: THREE.AnimationClip[] = []
) {
  const group = new THREE_REF.Group();
  group.position.set(...scaleWorldPosition(weirdo.position));
  group.rotation.y = weirdo.facing;
  group.userData.weirdoId = weirdo.id;
  group.userData.home = group.position.clone();

  const floorRing = new THREE_REF.Mesh(
    new THREE_REF.TorusGeometry(1.18, 0.03, 8, 72),
    new THREE_REF.MeshBasicMaterial({ color: weirdo.accent, transparent: true, opacity: 0.5 })
  );
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = 0.035;
  group.add(floorRing);
  group.userData.floorRing = floorRing;

  const actorRoot = new THREE_REF.Group();
  group.add(actorRoot);
  group.userData.actorRoot = actorRoot;

  if (source) {
    const actorModel = cloneModel(THREE_REF, source, cloneAnimatedModel);
    const usesCustomEmbeddedWeirdo = weirdo.id === "weirdo_5" || weirdo.id === "weirdo_7";
    normalizeWeirdoModel(THREE_REF, actorModel, getWeirdoModelNormalizeOptions(weirdo.id));
    groundModelToFloor(THREE_REF, actorModel, 0, usesCustomEmbeddedWeirdo);
    if (usesCustomEmbeddedWeirdo) {
      actorModel.userData.embeddedTargetHeight = CUSTOM_EMBEDDED_WEIRDO_TARGET_HEIGHT;
      actorModel.userData.embeddedBaseScale = actorModel.scale.clone();
    }
    actorRoot.add(actorModel);
    group.userData.actorModel = actorModel;
    const nodes = cacheWeirdoNodes(actorModel);
    group.userData.weirdoNodes = nodes;
    group.userData.weirdoRestPose = snapshotWeirdoNodePose(nodes);
    if (animations.length > 0) {
      const mixer = new THREE_REF.AnimationMixer(actorModel);
      const actions = new Map<string, THREE.AnimationAction>();
      animations.forEach((clip) => {
        const playableClip = normalizeEmbeddedWeirdoClip(THREE_REF, weirdo, clip);
        const action = mixer.clipAction(playableClip, actorModel);
        action.enabled = true;
        actions.set(playableClip.name, action);
      });
      group.userData.embeddedWeirdoMixer = mixer;
      group.userData.embeddedWeirdoActions = actions;
      group.userData.embeddedWeirdoCurrentAction = "";
      group.userData.embeddedWeirdoCompletePlayed = false;
    }
  } else {
    const fallback = new THREE_REF.Mesh(
      new THREE_REF.BoxGeometry(0.8, 1.6, 0.5),
      new THREE_REF.MeshStandardMaterial({
        color: weirdo.accent,
        emissive: weirdo.accent,
        emissiveIntensity: 0.28,
      })
    );
    fallback.position.y = 0.8;
    actorRoot.add(fallback);
    group.userData.actorModel = fallback;
  }

  if (weirdo.behavior === "tree-climber") {
    const climbTree = createDetailedVoxelTree(THREE_REF, weirdo.accent);
    climbTree.position.set(0.88, 0, 0.2);
    climbTree.scale.setScalar(0.92);
    group.add(climbTree);
    group.userData.climbTree = climbTree;
  }

  const label = makeWeirdoLabel(THREE_REF, weirdo);
  const labelHeight = weirdo.id === "weirdo_3" ? 1.65 : 2.9;
  label.position.set(0, labelHeight, 0);
  label.visible = false;
  group.add(label);
  group.userData.label = label;

  const prompt = makeInteractionPrompt(THREE_REF, weirdo.accent);
  prompt.position.set(1.08, weirdo.id === "weirdo_3" ? 1.05 : 1.75, 0);
  prompt.visible = false;
  group.add(prompt);
  group.userData.prompt = prompt;

  const foundBadge = makeWeirdoFoundBadge(THREE_REF);
  foundBadge.position.set(0, weirdo.id === "weirdo_3" ? 2.05 : 3.38, 0);
  foundBadge.visible = false;
  group.add(foundBadge);
  group.userData.foundBadge = foundBadge;

  const light = new THREE_REF.PointLight(weirdo.accent, 3.2, 5.8);
  light.position.y = weirdo.id === "weirdo_3" ? 0.85 : 1.5;
  group.add(light);

  group.traverse((child) => {
    child.userData.weirdoId = weirdo.id;
    if (child instanceof THREE_REF.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

function createEmbeddedWeirdoSafetyFallback(THREE_REF: typeof THREE, weirdo: WeirdoData) {
  const group = new THREE_REF.Group();
  group.name = `${weirdo.id}-safety-fallback`;
  const accent = new THREE_REF.Color(weirdo.accent);
  const skinMaterial = new THREE_REF.MeshStandardMaterial({
    color: weirdo.id === "weirdo_7" ? "#a7f3d0" : "#f1d6ff",
    roughness: 0.62,
  });
  const clothMaterial = new THREE_REF.MeshStandardMaterial({
    color: accent,
    emissive: weirdo.accent,
    emissiveIntensity: 0.18,
    roughness: 0.58,
  });
  const darkMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#172033",
    roughness: 0.68,
  });
  const glowMaterial = new THREE_REF.MeshBasicMaterial({ color: weirdo.accent });

  const torso = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.48, 0.68, 0.28), clothMaterial);
  torso.name = "fallback-torso";
  torso.position.y = 0.78;
  group.add(torso);

  const head = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.46, 0.42, 0.38), skinMaterial);
  head.name = "fallback-head";
  head.position.y = 1.32;
  group.add(head);

  const hair = new THREE_REF.Mesh(
    new THREE_REF.BoxGeometry(weirdo.id === "weirdo_7" ? 0.56 : 0.5, 0.16, 0.42),
    new THREE_REF.MeshStandardMaterial({
      color: weirdo.id === "weirdo_7" ? "#166534" : "#4c1d95",
      roughness: 0.7,
    })
  );
  hair.position.y = 1.6;
  group.add(hair);

  [-1, 1].forEach((side) => {
    const eye = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.06, 0.12, 0.032), darkMaterial);
    eye.position.set(side * 0.12, 1.32, -0.205);
    group.add(eye);

    const arm = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.14, 0.54, 0.14), skinMaterial);
    arm.name = side < 0 ? "fallback-left-arm" : "fallback-right-arm";
    arm.position.set(side * 0.38, 0.78, 0);
    arm.rotation.z = side * (weirdo.id === "weirdo_7" ? -0.92 : -0.18);
    group.add(arm);

    const leg = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.16, 0.5, 0.16), darkMaterial);
    leg.name = side < 0 ? "fallback-left-leg" : "fallback-right-leg";
    leg.position.set(side * 0.14, 0.28, 0);
    group.add(leg);

    const foot = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.18, 0.08, 0.24), darkMaterial);
    foot.position.set(side * 0.14, 0.02, -0.04);
    group.add(foot);
  });

  if (weirdo.id === "weirdo_5") {
    const tutu = new THREE_REF.Mesh(
      new THREE_REF.CylinderGeometry(0.42, 0.58, 0.16, 8),
      new THREE_REF.MeshStandardMaterial({
        color: "#ddd6fe",
        emissive: weirdo.accent,
        emissiveIntensity: 0.16,
        transparent: true,
        opacity: 0.84,
        roughness: 0.42,
      })
    );
    tutu.position.y = 0.48;
    group.add(tutu);
    const halo = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.38, 0.018, 6, 36), glowMaterial);
    halo.position.y = 1.86;
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
  } else {
    const leaf = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.32, 0.18, 0.1), glowMaterial);
    leaf.position.set(0.18, 1.76, -0.02);
    leaf.rotation.z = -0.35;
    group.add(leaf);
  }

  groundModelToFloor(THREE_REF, group, 0);
  group.scale.setScalar(0.82);
  return group;
}

const EMBEDDED_WEIRDO_ACTION_ALIASES: Record<string, string[]> = {
  floor_crawl: [
    "Crawl_Backward",
    "Crawl_Backward_inplace",
    "Lie_Down_Hands_Spread",
    "Wake_Up_and_Look_Up",
  ],
  gravity_spin: ["Indoor_Swing"],
  tree_hug_climb: ["Slow_Ladder_Climb"],
};

const FLOOR_CRAWLER_ACTION_SEQUENCE = [
  "Crawl_Backward_inplace",
  "Lie_Down_Hands_Spread",
  "Wake_Up_and_Look_Up",
] as const;

function normalizeEmbeddedActionName(name: string) {
  return name.toLowerCase().replace(/\s+/g, "_");
}

function normalizeEmbeddedWeirdoClip(
  THREE_REF: typeof THREE,
  weirdo: WeirdoData,
  clip: THREE.AnimationClip
) {
  if (weirdo.id !== "weirdo_5" && weirdo.id !== "weirdo_7") {
    return clip;
  }

  const inPlaceTracks = clip.tracks.map((track) => {
    const clonedTrack = track.clone();
    const isHipsPosition = track.name === "Hips.position" || track.name.endsWith(".Hips.position");
    if (isHipsPosition && "values" in clonedTrack) {
      const values = clonedTrack.values as ArrayLike<number> & { [index: number]: number };
      for (let index = 0; index < values.length; index += 3) {
        values[index] = 0;
        values[index + 1] = 0;
        values[index + 2] = 0;
      }
    }
    return clonedTrack;
  });

  return new THREE_REF.AnimationClip(clip.name, clip.duration, inPlaceTracks);
}

function resolveEmbeddedWeirdoAction(
  actions: Map<string, THREE.AnimationAction>,
  clipNames: string | string[]
) {
  const requestedNames = Array.isArray(clipNames) ? clipNames : [clipNames];
  const candidates = requestedNames
    .flatMap((name) => [name, ...(EMBEDDED_WEIRDO_ACTION_ALIASES[name] ?? [])])
    .map(normalizeEmbeddedActionName);

  for (const [actionName, action] of actions) {
    const normalizedActionName = normalizeEmbeddedActionName(actionName);
    if (candidates.includes(normalizedActionName)) {
      return { actionName, action };
    }
  }

  for (const [actionName, action] of actions) {
    const normalizedActionName = normalizeEmbeddedActionName(actionName);
    if (candidates.some((candidate) => normalizedActionName.includes(candidate))) {
      return { actionName, action };
    }
  }

  return null;
}

type EmbeddedWeirdoPlaybackOptions = {
  fade?: number;
  loopOnce?: boolean;
  clampWhenFinished?: boolean;
};

function playEmbeddedWeirdoAction(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  clipNames: string | string[],
  playback: number | EmbeddedWeirdoPlaybackOptions = 0.14
) {
  const options =
    typeof playback === "number" ? { fade: playback } : playback;
  const fade = options.fade ?? 0.14;
  const actions = group.userData.embeddedWeirdoActions as Map<string, THREE.AnimationAction> | undefined;
  if (!actions?.size) {
    return null;
  }
  const resolved = resolveEmbeddedWeirdoAction(actions, clipNames);
  if (!resolved) {
    return null;
  }
  const { actionName, action: nextAction } = resolved;
  const currentName = group.userData.embeddedWeirdoCurrentAction as string | undefined;
  const currentAction = currentName ? actions.get(currentName) : undefined;
  if (currentName === actionName && nextAction.isRunning()) {
    return actionName;
  }
  const loopOnce = options.loopOnce ?? normalizeEmbeddedActionName(actionName).includes("complete");
  currentAction?.fadeOut(fade);
  nextAction.reset();
  nextAction.enabled = true;
  nextAction.clampWhenFinished = options.clampWhenFinished ?? loopOnce;
  nextAction.setLoop(loopOnce ? THREE_REF.LoopOnce : THREE_REF.LoopRepeat, loopOnce ? 1 : Infinity);
  nextAction.setEffectiveTimeScale(1);
  nextAction.setEffectiveWeight(1);
  nextAction.fadeIn(fade).play();
  group.userData.embeddedWeirdoCurrentAction = actionName;
  group.userData.embeddedRuntimeScaleChecks = 0;
  group.userData.embeddedRuntimeScaleStable = false;
  return actionName;
}

function clampEmbeddedWeirdoRuntimeScale(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  actorRoot: THREE.Group
) {
  const weirdoId = group.userData.weirdoId as WeirdoId | undefined;
  const rule = weirdoId ? EMBEDDED_WEIRDO_RUNTIME_SCALE_RULES[weirdoId] : undefined;
  if (!rule) {
    return;
  }

  const checks = (group.userData.embeddedRuntimeScaleChecks as number | undefined) ?? 0;
  group.userData.embeddedRuntimeScaleChecks = checks + 1;

  actorRoot.updateWorldMatrix(true, true);
  const box = getVisibleObjectBox(THREE_REF, actorRoot);
  if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x)) {
    return;
  }

  const size = box.getSize(new THREE_REF.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const sourceDimension = maxDimension > rule.maxDimension
    ? maxDimension
    : maxDimension;
  const shouldResize =
    maxDimension > rule.maxDimension ||
    sourceDimension > rule.targetDimension * 1.3;
  if (shouldResize) {
    const scale = rule.targetDimension / Math.max(sourceDimension, 0.001);
    if (Number.isFinite(scale) && scale > 0.0001 && scale < 1) {
      actorRoot.scale.multiplyScalar(scale);
      group.userData.embeddedRuntimeScaleClamped = true;
      group.userData.embeddedRuntimeLastDimension = sourceDimension;
    }
    return;
  }

  if (checks >= 2) {
    group.userData.embeddedRuntimeScaleStable = true;
  }
}

function getVisibleObjectBox(
  THREE_REF: typeof THREE,
  object: THREE.Object3D,
  precise = false
) {
  object.updateWorldMatrix(true, true);
  const box = new THREE_REF.Box3();
  box.makeEmpty();
  const vertex = new THREE_REF.Vector3();

  object.traverse((child) => {
    if (!isObjectTreeVisible(child)) {
      return;
    }
    const mesh = child as THREE.Mesh & {
      isMesh?: boolean;
      isSkinnedMesh?: boolean;
      geometry?: THREE.BufferGeometry;
      getVertexPosition?: (index: number, target: THREE.Vector3) => THREE.Vector3;
    };
    if (!mesh.geometry || (!mesh.isMesh && !mesh.isSkinnedMesh)) {
      return;
    }
    const positionAttribute = mesh.geometry.getAttribute("position");
    if (precise && positionAttribute && typeof mesh.getVertexPosition === "function") {
      for (let index = 0; index < positionAttribute.count; index += 1) {
        mesh.getVertexPosition(index, vertex);
        vertex.applyMatrix4(child.matrixWorld);
        box.expandByPoint(vertex);
      }
      return;
    }
    if (!mesh.geometry.boundingBox) {
      mesh.geometry.computeBoundingBox();
    }
    const geometryBox = mesh.geometry.boundingBox;
    if (!geometryBox) {
      return;
    }
    box.union(geometryBox.clone().applyMatrix4(child.matrixWorld));
  });

  return box;
}

function isObjectTreeVisible(object: THREE.Object3D) {
  let cursor: THREE.Object3D | null = object;
  while (cursor) {
    if (!cursor.visible) {
      return false;
    }
    cursor = cursor.parent;
  }
  return true;
}

function setEmbeddedWeirdoSafetyFallback(group: THREE.Group, enabled: boolean) {
  const actorModel = group.userData.actorModel as THREE.Object3D | undefined;
  const fallback = group.userData.embeddedSafetyFallback as THREE.Group | undefined;
  if (!fallback) {
    return;
  }
  fallback.visible = enabled;
  if (actorModel) {
    actorModel.visible = !enabled;
  }
}

function pinEmbeddedActorBoxToLocalTarget(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  actorRoot: THREE.Group,
  target: THREE.Vector3,
  precise = false
) {
  group.updateWorldMatrix(true, true);
  actorRoot.updateWorldMatrix(true, true);
  const box = getVisibleObjectBox(THREE_REF, actorRoot, precise);
  if (!Number.isFinite(box.min.y) || !Number.isFinite(box.max.y)) {
    return;
  }

  const centerWorld = box.getCenter(new THREE_REF.Vector3());
  const bottomCenterLocal = group.worldToLocal(
    new THREE_REF.Vector3(centerWorld.x, box.min.y, centerWorld.z)
  );
  const delta = new THREE_REF.Vector3(
    target.x - bottomCenterLocal.x,
    target.y - bottomCenterLocal.y,
    target.z - bottomCenterLocal.z
  );
  if (Number.isFinite(delta.x) && Number.isFinite(delta.y) && Number.isFinite(delta.z)) {
    actorRoot.position.add(delta);
  }
}

function lockCustomEmbeddedActorToHeight(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  actorRoot: THREE.Group,
  targetHeight: number,
  precise = false
): boolean {
  const actorModel = group.userData.actorModel as THREE.Object3D | undefined;
  if (!actorModel) {
    return false;
  }

  actorModel.visible = true;
  actorRoot.scale.setScalar(1);
  actorRoot.updateWorldMatrix(true, true);
  actorModel.updateWorldMatrix(true, true);

  const box = getVisibleObjectBox(THREE_REF, actorModel, precise);
  if (!Number.isFinite(box.min.y) || !Number.isFinite(box.max.y)) {
    return false;
  }

  const size = box.getSize(new THREE_REF.Vector3());
  const scaleFactor = Number.isFinite(size.y) && size.y > 0.001 ? targetHeight / size.y : 1;

  const shouldResize =
    Number.isFinite(scaleFactor) &&
    scaleFactor > 0.0001 &&
    (size.y > targetHeight * 1.04 || size.y < targetHeight * 0.96);
  if (!shouldResize) {
    return true;
  }

  actorModel.scale.multiplyScalar(scaleFactor);
  actorModel.updateWorldMatrix(true, true);
  return true;
}

function shouldUseEmbeddedWeirdoFallback(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  box: THREE.Box3,
  size: THREE.Vector3,
  maxDimension: number,
  rule: EmbeddedWeirdoRuntimeScaleRule,
  target: THREE.Vector3
) {
  const targetWorld = group.localToWorld(target.clone());
  const bottomOffset = box.min.y - targetWorld.y;
  const topOffset = box.max.y - targetWorld.y;
  return (
    !Number.isFinite(maxDimension) ||
    maxDimension < 0.38 ||
    maxDimension > rule.maxDimension * 1.9 ||
    size.y > rule.maxDimension * 1.9 ||
    bottomOffset < -0.35 ||
    topOffset > rule.maxDimension * 2.05
  );
}

function updateEmbeddedWeirdoSafetyFallbackPose(
  group: THREE.Group,
  weirdo: WeirdoData,
  time: number,
  found: boolean
) {
  const fallback = group.userData.embeddedSafetyFallback as THREE.Group | undefined;
  if (!fallback?.visible) {
    return;
  }
  const leftArm = fallback.getObjectByName("fallback-left-arm");
  const rightArm = fallback.getObjectByName("fallback-right-arm");
  const leftLeg = fallback.getObjectByName("fallback-left-leg");
  const rightLeg = fallback.getObjectByName("fallback-right-leg");
  const head = fallback.getObjectByName("fallback-head");
  const torso = fallback.getObjectByName("fallback-torso");
  const pulse = Math.sin(time * (found ? 4.2 : 6.8));
  if (weirdo.id === "weirdo_5") {
    fallback.rotation.y += 0.075;
    leftArm?.rotation.set(0, 0, -1.05 + pulse * 0.12);
    rightArm?.rotation.set(0, 0, 1.05 - pulse * 0.12);
    leftLeg?.rotation.set(0, 0, -0.12 + pulse * 0.08);
    rightLeg?.rotation.set(0, 0, 0.12 - pulse * 0.08);
  } else {
    fallback.rotation.y = 0.18 + pulse * 0.08;
    fallback.rotation.z = -0.16 + pulse * 0.05;
    leftArm?.rotation.set(0, 0, -1.05 + pulse * 0.18);
    rightArm?.rotation.set(0, 0, 1.05 - pulse * 0.18);
    leftLeg?.rotation.set(0, 0, -0.34 + pulse * 0.12);
    rightLeg?.rotation.set(0, 0, 0.34 - pulse * 0.12);
  }
  if (head) {
    head.rotation.y = pulse * 0.08;
  }
  if (torso) {
    torso.position.y = 0.78 + Math.abs(pulse) * 0.025;
  }
}

function stabilizeCustomEmbeddedWeirdo(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  actorRoot: THREE.Group,
  target: THREE.Vector3,
  weirdo: WeirdoData,
  time: number,
  found: boolean
) {
  const weirdoId = group.userData.weirdoId as WeirdoId | undefined;
  const rule = weirdoId ? EMBEDDED_WEIRDO_RUNTIME_SCALE_RULES[weirdoId] : undefined;
  if (!rule) {
    pinEmbeddedActorBoxToLocalTarget(THREE_REF, group, actorRoot, target);
    return;
  }

  const mustUseCustomModel = weirdo.id === "weirdo_5" || weirdo.id === "weirdo_7";
  const usePreciseCustomBox = rule.preciseBox ?? false;
  actorRoot.scale.setScalar(1);
  setEmbeddedWeirdoSafetyFallback(group, false);
  actorRoot.updateWorldMatrix(true, true);
  let box = getVisibleObjectBox(THREE_REF, actorRoot, usePreciseCustomBox);
  let size = box.getSize(new THREE_REF.Vector3());
  let maxDimension = Math.max(size.x, size.y, size.z);

  if (rule.targetHeight) {
    if (group.userData.customEmbeddedRuntimeLocked !== true) {
      const didLock = lockCustomEmbeddedActorToHeight(
        THREE_REF,
        group,
        actorRoot,
        rule.targetHeight,
        usePreciseCustomBox
      );
      if (didLock) {
        group.userData.customEmbeddedRuntimeLocked = true;
      }
    }
    updateEmbeddedWeirdoSafetyFallbackPose(group, weirdo, time, found);
    if (mustUseCustomModel) {
      actorRoot.position.copy(target);
    } else {
      pinEmbeddedActorBoxToLocalTarget(THREE_REF, group, actorRoot, target, usePreciseCustomBox);
    }
    return;
  }

  if (shouldUseEmbeddedWeirdoFallback(THREE_REF, group, box, size, maxDimension, rule, target)) {
    if (mustUseCustomModel && Number.isFinite(maxDimension) && maxDimension > 0.001) {
      actorRoot.scale.multiplyScalar(rule.targetDimension / maxDimension);
    } else {
      setEmbeddedWeirdoSafetyFallback(group, true);
      actorRoot.scale.setScalar(1);
    }
  } else if (maxDimension > rule.maxDimension || size.y > rule.targetDimension * 1.22) {
    const sourceDimension = Math.max(maxDimension, size.y);
    const scale = rule.targetDimension / Math.max(sourceDimension, 0.001);
    if (Number.isFinite(scale) && scale > 0.0001 && scale < 1) {
      actorRoot.scale.multiplyScalar(scale);
    }
  }

  actorRoot.updateWorldMatrix(true, true);
  box = getVisibleObjectBox(THREE_REF, actorRoot, usePreciseCustomBox);
  size = box.getSize(new THREE_REF.Vector3());
  maxDimension = Math.max(size.x, size.y, size.z);
  if (shouldUseEmbeddedWeirdoFallback(THREE_REF, group, box, size, maxDimension, rule, target)) {
    if (mustUseCustomModel && Number.isFinite(maxDimension) && maxDimension > 0.001) {
      actorRoot.scale.multiplyScalar(rule.targetDimension / maxDimension);
    } else {
      setEmbeddedWeirdoSafetyFallback(group, true);
      actorRoot.scale.setScalar(1);
    }
  }

  updateEmbeddedWeirdoSafetyFallbackPose(group, weirdo, time, found);
  pinEmbeddedActorBoxToLocalTarget(THREE_REF, group, actorRoot, target, usePreciseCustomBox);
}

function applyEmbeddedWeirdoVisualPose(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  actorRoot: THREE.Group,
  weirdo: WeirdoData,
  time: number,
  found: boolean,
  isFloorCrawler: boolean
) {
  const seed = motionSeed(weirdo.id);
  actorRoot.visible = true;
  const target = new THREE_REF.Vector3();

  if (isFloorCrawler) {
    target.set(
      0,
      FLOOR_CRAWLER_GROUND_LIFT + Math.abs(Math.sin(time * 5 + seed)) * 0.025,
      0
    );
    actorRoot.position.copy(target);
    actorRoot.rotation.set(0, 0, 0);
    return;
  }

  if (weirdo.specialAnimation === "gravity_spin") {
    target.set(
      0,
      CUSTOM_EMBEDDED_WEIRDO_GROUND_Y,
      0
    );
    actorRoot.position.copy(target);
    actorRoot.rotation.set(0, 0, 0);
    stabilizeCustomEmbeddedWeirdo(THREE_REF, group, actorRoot, target, weirdo, time, found);
    return;
  }

  if (weirdo.specialAnimation === "tree_hug_climb") {
    target.set(
      0.04,
      CUSTOM_EMBEDDED_WEIRDO_GROUND_Y,
      -0.42
    );
    actorRoot.position.copy(target);
    actorRoot.rotation.set(0, 0.42, -0.08);
    stabilizeCustomEmbeddedWeirdo(THREE_REF, group, actorRoot, target, weirdo, time, found);
    return;
  }

  target.set(
    0,
    found ? Math.abs(Math.sin(time * 5 + seed)) * 0.06 : 0,
    0
  );
  actorRoot.position.copy(target);
  actorRoot.rotation.set(0, 0, 0);
}

function nextFloorCrawlerCycleClip(
  group: THREE.Group,
  actions: Map<string, THREE.AnimationAction>
) {
  const currentName = group.userData.embeddedWeirdoCurrentAction as string | undefined;
  const currentAction = currentName ? actions.get(currentName) : undefined;
  const currentClipFinished =
    Boolean(currentAction) &&
    (!currentAction!.isRunning() || currentAction!.time >= currentAction!.getClip().duration - 0.04);

  if (!currentName || currentClipFinished) {
    const nextIndex =
      (((group.userData.floorCrawlerCycleIndex as number | undefined) ?? -1) + 1) %
      FLOOR_CRAWLER_ACTION_SEQUENCE.length;
    group.userData.floorCrawlerCycleIndex = nextIndex;
    group.userData.floorCrawlerCycleClip = FLOOR_CRAWLER_ACTION_SEQUENCE[nextIndex];
  }

  return (group.userData.floorCrawlerCycleClip as string | undefined) ?? FLOOR_CRAWLER_ACTION_SEQUENCE[0];
}

type WeirdoModelNormalizeOptions = {
  targetHeight?: number;
  targetMaxDimension?: number;
  preciseBox?: boolean;
};

function getWeirdoModelNormalizeOptions(weirdoId: WeirdoId): WeirdoModelNormalizeOptions {
  if (weirdoId === "weirdo_3") {
    return { targetMaxDimension: FLOOR_CRAWLER_STATIC_TARGET_MAX_DIMENSION };
  }
  if (weirdoId === "weirdo_5" || weirdoId === "weirdo_7") {
    return { targetHeight: CUSTOM_EMBEDDED_WEIRDO_TARGET_HEIGHT, preciseBox: true };
  }
  return {};
}

function normalizeWeirdoModel(
  THREE_REF: typeof THREE,
  model: THREE.Object3D,
  options: WeirdoModelNormalizeOptions = {}
) {
  const box = options.preciseBox
    ? getVisibleObjectBox(THREE_REF, model, true)
    : new THREE_REF.Box3().setFromObject(model);
  if (!Number.isFinite(box.min.y) || !Number.isFinite(box.max.y)) {
    return;
  }
  const size = box.getSize(new THREE_REF.Vector3());
  const sourceDimension = options.targetMaxDimension
    ? Math.max(size.x, size.y, size.z)
    : size.y;
  const targetDimension = options.targetMaxDimension ?? options.targetHeight ?? 1.58;
  const scale = targetDimension / Math.max(sourceDimension, 0.001);
  if (Number.isFinite(scale) && scale > 0.0001) {
    model.scale.multiplyScalar(scale);
  }
  const normalizedBox = options.preciseBox
    ? getVisibleObjectBox(THREE_REF, model, true)
    : new THREE_REF.Box3().setFromObject(model);
  const center = normalizedBox.getCenter(new THREE_REF.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  groundModelToFloor(THREE_REF, model, 0, options.preciseBox === true);
}

function cacheWeirdoNodes(model: THREE.Object3D) {
  const nodeNames = new Set<WeirdoNodeName>([
    "RootBody",
    "Head",
    "Arm_L",
    "Arm_R",
    "Leg_L",
    "Leg_R",
    "Shoe_L",
    "Shoe_R",
    "Basketball",
    "BallSeamA",
    "UmbrellaHandle",
    "UmbrellaCanopy",
    "SignalRing",
    "ReceiverPack",
  ]);
  const nodes: WeirdoNodeMap = {};
  model.traverse((child) => {
    if (nodeNames.has(child.name as WeirdoNodeName)) {
      nodes[child.name as WeirdoNodeName] = child;
    }
  });
  return nodes;
}

function snapshotWeirdoNodePose(nodes: WeirdoNodeMap) {
  const state: Partial<Record<WeirdoNodeName, WeirdoNodeState>> = {};
  (Object.keys(nodes) as WeirdoNodeName[]).forEach((name) => {
    const node = nodes[name];
    if (!node) {
      return;
    }
    state[name] = {
      position: node.position.clone(),
      rotation: node.rotation.clone(),
      scale: node.scale.clone(),
    };
  });
  return state;
}

function restoreWeirdoNodePose(nodes: WeirdoNodeMap, state: Partial<Record<WeirdoNodeName, WeirdoNodeState>>) {
  (Object.keys(nodes) as WeirdoNodeName[]).forEach((name) => {
    const node = nodes[name];
    const rest = state[name];
    if (!node || !rest) {
      return;
    }
    node.position.copy(rest.position);
    node.rotation.copy(rest.rotation);
    node.scale.copy(rest.scale);
  });
}

function createDetailedVoxelTree(THREE_REF: typeof THREE, accent: string) {
  const tree = new THREE_REF.Group();
  tree.name = "weirdo-tree-hugger-target";
  const trunkMaterial = new THREE_REF.MeshStandardMaterial({ color: "#6b4226", roughness: 0.82 });
  const leafMaterial = new THREE_REF.MeshStandardMaterial({ color: "#2f7d42", roughness: 0.72 });
  const glowMaterial = new THREE_REF.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.44 });
  for (let level = 0; level < 7; level += 1) {
    const trunk = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.26, 0.34, 0.26), trunkMaterial);
    trunk.position.set((level % 2 ? 0.035 : -0.025), 0.18 + level * 0.31, Math.sin(level) * 0.025);
    tree.add(trunk);
  }
  [
    [-0.36, 1.05, 0.02, 0.72, 0.16, 0.22, -0.22],
    [0.35, 1.42, -0.03, 0.68, 0.16, 0.22, 0.24],
    [-0.26, 1.76, 0.05, 0.54, 0.14, 0.2, -0.12],
  ].forEach(([x, y, z, w, h, d, rz]) => {
    const branch = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(w, h, d), trunkMaterial);
    branch.position.set(x, y, z);
    branch.rotation.z = rz;
    tree.add(branch);
  });
  const crownPositions = [
    [0, 2.45, 0, 1.12, 0.62],
    [-0.46, 2.28, 0.1, 0.7, 0.52],
    [0.44, 2.32, -0.12, 0.74, 0.5],
    [0.05, 2.85, 0.03, 0.82, 0.48],
    [-0.18, 2.62, 0.48, 0.62, 0.42],
    [0.24, 2.54, -0.46, 0.58, 0.42],
  ] as const;
  crownPositions.forEach(([x, y, z, w, h], index) => {
    const leaf = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(w, h, w), leafMaterial);
    leaf.position.set(x, y, z);
    leaf.rotation.y = index * 0.21;
    tree.add(leaf);
  });
  const ring = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.62, 0.025, 8, 52), glowMaterial);
  ring.position.y = 1.35;
  ring.rotation.x = Math.PI / 2;
  tree.add(ring);
  tree.userData.crown = tree.children.slice(-7);
  return tree;
}

function addWeirdoHumanoid(
  THREE_REF: typeof THREE,
  parent: THREE.Group,
  materials: {
    skin: THREE.Material;
    body: THREE.Material;
    leg: THREE.Material;
    dark: THREE.Material;
    accent: THREE.Material;
  }
) {
  const root = new THREE_REF.Group();
  parent.add(root);
  const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.48, 0.72, 0.3), materials.body);
  body.name = "torso";
  body.position.y = 0.86;
  root.add(body);
  const belt = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.52, 0.08, 0.33), materials.dark);
  belt.position.y = 0.52;
  root.add(belt);
  const chestBadge = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.18, 0.16, 0.035), materials.accent);
  chestBadge.position.set(0.16, 0.98, -0.18);
  root.add(chestBadge);
  const head = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.48, 0.42, 0.38), materials.skin);
  head.name = "head";
  head.position.y = 1.36;
  root.add(head);
  const hair = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.56, 0.18, 0.42), materials.dark);
  hair.position.y = 1.61;
  root.add(hair);
  const eyes = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.23, 0.045, 0.035), materials.dark);
  eyes.position.set(0, 1.37, -0.22);
  root.add(eyes);
  const mouth = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.16, 0.035, 0.035), materials.accent);
  mouth.position.set(0, 1.24, -0.22);
  root.add(mouth);

  const leftShoulder = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.18, 0.18, 0.18), materials.body);
  leftShoulder.position.set(-0.35, 1.16, 0);
  root.add(leftShoulder);
  const leftArm = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.15, 0.58, 0.15), materials.skin);
  leftArm.name = "arm-left";
  leftArm.position.set(-0.39, 0.86, 0);
  leftArm.rotation.z = -0.18;
  root.add(leftArm);
  const leftForearm = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.14, 0.25, 0.14), materials.skin);
  leftForearm.position.set(-0.48, 0.55, -0.01);
  root.add(leftForearm);
  const leftHand = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.17, 0.13, 0.17), materials.skin);
  leftHand.position.set(-0.44, 0.54, -0.01);
  root.add(leftHand);
  const rightShoulder = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.18, 0.18, 0.18), materials.body);
  rightShoulder.position.set(0.35, 1.16, 0);
  root.add(rightShoulder);
  const rightArm = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.15, 0.58, 0.15), materials.skin);
  rightArm.name = "arm-right";
  rightArm.position.set(0.39, 0.86, 0);
  rightArm.rotation.z = 0.18;
  root.add(rightArm);
  const rightForearm = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.14, 0.25, 0.14), materials.skin);
  rightForearm.position.set(0.48, 0.55, -0.01);
  root.add(rightForearm);
  const rightHand = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.17, 0.13, 0.17), materials.skin);
  rightHand.position.set(0.44, 0.54, -0.01);
  root.add(rightHand);
  const leftLeg = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.17, 0.46, 0.17), materials.leg);
  leftLeg.name = "leg-left";
  leftLeg.position.set(-0.15, 0.28, 0);
  root.add(leftLeg);
  const rightLeg = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.17, 0.46, 0.17), materials.leg);
  rightLeg.name = "leg-right";
  rightLeg.position.set(0.15, 0.28, 0);
  root.add(rightLeg);
  const leftKnee = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.19, 0.08, 0.19), materials.accent);
  leftKnee.position.set(-0.15, 0.24, -0.04);
  root.add(leftKnee);
  const rightKnee = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.19, 0.08, 0.19), materials.accent);
  rightKnee.position.set(0.15, 0.24, -0.04);
  root.add(rightKnee);
  const leftShoe = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.22, 0.11, 0.27), materials.dark);
  leftShoe.position.set(-0.15, 0.04, -0.04);
  root.add(leftShoe);
  const rightShoe = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.22, 0.11, 0.27), materials.dark);
  rightShoe.position.set(0.15, 0.04, -0.04);
  root.add(rightShoe);
  return {
    root,
    body,
    belt,
    chestBadge,
    head,
    hair,
    leftShoulder,
    rightShoulder,
    leftArm,
    rightArm,
    leftForearm,
    rightForearm,
    leftLeg,
    rightLeg,
    leftKnee,
    rightKnee,
    eyes,
    mouth,
    leftHand,
    rightHand,
    leftShoe,
    rightShoe,
  };
}

function makeWeirdoLabel(THREE_REF: typeof THREE, weirdo: WeirdoData) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 214;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(7, 10, 18, 0.74)";
    context.fillRect(34, 32, 572, 126);
    context.strokeStyle = weirdo.accent;
    context.lineWidth = 5;
    context.strokeRect(44, 42, 552, 106);
    context.fillStyle = "#ffffff";
    context.font = "800 36px serif";
    context.textAlign = "center";
    context.fillText(weirdo.title, 320, 86);
    context.fillStyle = weirdo.accent;
    context.font = "800 18px sans-serif";
    context.fillText(weirdo.english, 320, 122);
  }
  const texture = new THREE_REF.CanvasTexture(canvas);
  const sprite = new THREE_REF.Sprite(
    new THREE_REF.SpriteMaterial({ map: texture, transparent: true })
  );
  sprite.scale.set(3.15, 1.05, 1);
  return sprite;
}

function makeWeirdoFoundBadge(THREE_REF: typeof THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.shadowColor = "#22c55e";
    context.shadowBlur = 22;
    context.fillStyle = "rgba(15, 118, 110, 0.88)";
    context.beginPath();
    context.arc(96, 96, 58, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "#bbf7d0";
    context.lineWidth = 8;
    context.stroke();
    context.fillStyle = "#ecfdf5";
    context.font = "900 86px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("✓", 96, 98);
  }
  const texture = new THREE_REF.CanvasTexture(canvas);
  const sprite = new THREE_REF.Sprite(
    new THREE_REF.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    })
  );
  sprite.scale.set(0.62, 0.62, 0.62);
  return sprite;
}

function updateWeirdoFoundVisuals(runtime: Runtime, checked: Set<WeirdoId>) {
  runtime.weirdoGroups.forEach((group, id) => {
    const found = checked.has(id);
    group.userData.found = found;
    group.userData.followIndex = WEIRDOS.findIndex((weirdo) => weirdo.id === id);
    if (!found) {
      const home = group.userData.home as THREE.Vector3 | undefined;
      if (home) {
        group.position.copy(home);
      }
      const weirdo = getWeirdo(id);
      group.rotation.y = weirdo.facing;
      group.userData.embeddedWeirdoCompletePlayed = false;
      group.userData.embeddedWeirdoCurrentAction = "";
      const actions = group.userData.embeddedWeirdoActions as Map<string, THREE.AnimationAction> | undefined;
      actions?.forEach((action) => action.stop());
    }
    const badge = runtime.weirdoFoundBadges.get(id);
    if (badge) {
      badge.visible = found;
    }
    const ring = group.userData.floorRing as THREE.Mesh | undefined;
    const material = ring?.material as THREE.Material & { opacity?: number };
    if (material && typeof material.opacity === "number") {
      material.opacity = found ? 0.86 : 0.5;
    }
  });
}

function drawPlayerNameTexture(THREE_REF: typeof THREE, name: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f8fafc";
    context.font = "900 38px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "rgba(0, 0, 0, 0.9)";
    context.shadowBlur = 12;
    context.shadowOffsetY = 3;
    context.fillText(name.slice(0, 18) || "player1", 256, 66);
  }
  return new THREE_REF.CanvasTexture(canvas);
}

function makePlayerNameLabel(THREE_REF: typeof THREE, name: string) {
  const texture = drawPlayerNameTexture(THREE_REF, name);
  const sprite = new THREE_REF.Sprite(
    new THREE_REF.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    })
  );
  sprite.scale.set(1.38, 0.34, 1);
  return sprite;
}

function updatePlayerNameLabel(
  THREE_REF: typeof THREE,
  sprite: THREE.Sprite,
  name: string
) {
  const material = sprite.material as THREE.SpriteMaterial;
  material.map?.dispose();
  material.map = drawPlayerNameTexture(THREE_REF, name);
  material.needsUpdate = true;
}

function createAquariusObjectGroup(THREE_REF: typeof THREE, item: AquariusObjectData) {
  const group = new THREE_REF.Group();
  group.position.set(...scaleWorldPosition(item.position));
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
  } else if (item.id === "habitat-dome") {
    addHabitatDomeObject(THREE_REF, group, darkMaterial, accentMaterial);
  } else if (item.id === "oxygen-tree") {
    addOxygenTreeObject(THREE_REF, group, baseMaterial, accentMaterial);
  } else if (item.id === "hydroponic-kitchen") {
    addHydroponicKitchenObject(THREE_REF, group, darkMaterial, accentMaterial);
  } else if (item.id === "memory-market") {
    addMemoryMarketObject(THREE_REF, group, darkMaterial, accentMaterial);
  } else if (item.id === "monorail-station") {
    addMonorailStationObject(THREE_REF, group, baseMaterial, accentMaterial);
  } else if (item.id === "flying-cow") {
    addFlyingCowObject(THREE_REF, group, darkMaterial, accentMaterial);
  } else if (item.id === "signal-jellyfish") {
    addSignalJellyfishObject(THREE_REF, group, accentMaterial);
  } else if (item.id === "quantum-deer") {
    addQuantumDeerObject(THREE_REF, group, darkMaterial, accentMaterial);
  } else if (item.id === "bubble-dog") {
    addBubbleDogObject(THREE_REF, group, darkMaterial, accentMaterial);
  } else if (item.id === "solar-sheep") {
    addSolarSheepObject(THREE_REF, group, darkMaterial, accentMaterial);
  } else {
    addPaperRayObject(THREE_REF, group, accentMaterial);
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
  const prompt = makeInteractionPrompt(THREE_REF, item.accent);
  prompt.position.set(item.kind === "creature" ? 0.9 : 0.82, item.kind === "creature" ? 1.2 : 1.52, 0);
  prompt.visible = false;
  group.add(prompt);
  group.userData.prompt = prompt;

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

function addHabitatDomeObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  darkMaterial: THREE.Material,
  accentMaterial: THREE.Material
) {
  const base = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(1.12, 1.32, 0.42, 16), darkMaterial);
  base.position.y = 0.22;
  group.add(base);
  const glass = new THREE_REF.Mesh(
    new THREE_REF.SphereGeometry(1.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE_REF.MeshStandardMaterial({
      color: "#a7f3d0",
      emissive: "#0f766e",
      emissiveIntensity: 0.16,
      transparent: true,
      opacity: 0.36,
      roughness: 0.18,
    })
  );
  glass.position.y = 0.42;
  group.add(glass);
  for (let index = 0; index < 3; index += 1) {
    const pod = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.42, 0.36, 0.58), accentMaterial);
    const theta = index * (Math.PI * 2 / 3);
    pod.position.set(Math.cos(theta) * 0.62, 0.56, Math.sin(theta) * 0.62);
    pod.rotation.y = -theta;
    group.add(pod);
  }
}

function addOxygenTreeObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  baseMaterial: THREE.Material,
  accentMaterial: THREE.Material
) {
  const trunk = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.14, 0.24, 1.35, 8), baseMaterial);
  trunk.position.y = 0.68;
  group.add(trunk);
  [0, 0.55, -0.55].forEach((x, index) => {
    const crown = new THREE_REF.Mesh(new THREE_REF.OctahedronGeometry(0.48 - index * 0.04, 0), accentMaterial);
    crown.position.set(x, 1.55 + index * 0.18, index === 0 ? 0 : 0.22);
    crown.rotation.set(index * 0.3, index * 0.8, 0.42);
    group.add(crown);
  });
  const halo = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(1.05, 0.025, 8, 64), accentMaterial);
  halo.position.y = 1.55;
  halo.rotation.x = Math.PI / 2;
  group.add(halo);
}

function addHydroponicKitchenObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  darkMaterial: THREE.Material,
  accentMaterial: THREE.Material
) {
  const counter = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.8, 0.32, 0.72), darkMaterial);
  counter.position.y = 0.5;
  group.add(counter);
  for (let index = 0; index < 4; index += 1) {
    const tube = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.055, 0.055, 1.45, 10), accentMaterial);
    tube.position.set(-0.64 + index * 0.42, 0.9, 0);
    tube.rotation.z = Math.PI / 2;
    group.add(tube);
    const crop = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(0.13, 0.38, 5), accentMaterial);
    crop.position.set(-0.64 + index * 0.42, 1.15, 0.18);
    group.add(crop);
  }
  const sign = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.7, 0.36, 0.05), accentMaterial);
  sign.position.set(0, 1.38, -0.36);
  group.add(sign);
}

function addMemoryMarketObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  darkMaterial: THREE.Material,
  accentMaterial: THREE.Material
) {
  const table = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.55, 0.24, 0.92), darkMaterial);
  table.position.y = 0.58;
  group.add(table);
  const canopy = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(1.05, 0.52, 4), accentMaterial);
  canopy.position.y = 1.55;
  canopy.rotation.y = Math.PI / 4;
  group.add(canopy);
  for (let index = 0; index < 5; index += 1) {
    const memory = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.18, 0.18, 0.18), accentMaterial);
    memory.position.set(-0.58 + index * 0.29, 0.86 + Math.sin(index) * 0.08, 0.08);
    memory.rotation.set(index * 0.4, index * 0.8, 0.2);
    group.add(memory);
  }
}

function addMonorailStationObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  baseMaterial: THREE.Material,
  accentMaterial: THREE.Material
) {
  const platform = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(2.1, 0.22, 0.95), baseMaterial);
  platform.position.y = 0.42;
  group.add(platform);
  const rail = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(1.15, 0.035, 8, 72), accentMaterial);
  rail.position.y = 0.75;
  rail.rotation.x = Math.PI / 2;
  group.add(rail);
  const train = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.78, 0.34, 0.42), accentMaterial);
  train.position.set(0.35, 1.08, 0);
  train.rotation.y = -0.42;
  group.add(train);
  const mast = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.045, 0.065, 1.24, 8), baseMaterial);
  mast.position.set(-0.82, 1, -0.24);
  group.add(mast);
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

function addBubbleDogObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  darkMaterial: THREE.Material,
  accentMaterial: THREE.Material
) {
  const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.05, 0.48, 0.55), darkMaterial);
  body.position.y = 0.62;
  group.add(body);
  const head = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.48, 0.46, 0.46), darkMaterial);
  head.position.set(0.68, 0.78, 0);
  group.add(head);
  [-0.16, 0.16].forEach((z) => {
    const ear = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(0.12, 0.32, 4), accentMaterial);
    ear.position.set(0.72, 1.13, z);
    ear.rotation.z = -0.2;
    group.add(ear);
  });
  const tail = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.22, 0.035, 8, 30), accentMaterial);
  tail.position.set(-0.62, 0.8, 0);
  tail.rotation.y = Math.PI / 2;
  group.add(tail);
  for (let index = 0; index < 4; index += 1) {
    const leg = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.12, 0.34, 0.12), darkMaterial);
    leg.position.set(index < 2 ? -0.32 : 0.34, 0.24, index % 2 === 0 ? -0.18 : 0.18);
    group.add(leg);
  }
  const bubbles: THREE.Object3D[] = [];
  for (let index = 0; index < 5; index += 1) {
    const bubble = new THREE_REF.Mesh(
      new THREE_REF.SphereGeometry(0.11 + index * 0.018, 12, 10),
      new THREE_REF.MeshStandardMaterial({
        color: "#d8b4fe",
        emissive: "#8b5cf6",
        emissiveIntensity: 0.22,
        transparent: true,
        opacity: 0.38,
        roughness: 0.16,
      })
    );
    bubble.position.set(-0.45 + index * 0.22, 1.22 + (index % 2) * 0.22, -0.32 + index * 0.13);
    group.add(bubble);
    bubbles.push(bubble);
  }
  group.userData.bubbles = bubbles;
}

function addSolarSheepObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  darkMaterial: THREE.Material,
  accentMaterial: THREE.Material
) {
  const wool = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.12, 0.72, 0.66), accentMaterial);
  wool.position.y = 0.74;
  group.add(wool);
  const head = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.42, 0.42, 0.42), darkMaterial);
  head.position.set(0.78, 0.78, 0);
  group.add(head);
  const panel = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.76, 0.035, 0.48), darkMaterial);
  panel.position.set(-0.1, 1.18, 0);
  panel.rotation.x = -0.28;
  group.add(panel);
  for (let index = 0; index < 4; index += 1) {
    const leg = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.045, 0.055, 0.42, 6), darkMaterial);
    leg.position.set(index < 2 ? -0.34 : 0.34, 0.24, index % 2 === 0 ? -0.22 : 0.22);
    group.add(leg);
  }
  [-0.18, 0.18].forEach((z) => {
    const horn = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.14, 0.025, 8, 24), accentMaterial);
    horn.position.set(0.88, 0.98, z);
    horn.rotation.y = Math.PI / 2;
    group.add(horn);
  });
}

function addPaperRayObject(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  accentMaterial: THREE.Material
) {
  const wingMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#fbcfe8",
    emissive: "#fb7185",
    emissiveIntensity: 0.28,
    roughness: 0.42,
    metalness: 0.04,
  });
  const body = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(1.45, 0.08, 0.72), wingMaterial);
  body.rotation.z = 0.06;
  group.add(body);
  const nose = new THREE_REF.Mesh(new THREE_REF.ConeGeometry(0.24, 0.54, 4), accentMaterial);
  nose.position.set(0.82, 0, 0);
  nose.rotation.z = -Math.PI / 2;
  group.add(nose);
  [-1, 1].forEach((side) => {
    const fin = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(0.64, 0.04, 0.28), accentMaterial);
    fin.position.set(-0.1, 0.02, side * 0.52);
    fin.rotation.set(0, side * 0.18, side * 0.28);
    group.add(fin);
  });
  group.userData.paperRay = body;
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

function createFoodPickupGroup(
  THREE_REF: typeof THREE,
  food: FoodData,
  source: THREE.Group | undefined,
  cloneAnimatedModel: CloneModelFn
) {
  const group = new THREE_REF.Group();
  group.name = `food-${food.id}`;
  group.position.set(...scaleWorldPosition(food.position));
  group.userData.foodId = food.id;
  group.userData.consumed = false;
  group.userData.baseY = food.position[1];

  const plateMaterial = new THREE_REF.MeshStandardMaterial({
    color: "#f8fafc",
    emissive: food.accent,
    emissiveIntensity: 0.08,
    roughness: 0.5,
    metalness: 0.08,
  });
  const glowMaterial = new THREE_REF.MeshBasicMaterial({
    color: food.accent,
    transparent: true,
    opacity: 0.62,
  });

  const plate = new THREE_REF.Mesh(new THREE_REF.CylinderGeometry(0.38, 0.44, 0.055, 22), plateMaterial);
  plate.position.y = -0.04;
  group.add(plate);

  const ring = new THREE_REF.Mesh(new THREE_REF.TorusGeometry(0.5, 0.024, 8, 46), glowMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.02;
  group.add(ring);
  group.userData.ring = ring;

  const model = createFallbackFoodModel(THREE_REF, food);
  model.userData.sourceAssetLoaded = Boolean(source && cloneAnimatedModel);
  model.scale.setScalar(food.scale * 1.22);
  groundModelToFloor(THREE_REF, model, 0.04);
  group.add(model);

  const label = makeFoodLabel(THREE_REF, food);
  label.position.set(0, 0.92, 0);
  group.add(label);
  group.userData.label = label;

  return group;
}

function createFallbackFoodModel(THREE_REF: typeof THREE, food: FoodData) {
  const group = new THREE_REF.Group();
  const material = new THREE_REF.MeshStandardMaterial({
    color: food.accent,
    emissive: food.accent,
    emissiveIntensity: 0.12,
    roughness: 0.52,
  });
  const dark = new THREE_REF.MeshStandardMaterial({ color: "#24150e", roughness: 0.7 });
  const cream = new THREE_REF.MeshStandardMaterial({ color: "#fef3c7", roughness: 0.58 });
  const green = new THREE_REF.MeshStandardMaterial({ color: "#22c55e", roughness: 0.58 });

  const addCube = (
    size: [number, number, number],
    position: [number, number, number],
    cubeMaterial: THREE.Material
  ) => {
    const cube = new THREE_REF.Mesh(new THREE_REF.BoxGeometry(...size), cubeMaterial);
    cube.position.set(...position);
    group.add(cube);
    return cube;
  };

  if (food.id === "pizza") {
    addCube([0.46, 0.08, 0.36], [0, 0.22, 0], cream);
    addCube([0.36, 0.045, 0.28], [0.03, 0.3, -0.02], material);
    addCube([0.09, 0.055, 0.09], [-0.1, 0.34, -0.08], dark);
    addCube([0.08, 0.055, 0.08], [0.12, 0.34, 0.08], green);
  } else if (food.id === "burger") {
    addCube([0.52, 0.16, 0.42], [0, 0.2, 0], cream);
    addCube([0.46, 0.12, 0.38], [0, 0.34, 0], dark);
    addCube([0.5, 0.08, 0.4], [0, 0.44, 0], green);
    addCube([0.52, 0.16, 0.42], [0, 0.56, 0], cream);
  } else if (food.id === "donut") {
    addCube([0.52, 0.16, 0.52], [0, 0.26, 0], material);
    addCube([0.22, 0.18, 0.22], [0, 0.28, 0], dark);
    addCube([0.11, 0.055, 0.11], [-0.17, 0.38, 0.1], cream);
    addCube([0.09, 0.055, 0.09], [0.18, 0.38, -0.08], green);
  } else if (food.id === "sushi") {
    addCube([0.48, 0.18, 0.34], [0, 0.22, 0], cream);
    addCube([0.5, 0.08, 0.36], [0, 0.36, 0], material);
    addCube([0.36, 0.1, 0.22], [0, 0.46, 0], green);
  } else {
    addCube([0.34, 0.34, 0.34], [0, 0.32, 0], material);
    addCube([0.08, 0.18, 0.08], [0.05, 0.6, 0], dark);
    addCube([0.22, 0.08, 0.12], [0.18, 0.58, 0], green);
  }
  return group;
}

function makeFoodLabel(THREE_REF: typeof THREE, food: FoodData) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = food.accent;
    context.font = "800 22px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "rgba(0, 0, 0, 0.72)";
    context.shadowBlur = 10;
    context.fillText("+1 min", 128, 48);
  }
  const texture = new THREE_REF.CanvasTexture(canvas);
  const sprite = new THREE_REF.Sprite(
    new THREE_REF.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    })
  );
  sprite.scale.set(0.9, 0.34, 1);
  return sprite;
}

function resetFoodPickups(runtime: Runtime) {
  runtime.foodGroups.forEach((group) => {
    group.visible = true;
    group.userData.consumed = false;
  });
  runtime.floatingPickupTexts.forEach((item) => {
    runtime.scene.remove(item.sprite);
    disposeSprite(item.sprite);
  });
  runtime.floatingPickupTexts = [];
}

function updateFoodPickups(
  runtime: Runtime,
  delta: number,
  time: number,
  onFoodCollected: (foodId: FoodId) => void
) {
  runtime.foodGroups.forEach((group, foodId) => {
    if (!group.visible || group.userData.consumed === true) {
      return;
    }
    group.rotation.y += delta * 1.2;
    group.position.y = (group.userData.baseY as number) + Math.sin(time * 2.6 + motionSeed(foodId)) * 0.08;
    const ring = group.userData.ring as THREE.Object3D | undefined;
    if (ring) {
      ring.rotation.z += delta * 1.8;
      ring.scale.setScalar(1 + Math.sin(time * 4 + motionSeed(foodId)) * 0.08);
    }
    const label = group.userData.label as THREE.Sprite | undefined;
    if (label) {
      label.visible = runtime.player.position.distanceTo(group.position) < WORLD_CONFIG.revealDistance * 0.62;
    }
    if (runtime.player.position.distanceTo(group.position) < 1.18) {
      group.userData.consumed = true;
      group.visible = false;
      onFoodCollected(foodId);
    }
  });

  runtime.floatingPickupTexts = runtime.floatingPickupTexts.filter((item) => {
    const elapsed = time - item.bornAt;
    if (elapsed >= item.duration) {
      runtime.scene.remove(item.sprite);
      disposeSprite(item.sprite);
      return false;
    }
    const progress = elapsed / item.duration;
    item.sprite.position.copy(item.base).add(new runtime.THREE.Vector3(0, progress * 0.9, 0));
    const material = item.sprite.material as THREE.SpriteMaterial & { opacity: number };
    material.opacity = Math.max(0, 1 - progress);
    item.sprite.scale.set(1.08 + progress * 0.24, 0.38 + progress * 0.08, 1);
    return true;
  });
}

function showFloatingTimeBonus(runtime: Runtime, label = "+1 min") {
  const sprite = makeFloatingTextSprite(runtime.THREE, label, "#5eead4");
  sprite.position.copy(runtime.player.position).add(new runtime.THREE.Vector3(0, 2.18, 0));
  runtime.scene.add(sprite);
  runtime.floatingPickupTexts.push({
    sprite,
    base: sprite.position.clone(),
    bornAt: performance.now() * 0.001,
    duration: 1.15,
  });
}

function makeFloatingTextSprite(THREE_REF: typeof THREE, text: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "900 42px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "rgba(0, 0, 0, 0.82)";
    context.shadowBlur = 12;
    context.fillStyle = color;
    context.fillText(text, 192, 64);
  }
  const texture = new THREE_REF.CanvasTexture(canvas);
  const sprite = new THREE_REF.Sprite(
    new THREE_REF.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      opacity: 1,
    })
  );
  sprite.scale.set(1.08, 0.38, 1);
  return sprite;
}

function disposeSprite(sprite: THREE.Sprite) {
  const material = sprite.material as THREE.SpriteMaterial;
  material.map?.dispose();
  material.dispose();
}

function updateWeirdoActors(
  runtime: Runtime,
  delta: number,
  time: number,
  callbacks: {
    gameState: GameState;
    dialogue: DialogueState | null;
    humanDialogue: HumanDialogueState | null;
    weirdoDialogue: WeirdoDialogueState | null;
    collectionPopup: CollectionPopupState | null;
    artifact: ArtifactState | null;
  }
) {
  runtime.weirdoGroups.forEach((group, id) => {
    const weirdo = getWeirdo(id);
    const label = runtime.weirdoLabels.get(id);
    const prompt = runtime.weirdoPrompts.get(id);
    const badge = runtime.weirdoFoundBadges.get(id);
    const distance = runtime.player.position.distanceTo(group.position);
    const reachable = canReachInteractionHeight(runtime, group.position);
    const activeDialogue = callbacks.weirdoDialogue?.weirdoId === id;
    const found = group.userData.found === true;

    updateWeirdoBehavior(runtime.THREE, group, weirdo, delta, time, found, activeDialogue, runtime.player.position);
    runtime.weirdoPositions.set(id, group.position.clone());

    if (label) {
      label.visible = distance < WORLD_CONFIG.revealDistance || activeDialogue;
    }
    if (prompt) {
      const active =
        callbacks.gameState === "playing" &&
        distance < WORLD_CONFIG.interactDistance &&
        reachable &&
        !callbacks.dialogue &&
        !callbacks.humanDialogue &&
        !callbacks.weirdoDialogue &&
        !callbacks.collectionPopup &&
        !callbacks.artifact;
      prompt.visible = active;
      prompt.scale.setScalar(0.62 + Math.sin(time * 7 + motionSeed(id)) * 0.035);
    }
    if (badge && found) {
      badge.scale.setScalar(0.66 + Math.sin(time * 5) * 0.045);
    }
  });
}

function updateWeirdoBehavior(
  THREE_REF: typeof THREE,
  group: THREE.Group,
  weirdo: WeirdoData,
  delta: number,
  time: number,
  found: boolean,
  activeDialogue: boolean,
  playerPosition: THREE.Vector3
) {
  const actorRoot = group.userData.actorRoot as THREE.Group | undefined;
  if (!actorRoot) {
    return;
  }

  const distance = group.position.distanceTo(playerPosition);
  const farThrottle = distance > scaleWorldValue(45) && group.userData.lastFarFrame === runtimeFrameBucket(time, 0.2);
  if (farThrottle) {
    return;
  }
  group.userData.lastFarFrame = runtimeFrameBucket(time, distance > scaleWorldValue(25) ? 0.05 : 0.016);

  const embeddedMixer = group.userData.embeddedWeirdoMixer as THREE.AnimationMixer | undefined;
  const embeddedActions = group.userData.embeddedWeirdoActions as Map<string, THREE.AnimationAction> | undefined;
  if (embeddedMixer && embeddedActions?.size) {
    const currentName = group.userData.embeddedWeirdoCurrentAction as string | undefined;
    const currentAction = currentName ? embeddedActions.get(currentName) : undefined;
    if (
      currentName &&
      normalizeEmbeddedActionName(currentName).includes("complete") &&
      currentAction &&
      currentAction.time >= currentAction.getClip().duration - 0.04
    ) {
      group.userData.embeddedWeirdoCompletePlayed = true;
    }

    const completePlayed = group.userData.embeddedWeirdoCompletePlayed === true;
    const isFloorCrawler = weirdo.specialAnimation === "floor_crawl";
    const desiredClips = isFloorCrawler
      ? [nextFloorCrawlerCycleClip(group, embeddedActions), "floor_crawl"]
      : activeDialogue
        ? ["Talk", weirdo.specialAnimation]
        : found
          ? completePlayed
            ? ["Idle", weirdo.specialAnimation]
            : ["Complete", weirdo.specialAnimation]
          : [weirdo.specialAnimation];
    const playedClip = playEmbeddedWeirdoAction(
      THREE_REF,
      group,
      desiredClips,
      isFloorCrawler
        ? { fade: 0.16, loopOnce: true, clampWhenFinished: false }
        : 0.16
    );
    if (playedClip) {
      embeddedMixer.update(delta);
      if (weirdo.id !== "weirdo_5" && weirdo.id !== "weirdo_7") {
        clampEmbeddedWeirdoRuntimeScale(THREE_REF, group, actorRoot);
      }
      if (normalizeEmbeddedActionName(playedClip).includes("complete")) {
        const completeAction = embeddedActions.get(playedClip);
        if (completeAction && completeAction.time >= completeAction.getClip().duration - 0.04) {
          group.userData.embeddedWeirdoCompletePlayed = true;
        }
      }
      applyEmbeddedWeirdoVisualPose(THREE_REF, group, actorRoot, weirdo, time, found, isFloorCrawler);
      if (activeDialogue) {
        faceTowards(group, playerPosition, Math.min(1, delta * 4.2));
      } else if (weirdo.specialAnimation === "gravity_spin") {
        group.rotation.y += delta * (found ? 1.8 : 3.8);
      }
      const climbTree = group.userData.climbTree as THREE.Group | undefined;
      climbTree?.children.forEach((child, index) => {
        if (index > 8) {
          child.scale.setScalar(1 + Math.sin(time * 2.5 + index) * 0.025);
        }
      });
      return;
    }
  }

  const nodes = group.userData.weirdoNodes as WeirdoNodeMap | undefined;
  const restPose = group.userData.weirdoRestPose as Partial<Record<WeirdoNodeName, WeirdoNodeState>> | undefined;
  if (!nodes || !restPose) {
    return;
  }

  restoreWeirdoNodePose(nodes, restPose);
  actorRoot.position.set(0, 0, 0);
  actorRoot.rotation.set(0, 0, 0);

  const seed = motionSeed(weirdo.id);
  const speed = activeDialogue ? 0.25 : found ? 0.42 : 1;
  const t = time * speed + seed;
  const pulse = Math.sin(t * Math.PI * 2);
  const bounce = Math.abs(Math.sin(t * 4.8));
  const foundBounce = found ? Math.abs(Math.sin(time * 5 + seed)) * 0.08 : 0;
  actorRoot.position.y = foundBounce;

  if (activeDialogue) {
    faceTowards(group, playerPosition, Math.min(1, delta * 4.2));
  }

  if (weirdo.specialAnimation === "air_shot") {
    const phase = (t * 0.86) % 2.8;
    const crossover = Math.sin(t * 14);
    nodes.Arm_L?.rotation.set(-0.35 + crossover * 0.38, 0.08, -0.45 + crossover * 0.28);
    nodes.Arm_R?.rotation.set(-0.35 - crossover * 0.38, -0.08, 0.45 + crossover * 0.28);
    nodes.Leg_L?.rotation.set(Math.sin(t * 6.4) * 0.24, 0, -0.08);
    nodes.Leg_R?.rotation.set(-Math.sin(t * 6.4) * 0.24, 0, 0.08);
    nodes.RootBody?.position.add(new THREE_REF.Vector3(0, 0, Math.sin(t * 5.2) * 0.025));
    if (phase > 1.15 && phase <= 1.72) {
      nodes.RootBody?.position.add(new THREE_REF.Vector3(0, -0.08, -0.18));
      nodes.Arm_L?.rotation.set(-0.78, 0.08, -0.92);
      nodes.Arm_R?.rotation.set(-0.78, -0.08, 0.92);
    } else if (phase > 1.72) {
      const shotLift = Math.min(1, (phase - 1.72) / 0.32);
      actorRoot.position.y += Math.sin(Math.min(Math.PI, shotLift * Math.PI)) * 0.22;
      nodes.Arm_L?.rotation.set(-1.95, 0.12, -1.72);
      nodes.Arm_R?.rotation.set(-1.95, -0.12, 1.72);
      nodes.RootBody?.rotation.set(-0.08, 0, 0);
      nodes.Head?.rotation.set(-0.08, 0, 0);
    }
    const ball = nodes.Basketball;
    if (ball && restPose.Basketball) {
      ball.position.copy(restPose.Basketball.position).add(new THREE_REF.Vector3(crossover * 0.38, phase > 1.72 ? 0.62 : Math.abs(crossover) * 0.14, phase > 1.72 ? 0.12 : 0));
      ball.rotation.y += t * 8;
    }
    return;
  }

  if (weirdo.specialAnimation === "jumping_jack") {
    const open = Math.max(0, Math.sin(t * 12));
    actorRoot.position.y = foundBounce + open * 0.22;
    nodes.Arm_L?.rotation.set(0, 0, -0.36 - open * 2.0);
    nodes.Arm_R?.rotation.set(0, 0, 0.36 + open * 2.0);
    nodes.Leg_L?.rotation.set(0, 0, open * 0.58);
    nodes.Leg_R?.rotation.set(0, 0, -open * 0.58);
    nodes.Shoe_L?.position.add(new THREE_REF.Vector3(-open * 0.08, 0, 0));
    nodes.Shoe_R?.position.add(new THREE_REF.Vector3(open * 0.08, 0, 0));
    nodes.Head?.position.add(new THREE_REF.Vector3(0, open * 0.025, 0));
    nodes.RootBody?.rotation.set(0, 0, Math.sin(t * 20) * 0.025);
    return;
  }

  if (weirdo.specialAnimation === "floor_crawl") {
    actorRoot.rotation.x = Math.PI / 2;
    actorRoot.position.y = 0.36 + foundBounce * 0.2;
    nodes.RootBody?.rotation.set(Math.sin(t * 4) * 0.04, 0, 0);
    nodes.Head?.rotation.set(-0.28 + Math.sin(t * 3) * 0.1, 0, 0);
    nodes.Arm_L?.rotation.set(-0.85 + Math.sin(t * 9) * 0.48, 0, -0.12);
    nodes.Arm_R?.rotation.set(-0.85 - Math.sin(t * 9) * 0.48, 0, 0.12);
    nodes.Leg_L?.rotation.set(Math.sin(t * 9 + Math.PI) * 0.42, 0, -0.08);
    nodes.Leg_R?.rotation.set(Math.sin(t * 9) * 0.42, 0, 0.08);
    return;
  }

  if (weirdo.specialAnimation === "butt_walk") {
    actorRoot.position.y = 0.12 + Math.abs(Math.sin(t * 7)) * 0.08 + foundBounce * 0.2;
    actorRoot.rotation.x = -0.22;
    nodes.RootBody?.rotation.set(-0.18, 0, Math.sin(t * 7) * 0.16);
    nodes.Leg_L?.rotation.set(-1.18 + Math.sin(t * 9) * 0.34, 0, -0.2);
    nodes.Leg_R?.rotation.set(-1.18 - Math.sin(t * 9) * 0.34, 0, 0.2);
    nodes.Arm_L?.rotation.set(-0.12, 0, -0.42 + Math.sin(t * 6) * 0.2);
    nodes.Arm_R?.rotation.set(-0.12, 0, 0.42 - Math.sin(t * 6) * 0.2);
    return;
  }

  if (weirdo.specialAnimation === "gravity_spin") {
    if (!activeDialogue) {
      group.rotation.y += delta * (found ? 2.2 : 5.7);
    }
    actorRoot.position.y = foundBounce + Math.abs(Math.sin(t * 4)) * 0.08;
    nodes.Arm_L?.rotation.set(-0.45, 0, -2.12 + Math.sin(t * 2) * 0.08);
    nodes.Arm_R?.rotation.set(-0.45, 0, 2.12 - Math.sin(t * 2) * 0.08);
    nodes.Leg_L?.rotation.set(0.18 + Math.sin(t * 7) * 0.08, 0, -0.12);
    nodes.Leg_R?.rotation.set(-0.26, 0, 0.12);
    nodes.Head?.rotation.set(0, Math.sin(t * 9) * 0.18, 0);
    return;
  }

  if (weirdo.specialAnimation === "handstand_walk") {
    actorRoot.rotation.z = Math.PI;
    actorRoot.position.y = 1.58 + foundBounce * 0.25;
    nodes.Arm_L?.rotation.set(0.45 + Math.sin(t * 10) * 0.35, 0, -0.08);
    nodes.Arm_R?.rotation.set(-0.45 - Math.sin(t * 10) * 0.35, 0, 0.08);
    nodes.Leg_L?.rotation.set(Math.sin(t * 5) * 0.42, 0, 0.34);
    nodes.Leg_R?.rotation.set(-Math.sin(t * 5) * 0.42, 0, -0.34);
    nodes.Head?.rotation.set(0.16, Math.sin(t * 4) * 0.16, 0);
    return;
  }

  if (weirdo.specialAnimation === "tree_hug_climb") {
    actorRoot.position.set(-0.2, 0.45 + Math.abs(Math.sin(t * 1.8)) * 0.36 + foundBounce * 0.2, 0.04);
    actorRoot.rotation.z = -0.52 + Math.sin(t * 2.8) * 0.06;
    nodes.Arm_L?.rotation.set(-0.12, 0, -1.55 + Math.sin(t * 5) * 0.12);
    nodes.Arm_R?.rotation.set(-0.12, 0, 1.55 - Math.sin(t * 5) * 0.12);
    nodes.Leg_L?.rotation.set(0.1, 0, -0.62);
    nodes.Leg_R?.rotation.set(0.1, 0, 0.62);
    const climbTree = group.userData.climbTree as THREE.Group | undefined;
    climbTree?.children.forEach((child, index) => {
      if (index > 8) {
        child.scale.setScalar(1 + Math.sin(time * 2.5 + index) * 0.025);
      }
    });
    return;
  }

  if (weirdo.specialAnimation === "umbrella_receiver") {
    actorRoot.position.y = foundBounce + Math.abs(Math.sin(t * 7)) * 0.045;
    nodes.Arm_L?.rotation.set(-0.2, 0, -1.08 + Math.sin(t * 4) * 0.14);
    nodes.Arm_R?.rotation.set(-0.78, 0, 1.2 - Math.sin(t * 4) * 0.14);
    nodes.Leg_L?.rotation.set(Math.sin(t * 9) * 0.26, 0, 0);
    nodes.Leg_R?.rotation.set(-Math.sin(t * 9) * 0.26, 0, 0);
    nodes.Head?.rotation.set(Math.sin(t * 3) * 0.08, Math.sin(t * 2) * 0.2, 0);
    const canopy = nodes.UmbrellaCanopy;
    if (canopy) {
      canopy.rotation.y += delta * 7.5;
    }
    const signalRing = nodes.SignalRing;
    if (signalRing) {
      signalRing.rotation.y -= delta * 11;
    }
    nodes.ReceiverPack?.scale.setScalar(1 + Math.max(0, Math.sin(t * 12)) * 0.08);
  }
}

function runtimeFrameBucket(time: number, interval: number) {
  return Math.floor(time / interval);
}

function updateSkyCycle(runtime: Runtime, time: number, delta: number) {
  const dayAmount = (Math.sin(time * 0.035 - 0.8) + 1) / 2;
  const bg = new runtime.THREE.Color("#071124").lerp(new runtime.THREE.Color("#54a7ff"), dayAmount);
  const fog = new runtime.THREE.Color("#0d1632").lerp(new runtime.THREE.Color("#8ed7ff"), dayAmount);
  runtime.scene.background = bg;
  runtime.scene.fog = new runtime.THREE.FogExp2(fog, 0.022 + (1 - dayAmount) * 0.006);
  runtime.hemiLight.intensity = 1.35 + dayAmount * 1.15;
  runtime.hemiLight.color.set(dayAmount > 0.48 ? "#eef7ff" : "#dbeafe");
  runtime.hemiLight.groundColor.set(dayAmount > 0.48 ? "#6b8fb5" : "#130f1f");
  runtime.sunLight.intensity = 1.7 + dayAmount * 1.6;
  runtime.sunLight.color.set(dayAmount > 0.48 ? "#fff7db" : "#dbeafe");
  runtime.sunLight.position.set(Math.cos(time * 0.035) * 18, 10 + dayAmount * 10, Math.sin(time * 0.035) * 18);
  const starMaterial = runtime.stars.material as THREE.PointsMaterial;
  starMaterial.opacity = Math.max(0.08, 0.78 * (1 - dayAmount));
  const particleMaterial = runtime.particles.material as THREE.PointsMaterial;
  particleMaterial.opacity = 0.12 + (1 - dayAmount) * 0.3;
  runtime.skyWorlds.rotation.y += delta * 0.006;
  runtime.skyWorlds.traverse((child) => {
    if (child.name === "voxel-cloud") {
      const cloud = child as THREE.Group;
      const baseY = typeof cloud.userData.baseY === "number" ? cloud.userData.baseY : cloud.position.y;
      const drift = typeof cloud.userData.drift === "number" ? cloud.userData.drift : 0;
      cloud.position.y = baseY + Math.sin(time * 0.45 + drift) * 0.18;
      cloud.rotation.y += delta * 0.012;
      cloud.children.forEach((cube) => {
        const mesh = cube as THREE.Mesh;
        const material = mesh.material as THREE.Material & { opacity?: number };
        if (typeof material.opacity === "number") {
          material.opacity = 0.16 + dayAmount * 0.62;
        }
      });
    } else if (child.type === "Group" && child.userData.floatOffset !== undefined) {
      const baseY = typeof child.userData.baseY === "number" ? child.userData.baseY : child.position.y;
      child.position.y = baseY + Math.sin(time * 0.42 + Number(child.userData.floatOffset)) * 0.18;
    }
  });
}

function autoTuneMobileQuality(
  runtime: Runtime,
  delta: number,
  currentQuality: Quality,
  setQuality: (quality: Quality) => void
) {
  if (typeof window === "undefined" || currentQuality === "low") {
    return;
  }
  const isMobile = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  if (!isMobile) {
    runtime.autoQualitySlowFrames = 0;
    return;
  }
  runtime.autoQualitySlowFrames =
    delta > 0.045
      ? runtime.autoQualitySlowFrames + 1
      : Math.max(0, runtime.autoQualitySlowFrames - 2);
  const now = performance.now();
  if (runtime.autoQualitySlowFrames < 72 || now - runtime.lastAutoQualityAt < 3500) {
    return;
  }
  runtime.autoQualitySlowFrames = 0;
  runtime.lastAutoQualityAt = now;
  setQuality(currentQuality === "high" ? "medium" : "low");
}

function updateRuntime(
  runtime: Runtime,
  delta: number,
  callbacks: {
    phase: Phase;
    gameState: GameState;
    dialogue: DialogueState | null;
    humanDialogue: HumanDialogueState | null;
    weirdoDialogue: WeirdoDialogueState | null;
    collectionPopup: CollectionPopupState | null;
    artifact: ArtifactState | null;
    onRegion: (region: string) => void;
    onMiniMap: (state: { x: number; z: number; angle: number }) => void;
    onNearestNpc: (id: ArchetypeId | null) => void;
    onNearestTarget: (target: InteractionTarget | null) => void;
    onOpenDialogue: (id: ArchetypeId) => void;
    onOpenHumanDialogue: (id: HumanId) => void;
    onOpenWeirdoDialogue: (id: WeirdoId) => void;
    onOpenArtifact: (id: AquariusObjectId) => void;
    onTutorialMove: () => void;
    onFootstep: () => void;
    onFoodCollected: (foodId: FoodId) => void;
  }
) {
  const { THREE: THREE_REF, player, controls } = runtime;
  const time = performance.now() * 0.001;
  updateSkyCycle(runtime, time, delta);
  runtime.particles.rotation.y += delta * 0.018;
  runtime.actorMixers.forEach((mixer) => mixer.update(delta));
  updateAmbientModels(runtime, delta, time);
  updateWeirdoActors(runtime, delta, time, callbacks);
  updateFoodPickups(runtime, delta, time, callbacks.onFoodCollected);

  runtime.npcGroups.forEach((group, id) => {
    const label = runtime.npcLabels.get(id);
    const prompt = runtime.npcPrompts.get(id);
    const distance = player.position.distanceTo(group.position);
    const animator = runtime.npcAnimators.get(id);
    const motion = runtime.npcMotion.get(id);
    const inDialogue = callbacks.dialogue?.npcId === id;
    if (inDialogue || distance < 2.6) {
      playActorAction(animator, inDialogue ? "talk" : getNpcIdleAction(id));
      faceTowards(group, player.position, Math.min(1, delta * 5));
    } else if (motion) {
      updateWanderActor(runtime, group, motion, animator, delta, time);
    }
    const baseY = typeof group.userData.baseY === "number" ? group.userData.baseY : 0;
    group.position.y = baseY + Math.max(0, Math.sin(time * 1.8 + motionSeed(id)) * 0.035);
    runtime.npcPositions.set(id, group.position.clone());
    if (label) {
      label.visible = distance < WORLD_CONFIG.revealDistance || callbacks.dialogue?.npcId === id;
    }
    if (prompt) {
      const active =
        callbacks.gameState === "playing" &&
        distance < WORLD_CONFIG.interactDistance &&
        !callbacks.dialogue &&
        !callbacks.collectionPopup &&
        !callbacks.weirdoDialogue;
      prompt.visible = active;
      prompt.scale.setScalar(0.62 + Math.sin(time * 7) * 0.035);
    }
  });

  runtime.humanGroups.forEach((group, id) => {
    const label = runtime.humanLabels.get(id);
    const prompt = runtime.humanPrompts.get(id);
    const distance = player.position.distanceTo(group.position);
    const animator = runtime.humanAnimators.get(id);
    const motion = runtime.humanMotion.get(id);
    const inDialogue = callbacks.humanDialogue?.humanId === id;
    if (inDialogue || distance < 2.35) {
      playActorAction(animator, inDialogue ? "talk" : motion?.idleAction ?? "idle");
      faceTowards(group, player.position, Math.min(1, delta * 4.5));
    } else if (motion) {
      updateWanderActor(runtime, group, motion, animator, delta, time);
    }
    const baseY = typeof group.userData.baseY === "number" ? group.userData.baseY : 0;
    group.position.y = baseY + Math.max(0, Math.sin(time * 1.35 + motionSeed(id)) * 0.026);
    runtime.humanPositions.set(id, group.position.clone());
    if (label) {
      label.visible = distance < WORLD_CONFIG.revealDistance || callbacks.humanDialogue?.humanId === id;
    }
    if (prompt) {
      const active =
        callbacks.gameState === "playing" &&
        distance < WORLD_CONFIG.interactDistance &&
        !callbacks.humanDialogue &&
        !callbacks.collectionPopup &&
        !callbacks.weirdoDialogue;
      prompt.visible = active;
      prompt.scale.setScalar(0.58 + Math.sin(time * 7 + 0.7) * 0.032);
    }
  });

  runtime.objectGroups.forEach((group, id) => {
    const item = getAquariusObject(id);
    const label = runtime.objectLabels.get(id);
    const prompt = runtime.objectPrompts.get(id);
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
    const bubbles = group.userData.bubbles as THREE.Object3D[] | undefined;
    bubbles?.forEach((bubble, index) => {
      bubble.position.y += Math.sin(time * 2.1 + index) * 0.0025;
      bubble.rotation.y += delta * 0.7;
    });
    const paperRay = group.userData.paperRay as THREE.Object3D | undefined;
    if (paperRay) {
      paperRay.rotation.z = 0.05 + Math.sin(time * 2.2) * 0.14;
    }
    if (label) {
      label.visible = distance < WORLD_CONFIG.revealDistance || callbacks.artifact?.objectId === id;
    }
    if (prompt) {
      const active =
        callbacks.gameState === "playing" &&
        distance < WORLD_CONFIG.interactDistance &&
        !callbacks.artifact &&
        !callbacks.collectionPopup &&
        !callbacks.weirdoDialogue;
      prompt.visible = active;
      prompt.scale.setScalar(0.56 + Math.sin(time * 7 + 1.2) * 0.03);
    }
  });

  if (
    callbacks.phase === "playing" &&
    callbacks.gameState === "playing" &&
    !callbacks.dialogue &&
    !callbacks.humanDialogue &&
    !callbacks.weirdoDialogue &&
    !callbacks.collectionPopup &&
    !callbacks.artifact
  ) {
    updatePlayerMovement(runtime, delta, callbacks.onTutorialMove, callbacks.onFootstep);
  } else {
    runtime.velocity.lerp(new THREE_REF.Vector3(0, 0, 0), Math.min(1, delta * 8));
    updateJump(runtime, delta);
  }

  const region = getRegionName(player.position.x, player.position.z);
  if (runtime.frame % 12 === 0) {
    callbacks.onRegion(region);
  }
  if (runtime.frame % 4 === 0) {
    callbacks.onMiniMap({
      x: player.position.x,
      z: player.position.z,
      angle: runtime.playerModel.rotation.y - getPlayerFacingOffset(runtime.playerModel),
    });
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

  if (
    runtime.pendingHumanId &&
    nearestTarget?.kind === "human" &&
    nearestTarget.id === runtime.pendingHumanId &&
    nearestTarget.distance < WORLD_CONFIG.interactDistance
  ) {
    callbacks.onOpenHumanDialogue(runtime.pendingHumanId);
  }

  if (
    runtime.pendingWeirdoId &&
    nearestTarget?.kind === "weirdo" &&
    nearestTarget.id === runtime.pendingWeirdoId &&
    nearestTarget.distance < WORLD_CONFIG.interactDistance
  ) {
    callbacks.onOpenWeirdoDialogue(runtime.pendingWeirdoId);
  }

  if (callbacks.dialogue) {
    focusDialogueCamera(runtime, callbacks.dialogue.npcId, delta);
  } else if (callbacks.humanDialogue) {
    focusHumanCamera(runtime, callbacks.humanDialogue.humanId, delta);
  } else if (callbacks.weirdoDialogue) {
    focusWeirdoCamera(runtime, callbacks.weirdoDialogue.weirdoId, delta);
  } else if (callbacks.artifact) {
    focusArtifactCamera(runtime, callbacks.artifact.objectId, delta);
  } else {
    followPlayerCamera(runtime, delta);
  }

  controls.update();
}

function motionSeed(id: string) {
  let seed = 0;
  for (let index = 0; index < id.length; index += 1) {
    seed += id.charCodeAt(index) * (index + 1);
  }
  return seed * 0.013;
}

function updateWanderActor(
  runtime: Runtime,
  group: THREE.Group,
  motion: WanderState,
  animator: ActorAnimator | undefined,
  delta: number,
  time: number
) {
  if (time < motion.pauseUntil) {
    playActorAction(animator, motion.idleAction);
    group.rotation.y += Math.sin(time * 1.8 + motion.home.x) * delta * 0.18;
    return;
  }

  const targetOffset = motion.target.clone().sub(group.position).setY(0);
  const distance = targetOffset.length();
  if (distance < 0.18) {
    motion.pauseUntil = time + 1.2 + Math.random() * 1.6;
    motion.target = pickWalkableWanderTarget(runtime, motion.home, motion.radius);
    if (time > motion.nextGestureAt) {
      motion.nextGestureAt = time + 4 + Math.random() * 4;
      playActorAction(animator, motion.idleAction, 0.16);
    }
    return;
  }

  const direction = targetOffset.normalize();
  const step = Math.min(distance, motion.speed * delta);
  const nextPosition = group.position.clone().addScaledVector(direction, step);
  if (!isOnWalkableSurface(runtime, nextPosition.x, nextPosition.z) || actorCollides(runtime, nextPosition.x, nextPosition.z)) {
    motion.target = pickWalkableWanderTarget(runtime, motion.home, motion.radius);
    motion.pauseUntil = time + 0.25 + Math.random() * 0.45;
    playActorAction(animator, motion.idleAction);
    return;
  }
  group.position.copy(nextPosition);
  const angle = Math.atan2(direction.x, direction.z) + MODEL_FORWARD_OFFSET;
  group.rotation.y = lerpAngle(group.rotation.y, angle, Math.min(1, delta * 5.5));
  playActorAction(animator, motion.speed > 0.62 ? "run" : "walk");
}

function updateAmbientModels(runtime: Runtime, delta: number, time: number) {
  runtime.ambientModels.forEach((ambient) => {
    const fins = ambient.group.userData.fins as THREE.Object3D[] | undefined;
    fins?.forEach((fin, index) => {
      fin.rotation.z = (index === 0 ? 0.45 : -0.45) + Math.sin(time * 2.8) * (index === 0 ? 0.26 : -0.26);
    });
    const tail = ambient.group.userData.tail as THREE.Object3D | undefined;
    if (tail) {
      tail.rotation.y = Math.sin(time * 3.1) * 0.34;
    }

    if (ambient.mode === "spin") {
      playActorAction(ambient.animator, "idle");
      ambient.group.rotation.y += delta * ambient.speed;
      ambient.group.position.y =
        ambient.home.y + Math.sin(time * 1.7 + ambient.home.x) * 0.08;
      return;
    }

    if (ambient.mode === "float") {
      playActorAction(ambient.animator, "idle");
      ambient.group.position.y =
        ambient.home.y + Math.sin(time * (1.3 + ambient.speed) + ambient.home.z) * 0.12;
      ambient.group.rotation.y += delta * ambient.speed * 0.35;
      return;
    }

    if (ambient.mode === "idle") {
      playActorAction(ambient.animator, "idle");
      ambient.group.position.y =
        ambient.home.y + Math.sin(time * 1.1 + ambient.home.x) * 0.025;
      ambient.group.rotation.y += Math.sin(time + ambient.home.z) * delta * 0.08;
      return;
    }

    if (time < ambient.pauseUntil) {
      playActorAction(ambient.animator, "idle");
      ambient.group.position.y =
        ambient.home.y + Math.sin(time * 2 + ambient.home.x) * 0.02;
      return;
    }

    const targetOffset = ambient.target.clone().sub(ambient.group.position).setY(0);
    const distance = targetOffset.length();
    if (distance < 0.16) {
      ambient.pauseUntil = time + 0.9 + Math.random() * 1.5;
      ambient.target = pickWanderTarget(runtime.THREE, ambient.home, ambient.radius);
      return;
    }

    const direction = targetOffset.normalize();
    playActorAction(ambient.animator, ambient.motionAction);
    ambient.group.position.addScaledVector(direction, Math.min(distance, ambient.speed * delta));
    ambient.group.rotation.y = lerpAngle(
      ambient.group.rotation.y,
      Math.atan2(direction.x, direction.z) + MODEL_FORWARD_OFFSET,
      Math.min(1, delta * 4)
    );
    ambient.group.position.y = ambient.home.y + Math.sin(time * 6 + ambient.home.x) * 0.025;
  });
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
  if (performance.now() < runtime.inputPausedUntil || runtime.cameraReturnToDefault) {
    runtime.keys.clear();
    runtime.joystick = { x: 0, y: 0 };
    runtime.clickTarget = null;
    runtime.pendingNpcId = null;
    runtime.pendingHumanId = null;
    runtime.pendingObjectId = null;
    runtime.pendingWeirdoId = null;
  }
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
    runtime.pendingHumanId = null;
    runtime.pendingObjectId = null;
    runtime.pendingWeirdoId = null;
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

  if (!collides(runtime, next.x, next.z) && canMoveToSupport(runtime, next.x, next.z)) {
    player.position.copy(next);
  } else {
    const tryX = player.position.clone();
    tryX.x = next.x;
    const tryZ = player.position.clone();
    tryZ.z = next.z;
    if (!collides(runtime, tryX.x, tryX.z) && canMoveToSupport(runtime, tryX.x, tryX.z)) {
      player.position.copy(tryX);
    } else if (!collides(runtime, tryZ.x, tryZ.z) && canMoveToSupport(runtime, tryZ.x, tryZ.z)) {
      player.position.copy(tryZ);
    } else {
      runtime.velocity.multiplyScalar(0.2);
    }
  }

  const supportHeight = getPlayerSupportHeight(runtime);
  if (runtime.grounded) {
    if (player.position.y > supportHeight + 0.05) {
      runtime.grounded = false;
      runtime.jumpVelocity = 0;
    } else {
      player.position.y = supportHeight;
      if (isOnWalkableSurface(runtime, player.position.x, player.position.z)) {
        player.userData.lastSafeWalkable = player.position.clone();
      }
    }
  }

  const moving = runtime.velocity.length() > 0.12;
  const playerFloorY = getModelFloorY(runtime.playerModel);
  const clipDrivenPlayer = isClipDrivenPlayerModel(runtime);
  if (moving) {
    onTutorialMove();
    const angle = Math.atan2(runtime.velocity.x, runtime.velocity.z);
    runtime.playerModel.rotation.y = angle + getPlayerFacingOffset(runtime.playerModel);
    const running = speed > WORLD_CONFIG.moveSpeed;
    const now = performance.now();
    const actorAnimationLocked = Boolean(runtime.playerAnimator?.lockedUntil && now < runtime.playerAnimator.lockedUntil);
    if (!actorAnimationLocked) {
      resetAuthorIdleCycle(runtime.playerAnimator);
      if (!clipDrivenPlayer) {
        applyPlayerWalkCycle(runtime.playerModel, true, running);
      }
      playActorAction(runtime.playerAnimator, running ? "run" : "walk");
    }
    const bob = Math.sin(performance.now() * 0.016 * (running ? 1.4 : 1)) * 0.018;
    runtime.playerModel.position.y = clipDrivenPlayer
      ? playerFloorY
      : playerFloorY + Math.max(-0.006, bob);
    if (now - runtime.lastStepAt > (speed > WORLD_CONFIG.moveSpeed ? 260 : 390)) {
      runtime.lastStepAt = now;
      onFootstep();
    }
  } else {
    if (runtime.grounded) {
      if (!updateAuthorIdleCycle(runtime.playerAnimator)) {
        playActorAction(runtime.playerAnimator, "idle");
      }
    }
    if (!clipDrivenPlayer) {
      applyPlayerWalkCycle(runtime.playerModel, false, false);
    }
    runtime.playerModel.position.y = clipDrivenPlayer
      ? playerFloorY
      : playerFloorY + Math.sin(performance.now() * 0.0025) * 0.008;
  }

  updateJump(runtime, delta);
}

function updateJump(runtime: Runtime, delta: number) {
  if (!runtime.grounded || runtime.player.position.y > 0) {
    if (runtime.playerAnimator?.current !== "jump") {
      playActorAction(runtime.playerAnimator, "jump", 0.08);
    }
    runtime.jumpVelocity -= WORLD_CONFIG.gravity * delta;
    runtime.player.position.y += runtime.jumpVelocity * delta;
    const supportHeight = getPlayerSupportHeight(runtime);
    if (runtime.player.position.y <= supportHeight) {
      runtime.player.position.y = supportHeight;
      runtime.jumpVelocity = 0;
      runtime.grounded = true;
      if (!isOnWalkableSurface(runtime, runtime.player.position.x, runtime.player.position.z)) {
        const safePosition = runtime.player.userData.lastSafeWalkable as THREE.Vector3 | undefined;
        if (safePosition) {
          runtime.player.position.copy(safePosition);
          runtime.player.position.y = getPlayerSupportHeight(runtime, safePosition.x, safePosition.z);
        }
      } else if (isInsidePlayableWorld(runtime.player.position.x, runtime.player.position.z)) {
        runtime.player.userData.lastSafeWalkable = runtime.player.position.clone();
      }
      playActorAction(
        runtime.playerAnimator,
        runtime.velocity.length() > 0.12 ? "walk" : "idle",
        0.12
      );
    }
  }
}

function getPlayerSupportHeight(runtime: Runtime, x = runtime.player.position.x, z = runtime.player.position.z) {
  let support = 0;
  for (const platform of runtime.jumpPlatforms) {
    if (
      Math.abs(x - platform.x) <= platform.width / 2 + 0.32 &&
      Math.abs(z - platform.z) <= platform.depth / 2 + 0.32
    ) {
      support = Math.max(support, platform.height);
    }
  }
  return support;
}

function canMoveToSupport(runtime: Runtime, x: number, z: number) {
  if (!runtime.grounded) {
    const nextSupport = getPlayerSupportHeight(runtime, x, z);
    return nextSupport <= runtime.player.position.y + 0.3;
  }
  if (!isOnWalkableSurface(runtime, x, z)) {
    return false;
  }
  const nextSupport = getPlayerSupportHeight(runtime, x, z);
  const currentSupport = getPlayerSupportHeight(runtime);
  return nextSupport <= currentSupport + 0.38;
}

function isInsidePlayableWorld(x: number, z: number) {
  return Math.hypot(x, z) <= WORLD_CONFIG.worldRadius - 0.35;
}

function isOnWalkableSurface(runtime: Runtime, x: number, z: number) {
  if (getPlayerSupportHeight(runtime, x, z) > 0.05) {
    return true;
  }
  if (isOnScaledBridgeSurface(x, z)) {
    return true;
  }
  if (isInsideScaledCanal(x, z)) {
    return false;
  }
  if (isInsideScaledGrassPatch(x, z)) {
    return true;
  }
  for (const platform of CITY_PLATFORMS) {
    const centerX = scaleWorldValue(platform.position[0]);
    const centerZ = scaleWorldValue(platform.position[1]);
    const width = scaleWorldValue(platform.size[0]);
    const depth = scaleWorldValue(platform.size[1]);
    if (
      Math.abs(x - centerX) <= width / 2 + 0.34 &&
      Math.abs(z - centerZ) <= depth / 2 + 0.34
    ) {
      return true;
    }
  }
  for (const road of CITY_ROADS) {
    if (pointNearScaledSegment(x, z, road.from, road.to, road.width + 0.86)) {
      return true;
    }
  }
  return isInsidePlayableWorld(x, z);
}

function isOnScaledBridgeSurface(x: number, z: number) {
  return CITY_BRIDGES.some((bridge) =>
    pointNearScaledSegment(x, z, bridge.from, bridge.to, bridge.width + 0.72)
  );
}

function isInsideScaledCanal(x: number, z: number) {
  return CITY_CANALS.some((canal) =>
    pointNearScaledSegment(x, z, canal.from, canal.to, canal.width + 0.32)
  );
}

function isInsideScaledGrassPatch(x: number, z: number) {
  return EXTRA_GRASS_PATCHES.some((patch) => {
    const dx = (x - scaleWorldValue(patch.x)) / Math.max(scaleWorldValue(patch.rx), 0.001);
    const dz = (z - scaleWorldValue(patch.z)) / Math.max(scaleWorldValue(patch.rz), 0.001);
    return dx * dx + dz * dz <= 1.08;
  });
}

function pointNearScaledSegment(
  x: number,
  z: number,
  from: [number, number],
  to: [number, number],
  width: number
) {
  const start = scaleWorldPoint(from[0], from[1]);
  const end = scaleWorldPoint(to[0], to[1]);
  const segmentX = end[0] - start[0];
  const segmentZ = end[1] - start[1];
  const lengthSq = segmentX * segmentX + segmentZ * segmentZ;
  if (lengthSq < 0.0001) {
    return Math.hypot(x - start[0], z - start[1]) <= scaleWorldValue(width) / 2;
  }
  const t = Math.max(0, Math.min(1, ((x - start[0]) * segmentX + (z - start[1]) * segmentZ) / lengthSq));
  const nearestX = start[0] + segmentX * t;
  const nearestZ = start[1] + segmentZ * t;
  return Math.hypot(x - nearestX, z - nearestZ) <= scaleWorldValue(width) / 2;
}

function collides(runtime: Runtime, x: number, z: number) {
  const supportHeight = getPlayerSupportHeight(runtime, x, z);
  if (supportHeight > 0.1 || runtime.player.position.y > 0.1) {
    return false;
  }
  for (const obstacle of runtime.obstacles) {
    if (Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.radius + 0.42) {
      return true;
    }
  }
  return false;
}

function actorCollides(runtime: Runtime, x: number, z: number) {
  for (const obstacle of runtime.obstacles) {
    if (Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.radius + 0.32) {
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
    if (!canReachInteractionHeight(runtime, position)) {
      return;
    }
    const distance = runtime.player.position.distanceTo(position);
    if (!nearest || distance < nearest.distance) {
      nearest = { kind: "npc", id, distance };
    }
  });
  runtime.humanPositions.forEach((position, id) => {
    if (!canReachInteractionHeight(runtime, position)) {
      return;
    }
    const distance = runtime.player.position.distanceTo(position);
    if (!nearest || distance < nearest.distance) {
      nearest = { kind: "human", id, distance };
    }
  });
  runtime.objectPositions.forEach((position, id) => {
    if (!canReachInteractionHeight(runtime, position)) {
      return;
    }
    const distance = runtime.player.position.distanceTo(position);
    if (!nearest || distance < nearest.distance) {
      nearest = { kind: "object", id, distance };
    }
  });
  runtime.weirdoPositions.forEach((position, id) => {
    if (!canReachInteractionHeight(runtime, position)) {
      return;
    }
    const distance = runtime.player.position.distanceTo(position);
    if (!nearest || distance < nearest.distance) {
      nearest = { kind: "weirdo", id, distance };
    }
  });
  return nearest;
}

function canReachInteractionHeight(runtime: Runtime, position: THREE.Vector3) {
  return position.y < 0.75 || runtime.player.position.y > 0.32;
}

function followPlayerCamera(runtime: Runtime, delta: number) {
  if (runtime.cameraReturnToDefault) {
    setDefaultCameraView(runtime);
    runtime.controls.enableRotate = true;
    return;
  }
  const desiredTarget = runtime.player.position.clone().add(new runtime.THREE.Vector3(0, 0.92, 0));
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

function focusHumanCamera(runtime: Runtime, humanId: HumanId, delta: number) {
  const humanPosition = runtime.humanPositions.get(humanId);
  if (!humanPosition) {
    return;
  }
  const midpoint = runtime.player.position.clone().lerp(humanPosition, 0.5);
  midpoint.y = 1.18;
  const direction = runtime.player.position.clone().sub(humanPosition).setY(0).normalize();
  const side = new runtime.THREE.Vector3(-direction.z, 0, direction.x);
  const desiredPosition = midpoint.clone().add(side.multiplyScalar(2.6)).add(new runtime.THREE.Vector3(0, 1.9, 2.6));
  runtime.camera.position.lerp(desiredPosition, Math.min(1, delta * 3.8));
  runtime.controls.target.lerp(midpoint, Math.min(1, delta * 5));
  runtime.controls.enableRotate = false;
}

function focusArtifactCamera(runtime: Runtime, objectId: AquariusObjectId, delta: number) {
  const objectPosition = runtime.objectPositions.get(objectId);
  if (!objectPosition) {
    return;
  }
  const midpoint = runtime.player.position.clone().lerp(objectPosition, 0.55);
  midpoint.y = 1.12;
  const direction = runtime.player.position.clone().sub(objectPosition).setY(0);
  if (direction.lengthSq() < 0.01) {
    direction.set(0, 0, 1);
  }
  direction.normalize();
  const side = new runtime.THREE.Vector3(-direction.z, 0, direction.x);
  const desiredPosition = midpoint
    .clone()
    .add(side.multiplyScalar(2.15))
    .add(new runtime.THREE.Vector3(0, 1.75, 2.2));
  runtime.camera.position.lerp(desiredPosition, Math.min(1, delta * 3.8));
  runtime.controls.target.lerp(midpoint, Math.min(1, delta * 5));
  runtime.controls.enableRotate = false;
}

function focusWeirdoCamera(runtime: Runtime, weirdoId: WeirdoId, delta: number) {
  const weirdoPosition = runtime.weirdoPositions.get(weirdoId);
  if (!weirdoPosition) {
    return;
  }
  const midpoint = runtime.player.position.clone().lerp(weirdoPosition, 0.52);
  midpoint.y = 1.34;
  const direction = runtime.player.position.clone().sub(weirdoPosition).setY(0);
  if (direction.lengthSq() < 0.01) {
    direction.set(0, 0, 1);
  }
  direction.normalize();
  const side = new runtime.THREE.Vector3(-direction.z, 0, direction.x);
  const desiredPosition = midpoint
    .clone()
    .add(side.multiplyScalar(2.75))
    .add(new runtime.THREE.Vector3(0, 2.05, 2.75));
  runtime.camera.position.lerp(desiredPosition, Math.min(1, delta * 3.8));
  runtime.controls.target.lerp(midpoint, Math.min(1, delta * 5));
  runtime.controls.enableRotate = false;
}

function findWeirdoId(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (typeof current.userData.weirdoId === "string") {
      return current.userData.weirdoId;
    }
    current = current.parent;
  }
  return null;
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

function findHumanId(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (typeof current.userData.humanId === "string") {
      return current.userData.humanId;
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
