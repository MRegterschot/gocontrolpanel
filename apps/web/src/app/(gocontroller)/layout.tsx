import { AppSidebar } from "@/components/shell/app-sidebar";
import { SiteHeader } from "@/components/shell/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { NotificationProvider } from "@/providers/notification-provider";
import { ServersProvider } from "@/providers/servers-provider";
import { routes } from "@/routes";
import { redirect } from "next/navigation";

export default async function GoControllerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect(routes.login);
  }

  return (
    <ServersProvider>
      <NotificationProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader />
            <div className="h-full">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </NotificationProvider>
    </ServersProvider>
  );
}
