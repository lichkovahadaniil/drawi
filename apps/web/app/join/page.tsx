import Link from "next/link";
import { joinByCodeAction } from "@/server/services/session-actions";

export default function JoinByCodePage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-lg content-center gap-5 px-6">
      <Link
        href="/"
        className="w-fit text-xl font-black tracking-tight text-[var(--ink-0)]"
        aria-label="drawi home"
      >
        drawi
      </Link>
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--ink-0)]">Join a lesson</h1>
        <p className="mt-2 text-[var(--ink-2)]">
          Paste the lesson code or the full invite link from your tutor.
        </p>
      </div>
      <form action={joinByCodeAction} className="drawi-panel grid gap-4 p-5">
        <label className="drawi-label">
          Lesson code
          <input
            className="drawi-input"
            name="inviteCode"
            required
            autoComplete="off"
            placeholder="abc_DEF-123 or /join/abc_DEF-123"
          />
        </label>
        <button className="drawi-button" type="submit">
          Continue
        </button>
      </form>
      <p className="text-sm text-[var(--ink-2)]">
        Already have a direct invite link? Open it and drawi will take you to the same join flow.
      </p>
    </main>
  );
}
