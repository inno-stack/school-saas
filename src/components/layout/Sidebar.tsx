/**
 * @file src/components/layout/Sidebar.tsx
 * @description Responsive sidebar navigation component.
 * - Desktop: Fixed left sidebar (always visible)
 * - Mobile: Slide-in drawer with overlay backdrop
 * - Role-filtered navigation items
 * - Active route highlighting
 */

"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import api from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ChevronRight,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  GraduationCap as Logo,
  Menu,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ── Navigation item type definition ───────────────
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

// ── All navigation items with role restrictions ────
const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT"],
  },
  {
    label: "Students",
    href: "/dashboard/students",
    icon: GraduationCap,
    roles: ["SCHOOL_ADMIN", "TEACHER", "SUPER_ADMIN"],
  },
  {
    label: "Teachers",
    href: "/dashboard/teachers",
    icon: UserCheck,
    roles: ["SCHOOL_ADMIN", "SUPER_ADMIN"],
  },
  {
    label: "Parents",
    href: "/dashboard/parents",
    icon: Users,
    roles: ["SCHOOL_ADMIN", "SUPER_ADMIN"],
  },
  {
    label: "Classes",
    href: "/dashboard/classes",
    icon: BookOpen,
    roles: ["SCHOOL_ADMIN", "TEACHER", "SUPER_ADMIN"],
  },
  {
    label: "Sessions & Terms",
    href: "/dashboard/sessions",
    icon: CalendarDays,
    roles: ["SCHOOL_ADMIN", "SUPER_ADMIN"],
  },
  {
    label: "Results",
    href: "/dashboard/results",
    icon: FileText,
    roles: ["SCHOOL_ADMIN", "TEACHER", "SUPER_ADMIN"],
  },
  {
    label: "Scratch Cards",
    href: "/dashboard/scratch-cards",
    icon: CreditCard,
    roles: ["SCHOOL_ADMIN", "SUPER_ADMIN"],
  },
  {
    label: "My Children",
    href: "/dashboard/children",
    icon: Users,
    roles: ["PARENT"],
  },
  {
    label: "All Schools",
    href: "/dashboard/schools",
    icon: Building2,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "System Users",
    href: "/dashboard/system-users",
    icon: ShieldCheck,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["SCHOOL_ADMIN", "SUPER_ADMIN"],
  },
];

// ── Role display config ────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  SCHOOL_ADMIN: "bg-blue-100 text-blue-700",
  TEACHER: "bg-green-100 text-green-700",
  PARENT: "bg-orange-100 text-orange-700",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  SCHOOL_ADMIN: "School Admin",
  TEACHER: "Teacher",
  PARENT: "Parent",
};

// ── Sidebar content (shared between desktop + mobile) ─
function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // ── Filter nav items by user role ─────────────
  const filteredNav = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role),
  );

  // ── User initials for avatar ───────────────────
  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "?";

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // Silently fail — logout locally regardless
    }
    logout();
    router.push("/login");
    toast.success("Logged out successfully");
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* ── Logo / School Name ─────────────────── */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Logo className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight">InnoCore</p>
          <p className="text-xs text-slate-400 leading-tight truncate">
            {user?.school?.name ?? "System"}
          </p>
        </div>
      </div>

      {/* ── Navigation Links ───────────────────── */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick} // close mobile drawer on navigation
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive
                    ? "text-white"
                    : "text-slate-500 group-hover:text-white",
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User Profile + Logout ──────────────── */}
      <div className="p-2 border-t border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-slate-800/50 mb-1">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <span
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                ROLE_COLORS[user?.role ?? "SCHOOL_ADMIN"],
              )}
            >
              {ROLE_LABELS[user?.role ?? "SCHOOL_ADMIN"]}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Main Sidebar Export ────────────────────────────
export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // ── Close mobile drawer on route change ───────
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // ── Prevent body scroll when drawer is open ───
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Mobile Hamburger Button ────────────── */}
      {/* Visible only on mobile — triggers drawer */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Mobile Drawer Overlay ──────────────── */}
      {/* Dark backdrop behind the drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      {/* ── Mobile Drawer ──────────────────────── */}
      {/* Slides in from the left on mobile */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 h-full w-72 transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Close button inside drawer */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-slate-800 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-colors"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* ── Desktop Sidebar ────────────────────── */}
      {/* Always visible on lg screens and above */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen flex-shrink-0">
        <SidebarContent />
      </aside>
    </>
  );
}
