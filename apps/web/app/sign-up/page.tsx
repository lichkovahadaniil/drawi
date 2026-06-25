import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignUpPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center gap-6 px-6">
      <Link href="/" className="text-xl font-black tracking-tight text-[var(--ink-0)]">
        drawi
      </Link>
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--ink-0)]">
          Create an account
        </h1>
        <p className="mt-2 text-[var(--ink-2)]">Start a shared visual lesson.</p>
      </div>
      <Suspense
        fallback={<div className="drawi-panel p-6 text-sm text-[var(--ink-2)]">Loading...</div>}
      >
        <AuthForm mode="sign-up" />
      </Suspense>
      <p className="text-sm text-[var(--ink-2)]">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-bold text-[var(--primary)]">
          Sign in
        </Link>
      </p>
    </main>
  );
}
