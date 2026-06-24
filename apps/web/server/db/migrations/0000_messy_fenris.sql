CREATE TYPE "public"."board_permission" AS ENUM('manage', 'edit', 'view');--> statement-breakpoint
CREATE TYPE "public"."board_status" AS ENUM('active', 'archived', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."checkpoint_source" AS ENUM('manual', 'session_end');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('active', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."library_relationship" AS ENUM('created', 'learned');--> statement-breakpoint
CREATE TYPE "public"."live_session_status" AS ENUM('live', 'ended');--> statement-breakpoint
CREATE TYPE "public"."session_role" AS ENUM('tutor', 'student');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"permission" "board_permission" NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"room_id" text NOT NULL,
	"status" "board_status" DEFAULT 'active' NOT NULL,
	"source_board_id" uuid,
	"source_checkpoint_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"session_id" uuid,
	"created_by_user_id" text NOT NULL,
	"label" text NOT NULL,
	"snapshot_storage_key" text NOT NULL,
	"tldraw_schema_version" integer DEFAULT 1 NOT NULL,
	"source" "checkpoint_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"status" "invite_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"board_id" uuid NOT NULL,
	"relationship" "library_relationship" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_opened_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "live_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"host_user_id" text NOT NULL,
	"title" text NOT NULL,
	"livekit_room_name" text NOT NULL,
	"status" "live_session_status" DEFAULT 'live' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"handle" text NOT NULL,
	"normalized_handle" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"role_label" text DEFAULT 'Learner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "session_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "session_role" NOT NULL,
	"can_edit_board" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_access" ADD CONSTRAINT "board_access_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_access" ADD CONSTRAINT "board_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_host_user_id_user_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_memberships" ADD CONSTRAINT "session_memberships_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_memberships" ADD CONSTRAINT "session_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_notes" ADD CONSTRAINT "student_notes_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_notes" ADD CONSTRAINT "student_notes_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "board_access_active_unique" ON "board_access" USING btree ("board_id","user_id");--> statement-breakpoint
CREATE INDEX "boards_owner_id_idx" ON "boards" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "boards_room_id_unique" ON "boards" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "checkpoints_board_id_idx" ON "checkpoints" USING btree ("board_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invites_code_hash_unique" ON "invites" USING btree ("code_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "library_items_unique" ON "library_items" USING btree ("user_id","board_id","relationship");--> statement-breakpoint
CREATE INDEX "live_sessions_board_id_idx" ON "live_sessions" USING btree ("board_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_unique" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_normalized_handle_unique" ON "profiles" USING btree ("normalized_handle");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_memberships_unique" ON "session_memberships" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_notes_board_student_unique" ON "student_notes" USING btree ("board_id","student_id");