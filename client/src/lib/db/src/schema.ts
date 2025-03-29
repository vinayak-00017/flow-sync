import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============ Enums ============
export const roomTypeEnum = pgEnum("room_type", [
  "DSA",
  "SYSTEM_DESIGN",
  "CODE_COLLABORATION",
]);
export const participantRoleEnum = pgEnum("participant_role", [
  "OWNER",
  "ADMIN",
  "MEMBER",
  "VIEWER",
]);

// ============ User Management ============
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql.raw("uuid_generate_v4()")),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  ownedRooms: many(rooms, { relationName: "RoomOwner" }),
  participantIn: many(roomParticipants),
}));

// ============ Room Management ============
export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().default(sql.raw("uuid_generate_v4()")),
  name: text("name").notNull(),
  description: text("description"),
  type: roomTypeEnum("type").notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  inviteCode: text("invite_code").unique(),
});

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  owner: one(users, {
    fields: [rooms.ownerId],
    references: [users.id],
    relationName: "RoomOwner",
  }),
  participants: many(roomParticipants),
}));

export const roomParticipants = pgTable(
  "room_participants",
  {
    id: uuid("id").primaryKey().default(sql.raw("uuid_generate_v4()")),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    role: participantRoleEnum("role").default("MEMBER").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastSeen: timestamp("last_seen").defaultNow().notNull(),
  },
  (table) => {
    return {
      userRoomIdx: uniqueIndex("user_room_idx").on(table.userId, table.roomId),
    };
  }
);

export const roomParticipantsRelations = relations(
  roomParticipants,
  ({ one }) => ({
    user: one(users, {
      fields: [roomParticipants.userId],
      references: [users.id],
    }),
    room: one(rooms, {
      fields: [roomParticipants.roomId],
      references: [rooms.id],
    }),
  })
);
