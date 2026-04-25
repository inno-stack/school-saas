/**
 * @file src/app/(dashboard)/dashboard/page.tsx
 * @description Role-aware dashboard home page.
 * Fully responsive grid layout for all screen sizes.
 */

"use client";

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

export default function DashboardPage() {
  const { user } = useRequireAuth();

  // ── Fetch dashboard stats ──────────────────────
  const { data: dashData, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/school/dashboard");
      return data.data;
    },
    enabled: !!user,
  });

  // ── Fetch sessions for academic calendar ───────
  const { data: sessionData } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data } = await api.get("/sessions");
      return data.data;
    },
    enabled: !!user,
  });

  // ── Find active session and term ───────────────
  const activeSession = sessionData?.find((s: any) => s.isActive);
  const activeTerm = activeSession?.terms?.find((t: any) => t.isActive);

  const termLabel =
    activeTerm?.name === "FIRST"
      ? "1st Term"
      : activeTerm?.name === "SECOND"
        ? "2nd Term"
        : activeTerm?.name === "THIRD"
          ? "3rd Term"
          : null;

  // ── Role-aware quick actions ───────────────────
  // Super Admin sees system-level actions
  // School Admin sees school management actions
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

  if (!user) return null;

  return (
    <div>
      <Header
        title={`Welcome back, ${user.firstName}! `}
        subtitle={user.school?.name}
      />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* ── Active Period Banner ───────────────── */}
        {activeSession && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <CalendarDays className="w-5 h-5 opacity-80 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs opacity-80">Current Academic Period</p>
                <p className="font-bold text-sm lg:text-lg truncate">
                  {activeSession.name} — {termLabel ?? "No active term"}
                </p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-0 text-xs flex-shrink-0">
              {termLabel ? "In Progress" : "Term not set"}
            </Badge>
          </div>
        )}

        {/* ── Stats Grid ────────────────────────── */}
        {/* 2 columns on mobile, 4 on desktop */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-24 lg:h-28 rounded-xl" />
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <StatCard
              title="Total Students"
              value={dashData?.stats?.totalStudents ?? 0}
              icon={GraduationCap}
              color="blue"
              sub="Enrolled"
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
              title="Results"
              value={dashData?.stats?.totalResults ?? 0}
              icon={FileText}
              color="purple"
            />
          </div>
        )}

        {/* ── Bottom Grid ───────────────────────── */}
        {/* Stacks vertically on mobile, side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3 px-4 lg:px-6">
              <CardTitle className="text-sm lg:text-base font-semibold text-slate-700">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 lg:gap-3 px-4 lg:px-6 pb-4 lg:pb-6">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-2 lg:gap-3 p-2.5 lg:p-3 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all group"
                  >
                    <div
                      className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg ${action.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
                    </div>
                    <span className="text-xs lg:text-sm font-medium text-slate-700 group-hover:text-blue-600 leading-tight">
                      {action.label}
                    </span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Academic Calendar */}
          <Card>
            <CardHeader className="pb-3 px-4 lg:px-6">
              <CardTitle className="text-sm lg:text-base font-semibold text-slate-700">
                Academic Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 lg:px-6 pb-4 lg:pb-6">
              {!sessionData?.length && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No sessions yet.{" "}
                  <Link
                    href="/dashboard/sessions"
                    className="text-blue-600 hover:underline"
                  >
                    Create one →
                  </Link>
                </p>
              )}
              {sessionData?.slice(0, 4).map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2.5 lg:p-3 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                    <CalendarDays className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {session.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {session.totalTerms} term(s)
                      </p>
                    </div>
                  </div>
                  {session.isActive && (
                    <Badge className="bg-green-100 text-green-700 border-0 text-xs flex-shrink-0 ml-2">
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
