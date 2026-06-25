import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getServerSession } from "@/server/auth/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-4 sm:px-6">
      <header className="drawi-panel mb-5 flex flex-wrap items-center justify-between gap-3 px-3 py-3">
        <nav className="flex flex-wrap items-center gap-1" aria-label="Primary">
          <Link
            href="/app"
            className="mr-3 px-2 text-xl font-black tracking-tight text-[var(--ink-0)]"
          >
            drawi
          </Link>
          <Link href="/app" className="drawi-muted-link">
            Home
          </Link>
          <Link href="/app/boards" className="drawi-muted-link">
            Boards
          </Link>
          <Link href="/app/profile" className="drawi-muted-link">
            Profile
          </Link>
        </nav>
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden max-w-56 truncate text-sm text-[var(--ink-2)] sm:block">
            {session.user.email}
          </span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
