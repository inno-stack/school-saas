/**
 * @file src/components/layout/InactivityGuard.tsx
 * @description Auto-logout inactivity guard component.
 *
 * Renders a countdown warning dialog when the user has been
 * inactive for 28 minutes. Gives them 2 minutes to respond
 * before automatically logging them out.
 *
 * Usage: Mount inside the dashboard layout.
 */

"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ActivityTracker } from "@/lib/activity-tracker";
import api from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import { Clock, LogOut, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ── Warning countdown duration ─────────────────────
const WARNING_SECONDS = 120; // 2 minutes

export function InactivityGuard() {
  const router = useRouter();
  const { logout, isAuth } = useAuthStore();

  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ── Countdown interval ref ─────────────────────
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackerRef = useRef<ActivityTracker | null>(null);

  // ── Execute logout ─────────────────────────────
  const performLogout = useCallback(
    async (reason: "timeout" | "manual") => {
      if (isLoggingOut) return;
      setIsLoggingOut(true);

      // ── Stop the tracker ───────────────────────────
      trackerRef.current?.stop();
      clearCountdown();

      try {
        await api.post("/auth/logout");
      } catch {
        // ── Silently fail — logout locally regardless ─
      }

      logout();

      if (reason === "timeout") {
        // ── Store message to show on login page ───────
        sessionStorage.setItem(
          "logout_reason",
          "You were automatically logged out due to 30 minutes of inactivity.",
        );
      }

      router.replace("/login");
      toast.info(
        reason === "timeout"
          ? "You have been logged out due to inactivity."
          : "You have been logged out.",
      );
    },
    [isLoggingOut, logout, router],
  );

  // ── Start countdown in warning dialog ─────────
  const startCountdown = useCallback(() => {
    setSecondsLeft(WARNING_SECONDS);
    clearCountdown();

    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearCountdown();
          performLogout("timeout");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [performLogout]);

  // ── Clear countdown interval ───────────────────
  function clearCountdown() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  // ── User clicked "Stay Logged In" ─────────────
  function handleStayLoggedIn() {
    setShowWarning(false);
    clearCountdown();
    setSecondsLeft(WARNING_SECONDS);
    // ActivityTracker will reset its own timers via activity events
  }

  // ── Format seconds as mm:ss ────────────────────
  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ── Initialize tracker when user is authenticated ─
  useEffect(() => {
    if (!isAuth) return;

    const tracker = new ActivityTracker({
      // ── Warning: show dialog + start countdown ───
      onWarning: () => {
        setShowWarning(true);
        startCountdown();
      },

      // ── Logout: called when countdown reaches 0 ──
      onLogout: () => {
        performLogout("timeout");
      },

      // ── Activity: user responded — dismiss warning ─
      onActivity: () => {
        setShowWarning(false);
        clearCountdown();
        setSecondsLeft(WARNING_SECONDS);
      },
    });

    trackerRef.current = tracker;
    tracker.start();

    // ── Cleanup on unmount or auth change ──────────
    return () => {
      tracker.stop();
      clearCountdown();
    };
  }, [isAuth, startCountdown, performLogout]);

  // ── Don't render anything if not authenticated ─
  if (!isAuth) return null;

  // ── Progress percentage for visual countdown ───
  const progressPct = (secondsLeft / WARNING_SECONDS) * 100;
  const isUrgent = secondsLeft <= 30;

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          {/* Icon */}
          <div
            className={[
              "w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3",
              isUrgent ? "bg-red-100" : "bg-amber-100",
            ].join(" ")}
          >
            {isUrgent ? (
              <LogOut className="w-7 h-7 text-red-600" />
            ) : (
              <ShieldAlert className="w-7 h-7 text-amber-600" />
            )}
          </div>

          <AlertDialogTitle className="text-center text-lg">
            Session Expiring Soon
          </AlertDialogTitle>

          <AlertDialogDescription className="text-center text-slate-600">
            You have been inactive for 28 minutes. For your security, you will
            be automatically logged out in:
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* ── Countdown Display ──────────────────── */}
        <div className="flex flex-col items-center gap-4 py-2">
          {/* Big countdown timer */}
          <div
            className={[
              "text-5xl font-bold font-mono tabular-nums transition-colors",
              isUrgent ? "text-red-600" : "text-amber-600",
            ].join(" ")}
          >
            {formatTime(secondsLeft)}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className={[
                "h-2 rounded-full transition-all duration-1000",
                isUrgent ? "bg-red-500" : "bg-amber-500",
              ].join(" ")}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Info */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Any activity on this page will reset the timer</span>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {/* ── Logout now ──────────────────── */}
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => {
              setShowWarning(false);
              performLogout("manual");
            }}
            disabled={isLoggingOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout Now
          </Button>

          {/* ── Stay logged in ───────────────── */}
          <Button
            className="bg-blue-600 hover:bg-blue-700 flex-1"
            onClick={handleStayLoggedIn}
            disabled={isLoggingOut}
          >
            Stay Logged In
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
