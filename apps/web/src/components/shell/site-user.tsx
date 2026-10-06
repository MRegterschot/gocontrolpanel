"use client";

import { IconBell, IconDotsVertical, IconLogout } from "@tabler/icons-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useNotifications } from "@/providers/notification-provider";
import { routes } from "@/routes";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../theme-toggle";
import { NotificationsList } from "./notifications-list";

export function SiteUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { data: session } = useSession();
  const { unreadCount } = useNotifications();

  const signOutHandler = async () => {
    const data = await signOut({
      callbackUrl: routes.login,
      redirect: false,
    });
    router.push(data.url);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={`https://avatars.ubisoft.com/${session?.user.ubiId}/default_146_146.png`}
                  alt={session?.user.displayName}
                />
                <AvatarFallback className="rounded-lg">
                  {session?.user.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {session?.user.displayName}
                </span>
              </div>
              <div className="ml-auto flex gap-2">
                <div className="relative">
                  <IconBell className="size-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 text-center rounded-full bg-destructive text-[8px]">
                      {unreadCount}
                    </span>
                  )}
                </div>

                <IconDotsVertical className="size-4" />
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={`https://avatars.ubisoft.com/${session?.user.ubiId}/default_146_146.png`}
                    alt={session?.user.displayName}
                  />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {session?.user.displayName}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <NotificationsList />
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <ThemeToggle />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOutHandler}>
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
