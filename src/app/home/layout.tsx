import { PageShell } from "@/components/layout/page-shell";
import { HomeHeader } from "@/features/home/ui/home-header";
import { getCurrentUser } from "@/server/current-user";

/** The header lives in the layout, so it stays visible when the page shows its error state. */
export default async function HomeLayout({ children }: LayoutProps<"/home">) {
  const user = await getCurrentUser();

  return <PageShell header={<HomeHeader userName={user.name} />}>{children}</PageShell>;
}
