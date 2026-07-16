import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  creatorName: text("creator_name").notNull(),
  objectsJson: text("objects_json").notNull().default("[]"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const roomMessages = sqliteTable("room_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  body: text("body").notNull(),
  kind: text("kind").notNull().default("chat"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const roomPlayers = sqliteTable(
  "room_players",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    playerName: text("player_name").notNull(),
    avatarColor: text("avatar_color").notNull(),
    positionX: real("position_x").notNull().default(0),
    positionZ: real("position_z").notNull().default(0),
    lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    roomPlayerName: uniqueIndex("room_players_room_name_idx").on(
      table.roomId,
      table.playerName
    ),
  })
);
