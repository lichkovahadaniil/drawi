import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { getProfileSearchResults } from "@/server/services/queries";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const data = await getProfileSearchResults(q);
  if (!data) redirect("/sign-in?next=/app/search");

  return (
    <main className="mx-auto grid max-w-4xl gap-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-[var(--ink-0)]">Search</h1>
        <p className="mt-2 text-[var(--ink-2)]">Find profiles by nickname or handle.</p>
      </header>

      <form className="drawi-panel flex flex-col gap-3 p-4 sm:flex-row" method="get">
        <input
          className="drawi-input min-h-10 flex-1"
          name="q"
          defaultValue={data.query}
          placeholder="nickname or handle"
        />
        <button className="drawi-button" type="submit">
          Search
        </button>
      </form>

      <section className="grid gap-3">
        {data.results.length ? (
          data.results.map((result) => (
            <Link
              key={result.profile.id}
              className="drawi-panel drawi-panel-link grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              href={result.href as Route}
            >
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--ink-3)]">
                  @{result.profile.handle}
                </p>
                <h2 className="mt-1 text-balance text-xl font-black text-[var(--ink-0)]">
                  {result.profile.displayName}
                </h2>
                <p className="mt-2 text-pretty text-sm leading-6 text-[var(--ink-2)]">
                  {result.profile.bio || "Open profile"}
                </p>
              </div>
              <div className="grid gap-1 text-left sm:text-right">
                <p className="text-sm font-black text-[var(--ink-0)]">
                  Opens {result.tab === "created" ? "Created" : "Joined"}
                </p>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]">
                  <span className="tabular-nums">{result.createdBoardCount}</span> created ·{" "}
                  <span className="tabular-nums">{result.joinedBoardCount}</span> joined
                </p>
              </div>
            </Link>
          ))
        ) : (
          <div className="drawi-panel p-5 text-sm text-[var(--ink-2)]">
            {data.query ? "No visible profiles found." : "Search for a profile."}
          </div>
        )}
      </section>
    </main>
  );
}
