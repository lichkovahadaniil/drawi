import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
      <nav className="flex items-center justify-between">
        <Link href="/" className="text-xl font-black tracking-tight" aria-label="drawi home">
          drawi
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="drawi-button secondary">
            Sign in
          </Link>
          <Link href="/sign-up" className="drawi-button">
            Create an account
          </Link>
        </div>
      </nav>

      <section className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1fr_0.8fr]">
        <div className="max-w-2xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
            Think together. Learn visibly.
          </p>
          <h1 className="text-balance text-5xl font-black leading-[0.98] tracking-tight text-[var(--ink-0)] md:text-7xl">
            Draw ideas. Drive progress.
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-[var(--ink-1)]">
            drawi is a live visual lesson room where the shared canvas is the primary learning
            surface. Video helps the conversation, while the board, checkpoints, and private notes
            remain useful after the lesson ends.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/sign-up" className="drawi-button">
              Start a lesson
            </Link>
            <Link href="/sign-in" className="drawi-button secondary">
              I already have an account
            </Link>
          </div>
        </div>

        <div className="drawi-panel p-4">
          <div className="rounded-[10px] border border-[var(--line-subtle)] bg-[var(--paper-0)] p-4">
            <div className="mb-4 flex items-center justify-between text-sm text-[var(--ink-2)]">
              <span>Live lesson canvas</span>
              <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-[var(--primary)]">
                board first
              </span>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-white">
              <svg viewBox="0 0 640 480" className="h-full w-full">
                <defs>
                  <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#e4dfd3" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="640" height="480" fill="url(#grid)" />
                <path
                  d="M90 130 C170 74 255 108 290 178 C324 244 414 244 500 178"
                  fill="none"
                  stroke="#3156d3"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
                <rect x="94" y="260" width="164" height="88" rx="14" fill="#e8edff" />
                <text x="116" y="306" fill="#171715" fontSize="24" fontWeight="700">
                  attempt
                </text>
                <path d="M312 304 h150" stroke="#df6245" strokeWidth="8" strokeLinecap="round" />
                <path
                  d="M450 280 l32 24 -32 24"
                  fill="none"
                  stroke="#df6245"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="520" cy="96" r="34" fill="#fbe9e3" />
                <text x="499" y="104" fill="#171715" fontSize="24" fontWeight="700">
                  ✓
                </text>
              </svg>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
