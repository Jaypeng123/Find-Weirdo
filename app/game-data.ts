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

export type HumanId =
  | "guide_1"
  | "guide_2"
  | "guide_3"
  | "guide_4"
  | "guide_5"
  | "guide_6"
  | "guide_7"
  | "guide_8"
  | "roast_1"
  | "roast_2"
  | "roast_3"
  | "roast_4"
  | "praise_1"
  | "praise_2"
  | "praise_3"
  | "praise_4";

export type HumanData = {
  id: HumanId;
  title: string;
  english: string;
  model: string;
  position: [number, number, number];
  facing: number;
  accent: string;
  role: string;
  legend: string;
  rumor: string;
  detail: string;
};

export type AquariusObjectKind = "artifact" | "creature";

export type AquariusObjectId =
  | "reverse-clock"
  | "contrarian-vending"
  | "crowd-antenna"
  | "unwritten-chair"
  | "habitat-dome"
  | "oxygen-tree"
  | "hydroponic-kitchen"
  | "memory-market"
  | "monorail-station"
  | "flying-cow"
  | "signal-jellyfish"
  | "quantum-deer"
  | "bubble-dog"
  | "solar-sheep"
  | "paper-ray";

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

export type PlayerAvatarId =
  | "neutral-human"
  | "blocky-boy"
  | "blocky-girl"
  | "aqua-alien"
  | "author-self";

export type PlayerAvatarData = {
  id: PlayerAvatarId;
  title: string;
  description: string;
  model: string;
  scale: number;
  neutralSkin?: boolean;
  facingOffset?: number;
  proceduralOnly?: boolean;
  runtimeProcedural?: boolean;
};

export const WORLD_CONFIG = {
  moveSpeed: 4.35,
  runSpeed: 7.25,
  acceleration: 10,
  damping: 8.5,
  jumpPower: 6.2,
  gravity: 16,
  worldRadius: 62,
  interactDistance: 3.4,
  revealDistance: 10.5,
  cameraMin: 2.8,
  cameraMax: 22,
  modelScale: 0.78,
  playerScale: 0.0034,
};

export const CHARACTER_ASSETS = [
  "/assets/cube-world/characters/Character_Male_1.gltf",
  "/assets/cube-world/characters/Character_Female_1.gltf",
  "/assets/cube-world/characters/Character_Male_2.gltf",
  "/assets/cube-world/characters/Character_Female_2.gltf",
];

export const PLAYER_MODEL = "/assets/player/player-neutral.fbx";

export const PLAYER_AVATARS: PlayerAvatarData[] = [
  {
    id: "neutral-human",
    title: "0號觀測特工",
    description: "Agent Zero / 26歲 / 不限性別",
    model: "/assets/characters/character-a.glb",
    scale: 0.86,
    facingOffset: 0,
  },
  {
    id: "blocky-boy",
    title: "電光像素浪人",
    description: "Pixel Ronin / 16歲 / 男性",
    model: "/assets/characters/character-b.glb",
    scale: 0.86,
    facingOffset: 0,
  },
  {
    id: "blocky-girl",
    title: "霓虹矩陣暴走姬",
    description: "Matrix Matrix Hime / 16歲 / 女性",
    model: "/assets/characters/character-e.glb",
    scale: 0.86,
    facingOffset: 0,
  },
  {
    id: "aqua-alien",
    title: "代號：404 異星體",
    description: "Code 404 / 年齡不明 / 性別不明",
    model: "/assets/animated/aliens/alien.fbx",
    scale: 1,
    facingOffset: 0,
    proceduralOnly: true,
  },
  {
    id: "author-self",
    title: "作者本人",
    description: "Jay Peng / 27歲 / 男性",
    model: "/assets/characters/author/author-agree.glb",
    scale: 0.92,
    facingOffset: 0,
  },
];

