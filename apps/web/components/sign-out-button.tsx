"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/server/auth/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="drawi-button secondary"
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
