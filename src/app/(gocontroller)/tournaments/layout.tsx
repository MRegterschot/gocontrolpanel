import { auth } from "@/lib/auth";
import { routes } from "@/routes";
import { redirect } from "next/navigation";

export default async function TournamentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect(routes.login);
  }

  return <div className="p-4 lg:p-6 h-full">{children}</div>;
}
