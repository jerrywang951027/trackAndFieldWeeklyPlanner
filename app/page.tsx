import { redirect } from "next/navigation";
import { getAthlete } from "@/lib/queries";

export default async function RootPage() {
  const athlete = await getAthlete().catch(() => null);
  if (!athlete) redirect("/onboarding");
  redirect("/home");
}
