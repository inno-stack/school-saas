/**
 * @file src/app/(dashboard)/layout.tsx
 * @description Protected dashboard layout wrapper.
 * - Handles hydration-safe auth guard
 * - Renders sidebar + main content area
 * - Mobile: adds top padding for hamburger button
 */

"use client";

import { InactivityGuard } from "@/components/layout/InactivityGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuth } = useAuthStore();

  // ── Wait for Zustand to rehydrate from localStorage ─
  // Without this, isAuth is false on first render → redirect
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // ── Redirect unauthenticated users ─────────────
  useEffect(() => {
    if (hydrated && !isAuth) {
      router.replace("/login");
    }
  }, [hydrated, isAuth, router]);

  // ── Show loading spinner while rehydrating ─────
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuth) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Sidebar (desktop: fixed left, mobile: drawer) ── */}
      <Sidebar />

      {/* ── Main Content Area ──────────────────────────── */}
      <main
        className={[
          "flex-1 overflow-auto min-w-0",
          // On mobile: add top padding so content clears the hamburger button
          "pt-16 lg:pt-0",
        ].join(" ")}
      >
        {children}
      </main>
      {/* ── Auto-logout inactivity guard ──────────────
          Monitors user activity and shows a warning
          before logging out after 30 minutes idle.
      ─────────────────────────────────────────────── */}
      <InactivityGuard />
    </div>
  );
}
