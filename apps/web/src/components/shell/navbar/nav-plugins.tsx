import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { routes } from "@/routes";
import { IconPuzzle } from "@tabler/icons-react";
import Link from "next/link";

export default function NavPlugins() {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden select-none">
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Plugins" asChild>
              <Link href={routes.plugins.index}>
                <IconPuzzle />
                <span>Plugins</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
