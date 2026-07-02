import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getServerSession } from "@/server/auth/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session?.user) redirect("/sign-in");

  return <AppShell userEmail={session.user.email}>{children}</AppShell>;
}
