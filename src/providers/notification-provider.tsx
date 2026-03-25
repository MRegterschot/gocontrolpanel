"use client";
import {
  getNotifications,
  markNotificationAsRead,
} from "@/actions/database/notifications";
import useWebSocket from "@/hooks/use-websocket";
import { logger } from "@/lib/logger";
import { Notifications } from "@/lib/prisma/generated";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
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
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return ctx;
};

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [notifications, setNotifications] = useState<Notifications[]>([]);

  const handleMessage = useCallback((_: string, data: Notifications) => {
    addNotification(data);
  }, []);

  useWebSocket({
    url: "/api/ws/notifications",
    onMessage: handleMessage,
  });

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data, error } = await getNotifications();
        if (error) {
          throw new Error(error);
        }
        setNotifications(data);
      } catch (error) {
        logger.error(error, "Failed to fetch notifications");
      }
    };
    fetchNotifications();
  }, []);

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
        throw new Error(error);
      }
      setNotifications((prev) => prev.map((n) => (n.id === id ? data : n)));
    } catch (error) {
      logger.error(error, "Failed to mark notification as read");
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
