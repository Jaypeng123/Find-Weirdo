import { roomMessages } from "@/db/schema";
import { getDb } from "@/db";
import {
  cleanName,
  getRoomSnapshot,
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
      author?: string;
      body?: string;
    };

    if (!isFourDigitPassword(payload.password)) {
      return Response.json({ error: "password must be exactly four digits" }, { status: 400 });
    }

    const room = await verifyRoom(roomId, payload.password);
    if (!room) {
      return Response.json({ error: "room not found or password is incorrect" }, { status: 404 });
    }

    const body = typeof payload.body === "string" ? payload.body.trim().slice(0, 240) : "";
    if (!body) {
      return Response.json({ error: "message body is required" }, { status: 400 });
    }

    const db = getDb();
    const [message] = await db
      .insert(roomMessages)
      .values({
        roomId: room.id,
        author: cleanName(payload.author),
        body,
        kind: "chat",
        createdAt: new Date().toISOString(),
      })
      .returning();

    return Response.json({ message }, { status: 201 });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
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
    return Response.json({ messages: snapshot?.messages ?? [] });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
