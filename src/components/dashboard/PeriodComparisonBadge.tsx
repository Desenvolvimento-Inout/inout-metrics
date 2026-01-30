import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PeriodComparisonBadgeProps {
  change: number;
  className?: string;
}

export function PeriodComparisonBadge({ change, className }: PeriodComparisonBadgeProps) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        isPositive && "bg-success/10 text-success",
        isNegative && "bg-destructive/10 text-destructive",
        isNeutral && "bg-muted text-muted-foreground",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>
        {isPositive && "+"}
        {change.toFixed(1)}%
      </span>
    </div>
  );
}
