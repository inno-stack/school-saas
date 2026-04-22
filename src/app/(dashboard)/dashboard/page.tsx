"use client";

// ─── Framework & Library Imports ─────────────────────────────────────────────
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import api from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

// ─── Dashboard Page ───────────────────────────────────────────────────────────
// Main dashboard shown immediately after login.
// Renders different Quick Actions depending on the authenticated user's role:
//   - SUPER_ADMIN → platform-wide management links (schools, system users, etc.)
//   - All other roles → school-level actions (students, results, settings, etc.)
export default function DashboardPage() {
  // Pull the authenticated user from the auth hook.
  // Returns null until hydration is complete (prevents SSR flash).
  const { user } = useRequireAuth();

  // ── Data Fetching ───────────────────────────────────────────────────────────

  // Fetch school-level dashboard stats (students, teachers, parents, results).
  // Only runs once the user object is available to avoid unauthenticated calls.
  const { data: dashData, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/school/dashboard");
      return data.data;
    },
    enabled: !!user,
  });

  // Fetch all academic sessions to display the active period banner
  // and populate the Academic Calendar card.
  const { data: sessionData } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data } = await api.get("/sessions");
      return data.data;
    },
    enabled: !!user,
  });

  // ── Derived State ───────────────────────────────────────────────────────────

  // Resolve the currently active session and term from the sessions list.
  // At most one session and one term can be active at a time (enforced by API).
  const activeSession = sessionData?.find((s: any) => s.isActive);
  const activeTerm = activeSession?.terms?.find((t: any) => t.isActive);

  // Convert the term enum value (FIRST | SECOND | THIRD) to a display label.
  const termLabel =
    activeTerm?.name === "FIRST"
      ? "1st Term"
      : activeTerm?.name === "SECOND"
        ? "2nd Term"
        : activeTerm?.name === "THIRD"
          ? "3rd Term"
          : null; // null = no active term set yet

  // ── Role-Aware Quick Actions ────────────────────────────────────────────────
  // SUPER_ADMIN sees platform-management shortcuts.
  // All other roles (SCHOOL_ADMIN, TEACHER) see school-operation shortcuts.
  const quickActions =
    user?.role === "SUPER_ADMIN"
      ? [
          {
            label: "All Schools",
            icon: Building2,
            href: "/dashboard/schools",
            color: "bg-blue-600",
          },
          {
            label: "System Users",
            icon: ShieldCheck,
            href: "/dashboard/system-users",
            color: "bg-purple-600",
          },
          {
            label: "View Students",
            icon: GraduationCap,
            href: "/dashboard/students",
            color: "bg-green-600",
          },
          {
            label: "View Results",
            icon: FileText,
            href: "/dashboard/results",
            color: "bg-orange-500",
          },
          {
            label: "Manage Classes",
            icon: BookOpen,
            href: "/dashboard/classes",
            color: "bg-pink-600",
          },
          {
            label: "Scratch Cards",
            icon: CreditCard,
            href: "/dashboard/scratch-cards",
            color: "bg-slate-600",
          },
        ]
      : [
          {
            label: "Add Student",
            icon: GraduationCap,
            href: "/dashboard/students/new",
            color: "bg-blue-600",
          },
          {
            label: "Add Teacher",
            icon: UserCheck,
            href: "/dashboard/teachers/new",
            color: "bg-green-600",
          },
          {
            label: "Enter Results",
            icon: FileText,
            href: "/dashboard/results",
            color: "bg-purple-600",
          },
          {
            label: "Manage Classes",
            icon: BookOpen,
            href: "/dashboard/classes",
            color: "bg-orange-500",
          },
          {
            label: "Scratch Cards",
            icon: CreditCard,
            href: "/dashboard/scratch-cards",
            color: "bg-pink-600",
          },
          {
            label: "School Settings",
            icon: TrendingUp,
            href: "/dashboard/settings",
            color: "bg-slate-600",
          },
        ];

  // Block render until the auth store has rehydrated from localStorage.
  // Prevents a flash-redirect to /login on first load.
  if (!user) return null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header — shows the user's first name and their school name */}
      <Header
        title={`Welcome back, ${user.firstName}!`}
        subtitle={user.school?.name}
      />

      <div className="p-6 space-y-6">
        {/* ── Active Period Banner ──────────────────────────────────────────── */}
        {/* Only rendered when an active session exists.
            Shows the current session + term, or a warning if no term is set. */}
        {activeSession && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-sm opacity-80">Current Academic Period</p>
                <p className="font-bold text-lg">
                  {activeSession.name} — {termLabel ?? "No active term"}
                </p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-0 text-xs">
              {termLabel ? "In Progress" : "Term not set"}
            </Badge>
          </div>
        )}

        {/* ── Stats Grid ───────────────────────────────────────────────────── */}
        {/* Shows skeleton placeholders while dashboard data is loading,
            then renders the four key school metrics. */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Students"
              value={dashData?.stats?.totalStudents ?? 0}
              icon={GraduationCap}
              color="blue"
              sub="Enrolled this year"
            />
            <StatCard
              title="Teachers"
              value={dashData?.stats?.totalTeachers ?? 0}
              icon={UserCheck}
              color="green"
            />
            <StatCard
              title="Parents"
              value={dashData?.stats?.totalParents ?? 0}
              icon={Users}
              color="orange"
            />
            <StatCard
              title="Results Published"
              value={dashData?.stats?.totalResults ?? 0}
              icon={FileText}
              color="purple"
            />
          </div>
        )}

        {/* ── Bottom Cards Row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions Card
              Iterates the role-resolved quickActions array.
              Each action renders as a navigable Link with a coloured icon. */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-700">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                // Dynamically resolve the Lucide icon component from the action config
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all group"
                  >
                    {/* Coloured icon badge */}
                    <div
                      className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    {/* Action label — highlights blue on hover via parent group */}
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">
                      {action.label}
                    </span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Academic Calendar Card
              Lists up to 4 sessions with their active status badge.
              Shows a CTA to create the first session if none exist yet. */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-700">
                Academic Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Empty state */}
              {sessionData?.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No sessions created yet.{" "}
                  <a
                    href="/dashboard/sessions"
                    className="text-blue-600 hover:underline"
                  >
                    Create one →
                  </a>
                </p>
              )}

              {/* Session list — capped at 4 to keep the card compact */}
              {sessionData?.slice(0, 4).map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {session.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {session.totalTerms} term(s)
                      </p>
                    </div>
                  </div>
                  {/* Only the active session shows this badge */}
                  {session.isActive && (
                    <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                      Active
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
