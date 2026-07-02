import { redirect } from "next/navigation";
import { getMyProfile } from "@/server/services/queries";

export default async function ProfilePage() {
  const data = await getMyProfile();
  if (!data) redirect("/sign-in?next=/app/profile");

  if (!data.profile) {
    redirect("/app/settings?profile=create");
  }

  redirect(`/u/${data.profile.handle}`);
}
