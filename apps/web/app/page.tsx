import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-6">
      <nav className="flex items-center justify-between border-b border-[var(--line-subtle)] pb-5">
        <Link
          href="/"
          className="text-xl font-black tracking-tight text-[var(--ink-0)]"
          aria-label="drawi home"
        >
          drawi
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="drawi-button secondary">
            Sign in
          </Link>
          <Link href="/sign-up" className="drawi-button">
            Start lesson
          </Link>
        </div>
      </nav>

      <section className="grid flex-1 items-center gap-12 py-14 md:py-20 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="max-w-2xl">
          <h1 className="text-balance text-5xl font-black leading-[0.98] tracking-tight text-[var(--ink-0)] md:text-7xl">
            Draw ideas.
            <br />
            Drive progress.
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-[var(--ink-1)]">
            A quiet live lesson room where the shared canvas stays central. Video, checkpoints, and
            private notes support the work without taking over the screen.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/sign-up" className="drawi-button">
              Start a lesson
            </Link>
            <Link href="/sign-in" className="drawi-button secondary">
              I already have an account
            </Link>
          </div>
          <dl className="mt-12 grid max-w-xl grid-cols-3 gap-3 text-sm text-[var(--ink-2)]">
            <div className="border-t border-[var(--line-subtle)] pt-3">
              <dt className="font-bold text-[var(--ink-0)]">Board first</dt>
              <dd className="mt-1">Shared tldraw canvas</dd>
            </div>
            <div className="border-t border-[var(--line-subtle)] pt-3">
              <dt className="font-bold text-[var(--ink-0)]">Private</dt>
              <dd className="mt-1">Student notes</dd>
            </div>
            <div className="border-t border-[var(--line-subtle)] pt-3">
              <dt className="font-bold text-[var(--ink-0)]">Saved</dt>
              <dd className="mt-1">Lesson checkpoints</dd>
            </div>
          </dl>
        </div>

        <div className="relative min-h-[430px]">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="drawi-panel min-h-36 p-5">
              <p className="text-lg font-black">Product</p>
              <div className="mt-7 grid gap-4">
                <span className="drawi-sketch-line w-28" />
                <span className="drawi-sketch-line w-24" />
                <span className="drawi-sketch-line w-16" />
              </div>
            </div>
            <div className="drawi-panel min-h-36 p-5 md:mt-4">
              <p className="text-lg font-black">Sign up</p>
              <div className="mt-8 grid gap-4">
                <span className="drawi-sketch-line mx-auto w-24" />
                <span className="drawi-sketch-line mx-auto w-16" />
              </div>
            </div>
            <div className="drawi-panel min-h-36 p-5">
              <p className="text-lg font-black">Dashboard</p>
              <div className="mt-7 grid grid-cols-[56px_1fr] gap-4">
                <div className="drawi-panel h-16 p-2 shadow-none">
                  <div className="drawi-sketch-line mt-7 w-8" />
                </div>
                <svg viewBox="0 0 160 90" className="h-24 w-full text-[var(--ink-1)]">
                  <path
                    d="M10 68 L44 44 L72 56 L108 22 L148 30"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="5"
                  />
                  <path
                    d="M135 19 L148 30 L136 42"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="5"
                  />
                  <path
                    d="M16 82 H124"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="4"
                  />
                </svg>
              </div>
            </div>
          </div>

          <svg
            viewBox="0 0 760 250"
            className="pointer-events-none absolute inset-x-0 top-16 hidden h-64 w-full text-[var(--ink-1)] md:block"
            aria-hidden="true"
          >
            <path
              d="M160 54 C196 54 212 54 248 54"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="3"
            />
            <path
              d="M236 42 L252 54 L236 66"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            <path
              d="M404 54 C440 54 456 54 492 54"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="3"
            />
            <path
              d="M480 42 L496 54 L480 66"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            <path
              d="M640 138 C652 184 600 216 486 216 H286 C172 216 116 194 118 150"
              fill="none"
              stroke="currentColor"
              strokeDasharray="12 12"
              strokeLinecap="round"
              strokeWidth="3"
            />
            <path
              d="M110 164 L118 146 L134 158"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </svg>

          <div className="drawi-panel mx-auto mt-14 w-fit rounded-[999px] px-10 py-5 text-center text-2xl font-black shadow-none">
            iterate
          </div>
        </div>
      </section>
    </main>
  );
}
