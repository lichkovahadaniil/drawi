import { cookies } from "next/headers";
import { ThemeToggle } from "@/components/theme-toggle";
import { DRAWI_THEME_COOKIE, normalizeDrawiTheme } from "@/components/theme";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const initialTheme = normalizeDrawiTheme(cookieStore.get(DRAWI_THEME_COOKIE)?.value);

  return (
    <main className="mx-auto grid max-w-3xl gap-5">
      <header className="drawi-page-header">
        <div>
          <p className="drawi-kicker">Settings</p>
          <h1>Workspace settings</h1>
        </div>
      </header>

      <section>
        <ThemeToggle initialTheme={initialTheme} />
      </section>
    </main>
  );
}
