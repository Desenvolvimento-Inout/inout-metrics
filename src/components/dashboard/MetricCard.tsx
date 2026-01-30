import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { PeriodComparisonBadge } from "./PeriodComparisonBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "default" | "qualified" | "disqualified" | "conversion" | "leads";
  description?: string;
  tooltip?: string;
  loading?: boolean;
  change?: number;
  showChange?: boolean;
}

const variantStyles = {
  default: "text-foreground",
  qualified: "text-metric-qualified",
  disqualified: "text-destructive",
  conversion: "text-metric-conversion",
  leads: "text-metric-leads",
};

const iconBgStyles = {
  default: "bg-muted",
  qualified: "bg-metric-qualified/10",
  disqualified: "bg-destructive/10",
  conversion: "bg-metric-conversion/10",
  leads: "bg-metric-leads/10",
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  variant = "default",
  description,
  tooltip,
  loading = false,
  change,
  showChange = false,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="metric-card">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="skeleton-dark h-4 w-24" />
            <div className="skeleton-dark h-12 w-32" />
            {description && <div className="skeleton-dark h-3 w-40" />}
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
            {tooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm font-medium text-muted-foreground cursor-help">{title}</p>
                </TooltipTrigger>
                <TooltipContent side="top" align="start">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
            )}
            {showChange && change !== undefined && (
              <PeriodComparisonBadge change={change} />
            )}
          </div>
          <p className={cn("text-4xl font-semibold tracking-tight", variantStyles[variant])}>
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground/70">{description}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-lg", iconBgStyles[variant])}>
          <Icon className={cn("h-6 w-6", variantStyles[variant])} />
        </div>
      </div>
    </div>
  );
}
