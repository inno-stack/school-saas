/**
 * @file src/components/layout/Header.tsx
 * @description Responsive page header with title and search.
 * - Shows page title and subtitle
 * - Search bar (hidden on small mobile screens)
 * - Notification bell
 * - On mobile: left padding accounts for hamburger button
 */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Search } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-14 lg:h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-10">
      {/* ── Page Title ─────────────────────────────── */}
      {/* Left padding on mobile to clear the hamburger button */}
      <div className="flex-1 pl-8 lg:pl-0 min-w-0">
        <h1 className="text-base lg:text-lg font-bold text-slate-800 leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 truncate hidden sm:block">
            {subtitle}
          </p>
        )}
      </div>

      {/* ── Search Bar (hidden on small screens) ──── */}
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search..."
          className="pl-9 w-48 lg:w-56 h-8 lg:h-9 text-sm bg-slate-50"
        />
      </div>

      {/* ── Notification Bell ──────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        className="relative w-8 h-8 lg:w-9 lg:h-9 flex-shrink-0"
      >
        <Bell className="w-4 h-4 lg:w-5 lg:h-5 text-slate-600" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full" />
      </Button>
    </header>
  );
}