export const HUMANS: HumanData[] = [
  {
    id: "guide_1",
    title: "路過的球評",
    english: "COURTSIDE COMMENTATOR",
    model: "/assets/cube-world/characters/Character_Male_2.gltf",
    position: [-19.4, 0, -15.8],
    facing: 0.5,
    accent: "#7dd3fc",
    role: "線索 NPC / 虛空灌籃高手",
    legend: "「籃球架空地那邊有個小夥子，竟然對著虛空瘋狂交叉運球，還自己配音大喊：『唰！空心三分！』」",
    rumor: "「他堅信全宇宙都是他的球場。你快去帶走他，不然等一下他要開始對著空氣吹裁判哨子了。」",
    detail: "目標：weirdo_1 / 空氣投籃",
  },
  {
    id: "guide_2",
    title: "被風吹亂的阿姨",
    english: "WINDBLOWN AUNTIE",
    model: "/assets/cube-world/characters/Character_Female_1.gltf",
    position: [-8.8, 0, 4.4],
    facing: -2.75,
    accent: "#f6d365",
    role: "線索 NPC / 量子燃脂傳教士",
    legend: "「哎喲喂呀！島嶼中心有個過動兒在發光地板上瘋狂做開合跳，一邊跳還一邊大聲數著奇奇怪怪的數字。」",
    rumor: "「他說他在用肉體摩擦量子來對抗同化危機，再讓他這樣跳下去，霓虹浮島都要被他踩破一個大洞了！」",
    detail: "目標：weirdo_2 / 開合跳",
  },
  {
    id: "guide_3",
    title: "差點踩到人的大叔",
    english: "ALMOST STEPPED UNCLE",
    model: "/assets/cube-world/characters/Character_Male_1.gltf",
    position: [-20.8, 0, 14.4],
    facing: 1.08,
    accent: "#c4b5fd",
    role: "線索 NPC / 地板星人特戰隊",
    legend: "「走路真的要看路！霓虹街道那邊有個傢伙整個人像條壁虎一樣趴在地上匍匐前進，差點被我當成地毯踩過去。」",
    rumor: "「他一臉嚴肅地說他正在聽地板講八卦，真的瘋得很徹底，快去把他從地上撈起來！」",
    detail: "目標：weirdo_3 / 匍匐前進",
  },
  {
    id: "guide_4",
    title: "交通警察",
    english: "TRAFFIC OFFICER",
    model: "/assets/cube-world/characters/Character_Female_2.gltf",
    position: [8.8, 0, 23.2],
    facing: 0.1,
    accent: "#fb7185",
    role: "線索 NPC / 臀動列車長",
    legend: "「今天數據橋大打結！因為有個怪咖死不站起來，整個人坐在地上用屁股一左一右魔性地挪著走路。」",
    rumor: "「最扯的是那屁股推進的速度竟然比我走路還快！他的褲子到底是什麼航太防磨材質做的啊？」",
    detail: "目標：weirdo_4 / 屁股走路",
  },
  {
    id: "guide_5",
    title: "頭暈的觀光客",
    english: "DIZZY TOURIST",
    model: "/assets/cube-world/characters/Character_Female_1.gltf",
    position: [20.6, 0, -16.2],
    facing: -1.85,
    accent: "#5eead4",
    role: "線索 NPC / 引力波迴旋陀螺",
    legend: "「科學島圓頂那邊有個白色人影，手舉高高在跳芭蕾，整個人像個永動陀螺一樣瘋狂原地轉圈圈。」",
    rumor: "「她說這樣能自帶防護罩彈開同化腦波，我看著頭都暈了。兄弟，你快去看看她到底是吃了什麼才會這麼嗨。」",
    detail: "目標：weirdo_5 / 跳芭蕾轉圈圈",
  },
  {
    id: "guide_6",
    title: "懷疑引力的人",
    english: "GRAVITY SKEPTIC",
    model: "/assets/cube-world/characters/Character_Male_2.gltf",
    position: [24.4, 0, 4.2],
    facing: -1.55,
    accent: "#e0f2fe",
    role: "線索 NPC / 天地顛倒觀察家",
    legend: "「連通橋上有個奇葩雙腳朝天，鞋子還掛在手上，完全用雙手在倒立走路，而且平衡感好到走超快！」",
    rumor: "「他路過還一臉憐憫地看著我，說我正著走路腦袋會往下滴水...到底是誰的腦袋裝水啊？」",
    detail: "目標：weirdo_6 / 倒立走路",
  },
  {
    id: "guide_7",
    title: "護樹領隊",
    english: "TREE PROTECTION LEAD",
    model: "/assets/cube-world/characters/Character_Female_2.gltf",
    position: [23.8, 0, 20.4],
    facing: -2.5,
    accent: "#86efac",
    role: "線索 NPC / 積木樹靈魂伴侶",
    legend: "「街角那棵低面數積木樹上面吊著一個人，像隻無尾熊一樣死死抱著樹幹、拼了命扭動身體往上爬。」",
    rumor: "「他說他要跟那棵松樹結婚，正熱烈討論婚禮要邀請哪隻外星物種，你快去救救那棵無辜的樹吧！」",
    detail: "目標：weirdo_7 / 爬樹",
  },
  {
    id: "guide_8",
    title: "曬傷的正常人",
    english: "SUNBURNED NORMAL",
    model: "/assets/cube-world/characters/Character_Male_1.gltf",
    position: [-2.6, 0, -18.6],
    facing: 0,
    accent: "#fbbf24",
    role: "線索 NPC / 外星迷因解碼器",
    legend: "「今天明明太陽大到不行、萬里無雲，中央塔那邊卻有人撐著一把大雨傘，還把傘當成螺旋槳在頭頂瘋狂旋轉。」",
    rumor: "「他說他正在接收外星電台的宇宙炒飯教學，要是我擋到訊號就要跟我拼命，神經病啊！」",
    detail: "目標：weirdo_8 / 拿雨傘接收訊號",
  },
  {
    id: "roast_1",
    title: "崩潰的前任情人",
    english: "BROKEN EX",
    model: "/assets/cube-world/characters/Character_Female_1.gltf",
    position: [-16.8, 0, 3.4],
    facing: 1.25,
    accent: "#fb7185",
    role: "吐槽組 / 愛情",
    legend: "「千萬別跟水瓶座談戀愛！在一起時不抱我，天天跟我討論外星人進攻地心時要怎麼用湯匙挖地洞逃跑。」",
    rumor: "「分手時他還用毫無感情的機器音說：『我們的感情代碼已過期』，我的浪漫直接死在垃圾桶裡！」",
    detail: "角度：愛情",
  },
  {
    id: "roast_2",
    title: "血壓飆高的十年摯友",
    english: "TEN YEAR FRIEND",
    model: "/assets/cube-world/characters/Character_Male_1.gltf",
    position: [-21.6, 0, -5.6],
    facing: 0.9,
    accent: "#f97316",
    role: "吐槽組 / 友情",
    legend: "「作為水瓶座十年的朋友，我快瘋了！約他吃火鍋，他能在半路因為被一隻長得很逆向的流浪貓吸引而人間蒸發。」",
    rumor: "「隔天還一臉無辜地發訊息問我昨晚火鍋好不好吃，他的平行宇宙真的沒有正常人能理解！」",
    detail: "角度：友情",
  },
  {
    id: "roast_3",
    title: "快要辭職的專案 PM",
    english: "EXHAUSTED PM",
    model: "/assets/cube-world/characters/Character_Male_2.gltf",
    position: [10.8, 0, -18.2],
    facing: -1.2,
    accent: "#f6d365",
    role: "吐槽組 / 同事",
    legend: "「帶水瓶座組員簡直是災難！叫他寫個簡單的登入頁面，他給我搞出一個用周易八卦配合量子糾纏來隨機生成密碼的系統。」",
    rumor: "「我問他這一般人怎麼用，他還一臉嫌棄我智商低、缺乏未來前瞻性，可以讓他立刻原地離職嗎？」",
    detail: "角度：同事",
  },
  {
    id: "roast_4",
    title: "尷尬癌末期路人",
    english: "CRINGE WITNESS",
    model: "/assets/cube-world/characters/Character_Female_2.gltf",
    position: [4.2, 0, 10.8],
    facing: -2.1,
    accent: "#c4b5fd",
    role: "吐槽組 / 個人",
    legend: "「水瓶座最厲害的特質就是：只要他不尷尬，尷尬的就是全世界！看他在大馬路上突然擺動漫姿勢我都想遁地。」",
    rumor: "「不管旁邊有多少人在看，他都能一副理所當然的樣子，那種不可理喻的迷之自信到底哪來的？」",
    detail: "角度：個人",
  },
  {
    id: "praise_1",
    title: "熱戀中的外星迷妹",
    english: "ALIEN FAN IN LOVE",
    model: "/assets/cube-world/characters/Character_Female_1.gltf",
    position: [18.8, 0, 8.2],
    facing: -2.35,
    accent: "#f9a8d4",
    role: "稱讚組 / 愛情",
    legend: "「我最喜歡水瓶座的另一半了！他們的戀愛從不落俗套，比起送花，他更喜歡帶我去看半夜會發光的幾何垃圾桶。」",
    rumor: "「跟著他，每一天都像在過外星冒險。那種只屬於我們兩個人的怪異浪漫，真的超級迷人！」",
    detail: "角度：愛情",
  },
  {
    id: "praise_2",
    title: "被救贖的鐵桿閨蜜",
    english: "LOYAL BESTIE",
    model: "/assets/cube-world/characters/Character_Female_2.gltf",
    position: [-23.2, 0, 8.8],
    facing: 1.6,
    accent: "#5eead4",
    role: "稱讚組 / 友情",
    legend: "「水瓶座絕對是宇宙中最講義氣的朋友！雖然他們話題常跳躍到讓人滿頭問號，但只要你受委屈，他絕對第一個衝出來。」",
    rumor: "「他會用最前衛、不合常理的邏輯幫你把欺負你的人嗆到無話可說，有這種反骨朋友超有安全感！」",
    detail: "角度：友情",
  },
  {
    id: "praise_3",
    title: "崇拜他的實習生",
    english: "ADORING INTERN",
    model: "/assets/cube-world/characters/Character_Male_1.gltf",
    position: [23.4, 0, -8.6],
    facing: -1.85,
    accent: "#7dd3fc",
    role: "稱讚組 / 同事",
    legend: "「我們公司那個水瓶座前輩簡直是天才！每次開會大家卡死的時候，他總能提出一些反常理的逆向神操作。」",
    rumor: "「雖然他常常盯著空白的 Excel 螢幕摸魚，但只要他認真起來，一個人能直接幹掉整個部門的工作量！」",
    detail: "角度：同事",
  },
  {
    id: "praise_4",
    title: "思想自由的追隨者",
    english: "FREE THINKING FOLLOWER",
    model: "/assets/cube-world/characters/Character_Male_2.gltf",
    position: [0.4, 0, -22.8],
    facing: 0.4,
    accent: "#a7f3d0",
    role: "稱讚組 / 個人",
    legend: "「我太羨慕水瓶座的活法了！他們從來不在乎世俗的眼光，敢打破所有的常規和框架，活得比誰都自由。」",
    rumor: "「在這個大家都拼命想融入集體、變得一模一樣的無趣世界裡，他們就像霓虹浮島上最耀眼的獨特極光！」",
    detail: "角度：個人",
  },
];

