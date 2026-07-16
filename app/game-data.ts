export type ArchetypeId =
  | "futurist"
  | "rebel"
  | "observer"
  | "humanitarian"
  | "inventor"
  | "wanderer"
  | "visionary"
  | "hacker";

export type NpcData = {
  id: ArchetypeId;
  title: string;
  english: string;
  model: string;
  region: string;
  position: [number, number, number];
  facing: number;
  color: string;
  accent: string;
  quote: string;
  keywords: string[];
  core: string;
  strength: string;
  shadow: string;
  relation: string;
  fragment: string;
};

export type AquariusObjectKind = "artifact" | "creature";

export type AquariusObjectId =
  | "reverse-clock"
  | "contrarian-vending"
  | "crowd-antenna"
  | "unwritten-chair"
  | "flying-cow"
  | "signal-jellyfish"
  | "quantum-deer";

export type AquariusObjectData = {
  id: AquariusObjectId;
  kind: AquariusObjectKind;
  title: string;
  english: string;
  position: [number, number, number];
  accent: string;
  prompt: string;
  response: string;
  trait: string;
  collisionRadius: number;
};

export const WORLD_CONFIG = {
  moveSpeed: 3.15,
  runSpeed: 5.15,
  acceleration: 10,
  damping: 8.5,
  jumpPower: 6.2,
  gravity: 16,
  worldRadius: 24,
  interactDistance: 3.1,
  revealDistance: 7,
  cameraMin: 7,
  cameraMax: 18,
  modelScale: 1.35,
  playerScale: 1.26,
};

export const CHARACTER_ASSETS = [
  "/assets/characters/character-a.glb",
  "/assets/characters/character-d.glb",
  "/assets/characters/character-e.glb",
  "/assets/characters/character-f.glb",
  "/assets/characters/character-h.glb",
  "/assets/characters/character-j.glb",
  "/assets/characters/character-k.glb",
  "/assets/characters/character-m.glb",
  "/assets/characters/character-p.glb",
  "/assets/characters/character-q.glb",
  "/assets/characters/character-r.glb",
];

export const PLAYER_MODEL = "/assets/characters/character-a.glb";

export const AQUARIUS_OBJECTS: AquariusObjectData[] = [
  {
    id: "reverse-clock",
    kind: "artifact",
    title: "逆轉水鐘",
    english: "REVERSE CLOCK",
    position: [2.9, 0, 4.8],
    accent: "#7dd3fc",
    prompt: "時間正在倒著滴水",
    response: "你摸到水面時，剛剛那個念頭先回到了五秒前。這個裝置提醒水瓶座：未來感有時不是往前衝，而是回去改寫起點。",
    trait: "不照時間順序思考",
    collisionRadius: 0.95,
  },
  {
    id: "contrarian-vending",
    kind: "artifact",
    title: "反答案販賣機",
    english: "CONTRARIAN VENDING",
    position: [-10.4, 0, -4.8],
    accent: "#f6b04d",
    prompt: "按鈕上寫著：不要按",
    response: "機器吐出一張紙條：『如果大家都同意，先懷疑一下。』它專門販售不合群的答案，但偶爾也會掉出真正有用的捷徑。",
    trait: "越被禁止越想測試",
    collisionRadius: 1.15,
  },
  {
    id: "crowd-antenna",
    kind: "artifact",
    title: "群體腦波天線",
    english: "COMMONS ANTENNA",
    position: [-4.8, 0, -6.4],
    accent: "#5eead4",
    prompt: "天線正在收集眾人的怪想法",
    response: "你聽見很多聲音同時說：『世界可以再公平一點，也可以再怪一點。』它把個人的異想天開翻譯成集體行動。",
    trait: "一邊疏離人群，一邊想改善人類",
    collisionRadius: 1,
  },
  {
    id: "unwritten-chair",
    kind: "artifact",
    title: "不坐的椅子",
    english: "UNWRITTEN CHAIR",
    position: [10.2, 0, 5.4],
    accent: "#fb7185",
    prompt: "這張椅子拒絕被定義成椅子",
    response: "你靠近時，它把自己折成一座小舞台。水瓶座很常這樣：不是反對椅子，而是反對『只能被當成椅子』。",
    trait: "拒絕固定用途",
    collisionRadius: 0.9,
  },
  {
    id: "flying-cow",
    kind: "creature",
    title: "飛天牛",
    english: "AEROCOW",
    position: [8.6, 2.7, 12.4],
    accent: "#e0f2fe",
    prompt: "有一頭牛正在用反重力打嗝",
    response: "飛天牛慢慢眨眼：牠只吃明天才會長出來的草。牠代表水瓶座把荒謬當作原型測試的那一面。",
    trait: "把不可能先養起來",
    collisionRadius: 0,
  },
  {
    id: "signal-jellyfish",
    kind: "creature",
    title: "星訊水母",
    english: "SIGNAL JELLYFISH",
    position: [-8.2, 2.2, 10.2],
    accent: "#c4b5fd",
    prompt: "透明觸手正在接收宇宙通知",
    response: "星訊水母發出一段沒有語法的亮光。你不確定它在說什麼，但你突然知道下一步應該往哪裡走。",
    trait: "用直覺接收未來信號",
    collisionRadius: 0,
  },
  {
    id: "quantum-deer",
    kind: "creature",
    title: "量子鹿",
    english: "QUANTUM DEER",
    position: [16.2, 0, -7.4],
    accent: "#b7f7ff",
    prompt: "牠同時看著你和另一個可能的你",
    response: "量子鹿的角分裂成兩條星路。牠提醒你：選擇不是關門，而是在多個版本的自己之間建立通道。",
    trait: "同時相信多種可能",
    collisionRadius: 0.95,
  },
];

