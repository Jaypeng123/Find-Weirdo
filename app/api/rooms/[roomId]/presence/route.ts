import { getDb } from "@/db";
import { roomPlayers } from "@/db/schema";
import {
  avatarColorFor,
  clampNumber,
  cleanName,
  isFourDigitPassword,
  toRouteErrorMessage,
  verifyRoom,
} from "../../room-service";

type RoomContext = {
  params: Promise<{ roomId: string }> | { roomId: string };
};

async function readRoomId(context: RoomContext) {
  const params = await context.params;
  return params.roomId;
}

export async function POST(request: Request, context: RoomContext) {
  try {
    const roomId = await readRoomId(context);
    const payload = (await request.json()) as {
      password?: string;
      playerName?: string;
      color?: string;
      positionX?: number;
      positionZ?: number;
    };

    if (!isFourDigitPassword(payload.password)) {
      return Response.json({ error: "password must be exactly four digits" }, { status: 400 });
    }

    const room = await verifyRoom(roomId, payload.password);
    if (!room) {
      return Response.json({ error: "room not found or password is incorrect" }, { status: 404 });
    }

    const playerName = cleanName(payload.playerName);
    const db = await getDb();
    const [player] = await db
      .insert(roomPlayers)
      .values({
        roomId: room.id,
        playerName,
        avatarColor: payload.color || avatarColorFor(playerName),
        positionX: clampNumber(payload.positionX, -18, 18),
        positionZ: clampNumber(payload.positionZ, -18, 18),
        lastSeenAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [roomPlayers.roomId, roomPlayers.playerName],
        set: {
          avatarColor: payload.color || avatarColorFor(playerName),
          positionX: clampNumber(payload.positionX, -18, 18),
          positionZ: clampNumber(payload.positionZ, -18, 18),
          lastSeenAt: new Date().toISOString(),
        },
      })
      .returning();

    return Response.json({ player });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
