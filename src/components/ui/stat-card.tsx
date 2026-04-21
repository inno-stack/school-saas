import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

/**
 * Represents the props for the StatCard component.
 */
interface StatCardProps {
  title: string; // The title of the stat card.
  value: string | number; //The value of the stat card.
  icon: LucideIcon; // The icon of the stat card.
  color?: "blue" | "green" | "orange" | "purple" | "red"; //The color of the stat card. Optional.
  change?: string; //The change in the stat card. Optional.
  sub?: string; // The subtext of the stat card. Optional.
}

const colorMap = {
  blue: { bg: "bg-blue-50", icon: "bg-blue-600", text: "text-blue-600" },
  green: { bg: "bg-green-50", icon: "bg-green-600", text: "text-green-600" },
  orange: {
    bg: "bg-orange-50",
    icon: "bg-orange-500",
    text: "text-orange-500",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "bg-purple-600",
    text: "text-purple-600",
  },
  red: { bg: "bg-red-50", icon: "bg-red-500", text: "text-red-500" },
};

/**
 * A reusable component for displaying a stat card.
 * @param props - The props for the StatCard component.
 * @returns The rendered StatCard component.
 */

export function StatCard({
  title,
  value,
  icon: Icon,
  color = "blue",
  change,
  sub,
}: StatCardProps) {
  const c = colorMap[color];

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 p-5",
        "hover:shadow-md transition-shadow",
      )}
    >
      {/* Container for the stat card */}
      <div className="flex items-start justify-between">
        {/* Container for the content */}
        <div className="flex-1">
          {/* Display the title */}
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          {/* Display the value */}
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {/* Display the subtext if provided */}
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          {/* Display the change if provided */}
          {change && (
            <p className={cn("text-xs font-medium mt-1", c.text)}>{change}</p>
          )}
        </div>
        {/* Container for the icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            c.icon,
          )}
        >
          {/* Render the icon */}
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
