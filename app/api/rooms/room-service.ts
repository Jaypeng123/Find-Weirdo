import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { roomMessages, roomPlayers, rooms } from "@/db/schema";

export type SavedRoomObject = {
  id: string;
  type: string;
  x: number;
  z: number;
  rotation: number;
  owner: string;
  createdAt: string;
};

export type RoomSnapshot = {
  id: string;
  code: string;
  name: string;
  objects: SavedRoomObject[];
  messages: Array<typeof roomMessages.$inferSelect>;
  players: Array<typeof roomPlayers.$inferSelect>;
  updatedAt: string;
};

export function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail =
    error instanceof Error && error.cause instanceof Error
      ? error.cause.message
      : "";
  const combined = `${message}\n${detail}`;

  if (
    combined.includes("no such table") ||
    combined.includes("rooms") ||
    combined.includes("room_messages") ||
    combined.includes("room_players")
  ) {
    return "The Aquarius room database is unavailable. Generate and apply the D1 migration before using persistent rooms.";
  }

  return message;
}

export function isFourDigitPassword(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}$/.test(value);
}

export function cleanName(value: unknown, fallback = "匿名水瓶") {
  const text = typeof value === "string" ? value.trim() : "";
  return text.slice(0, 28) || fallback;
}

export function cleanRoomName(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.slice(0, 36) || "Aquarius Commons";
}

export async function hashRoomPassword(roomId: string, password: string) {
  const payload = new TextEncoder().encode(`${roomId}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function findRoomById(roomId: string) {
  const db = await getDb();
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  return room ?? null;
}

export async function verifyRoom(roomId: string, password: string) {
  const room = await findRoomById(roomId);
  if (!room) {
    return null;
  }

  const passwordHash = await hashRoomPassword(room.id, password);
  if (passwordHash !== room.passwordHash) {
    return null;
  }

  return room;
}

export function parseObjects(value: string): SavedRoomObject[] {
  try {
    const parsed = JSON.parse(value) as SavedRoomObject[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: String(item.id || crypto.randomUUID()),
        type: String(item.type || "crystal"),
        x: Number.isFinite(Number(item.x)) ? Number(item.x) : 0,
        z: Number.isFinite(Number(item.z)) ? Number(item.z) : 0,
        rotation: Number.isFinite(Number(item.rotation)) ? Number(item.rotation) : 0,
        owner: String(item.owner || "system").slice(0, 28),
        createdAt: String(item.createdAt || new Date().toISOString()),
      }))
      .slice(0, 80);
  } catch {
    return [];
  }
}

export function serializeObjects(objects: SavedRoomObject[]) {
  return JSON.stringify(
    objects
      .map((item) => ({
        id: String(item.id || crypto.randomUUID()),
        type: String(item.type || "crystal").slice(0, 32),
        x: clampNumber(item.x, -18, 18),
        z: clampNumber(item.z, -18, 18),
        rotation: clampNumber(item.rotation, -Math.PI * 2, Math.PI * 2),
        owner: String(item.owner || "system").slice(0, 28),
        createdAt: String(item.createdAt || new Date().toISOString()),
      }))
      .slice(-80)
  );
}

export async function getRoomSnapshot(roomId: string): Promise<RoomSnapshot | null> {
  const room = await findRoomById(roomId);
  if (!room) {
    return null;
  }

  const db = await getDb();
  const [messagesDesc, players] = await Promise.all([
    db
      .select()
      .from(roomMessages)
      .where(eq(roomMessages.roomId, room.id))
      .orderBy(desc(roomMessages.createdAt), desc(roomMessages.id))
      .limit(60),
    db
      .select()
      .from(roomPlayers)
      .where(eq(roomPlayers.roomId, room.id))
      .orderBy(desc(roomPlayers.lastSeenAt))
      .limit(16),
  ]);

  return {
    id: room.id,
    code: room.code,
    name: room.name,
    objects: parseObjects(room.objectsJson),
    messages: messagesDesc.reverse(),
    players,
    updatedAt: room.updatedAt,
  };
}

export function randomRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function avatarColorFor(name: string) {
  const colors = ["#7dd3fc", "#fb7185", "#bef264", "#facc15", "#c4b5fd", "#5eead4"];
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return colors[hash % colors.length];
}

export function clampNumber(value: unknown, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.min(max, Math.max(min, number));
}