export const NPCS: NpcData[] = [
  {
    id: "humanitarian",
    title: "人道主義者",
    english: "THE HUMANITARIAN",
    model: "/assets/characters/character-f.glb",
    region: "生命之泉",
    position: [-3.2, 0, 2.7],
    facing: -0.35,
    color: "#f7e7b4",
    accent: "#74f0d4",
    quote: "文明的高度，不在於誰飛得最遠，而在於有沒有人被留在地面。",
    keywords: ["平等", "博愛", "社會理想", "同理心"],
    core: "相信真正的進步不是少數人走得更快，而是所有人都能前進。",
    strength: "把群體的需求放進未來藍圖，讓理想不只停留在口號。",
    shadow: "容易為了大局忽略自己的疲憊，也可能對不願改變的人失去耐心。",
    relation: "他提醒其他水瓶：自由若不能分享，就會變成另一種孤島。",
    fragment: "生命之泉碎片",
  },
  {
    id: "inventor",
    title: "怪點子發明家",
    english: "THE INVENTOR",
    model: "/assets/characters/character-d.glb",
    region: "星象機械工坊",
    position: [-13.5, 0, 0.6],
    facing: 1.3,
    color: "#f5b84b",
    accent: "#7dd3fc",
    quote: "它現在還沒有用途，但這並不代表它沒有存在的必要。",
    keywords: ["創造力", "腦洞", "實驗精神", "好奇心"],
    core: "把古代星象儀器拆開，再改造成連自己都不知道用途的機器。",
    strength: "願意在失敗裡挖出下一個原型，讓不合理的想法先活下來。",
    shadow: "太迷戀可能性，容易忘記收尾，也可能把別人的耐心當燃料。",
    relation: "他替未來派做工具，也替駭客製造新的漏洞。",
    fragment: "黃銅星輪碎片",
  },
  {
    id: "hacker",
    title: "系統解構者",
    english: "THE HACKER",
    model: "/assets/characters/character-q.glb",
    region: "隱藏資料庫",
    position: [-14.6, 0, -7.3],
    facing: 0.8,
    color: "#5eead4",
    accent: "#b7f7ff",
    quote: "沒有完美的系統，只有還沒被理解的漏洞。",
    keywords: ["解構", "規則", "邏輯", "漏洞"],
    core: "先理解制度，再找到它的裂縫。",
    strength: "能看見規則背後的架構，替團隊打開更聰明的路徑。",
    shadow: "若只享受破解，可能忘記系統裡也住著真實的人。",
    relation: "他和觀察者共享冷靜，但更願意動手改寫規則。",
    fragment: "資料裂隙碎片",
  },
  {
    id: "rebel",
    title: "叛逆藝術家",
    english: "THE REBEL ARTIST",
    model: "/assets/characters/character-r.glb",
    region: "破碎藝術神殿",
    position: [13.4, 0, 1.2],
    facing: -1.4,
    color: "#fb7185",
    accent: "#c084fc",
    quote: "規則不是永恆，只是有人比你更早留下筆跡。",
    keywords: ["自由", "反傳統", "獨立", "審美顛覆"],
    core: "不相信既有規則，會在神殿牆面重新畫上自己的星圖。",
    strength: "敢把世界看成可重畫的草圖，讓被壓住的聲音重新發亮。",
    shadow: "若只為反對而反對，容易把真正的自由變成另一種姿態。",
    relation: "他和漫遊者一樣討厭固定路線，但更想改寫城市牆面。",
    fragment: "紫紅壁畫碎片",
  },
  {
    id: "futurist",
    title: "未來預言者",
    english: "THE FUTURIST",
    model: "/assets/characters/character-p.glb",
    region: "星際觀測台",
    position: [0, 0, -17.2],
    facing: 0,
    color: "#dcecff",
    accent: "#7dd3fc",
    quote: "你們稱它為未來，只是因為還沒有人先抵達。",
    keywords: ["前瞻", "科技", "想像力", "理想主義"],
    core: "總是在觀察尚未發生的世界，對現在的秩序缺乏耐心。",
    strength: "能替眾人看見尚未成形的可能，並把遠方變成藍圖。",
    shadow: "可能太急著抵達明天，而錯過此刻需要被照顧的人。",
    relation: "他需要人道主義者提醒方向，也需要發明家替預言造出工具。",
    fragment: "藍色全息碎片",
  },
  {
    id: "observer",
    title: "冷靜觀察者",
    english: "THE OBSERVER",
    model: "/assets/characters/character-h.glb",
    region: "中央上層平台",
    position: [7.1, 0, -11.8],
    facing: -0.55,
    color: "#9db4ff",
    accent: "#c7d2fe",
    quote: "人們總在回答問題之前，先暴露自己真正害怕的事。",
    keywords: ["理性", "分析", "疏離", "洞察"],
    core: "幾乎不主動說話，但會觀察玩家走過的每一條路。",
    strength: "能在混亂裡迅速看出核心問題，不被表象拖著走。",
    shadow: "過度抽離時，洞察會變成距離，沉默也會變成冷漠。",
    relation: "他理解駭客的邏輯，也看穿藝術家的防衛。",
    fragment: "單眼星鏡碎片",
  },
  {
    id: "visionary",
    title: "星際哲學家",
    english: "THE VISIONARY",
    model: "/assets/characters/character-k.glb",
    region: "圓形哲思大廳",
    position: [-6.6, 0, -14.4],
    facing: 0.35,
    color: "#c4b5fd",
    accent: "#f7d9ff",
    quote: "也許不是我們活在時間裡，而是時間正在經過我們。",
    keywords: ["哲思", "宇宙觀", "精神探索", "抽象思考"],
    core: "研究人類、時間與宇宙之間的關係，說話經常像謎語。",
    strength: "能把短暫的人生問題放進更大的尺度，讓痛苦長出意義。",
    shadow: "太常仰望宇宙時，可能忘記腳下的人正在等一句明白話。",
    relation: "他把未來派的藍圖變成問題，也把觀察者的沉默變成詩。",
    fragment: "星環文字碎片",
  },
  {
    id: "wanderer",
    title: "自由漫遊者",
    english: "THE WANDERER",
    model: "/assets/characters/character-m.glb",
    region: "風之橋",
    position: [5.7, 0, 15.5],
    facing: Math.PI,
    color: "#f6d365",
    accent: "#e0f2fe",
    quote: "你一直在問要去哪裡，卻忘了有些道路本身就是答案。",
    keywords: ["自由", "探索", "流動", "未知"],
    core: "從未在同一個星球停留太久，也不認為人生需要固定目的地。",
    strength: "能用移動打開新的感官，不被既定地圖困住。",
    shadow: "若把停留視為束縛，可能也錯過了深度連結。",
    relation: "他替所有水瓶記得：方向感不等於固定路線。",
    fragment: "風橋星塵碎片",
  },
];

export const DIALOGUE_QUESTIONS = [
  { id: "strength", label: "你的力量是什麼？" },
  { id: "shadow", label: "你的弱點是什麼？" },
  { id: "relation", label: "你如何看待其他水瓶？" },
] as const;

export const WORLD_REGIONS = [
  { name: "生命之泉", x: 0, z: 0, radius: 7 },
  { name: "星象機械工坊", x: -13, z: -2, radius: 8 },
  { name: "破碎藝術神殿", x: 13, z: 1, radius: 8 },
  { name: "星際觀測台", x: 0, z: -15, radius: 9 },
  { name: "風之橋", x: 5, z: 15, radius: 8 },
];
