"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRequiredUser } from "../auth/auth";
import { getDb } from "../db/client";
import { friendships, profiles } from "../db/schema";
import { validateHandle } from "../domain/handles";
import {
  canRespondToFriendRequest,
  canSendFriendRequest,
  parseChannelVisibilityInput,
  type FriendRequestResponse,
} from "../domain/profile-privacy";

export async function upsertProfileAction(formData: FormData) {
  const user = await getRequiredUser();
  if (!user) redirect("/sign-in");

  const handleResult = validateHandle(String(formData.get("handle") ?? ""));
  if (!handleResult.ok) {
    throw new Error(handleResult.reason);
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  if (displayName.length < 2 || displayName.length > 80) {
    throw new Error("Display name must be 2-80 characters.");
  }

  const bio = String(formData.get("bio") ?? "")
    .trim()
    .slice(0, 280);
  const roleLabel = String(formData.get("roleLabel") ?? "Learner")
    .trim()
    .slice(0, 40);
  const teachingEnabled = formData.get("teachingEnabled") === "on";
  const channelVisibility = parseChannelVisibilityInput(formData.get("channelVisibility"));

  await getDb()
    .insert(profiles)
    .values({
      userId: user.id,
      handle: handleResult.normalized,
      normalizedHandle: handleResult.normalized,
      displayName,
      bio,
      roleLabel,
      teachingEnabled,
      channelVisibility,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        handle: handleResult.normalized,
        normalizedHandle: handleResult.normalized,
        displayName,
        bio,
        roleLabel,
        teachingEnabled,
        channelVisibility,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/app/profile");
  revalidatePath(`/u/${handleResult.normalized}`);
  revalidatePath("/app/search");
}

export async function sendFriendRequestAction(profileUserId: string) {
  const user = await getRequiredUser();
  if (!user) redirect("/sign-in");

  const db = getDb();
  const [targetProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, profileUserId))
    .limit(1);
  if (!targetProfile) throw new Error("Profile not found.");

  const [existingFriendship] = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, profileUserId)),
        and(eq(friendships.requesterId, profileUserId), eq(friendships.addresseeId, user.id)),
      ),
    )
    .limit(1);

  if (!canSendFriendRequest(user, profileUserId, existingFriendship)) {
    throw new Error("Friend request already exists.");
  }

  await db.insert(friendships).values({
    requesterId: user.id,
    addresseeId: profileUserId,
  });

  revalidatePath("/app/profile");
  revalidatePath(`/u/${targetProfile.handle}`);
  revalidatePath("/app/search");
}

export async function respondFriendRequestAction(
  friendshipId: string,
  response: FriendRequestResponse,
) {
  const user = await getRequiredUser();
  if (!user) redirect("/sign-in");

  const db = getDb();
  const [friendship] = await db
    .select()
    .from(friendships)
    .where(eq(friendships.id, friendshipId))
    .limit(1);
  if (!friendship || !canRespondToFriendRequest(user, friendship, response)) {
    throw new Error("Friend request not found.");
  }

  await db
    .update(friendships)
    .set({ status: response, respondedAt: new Date(), updatedAt: new Date() })
    .where(eq(friendships.id, friendship.id));

  const otherUserId =
    friendship.requesterId === user.id ? friendship.addresseeId : friendship.requesterId;
  const [otherProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, otherUserId))
    .limit(1);

  revalidatePath("/app/profile");
  if (otherProfile) {
    revalidatePath(`/u/${otherProfile.handle}`);
  }
  revalidatePath("/app/search");
}
