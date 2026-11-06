"use client";

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/providers/notification-provider";
import { IconBell } from "@tabler/icons-react";
import { Fragment } from "react";
import Notification from "./notification";

export function NotificationsList() {
  const { notifications, markAsRead } = useNotifications();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <div className="flex items-center gap-2">
          <IconBell className="text-muted-foreground h-[1rem] w-[1rem]" />
          Notifications
        </div>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-[30vh] overflow-y-auto -translate-y-4">
        {notifications.length > 0 ? (
          notifications.map((notification, index) => (
            <Fragment key={index}>
              <DropdownMenuItem
                key={notification.id}
                onMouseOver={() => markAsRead(notification.id)}
                onClick={() => markAsRead(notification.id)}
              >
                <Notification notification={notification} />
              </DropdownMenuItem>

              {index < notifications.length - 1 && <DropdownMenuSeparator />}
            </Fragment>
          ))
        ) : (
          <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
