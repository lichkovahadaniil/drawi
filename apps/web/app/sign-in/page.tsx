import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignInPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center gap-6 px-6">
      <Link href="/" className="text-xl font-black tracking-tight text-[var(--ink-0)]">
        drawi
      </Link>
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--ink-0)]">Sign in</h1>
        <p className="mt-2 text-[var(--ink-2)]">Return to your lesson boards.</p>
      </div>
      <Suspense
        fallback={<div className="drawi-panel p-6 text-sm text-[var(--ink-2)]">Loading...</div>}
      >
        <AuthForm mode="sign-in" />
      </Suspense>
      <p className="text-sm text-[var(--ink-2)]">
        New to drawi?{" "}
        <Link href="/sign-up" className="font-bold text-[var(--primary)]">
          Create an account
        </Link>
      </p>
    </main>
  );
}
