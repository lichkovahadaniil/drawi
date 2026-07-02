"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { authClient } from "@/server/auth/client";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <form
      className="drawi-panel grid gap-4 p-6"
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");
        const name = String(formData.get("name") ?? email.split("@")[0] ?? "drawi user");
        const next = getSafeNextPath(searchParams.get("next"));

        startTransition(async () => {
          setError(null);
          const response =
            mode === "sign-up"
              ? await authClient.signUp.email({ email, password, name })
              : await authClient.signIn.email({ email, password });

          if (response.error) {
            setError(response.error.message ?? "Authentication failed.");
            return;
          }

          router.push(next);
          router.refresh();
        });
      }}
    >
      {mode === "sign-up" ? (
        <label className="drawi-label">
          Name
          <input className="drawi-input" name="name" required minLength={2} autoComplete="name" />
        </label>
      ) : null}
      <label className="drawi-label">
        Email
        <input className="drawi-input" name="email" required type="email" autoComplete="email" />
      </label>
      <label className="drawi-label">
        Password
        <input
          className="drawi-input"
          name="password"
          required
          type="password"
          minLength={8}
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
        />
      </label>
      {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
      <button className="drawi-button" type="submit" disabled={!isReady || isPending}>
        {!isReady
          ? "Loading..."
          : isPending
            ? "Working..."
            : mode === "sign-up"
              ? "Create account"
              : "Sign in"}
      </button>
    </form>
  );
}

function getSafeNextPath(next: string | null) {
  if (next?.startsWith("/join/")) return next as `/join/${string}`;
  if (next?.startsWith("/u/")) return next as `/u/${string}`;
  return "/app";
}