export const AQUARIUS_OBJECTS: AquariusObjectData[] = [
  {
    id: "reverse-clock",
    kind: "artifact",
    title: "逆轉水鐘",
    english: "REVERSE CLOCK",
    position: [2.6, 0, -2.8],
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
    position: [-11.4, 0, 10.2],
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
    position: [15.4, 0, 8.7],
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
    position: [-12.1, 0, 9.7],
    accent: "#fb7185",
    prompt: "這張椅子拒絕被定義成椅子",
    response: "你靠近時，它把自己折成一座小舞台。水瓶座很常這樣：不是反對椅子，而是反對『只能被當成椅子』。",
    trait: "拒絕固定用途",
    collisionRadius: 0.9,
  },
  {
    id: "habitat-dome",
    kind: "artifact",
    title: "共生居住穹頂",
    english: "COMMONS HABITAT",
    position: [17.4, 0, 7.2],
    accent: "#74f0d4",
    prompt: "穹頂正在調整適合人類與外星人的氣壓",
    response: "透明穹頂裡有睡眠艙、共享廚房和一面會改變意見的牆。這裡不是住宅區，而是一個練習共存的實驗室。",
    trait: "自由不是獨居，而是重新設計共住規則",
    collisionRadius: 1.55,
  },
  {
    id: "oxygen-tree",
    kind: "artifact",
    title: "氧氣樹",
    english: "OXYGEN TREE",
    position: [17.2, 0, 11.5],
    accent: "#5eead4",
    prompt: "樹冠正在把星塵轉成可呼吸的空氣",
    response: "氧氣樹的葉片像天線一樣微微旋轉。它證明這顆星球不是只為觀賞而存在，而是真的能讓奇怪的人活下去。",
    trait: "把科技做成生態，把生態做成公共設施",
    collisionRadius: 1.05,
  },
  {
    id: "hydroponic-kitchen",
    kind: "artifact",
    title: "水耕星球食堂",
    english: "HYDROPONIC KITCHEN",
    position: [10.4, 0, 11.1],
    accent: "#f6d365",
    prompt: "食堂正在烹調明天才發明的食物",
    response: "這裡的蔬菜漂浮在水管裡，調味料由 AI 和夢境共同決定。水瓶座外星人把吃飯也當成社會設計。",
    trait: "連日常生活都要先做一次原型",
    collisionRadius: 1.25,
  },
  {
    id: "memory-market",
    kind: "artifact",
    title: "記憶交換市集",
    english: "MEMORY MARKET",
    position: [5.9, 0, 17.3],
    accent: "#fb7185",
    prompt: "市集攤位正在交換還沒發生的回憶",
    response: "有人用童年換一段未來旅行，有人只買了一個問題。這個市集讓外星居民用想像力交易，而不是用貨幣。",
    trait: "價值不只來自物品，也來自觀點",
    collisionRadius: 1.35,
  },
  {
    id: "monorail-station",
    kind: "artifact",
    title: "反重力環線站",
    english: "GRAVITY LOOP",
    position: [0.5, 0, 18.2],
    accent: "#7dd3fc",
    prompt: "環線列車沒有軌道也準時抵達",
    response: "站台漂浮在地表上方，路線會依照乘客今天最需要的風景重新排列。這顆星球的交通也不相信固定路線。",
    trait: "移動是城市的思考方式",
    collisionRadius: 1.45,
  },
  {
    id: "flying-cow",
    kind: "creature",
    title: "飛天牛",
    english: "AEROCOW",
    position: [4.9, 2.7, 16.3],
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
    position: [-1.3, 2.2, 7.6],
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
    position: [16.7, 0, -10.7],
    accent: "#b7f7ff",
    prompt: "牠同時看著你和另一個可能的你",
    response: "量子鹿的角分裂成兩條星路。牠提醒你：選擇不是關門，而是在多個版本的自己之間建立通道。",
    trait: "同時相信多種可能",
    collisionRadius: 0.95,
  },
  {
    id: "bubble-dog",
    kind: "creature",
    title: "泡泡犬",
    english: "BUBBLE DOG",
    position: [2.1, 0, 2.4],
    accent: "#c4b5fd",
    prompt: "泡泡犬正在替行人保存迷路的念頭",
    response: "牠搖尾巴時，身邊冒出幾顆裝著問號的泡泡。水瓶城市裡連寵物都不只陪伴，還會幫大家暫存還沒想清楚的問題。",
    trait: "把疑問當成寵物球",
    collisionRadius: 0.82,
  },
  {
    id: "solar-sheep",
    kind: "creature",
    title: "太陽綿羊",
    english: "SOLAR SHEEP",
    position: [-18.0, 0, -10.1],
    accent: "#f6d365",
    prompt: "牠的羊毛正在幫路燈充電",
    response: "太陽綿羊安靜地發光，身上的方塊羊毛像迷你電池。牠們白天吃光，晚上吐出一點溫柔的電。",
    trait: "把能量養成毛茸茸的公共設施",
    collisionRadius: 0.95,
  },
  {
    id: "paper-ray",
    kind: "creature",
    title: "紙鰩",
    english: "PAPER RAY",
    position: [-14.2, 1.7, 6.4],
    accent: "#fb7185",
    prompt: "紙鰩從屋頂滑翔，背上印著未寄出的告白",
    response: "牠像一張會呼吸的紙飛機，繞著城市屋頂巡航。據說牠會把沒說出口的話摺成安全的形狀，等主人準備好再送回來。",
    trait: "讓秘密先在空中練習飛行",
    collisionRadius: 0,
  },
];

