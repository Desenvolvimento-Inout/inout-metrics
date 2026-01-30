import { cn } from "@/lib/utils";
import { CalendarRange } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Period = "today" | "7days" | "15days" | "30days" | "all" | "custom";

export interface CustomDateRange {
  start: Date;
  end: Date;
}

interface PeriodFilterProps {
  selected: Period;
  onChange: (period: Period) => void;
  customDateRange?: CustomDateRange;
  onCustomDateRangeChange?: (range: CustomDateRange) => void;
}

const periods: { value: Exclude<Period, "custom">; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7days", label: "7 dias" },
  { value: "15days", label: "15 dias" },
  { value: "30days", label: "30 dias" },
  { value: "all", label: "Todo período" },
];

function dateToInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inputValueToDate(value: string, endOfDay: boolean): Date {
  const d = new Date(value + "T00:00:00");
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

export function PeriodFilter({
  selected,
  onChange,
  customDateRange,
  onCustomDateRangeChange,
}: PeriodFilterProps) {
  const handleCustomStart = (value: string) => {
    if (!onCustomDateRangeChange || !customDateRange) return;
    const start = inputValueToDate(value, false);
    const end = new Date(customDateRange.end);
    if (end < start) end.setTime(start.getTime());
    end.setHours(23, 59, 59, 999);
    onCustomDateRangeChange({ start, end });
  };

  const handleCustomEnd = (value: string) => {
    if (!onCustomDateRangeChange || !customDateRange) return;
    const end = inputValueToDate(value, true);
    const start = new Date(customDateRange.start);
    start.setHours(0, 0, 0, 0);
    if (start > end) start.setTime(end.getTime());
    onCustomDateRangeChange({ start, end });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg border border-border">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => onChange(period.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
              selected === period.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {period.label}
          </button>
        ))}
        <button
          onClick={() => onChange("custom")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1.5",
            selected === "custom"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <CalendarRange className="h-4 w-4" />
          Data personalizada
        </button>
      </div>

      {selected === "custom" && customDateRange && onCustomDateRangeChange && (
        <div className="flex items-center gap-3 px-3 py-2 bg-secondary/50 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <Label htmlFor="period-start" className="text-sm text-muted-foreground whitespace-nowrap">
              De
            </Label>
            <Input
              id="period-start"
              type="date"
              value={dateToInputValue(customDateRange.start)}
              onChange={(e) => handleCustomStart(e.target.value)}
              className="h-9 w-[140px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="period-end" className="text-sm text-muted-foreground whitespace-nowrap">
              Até
            </Label>
            <Input
              id="period-end"
              type="date"
              value={dateToInputValue(customDateRange.end)}
              onChange={(e) => handleCustomEnd(e.target.value)}
              className="h-9 w-[140px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
