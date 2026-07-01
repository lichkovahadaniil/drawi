import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { DRAWI_THEME_COOKIE, normalizeDrawiTheme } from "@/components/theme";
import { ThemeBootScript } from "@/components/theme-boot-script";
import { getServerSession } from "@/server/auth/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.user) redirect("/sign-in");

  const cookieStore = await cookies();
  const initialTheme = normalizeDrawiTheme(cookieStore.get(DRAWI_THEME_COOKIE)?.value);

  return (
    <>
      <ThemeBootScript initialTheme={initialTheme} />
      <AppShell userEmail={session.user.email}>{children}</AppShell>
    </>
  );
}
