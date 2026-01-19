"use client";

import { useEffect, useState } from "react";
import { IoArrowBack } from "react-icons/io5";
import { SettingsView } from "./types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useDeviceSessionStore, type DeviceSession } from "@/lib/wallet/state/device-session-store";
import { useWalletManagerStore } from "@/lib/wallet/state/wallet-manager-store";
import { useWallet } from "@/lib/wallet/hooks/useWallet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ConnectedDevicesProps {
  onViewChange: (view: SettingsView) => void;
  onGoBack: () => void;
}

export default function ConnectedDevices({
  onViewChange,
  onGoBack,
}: ConnectedDevicesProps) {
  const { t } = useTranslation();
  void onViewChange; // kept for API compatibility; parent may pass it
  const getActiveWallet = useWalletManagerStore((s) => s.getActiveWallet);
  const activeWallet = getActiveWallet();
  const wallet = useWallet();
  
  const getSessionsForWallet = useDeviceSessionStore((s) => s.getSessionsForWallet);
  const getCurrentSession = useDeviceSessionStore((s) => s.getCurrentSession);
  const terminateSession = useDeviceSessionStore((s) => s.terminateSession);
  const terminateAllSessions = useDeviceSessionStore((s) => s.terminateAllSessions);
  const updateLastActive = useDeviceSessionStore((s) => s.updateLastActive);
  const clearActiveWallet = useWalletManagerStore((s) => s.clearActiveWallet);

  const [sessions, setSessions] = useState(
    activeWallet && activeWallet.isLocal && activeWallet.source === 'local'
      ? getSessionsForWallet(activeWallet.address)
      : []
  );
  const [isTerminating, setIsTerminating] = useState<string | null>(null);
  const [isTerminatingAll, setIsTerminatingAll] = useState(false);
  const [sessionToTerminate, setSessionToTerminate] = useState<DeviceSession | null>(null);
  const [showTerminateAllConfirm, setShowTerminateAllConfirm] = useState(false);

  // Update sessions when active wallet changes
  useEffect(() => {
    if (activeWallet && activeWallet.isLocal && activeWallet.source === 'local') {
      setSessions(getSessionsForWallet(activeWallet.address));
    } else {
      setSessions([]);
    }
  }, [activeWallet, getSessionsForWallet]);

  // Update last active time periodically for current session
  useEffect(() => {
    if (!activeWallet || !activeWallet.isLocal || activeWallet.source !== 'local') return;

    const currentSession = getCurrentSession(activeWallet.address);
    if (!currentSession) return;

    const interval = setInterval(() => {
      updateLastActive(currentSession.id);
      // Refresh sessions to show updated time
      setSessions(getSessionsForWallet(activeWallet.address));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [activeWallet, getCurrentSession, updateLastActive, getSessionsForWallet]);

  // Format time ago (for "last active" display)
  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t("common.just_now");
    if (minutes < 60) return `${minutes}${t("common.minutes_ago")}`;
    if (hours < 24) return `${hours}${t("common.hours_ago")}`;
    return `${days}${t("common.days_ago")}`;
  };

  // Format absolute time for "last active" (e.g. "Jan 5, 2:30 PM")
  const formatLastActive = (timestamp: number): string => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleTerminateDevice = async (sessionId: string) => {
    if (!activeWallet) return;

    setIsTerminating(sessionId);

    try {
      // Check if this is the current session BEFORE removing (getCurrentSession returns null after we remove it)
      const currentSession = getCurrentSession(activeWallet.address);
      const isCurrentDevice = !!(currentSession && currentSession.id === sessionId);

      // Remove the session from the store
      terminateSession(sessionId);

      // If we terminated THIS device's session, disconnect the wallet on this device
      if (isCurrentDevice) {
        await wallet.disconnect();
        clearActiveWallet();
        // View will switch to "only for local wallets" on re-render
      } else {
        setSessions(getSessionsForWallet(activeWallet.address));
      }
    } catch (error) {
      console.error("[ConnectedDevices] Failed to terminate session:", error);
    } finally {
      setIsTerminating(null);
    }
  };

  const handleTerminateAll = async () => {
    if (!activeWallet) return;

    setIsTerminatingAll(true);

    try {
      const currentSession = getCurrentSession(activeWallet.address);
      const currentSessionId = currentSession?.id;

      // Terminate all sessions except current
      terminateAllSessions(activeWallet.address, currentSessionId);

      // Refresh sessions
      setSessions(getSessionsForWallet(activeWallet.address));
    } catch (error) {
      console.error("[ConnectedDevices] Failed to terminate all sessions:", error);
    } finally {
      setIsTerminatingAll(false);
    }
  };

  // Only show for local wallets
  if (!activeWallet || !activeWallet.isLocal || activeWallet.source !== 'local') {
    return (
      <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8">
        <div className="flex justify-end mb-6">
          <button
            onClick={onGoBack}
            className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
          >
            <IoArrowBack size={16} />
            {t("settings.go_back")}
          </button>
        </div>

        <h2 className="text-2xl font-semibold text-white mb-4">
          {t("devices.not_available")}
        </h2>

        <p className="text-sm text-[#B5B5B5] mb-6">
          {t("devices.not_available_desc")}
        </p>
      </div>
    );
  }

  const currentSession = getCurrentSession(activeWallet.address);

  return (
    <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8">
      <div className="flex justify-end mb-6">
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
        >
          <IoArrowBack size={16} />
          {t("settings.go_back")}
        </button>
      </div>

      <h2 className="text-2xl font-semibold text-white mb-4">
        {t("devices.title")}
      </h2>

      <p className="text-sm text-[#B5B5B5] mb-2">
        {t("devices.description")}
      </p>
      <p className="text-xs text-[#6E7873] mb-6">
        {t("devices.description_detail")}
      </p>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#B5B5B5] mb-4">{t("devices.no_sessions")}</p>
          <p className="text-sm text-[#6E7873]">
            {t("devices.no_sessions_detail")}
          </p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="flex items-center gap-4 flex-1 px-4 pb-2 text-xs text-[#6E7873]">
            <span className="min-w-[140px]">{t("devices.device")}</span>
            <span className="min-w-[120px]">{t("devices.ip")}</span>
            <span className="min-w-[100px]">{t("devices.location")}</span>
            <span className="min-w-[100px]">{t("devices.last_active")}</span>
          </div>
      <div className="space-y-3 mb-8">
            {sessions.map((session) => {
              const isCurrentSession = session.id === currentSession?.id;
              const location = session.country
                ? `${session.city}, ${session.country}`
                : session.city;
              const lastActive = isCurrentSession ? t("devices.active") : formatTimeAgo(session.lastActiveAt);

              return (
          <div
                  key={session.id}
            className="flex items-center justify-between py-4 px-4 bg-[#010501] rounded-xl border border-[#1f261e]"
          >
            <div className="flex items-center gap-4 flex-1">
              <p className="text-base font-medium text-white min-w-[140px]">
                      {session.deviceName}
                    </p>
                    <p className="text-sm text-[#B5B5B5] min-w-[120px]">
                      {session.ipAddress}
              </p>
              <p className="text-sm text-[#B5B5B5] min-w-[100px]">
                      {location}
              </p>
              <p
                className={`text-sm min-w-[100px] ${
                        isCurrentSession ? "text-[#B1F128]" : "text-[#B5B5B5]"
                }`}
                      title={!isCurrentSession ? formatLastActive(session.lastActiveAt) : undefined}
              >
                      {lastActive}
              </p>
            </div>
                  <button
                    onClick={() => setSessionToTerminate(session)}
                    disabled={isTerminating === session.id}
                    className="text-[#B1F128] font-medium text-sm hover:opacity-80 transition-opacity ml-4 shrink-0 disabled:opacity-50"
                  >
                    {isTerminating === session.id ? t("devices.terminating") : t("devices.terminate")}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowTerminateAllConfirm(true)}
              disabled={isTerminatingAll}
              className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTerminatingAll ? t("devices.terminating") : t("devices.terminate_all")}
            </button>
            <p className="text-xs text-center text-[#B5B5B5]">
              {t("devices.terminate_all_confirm")}
            </p>
          </div>
        </>
      )}

      {/* Confirm: Terminate single device */}
      <Dialog open={!!sessionToTerminate} onOpenChange={(open) => !open && setSessionToTerminate(null)}>
        <DialogContent
          showCloseButton={false}
          className="bg-[#0b0f0a] border border-[#1f261e] rounded-2xl sm:rounded-3xl p-0 max-w-[calc(100vw-2rem)] sm:max-w-[420px] w-full overflow-hidden"
        >
          <div className="flex flex-col gap-6 px-6 py-6">
            <DialogTitle className="font-bold text-xl text-white">
              {t("devices.terminate_session_title")}
            </DialogTitle>
            <DialogDescription className="text-[#b5b5b5] text-sm">
              {sessionToTerminate ? (
                <>
                  {t("devices.terminate_session_desc")}
                </>
              ) : null}
            </DialogDescription>
            <div className="flex gap-3">
              <button
                onClick={() => setSessionToTerminate(null)}
                className="flex-1 bg-[#121712] border border-[#1f261e] text-white font-semibold py-3 px-6 rounded-full hover:bg-[#1a1f1a] transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={async () => {
                  if (!sessionToTerminate) return;
                  const id = sessionToTerminate.id;
                  try {
                    await handleTerminateDevice(id);
                  } finally {
                    setSessionToTerminate(null);
                  }
                }}
                disabled={!!sessionToTerminate && isTerminating === sessionToTerminate.id}
                className="flex-1 bg-[#B1F128] text-[#010501] font-semibold py-3 px-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sessionToTerminate && isTerminating === sessionToTerminate.id ? t("devices.terminating") : t("devices.terminate")}
              </button>
            </div>
      </div>
        </DialogContent>
      </Dialog>

      {/* Confirm: Terminate all sessions */}
      <Dialog open={showTerminateAllConfirm} onOpenChange={(open) => !open && setShowTerminateAllConfirm(false)}>
        <DialogContent
          showCloseButton={false}
          className="bg-[#0b0f0a] border border-[#1f261e] rounded-2xl sm:rounded-3xl p-0 max-w-[calc(100vw-2rem)] sm:max-w-[420px] w-full overflow-hidden"
        >
          <div className="flex flex-col gap-6 px-6 py-6">
            <DialogTitle className="font-bold text-xl text-white">
              {t("devices.terminate_all_title")}
            </DialogTitle>
            <DialogDescription className="text-[#b5b5b5] text-sm">
              {t("devices.terminate_all_desc")}
            </DialogDescription>
            <div className="flex gap-3">
        <button
                onClick={() => setShowTerminateAllConfirm(false)}
                className="flex-1 bg-[#121712] border border-[#1f261e] text-white font-semibold py-3 px-6 rounded-full hover:bg-[#1a1f1a] transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={async () => {
                  try {
                    await handleTerminateAll();
                  } finally {
                    setShowTerminateAllConfirm(false);
                  }
                }}
                disabled={isTerminatingAll}
                className="flex-1 bg-[#B1F128] text-[#010501] font-semibold py-3 px-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
                {isTerminatingAll ? t("devices.terminating") : t("devices.terminate_confirm")}
        </button>
            </div>
      </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
