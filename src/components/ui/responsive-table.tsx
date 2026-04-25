/**
 * @file src/components/ui/responsive-table.tsx
 * @description Responsive table wrapper.
 * On mobile: horizontally scrollable with a subtle scroll indicator.
 * On desktop: full-width table layout.
 */

import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  children:  React.ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn(
      // Horizontal scroll on mobile, full width on desktop
      "w-full overflow-x-auto rounded-xl border border-slate-200",
      "-mx-0",
      className
    )}>
      {/* Min width ensures table doesn't collapse on mobile */}
      <div className="min-w-[640px]">
        {children}
      </div>
    </div>
  );
}