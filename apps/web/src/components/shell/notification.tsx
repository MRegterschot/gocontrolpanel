import { Notifications } from "@tmcp/db";

export default function Notification({
  notification,
}: {
  notification: Notifications;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        {!notification.read && (
          <span className="w-2 h-2 bg-destructive rounded-full" />
        )}
        {notification.message}
      </span>
      {notification.description && (
        <span className="text-muted-foreground text-xs">
          {notification.description}
        </span>
      )}
    </div>
  );
}
