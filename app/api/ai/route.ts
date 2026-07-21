type ChatRequest = {
  archetypeId?: string;
  archetypeName?: string;
  playerName?: string;
  message?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

type RuntimeEnv = {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

async function getRuntimeEnv(): Promise<RuntimeEnv> {
  const processEnv = typeof process !== "undefined" ? process.env : {};
  if (processEnv.OPENAI_API_KEY || processEnv.OPENAI_MODEL) {
    return processEnv;
  }

  try {
    const workersSpecifier = "cloudflare:workers";
    const mod = (await import(/* @vite-ignore */ workersSpecifier)) as {
      env?: RuntimeEnv;
    };
    return mod.env ?? {};
  } catch {
    return {};
  }
}

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const archetypeBriefs: Record<string, string> = {
  futurist:
    "未來派。科技、AI、宇宙、前瞻、理性。你像全息投影一樣說話，總在談五年後，認為未來不是等待，而是設計出來的。",
  inventor:
    "怪點子發明家。創意、DIY、實驗、腦洞。你常常邊講邊修機器，失敗也會把它變成下一個原型。",
  rebel:
    "叛逆藝術家。藝術、反骨、自由、街頭文化。你討厭被定義，認為規則只是上一代人的習慣。",
  observer:
    "冷靜觀察者。分析、邏輯、心理學、觀察。你話少但犀利，會指出玩家行為背後的真相。",
  humanitarian:
    "人道主義者。公益、平等、理想、社會。你溫柔、堅定，總把進步連回所有人的前進。",
  wanderer:
    "自由旅人。旅行、探索、體驗、自由。你不做固定人生規劃，回答像從下一個未知地點寄來。",
  visionary:
    "星際哲學家。哲學、宇宙、時間、文明。你會把日常問題推向宇宙尺度，但仍保留溫度。",
  hacker:
    "系統駭客。破解、資訊、黑客、規則漏洞。你專門幫玩家找捷徑，但重視倫理與最佳化。",
  social:
    "社交實驗家。你不是單純喜歡人，而是對人很好奇。你會丟出奇怪但有洞察力的心理實驗問題。",
  receiver:
    "異世界信號接收者。靈感、宇宙同步、夢境、未來訊號。你神秘、詩性，像在接收另一個頻道。",
};

const fallbackReplies: Record<string, string[]> = {
  futurist: [
    "如果你要打造這個房間，先別問它現在能放什麼。問：五年後的人會需要它替自己記住什麼？",
    "我看見一個藍圖：把你的第一個物件放在中心偏北，它會像天線一樣替整個空間定義方向。",
  ],
  inventor: [
    "先放一個看起來不合理的東西。合理的發明通常已經被做完了。",
    "我剛剛把失敗紀錄拆開看了。很好，裡面至少有三個可用零件。",
  ],
  rebel: [
    "別急著讓空間漂亮。先讓它有一個不服從的角落。",
    "如果每個人都把物件排整齊，你就把牆打斜。美學有時需要一點不禮貌。",
  ],
  observer: [
    "你放置物件的位置，比你說的話更誠實。",
    "先停一下。這個房間缺的不是裝飾，是一個能讓人留下來的理由。",
  ],
  humanitarian: [
    "讓下一個加入的人也能參與，這個空間才真的有進步。",
    "請留一個公共節點，不屬於任何人，但每個人都能照亮它。",
  ],
  wanderer: [
    "路線不必固定。把入口做得像問題，不像答案。",
    "我昨天經過一個沒有地圖的城市。最好的房間也是這樣，讓人願意迷路。",
  ],
  visionary: [
    "如果宇宙是一場實驗，這個房間就是你們留下的觀測資料。",
    "時間不是直線，它比較像一間大家輪流改造的房間。",
  ],
  hacker: [
    "捷徑不是作弊，前提是它讓系統更公平、更聰明。",
    "我找到一個漏洞：你以為這是房間，其實它是協作規則的介面。",
  ],
  social: [
    "如果今天世界沒有貨幣，你會把這個房間的哪個角落送給陌生人？",
    "我想做個小實驗：把最重要的物件放在別人最容易碰到的位置。",
  ],
  receiver: [
    "我剛收到一段訊號：水流不是往下，是往還沒被命名的地方。",
    "夢裡有個藍色房間，它不是安靜，而是在等你靠近。",
  ],
};

function fallback(archetypeId: string, message: string) {
  const replies = fallbackReplies[archetypeId] ?? fallbackReplies.visionary;
  const index = Math.abs(
    [...message].reduce((sum, char) => sum + char.charCodeAt(0), archetypeId.length)
  ) % replies.length;
  return replies[index];
}

function extractOutputText(data: OpenAIResponse) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text?.trim()) {
        return content.text.trim();
      }
    }
  }

  return "";
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ChatRequest;
  const archetypeId = payload.archetypeId || "visionary";
  const playerName = payload.playerName?.trim().slice(0, 28) || "玩家";
  const message = payload.message?.trim().slice(0, 600) || "";

  if (!message) {
    return Response.json({ reply: "先丟一個問題給我，我會從水瓶座的角度回你。" });
  }

  const workerEnv = await getRuntimeEnv();
  const apiKey = workerEnv.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json({
      reply: fallback(archetypeId, message),
      mode: "scripted",
    });
  }

  const instructions = [
    "你是 Aquarius Commons 3D 多人協作星座空間中的 NPC。",
    `玩家名稱：${playerName}`,
    `你的角色設定：${archetypeBriefs[archetypeId] ?? archetypeBriefs.visionary}`,
    "請用繁體中文回答。保持角色聲音鮮明、短句、有啟發性。",
    "不要聲稱自己能真的改動遊戲狀態。若玩家問建造建議，給出具體可做的空間行為。",
    "每次回覆控制在 80 字以內。",
  ].join("\n");

  const recentHistory = (payload.history ?? [])
    .slice(-6)
    .map((entry) => `${entry.role === "assistant" ? "NPC" : playerName}: ${entry.content}`)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: workerEnv.OPENAI_MODEL || "gpt-4.1",
      instructions,
      input: `${recentHistory}\n${playerName}: ${message}`.trim(),
      max_output_tokens: 180,
    }),
  });

  if (!response.ok) {
    return Response.json({
      reply: fallback(archetypeId, message),
      mode: "scripted",
    });
  }

  const data = (await response.json()) as OpenAIResponse;
  return Response.json({
    reply: extractOutputText(data) || fallback(archetypeId, message),
    mode: "ai",
  });
}
