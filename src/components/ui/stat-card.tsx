/**
 * @file src/components/ui/stat-card.tsx
 * @description Reusable statistics card component.
 * Responsive — smaller on mobile, full size on desktop.
 */

import { cn }           from "@/lib/utils";
import { LucideIcon }   from "lucide-react";

interface StatCardProps {
  title:   string;
  value:   string | number;
  icon:    LucideIcon;
  color?:  "blue" | "green" | "orange" | "purple" | "red";
  change?: string;
  sub?:    string;
}

// ── Color theme mapping ────────────────────────────
const colorMap = {
  blue:   { bg: "bg-blue-50",   icon: "bg-blue-600",   text: "text-blue-600"   },
  green:  { bg: "bg-green-50",  icon: "bg-green-600",  text: "text-green-600"  },
  orange: { bg: "bg-orange-50", icon: "bg-orange-500", text: "text-orange-500" },
  purple: { bg: "bg-purple-50", icon: "bg-purple-600", text: "text-purple-600" },
  red:    { bg: "bg-red-50",    icon: "bg-red-500",    text: "text-red-500"    },
};

export function StatCard({
  title, value, icon: Icon, color = "blue", change, sub,
}: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className={cn(
      "bg-white rounded-xl border border-slate-200 p-3 lg:p-5",
      "hover:shadow-md transition-shadow"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Title — smaller on mobile */}
          <p className="text-xs lg:text-sm text-slate-500 font-medium truncate">
            {title}
          </p>
          {/* Value — large and bold */}
          <p className="text-xl lg:text-2xl font-bold text-slate-800 mt-0.5 lg:mt-1">
            {value}
          </p>
          {sub && (
            <p className="text-xs text-slate-400 mt-0.5 truncate hidden sm:block">
              {sub}
            </p>
          )}
          {change && (
            <p className={cn("text-xs font-medium mt-0.5", c.text)}>
              {change}
            </p>
          )}
        </div>
        {/* Icon — smaller on mobile */}
        <div className={cn(
          "w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          c.icon
        )}>
          <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
        </div>
      </div>
    </div>
  );
}