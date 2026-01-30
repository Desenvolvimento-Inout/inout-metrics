import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { PeriodComparisonBadge } from "./PeriodComparisonBadge";

interface DerivedMetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
  change?: number;
  showChange?: boolean;
  loading?: boolean;
}

const variantStyles = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

const iconBgStyles = {
  default: "bg-muted",
  success: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-destructive/10",
};

export function DerivedMetricCard({
  title,
  value,
  subValue,
  icon: Icon,
  variant = "default",
  change,
  showChange = false,
  loading = false,
}: DerivedMetricCardProps) {
  if (loading) {
    return (
      <div className="metric-card">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="skeleton-dark h-4 w-28" />
            <div className="skeleton-dark h-10 w-20" />
            {subValue !== undefined && <div className="skeleton-dark h-3 w-24" />}
          </div>
          <div className="skeleton-dark h-12 w-12 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="metric-card fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {showChange && change !== undefined && (
              <PeriodComparisonBadge change={change} />
            )}
          </div>
          <p className={cn("text-3xl font-semibold tracking-tight", variantStyles[variant])}>
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-muted-foreground/70">{subValue}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-lg", iconBgStyles[variant])}>
          <Icon className={cn("h-6 w-6", variantStyles[variant])} />
        </div>
      </div>
    </div>
  );
}
