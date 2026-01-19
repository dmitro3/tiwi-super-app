"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { IoNotificationsOutline, IoCloseOutline } from "react-icons/io5";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { Notification } from "@/lib/shared/types/notifications";

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string | null;
  onNotificationsViewed?: () => void;
}

export default function NotificationsDropdown({
  isOpen,
  onClose,
  walletAddress,
  onNotificationsViewed,
}: NotificationsDropdownProps) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/notifications?status=live&userWallet=${encodeURIComponent(walletAddress)}`
      );
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  const markNotificationsAsViewed = useCallback(async () => {
    if (!walletAddress || notifications.length === 0) return;

    try {
      const notificationIds = notifications.map(n => n.id);
      const response = await fetch("/api/v1/notifications/mark-viewed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationIds,
          userWallet: walletAddress,
        }),
      });

      if (response.ok && onNotificationsViewed) {
        onNotificationsViewed();
      }
    } catch (error) {
      console.error("Error marking notifications as viewed:", error);
    }
  }, [walletAddress, notifications, onNotificationsViewed]);

  // Fetch live notifications when opened
  useEffect(() => {
    if (isOpen && walletAddress) {
      fetchNotifications();
    }
  }, [isOpen, walletAddress, fetchNotifications]);

  // Mark notifications as viewed when dropdown opens and notifications are loaded
  useEffect(() => {
    if (isOpen && walletAddress && notifications.length > 0) {
      markNotificationsAsViewed();
    }
  }, [isOpen, walletAddress, notifications.length, markNotificationsAsViewed]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const getPriorityColor = (priority: Notification["priority"]) => {
    switch (priority) {
      case "critical":
        return "text-[#ff5c5c]";
      case "important":
        return "text-[#ffa500]";
      default:
        return "text-white";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("common.just_now");
    if (diffMins < 60) return `${diffMins}${t("common.minutes_ago")}`;
    if (diffHours < 24) return `${diffHours}${t("common.hours_ago")}`;
    if (diffDays < 7) return `${diffDays}${t("common.days_ago")}`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <div
        ref={dropdownRef}
        className="fixed top-16 right-4 md:right-8 lg:right-10 w-[90vw] sm:w-[400px] md:w-[450px] max-h-[600px] bg-[#0b0f0a] border border-[#1f261e] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1f261e]">
          <h3 className="text-lg font-semibold text-white">{t("notifications.title")}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#121712] rounded-lg transition-colors"
            aria-label={t("notifications.close")}
          >
            <IoCloseOutline className="w-5 h-5 text-[#b5b5b5]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-[#b5b5b5]">{t("notifications.loading")}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <IoNotificationsOutline className="w-12 h-12 text-[#7c7c7c] mx-auto mb-3" />
              <p className="text-[#b5b5b5] text-sm">{t("notifications.no_notifications")}</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1f261e]">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 hover:bg-[#121712] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-white font-medium text-sm flex-1">
                      {notification.title}
                    </h4>
                    <span className={`text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                      {notification.priority}
                    </span>
                  </div>
                  <p className="text-[#b5b5b5] text-xs mb-2 line-clamp-3">
                    {notification.messageBody}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7c7c7c] text-xs">
                      {formatDate(notification.createdAt)}
                    </span>
                    <span className="text-[#7c7c7c] text-xs capitalize">
                      {notification.deliveryType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

