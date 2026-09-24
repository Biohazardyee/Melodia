import React, { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import apiClient from "../api/client";
import { useSocket } from "../context/SocketContext";
import { AxiosResponse } from "axios";

export const NotificationBell: React.FC = () => {
  const navigate: NavigateFunction = useNavigate();
  const { t } = useTranslation();
  const socket = useSocket();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchCount = useCallback(async (): Promise<void> => {
    const token: string | null = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded: any = jwtDecode(token);
      const userId = decoded.id || decoded.userId;

      const res: AxiosResponse = await apiClient.get(
          `/notifications/user/${userId}`,
      );
      const list = res.data.notifications || [];
      const count = list.filter((n: any) => !n.is_read).length;
      setUnreadCount(count);
    } catch (e) {
      console.error("Impossible de charger le compteur de notifications", e);
    }
  }, []);

  useEffect(() => {
    fetchCount();

    // Mise à jour instantanée (optimiste) quand les notifications sont lues
    const handleRead = (e: Event): void => {
      const detail = (e as CustomEvent).detail;
      if (detail?.readAll) {
        setUnreadCount(0);
      } else if (detail?.readCount) {
        setUnreadCount((c) => Math.max(0, c - detail.readCount));
      } else {
        fetchCount();
      }
    };
    window.addEventListener("notificationsRead", handleRead);

    // Filet de sécurité si un événement temps réel est manqué
    const interval = setInterval(fetchCount, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notificationsRead", handleRead);
    };
  }, [fetchCount]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notification: any): void => {
      fetchCount();

      if (notification?.action === "badge_earned") {
        toast.success(t("toast_badge_earned", "Nouveau badge débloqué ! 🎉"));
      }
    };

    socket.on("notification_received", handleNotification);

    return (): void => {
      socket.off("notification_received", handleNotification);
    };
  }, [socket, fetchCount, t]);

  return (
      <button
          onClick={() => navigate("/notifications")}
          aria-label={t("notifications_title")}
          className="icon-button relative"
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] font-extrabold h-5 w-5 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)] border border-slate-950 dark:border-white animate-pulse">
        {unreadCount > 9 ? "9+" : unreadCount}
      </span>
  )}
</button>
);
};
