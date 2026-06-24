import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getServerSession } from "@/server/auth/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-5 py-5">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <nav className="flex items-center gap-5" aria-label="Primary">
          <Link href="/app" className="text-xl font-black">
            drawi
          </Link>
          <Link href="/app" className="font-semibold text-[var(--ink-1)]">
            Home
          </Link>
          <Link href="/app/boards" className="font-semibold text-[var(--ink-1)]">
            Boards
          </Link>
          <Link href="/app/profile" className="font-semibold text-[var(--ink-1)]">
            Profile
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--ink-2)]">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
