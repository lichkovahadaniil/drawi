"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRequiredUser } from "../auth/auth";
import { getDb } from "../db/client";
import { profiles } from "../db/schema";
import { validateHandle } from "../domain/handles";

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

  await getDb()
    .insert(profiles)
    .values({
      userId: user.id,
      handle: handleResult.normalized,
      normalizedHandle: handleResult.normalized,
      displayName,
      bio,
      roleLabel,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        handle: handleResult.normalized,
        normalizedHandle: handleResult.normalized,
        displayName,
        bio,
        roleLabel,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/app/profile");
}
