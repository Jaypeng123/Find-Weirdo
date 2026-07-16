import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { rooms } from "@/db/schema";
import {
  getRoomSnapshot,
  isFourDigitPassword,
  serializeObjects,
  toRouteErrorMessage,
  verifyRoom,
  type SavedRoomObject,
} from "../room-service";

type RoomContext = {
  params: Promise<{ roomId: string }> | { roomId: string };
};

async function readRoomId(context: RoomContext) {
  const params = await context.params;
  return params.roomId;
}

export async function GET(request: Request, context: RoomContext) {
  try {
    const roomId = await readRoomId(context);
    const password = new URL(request.url).searchParams.get("password") ?? "";

    if (!isFourDigitPassword(password)) {
      return Response.json({ error: "password must be exactly four digits" }, { status: 400 });
    }

    const room = await verifyRoom(roomId, password);
    if (!room) {
      return Response.json({ error: "room not found or password is incorrect" }, { status: 404 });
    }

    const snapshot = await getRoomSnapshot(room.id);
    return Response.json({ room: snapshot });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RoomContext) {
  try {
    const roomId = await readRoomId(context);
    const payload = (await request.json()) as {
      password?: string;
      objects?: SavedRoomObject[];
    };

    if (!isFourDigitPassword(payload.password)) {
      return Response.json({ error: "password must be exactly four digits" }, { status: 400 });
    }

    const room = await verifyRoom(roomId, payload.password);
    if (!room) {
      return Response.json({ error: "room not found or password is incorrect" }, { status: 404 });
    }

    if (!Array.isArray(payload.objects)) {
      return Response.json({ error: "objects must be an array" }, { status: 400 });
    }

    const db = getDb();
    await db
      .update(rooms)
      .set({
        objectsJson: serializeObjects(payload.objects),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(rooms.id, room.id));

    const snapshot = await getRoomSnapshot(room.id);
    return Response.json({ room: snapshot });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
