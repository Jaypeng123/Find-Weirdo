import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { roomMessages, roomPlayers, rooms } from "@/db/schema";
import {
  avatarColorFor,
  cleanName,
  cleanRoomName,
  getRoomSnapshot,
  hashRoomPassword,
  isFourDigitPassword,
  randomRoomCode,
  toRouteErrorMessage,
} from "./room-service";

type RoomRequest = {
  mode?: "create" | "join";
  roomName?: string;
  code?: string;
  password?: string;
  playerName?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RoomRequest;
    const mode = payload.mode === "join" ? "join" : "create";
    const playerName = cleanName(payload.playerName);

    if (!isFourDigitPassword(payload.password)) {
      return Response.json({ error: "password must be exactly four digits" }, { status: 400 });
    }

    const db = getDb();

    if (mode === "join") {
      const code = typeof payload.code === "string" ? payload.code.trim() : "";
      if (!/^\d{4}$/.test(code)) {
        return Response.json({ error: "room code must be four digits" }, { status: 400 });
      }

      const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
      if (!room) {
        return Response.json({ error: "room not found" }, { status: 404 });
      }

      const passwordHash = await hashRoomPassword(room.id, payload.password);
      if (passwordHash !== room.passwordHash) {
        return Response.json({ error: "password is incorrect" }, { status: 403 });
      }

      await db
        .insert(roomPlayers)
        .values({
          roomId: room.id,
          playerName,
          avatarColor: avatarColorFor(playerName),
          lastSeenAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [roomPlayers.roomId, roomPlayers.playerName],
          set: {
            avatarColor: avatarColorFor(playerName),
            lastSeenAt: new Date().toISOString(),
          },
        });

      const snapshot = await getRoomSnapshot(room.id);
      return Response.json({ room: snapshot, playerName });
    }

    const roomId = crypto.randomUUID();
    let code = randomRoomCode();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const [existing] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
      if (!existing) {
        break;
      }
      code = randomRoomCode();
    }

    const passwordHash = await hashRoomPassword(roomId, payload.password);
    const roomName = cleanRoomName(payload.roomName);

    await db.insert(rooms).values({
      id: roomId,
      code,
      name: roomName,
      passwordHash,
      creatorName: playerName,
      objectsJson: "[]",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.insert(roomPlayers).values({
      roomId,
      playerName,
      avatarColor: avatarColorFor(playerName),
      lastSeenAt: new Date().toISOString(),
    });

    await db.insert(roomMessages).values({
      roomId,
      author: "system",
      kind: "system",
      body: `${playerName} 建立了 ${roomName}`,
      createdAt: new Date().toISOString(),
    });

    const snapshot = await getRoomSnapshot(roomId);
    return Response.json({ room: snapshot, playerName }, { status: 201 });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
