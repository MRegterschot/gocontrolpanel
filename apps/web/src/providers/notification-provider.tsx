"use client";
import { markNotificationAsRead } from "@/actions/database/notifications";
import useWebSocket from "@/hooks/use-websocket";
import { getNotifications } from "@/lib/api-client/database";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { logger } from "@/lib/logger";
import { ServerError } from "@/types/responses";
import { Notifications } from "@tmcp/db";
import { wsPaths } from "@tmcp/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { toast } from "sonner";

interface NotificationContextType {
  notifications: Notifications[];
  unreadCount: number;
  addNotification: (notification: Notifications) => void;
  markAsRead: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new ServerError(
      "useNotifications must be used within a NotificationProvider",
      "UseNotificationsError",
    );
  }
  return ctx;
};

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const queryClient = useQueryClient();

  const { data, error } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => unwrap(getNotifications(), "FetchNotificationsError"),
  });
  const notifications = data ?? [];

  // Sockets and mark-as-read update the cached list in place
  const setNotifications = useCallback(
    (update: (prev: Notifications[]) => Notifications[]) =>
      queryClient.setQueryData<Notifications[]>(
        queryKeys.notifications,
        (prev) => update(prev ?? []),
      ),
    [queryClient],
  );

  useEffect(() => {
    if (!error) return;
    const meta = {
      type: "provider",
      module: "notification-provider",
      function: "fetchNotifications",
    };
    logger.error({ meta, error }, "Failed to fetch notifications");
  }, [error]);

  const handleMessage = useCallback((_: string, data: Notifications) => {
    addNotification(data);
  }, []);

  useWebSocket({
    path: wsPaths.notifications,
    onMessage: handleMessage,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (notification: Notifications) => {
    setNotifications((prev) => [notification, ...prev]);
    toast.info(notification.message, {
      description: notification.description,
      duration: 60000,
      closeButton: true,
    });
  };

  const markAsRead = async (id: string) => {
    if (notifications.find((n) => n.id === id)?.read) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );

    try {
      const { data, error } = await markNotificationAsRead(id);
      if (error) {
        throw new ServerError(error, "MarkNotificationAsReadError");
      }
      setNotifications((prev) => prev.map((n) => (n.id === id ? data : n)));
    } catch (error) {
      const meta = {
        type: "provider",
        module: "notification-provider",
        function: "markAsRead",
      };
      logger.error({ meta, error }, "Failed to mark notification as read");
    }
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
