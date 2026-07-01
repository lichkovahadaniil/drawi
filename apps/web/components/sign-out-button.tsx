"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/server/auth/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="drawi-button secondary"
      type="button"
      aria-label="Sign out"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut aria-hidden="true" size={17} strokeWidth={2.2} />
      <span>Sign out</span>
    </button>
  );
}
