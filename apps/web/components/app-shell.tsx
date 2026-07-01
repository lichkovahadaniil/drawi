"use client";

import { Home, LogIn, PanelsTopLeft, Search, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";

const NAV_ITEMS = [
  { href: "/app", label: "Home", Icon: Home },
  { href: "/app/boards", label: "Boards", Icon: PanelsTopLeft },
  { href: "/join", label: "Join", Icon: LogIn },
  { href: "/app/search", label: "Search", Icon: Search },
  { href: "/app/profile", label: "Profile", Icon: UserRound },
] as const;

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <div className="drawi-app-root">
      <header className="drawi-topbar">
        <div className="drawi-topbar-inner">
          <Link href="/app" className="drawi-brand" aria-label="Drawi home">
            <span className="drawi-brand-mark" aria-hidden="true">
              d
            </span>
            <span>drawi</span>
          </Link>

          <nav className="drawi-primary-nav" aria-label="Primary">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const isActive = href === "/app" ? pathname === href : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className="drawi-nav-link"
                  data-active={isActive ? "true" : "false"}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon aria-hidden="true" size={17} strokeWidth={2.2} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="drawi-shell-actions">
            <span className="drawi-user-chip" title={userEmail}>
              {userEmail}
            </span>
            <Link href="/app/settings" className="drawi-icon-button" aria-label="Settings">
              <Settings aria-hidden="true" size={18} strokeWidth={2.2} />
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="drawi-content">{children}</div>
    </div>
  );
}
