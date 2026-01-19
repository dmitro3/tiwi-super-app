/**
 * Device Session Store
 * 
 * Tracks device sessions for local wallets only.
 * Stores device information including IP, location, device type, and active time.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DeviceSession {
  id: string;                    // Unique session ID
  walletAddress: string;         // Wallet address this session is for
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceName: string;            // e.g., "Chrome on Windows", "Safari on iPhone"
  ipAddress: string;
  city: string;
  country?: string;
  connectedAt: number;            // Timestamp when connected
  lastActiveAt: number;          // Timestamp of last activity
  userAgent: string;
  isActive: boolean;              // Whether this is the current session
}

interface DeviceSessionState {
  sessions: DeviceSession[];
  
  // Actions
  addSession: (session: Omit<DeviceSession, 'id' | 'connectedAt' | 'lastActiveAt'>) => string;
  updateLastActive: (sessionId: string) => void;
  terminateSession: (sessionId: string) => void;
  terminateAllSessions: (walletAddress: string, keepCurrentSessionId?: string) => void;
  getSessionsForWallet: (walletAddress: string) => DeviceSession[];
  getCurrentSession: (walletAddress: string) => DeviceSession | null;
  clearSessionsForWallet: (walletAddress: string) => void;
}

const STORAGE_KEY = 'tiwi_device_sessions_v1';

// Generate unique session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export const useDeviceSessionStore = create<DeviceSessionState>()(
  persist(
    (set, get) => ({
      sessions: [],

      addSession: (sessionData) => {
        const sessionId = generateSessionId();
        const now = Date.now();
        
        const newSession: DeviceSession = {
          ...sessionData,
          id: sessionId,
          connectedAt: now,
          lastActiveAt: now,
          isActive: true,
        };

        set((state) => {
          // Mark all other sessions for this wallet as inactive
          const updatedSessions = state.sessions.map((s) =>
            s.walletAddress.toLowerCase() === sessionData.walletAddress.toLowerCase()
              ? { ...s, isActive: false }
              : s
          );

          return {
            sessions: [...updatedSessions, newSession],
          };
        });

        return sessionId;
      },

      updateLastActive: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, lastActiveAt: Date.now() }
              : s
          ),
        }));
      },

      terminateSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }));
      },

      terminateAllSessions: (walletAddress, keepCurrentSessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => {
            const matchesWallet = s.walletAddress.toLowerCase() === walletAddress.toLowerCase();
            if (!matchesWallet) return true;
            // Keep current session if specified
            if (keepCurrentSessionId && s.id === keepCurrentSessionId) return true;
            return false;
          }),
        }));
      },

      getSessionsForWallet: (walletAddress) => {
        const { sessions } = get();
        return sessions
          .filter((s) => s.walletAddress.toLowerCase() === walletAddress.toLowerCase())
          .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
      },

      getCurrentSession: (walletAddress) => {
        const { sessions } = get();
        return (
          sessions.find(
            (s) =>
              s.walletAddress.toLowerCase() === walletAddress.toLowerCase() && s.isActive
          ) || null
        );
      },

      clearSessionsForWallet: (walletAddress) => {
        set((state) => ({
          sessions: state.sessions.filter(
            (s) => s.walletAddress.toLowerCase() !== walletAddress.toLowerCase()
          ),
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        sessions: state.sessions,
      }),
    }
  )
);

