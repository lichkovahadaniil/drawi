CREATE TYPE "public"."board_visibility" AS ENUM('private', 'friends', 'public');--> statement-breakpoint
CREATE TYPE "public"."channel_visibility" AS ENUM('private', 'friends', 'public');--> statement-breakpoint
CREATE TYPE "public"."friendship_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" text NOT NULL,
	"addressee_id" text NOT NULL,
	"status" "friendship_status" DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "visibility" "board_visibility" DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "teaching_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "channel_visibility" "channel_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_user_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "boards_visibility_idx" ON "boards" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "friendships_requester_id_idx" ON "friendships" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "friendships_addressee_id_idx" ON "friendships" USING btree ("addressee_id");--> statement-breakpoint
CREATE INDEX "friendships_status_idx" ON "friendships" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_requester_addressee_unique" ON "friendships" USING btree ("requester_id","addressee_id");
