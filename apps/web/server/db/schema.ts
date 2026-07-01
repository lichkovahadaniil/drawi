import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const boardPermissionEnum = pgEnum("board_permission", ["manage", "edit", "view"]);
export const boardStatusEnum = pgEnum("board_status", ["active", "archived", "deleted"]);
export const boardVisibilityEnum = pgEnum("board_visibility", ["private", "friends", "public"]);
export const channelVisibilityEnum = pgEnum("channel_visibility", ["private", "friends", "public"]);
export const sessionRoleEnum = pgEnum("session_role", ["tutor", "student"]);
export const liveSessionStatusEnum = pgEnum("live_session_status", ["live", "ended"]);
export const libraryRelationshipEnum = pgEnum("library_relationship", ["created", "learned"]);
export const checkpointSourceEnum = pgEnum("checkpoint_source", ["manual", "session_end"]);
export const inviteStatusEnum = pgEnum("invite_status", ["active", "expired", "revoked"]);
export const friendshipStatusEnum = pgEnum("friendship_status", [
  "pending",
  "accepted",
  "declined",
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userIdIdx: index("session_user_id_idx").on(table.userId),
  }),
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("account_user_id_idx").on(table.userId),
  }),
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    normalizedHandle: text("normalized_handle").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    roleLabel: text("role_label").notNull().default("Learner"),
    teachingEnabled: boolean("teaching_enabled").notNull().default(false),
    channelVisibility: channelVisibilityEnum("channel_visibility").notNull().default("public"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: uniqueIndex("profiles_user_id_unique").on(table.userId),
    handleIdx: uniqueIndex("profiles_normalized_handle_unique").on(table.normalizedHandle),
  }),
);

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    roomId: text("room_id").notNull(),
    status: boardStatusEnum("status").notNull().default("active"),
    visibility: boardVisibilityEnum("visibility").notNull().default("private"),
    sourceBoardId: uuid("source_board_id"),
    sourceCheckpointId: uuid("source_checkpoint_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdx: index("boards_owner_id_idx").on(table.ownerId),
    visibilityIdx: index("boards_visibility_idx").on(table.visibility),
    roomIdx: uniqueIndex("boards_room_id_unique").on(table.roomId),
  }),
);

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    addresseeId: text("addressee_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: friendshipStatusEnum("status").notNull().default("pending"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    requesterIdx: index("friendships_requester_id_idx").on(table.requesterId),
    addresseeIdx: index("friendships_addressee_id_idx").on(table.addresseeId),
    statusIdx: index("friendships_status_idx").on(table.status),
    pairUnique: uniqueIndex("friendships_requester_addressee_unique").on(
      table.requesterId,
      table.addresseeId,
    ),
  }),
);

export const boardAccess = pgTable(
  "board_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    permission: boardPermissionEnum("permission").notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activeAccessUnique: uniqueIndex("board_access_active_unique").on(table.boardId, table.userId),
  }),
);

export const liveSessions = pgTable(
  "live_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    hostUserId: text("host_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    liveKitRoomName: text("livekit_room_name").notNull(),
    status: liveSessionStatusEnum("status").notNull().default("live"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    boardIdx: index("live_sessions_board_id_idx").on(table.boardId),
  }),
);

export const sessionMemberships = pgTable(
  "session_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => liveSessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: sessionRoleEnum("role").notNull(),
    canEditBoard: boolean("can_edit_board").notNull().default(true),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    leftAt: timestamp("left_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    membershipUnique: uniqueIndex("session_memberships_unique").on(table.sessionId, table.userId),
  }),
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => liveSessions.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    status: inviteStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeHashIdx: uniqueIndex("invites_code_hash_unique").on(table.codeHash),
  }),
);

export const libraryItems = pgTable(
  "library_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    relationship: libraryRelationshipEnum("relationship").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
  },
  (table) => ({
    libraryUnique: uniqueIndex("library_items_unique").on(
      table.userId,
      table.boardId,
      table.relationship,
    ),
  }),
);

export const studentNotes = pgTable(
  "student_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull().default(""),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    studentNoteUnique: uniqueIndex("student_notes_board_student_unique").on(
      table.boardId,
      table.studentId,
    ),
  }),
);

export const checkpoints = pgTable(
  "checkpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => liveSessions.id, { onDelete: "set null" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    snapshotStorageKey: text("snapshot_storage_key").notNull(),
    tldrawSchemaVersion: integer("tldraw_schema_version").notNull().default(1),
    source: checkpointSourceEnum("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    boardIdx: index("checkpoints_board_id_idx").on(table.boardId),
  }),
);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BoardPermission = (typeof boardPermissionEnum.enumValues)[number];
export type BoardVisibility = (typeof boardVisibilityEnum.enumValues)[number];
export type ChannelVisibility = (typeof channelVisibilityEnum.enumValues)[number];
export type SessionRole = (typeof sessionRoleEnum.enumValues)[number];
export type LiveSessionStatus = (typeof liveSessionStatusEnum.enumValues)[number];
export type LibraryRelationship = (typeof libraryRelationshipEnum.enumValues)[number];
export type CheckpointSource = (typeof checkpointSourceEnum.enumValues)[number];
export type FriendshipStatus = (typeof friendshipStatusEnum.enumValues)[number];
