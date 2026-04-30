/**
 * @file src/lib/activity-tracker.ts
 * @description Tracks user activity and auto-logs out after inactivity.
 *
 * Strategy:
 * - Listen to mouse, keyboard, touch, scroll events
 * - Reset a countdown timer on every activity event
 * - When timer expires → show warning → then logout
 * - Also handles tab visibility (pauses when tab is hidden)
 *
 * Timeout: 30 minutes of inactivity → 2 minute warning → logout
 */

// ── Configuration ──────────────────────────────────
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // warn 2 min before logout
const WARNING_TIMEOUT_MS = INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS;

// ── Events that count as user activity ────────────
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "keypress",
  "scroll",
  "touchstart",
  "touchmove",
  "click",
  "wheel",
] as const;

type ActivityTrackerOptions = {
  /** Called when warning should be shown to the user */
  onWarning: () => void;
  /** Called when user should be logged out */
  onLogout: () => void;
  /** Called when user is still active (resets warning) */
  onActivity?: () => void;
};

export class ActivityTracker {
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private logoutTimer: ReturnType<typeof setTimeout> | null = null;
  private isWarning: boolean = false;
  private options: ActivityTrackerOptions;
  private boundHandler: () => void;

  constructor(options: ActivityTrackerOptions) {
    this.options = options;
    this.boundHandler = this.handleActivity.bind(this);
  }

  /** Start tracking user activity */
  start() {
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, this.boundHandler, { passive: true });
    });

    // ── Also check tab visibility ──────────────────
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this),
    );

    this.resetTimers();
  }

  /** Stop tracking and clear all timers */
  stop() {
    ACTIVITY_EVENTS.forEach((event) => {
      window.removeEventListener(event, this.boundHandler);
    });

    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this),
    );

    this.clearTimers();
  }

  /** Called on every user activity event */
  private handleActivity() {
    // ── If warning is showing, dismiss it ──────────
    if (this.isWarning) {
      this.isWarning = false;
      this.options.onActivity?.();
    }
    this.resetTimers();
  }

  /** Handle tab becoming visible/hidden */
  private handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      // ── Tab became visible — reset timers ─────────
      this.resetTimers();
    }
  }

  /** Reset both timers from zero */
  private resetTimers() {
    this.clearTimers();

    // ── Timer 1: Show warning after WARNING_TIMEOUT_MS ─
    this.warningTimer = setTimeout(() => {
      this.isWarning = true;
      this.options.onWarning();

      // ── Timer 2: Logout after WARNING_BEFORE_MS more ─
      this.logoutTimer = setTimeout(() => {
        this.options.onLogout();
      }, WARNING_BEFORE_MS);
    }, WARNING_TIMEOUT_MS);
  }

  /** Clear all pending timers */
  private clearTimers() {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
    this.isWarning = false;
  }
}
