"use client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  badge?: string;
}

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
    roles: ["SCHOOL_ADMIN", "TEACHER"],
  },
  {
    label: "Teachers",
    href: "/dashboard/teachers",
    icon: UserCheck,
    roles: ["SCHOOL_ADMIN"],
  },
  {
    label: "Parents",
    href: "/dashboard/parents",
    icon: Users,
    roles: ["SCHOOL_ADMIN"],
  },
  {
    label: "Classes",
    href: "/dashboard/classes",
    icon: BookOpen,
    roles: ["SCHOOL_ADMIN", "TEACHER"],
  },
  {
    label: "Sessions & Terms",
    href: "/dashboard/sessions",
    icon: CalendarDays,
    roles: ["SCHOOL_ADMIN"],
  },
  {
    label: "Results",
    href: "/dashboard/results",
    icon: FileText,
    roles: ["SCHOOL_ADMIN", "TEACHER"],
  },
  {
    label: "Scratch Cards",
    href: "/dashboard/scratch-cards",
    icon: CreditCard,
    roles: ["SCHOOL_ADMIN"],
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
    roles: ["SCHOOL_ADMIN"],
  },
];

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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const filteredNav = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role),
  );

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {}
    logout();
    router.push("/login");
    toast.success("Logged out successfully");
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "?";

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Logo className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-base leading-tight">EduCore</p>
          <p className="text-xs text-slate-400 leading-tight truncate max-w-[130px]">
            {user?.school?.name ?? "System"}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
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
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge className="text-[10px] py-0 px-1.5 bg-blue-500">
                  {item.badge}
                </Badge>
              )}
              {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-800/50 mb-2">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
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
    </aside>
  );
}
