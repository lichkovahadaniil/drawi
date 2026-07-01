import Link from "next/link";
import { getServerSession } from "@/server/auth/auth";
import { joinInviteAction } from "@/server/services/session-actions";

export default async function JoinPage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;
  const session = await getServerSession();

  if (!session?.user) {
    return (
      <main className="mx-auto grid min-h-screen max-w-lg content-center gap-5 px-6">
        <h1 className="text-3xl font-black tracking-tight text-[var(--ink-0)]">
          Join a drawi lesson
        </h1>
        <p className="text-[var(--ink-2)]">
          Sign in or create an account before joining this private lesson.
        </p>
        <div className="flex gap-3">
          <Link href={`/sign-in?next=/join/${inviteCode}`} className="drawi-button">
            Sign in
          </Link>
          <Link href={`/sign-up?next=/join/${inviteCode}`} className="drawi-button secondary">
            Create account
          </Link>
        </div>
        <Link href="/join" className="drawi-muted-link w-fit">
          Use a different code
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-lg content-center gap-5 px-6">
      <h1 className="text-3xl font-black tracking-tight text-[var(--ink-0)]">Ready to join?</h1>
      <p className="text-[var(--ink-2)]">
        You will enter the live session with the shared board and optional camera/microphone.
      </p>
      <form action={joinInviteAction.bind(null, inviteCode)}>
        <button className="drawi-button" type="submit">
          Join lesson
        </button>
      </form>
      <Link href="/join" className="drawi-muted-link w-fit">
        Use a different code
      </Link>
    </main>
  );
}