export const NPCS: NpcData[] = [
  {
    id: "humanitarian",
    title: "人道主義者",
    english: "THE HUMANITARIAN",
    model: "/assets/cube-world/characters/Character_Female_2.gltf",
    region: "生命之泉",
    position: [13.2, 0, 9.7],
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
    model: "/assets/cube-world/characters/Character_Male_1.gltf",
    region: "星象機械工坊",
    position: [-14.7, 0, -7.3],
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
    model: "/assets/cube-world/characters/Character_Male_2.gltf",
    region: "隱藏資料庫",
    position: [-17.2, 0, -5.9],
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
    model: "/assets/cube-world/characters/Character_Female_1.gltf",
    region: "破碎藝術神殿",
    position: [-13.4, 0, 7.2],
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
    model: "/assets/cube-world/characters/Character_Male_2.gltf",
    region: "星際觀測台",
    position: [0, 0, -15.5],
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
    model: "/assets/cube-world/characters/Character_Female_2.gltf",
    region: "中央上層平台",
    position: [4.9, 0, -15.1],
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
    model: "/assets/cube-world/characters/Character_Male_1.gltf",
    region: "圓形哲思大廳",
    position: [10.7, 0, -6.9],
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
    model: "/assets/cube-world/characters/Character_Female_1.gltf",
    region: "風之橋",
    position: [0, 0, 14.6],
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
  { name: "Aquarius Plaza 水瓶中央廣場", x: 0, z: 0, radius: 7 },
  { name: "Future Observatory 未來觀測區", x: 0, z: -17, radius: 7 },
  { name: "Innovation Workshop 創新工坊區", x: -14, z: -8, radius: 7 },
  { name: "Cosmic Research 星際研究區", x: 14, z: -9, radius: 7 },
  { name: "Rebel Art Quarter 叛逆藝術街區", x: -14, z: 8, radius: 7 },
  { name: "Humanity Garden 人道花園區", x: 14, z: 9, radius: 7 },
  { name: "Canal Harbor 水道港灣區", x: 0, z: 17, radius: 7 },
];
