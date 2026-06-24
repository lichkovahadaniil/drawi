import { getProfile } from "@/server/services/queries";
import { upsertProfileAction } from "@/server/services/profile-actions";

export default async function ProfilePage() {
  const data = await getProfile();

  return (
    <main className="mx-auto grid max-w-2xl gap-6">
      <div>
        <h1 className="text-3xl font-black">Profile</h1>
        <p className="mt-2 text-[var(--ink-2)]">Minimal identity for live lessons.</p>
      </div>
      <form action={upsertProfileAction} className="drawi-panel grid gap-4 p-6">
        <label className="drawi-label">
          Handle
          <input
            className="drawi-input"
            name="handle"
            defaultValue={data?.profile?.handle ?? ""}
            required
            minLength={3}
          />
        </label>
        <label className="drawi-label">
          Display name
          <input
            className="drawi-input"
            name="displayName"
            defaultValue={data?.profile?.displayName ?? data?.user.name ?? ""}
            required
          />
        </label>
        <label className="drawi-label">
          Role label
          <input
            className="drawi-input"
            name="roleLabel"
            defaultValue={data?.profile?.roleLabel ?? "Learner"}
          />
        </label>
        <label className="drawi-label">
          Bio
          <textarea
            className="drawi-input min-h-32"
            name="bio"
            defaultValue={data?.profile?.bio ?? ""}
            maxLength={280}
          />
        </label>
        <button className="drawi-button" type="submit">
          Save profile
        </button>
      </form>
    </main>
  );
}
