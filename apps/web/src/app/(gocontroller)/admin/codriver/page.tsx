import PanelCodriver from "@/components/codriver/panel-codriver";
import { auth } from "@/lib/auth";
import { routes } from "@/routes";
import { redirect } from "next/navigation";

export default async function AdminCodriverPage() {
  const session = await auth();
  if (!session?.user.admin) {
    redirect(routes.dashboard);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Codriver</h1>
        <h4 className="text-muted-foreground">
          The AI assistant for your game servers: turn it on, store the shared
          API key, set budgets and decide who may use it.
        </h4>
      </div>
      <PanelCodriver />
    </div>
  );
}
