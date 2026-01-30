import { ExternalMetrics } from "@/hooks/useExternalSupabase";
import { Period, CustomDateRange } from "@/components/dashboard/PeriodFilter";
import { cn } from "@/lib/utils";

interface ComparativeSummaryProps {
  metrics: ExternalMetrics;
  period: Period;
  customDateRange?: CustomDateRange;
  loading?: boolean;
}

function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatChange(
  current: number,
  previous: number,
  decimals = 0,
  unit = ""
): string {
  const delta = current - previous;
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
  const percentBase = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
  const percentSign = percentBase > 0 ? "+" : percentBase < 0 ? "-" : "";
  const deltaValue = `${sign}${formatNumber(Math.abs(delta), decimals)}${unit}`;
  const percentValue = `${percentSign}${formatNumber(Math.abs(percentBase), 1)}%`;

  return `Var: ${deltaValue} (${percentValue})`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }
  if (minutes > 0) {
    return `${minutes}min`;
  }
  return `${seconds}s`;
}

function formatHourRange(hour: number): string {
  const nextHour = (hour + 2) % 24;
  const formatHour = (h: number) => `${h.toString().padStart(2, "0")}h`;
  return `${formatHour(hour)} e ${formatHour(nextHour)}`;
}

function formatPeriodLabel(period: Period, customDateRange?: CustomDateRange): string {
  if (period === "custom" && customDateRange) {
    const start = new Date(customDateRange.start);
    const end = new Date(customDateRange.end);
    return `${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`;
  }

  switch (period) {
    case "today":
      return "Hoje";
    case "7days":
      return "Últimos 7 dias";
    case "15days":
      return "Últimos 15 dias";
    case "30days":
      return "Últimos 30 dias";
    case "all":
      return "Todo o período";
    default:
      return "Período selecionado";
  }
}

type TrendDirection = "higher" | "lower";

function isBadChange(current: number, previous: number, trend: TrendDirection): boolean {
  if (current === previous) return false;
  if (trend === "higher") {
    return current < previous;
  }
  return current > previous;
}

export function ComparativeSummary({
  metrics,
  period,
  customDateRange,
  loading = false,
}: ComparativeSummaryProps) {
  if (loading) {
    return (
      <div className="metric-card">
        <div className="space-y-3">
          <div className="skeleton-dark h-4 w-44" />
          <div className="skeleton-dark h-3 w-3/4" />
          <div className="skeleton-dark h-3 w-2/3" />
          <div className="skeleton-dark h-3 w-1/2" />
        </div>
      </div>
    );
  }

  const hasCurrentTime = metrics.avgConversionTimeMs !== null && metrics.avgConversionTimeMs > 0;
  const hasPreviousTime = metrics.previousAvgConversionTimeMs !== null && metrics.previousAvgConversionTimeMs > 0;
  const currentTimeLabel = hasCurrentTime ? formatDuration(metrics.avgConversionTimeMs as number) : "—";
  const previousTimeLabel = hasPreviousTime ? formatDuration(metrics.previousAvgConversionTimeMs as number) : "—";
  const timeChangeLabel =
    hasCurrentTime && hasPreviousTime
      ? formatChange(metrics.avgConversionTimeMs as number, metrics.previousAvgConversionTimeMs as number)
      : "Var: —";

  const hasPeakHour = metrics.peakHour !== null;
  const hasPreviousPeakHour = metrics.previousPeakHour !== null;
  const currentPeakLabel = hasPeakHour
    ? `${formatHourRange(metrics.peakHour as number)} (${formatNumber(metrics.peakHourVolume)} leads)`
    : "—";
  const previousPeakLabel = hasPreviousPeakHour
    ? `${formatHourRange(metrics.previousPeakHour as number)} (${formatNumber(metrics.previousPeakHourVolume)} leads)`
    : "—";
  const peakChangeLabel =
    hasPeakHour && hasPreviousPeakHour
      ? formatChange(metrics.peakHourVolume, metrics.previousPeakHourVolume)
      : "Var: —";

  const summaryItems = [
    {
      label: "Novas Conversas Iniciada",
      current: formatNumber(metrics.conversations),
      previous: formatNumber(metrics.previousConversations),
      change: formatChange(metrics.conversations, metrics.previousConversations),
      currentValue: metrics.conversations,
      previousValue: metrics.previousConversations,
      trend: "higher" as TrendDirection,
    },
    {
      label: "Conversões",
      current: formatNumber(metrics.conversions),
      previous: formatNumber(metrics.previousConversions),
      change: formatChange(metrics.conversions, metrics.previousConversions),
      currentValue: metrics.conversions,
      previousValue: metrics.previousConversions,
      trend: "higher" as TrendDirection,
    },
    {
      label: "Leads Qualificados",
      current: formatNumber(metrics.qualified),
      previous: formatNumber(metrics.previousQualified),
      change: formatChange(metrics.qualified, metrics.previousQualified),
      currentValue: metrics.qualified,
      previousValue: metrics.previousQualified,
      trend: "higher" as TrendDirection,
    },
    {
      label: "Leads Desqualificados",
      current: formatNumber(metrics.disqualified),
      previous: formatNumber(metrics.previousDisqualified),
      change: formatChange(metrics.disqualified, metrics.previousDisqualified),
      currentValue: metrics.disqualified,
      previousValue: metrics.previousDisqualified,
      trend: "lower" as TrendDirection,
    },
    {
      label: "Leads Perdidos",
      current: formatNumber(metrics.lostLeads),
      previous: formatNumber(metrics.previousLostLeads),
      change: formatChange(metrics.lostLeads, metrics.previousLostLeads),
      currentValue: metrics.lostLeads,
      previousValue: metrics.previousLostLeads,
      trend: "lower" as TrendDirection,
    },
    {
      label: "Taxa de Conversão",
      current: `${formatNumber(metrics.conversionRate, 1)}%`,
      previous: `${formatNumber(metrics.previousConversionRate, 1)}%`,
      change: formatChange(metrics.conversionRate, metrics.previousConversionRate, 1, " p.p."),
      currentValue: metrics.conversionRate,
      previousValue: metrics.previousConversionRate,
      trend: "higher" as TrendDirection,
    },
    {
      label: "Taxa de Qualificação",
      current: `${formatNumber(metrics.qualificationRate, 1)}%`,
      previous: `${formatNumber(metrics.previousQualificationRate, 1)}%`,
      change: formatChange(metrics.qualificationRate, metrics.previousQualificationRate, 1, " p.p."),
      currentValue: metrics.qualificationRate,
      previousValue: metrics.previousQualificationRate,
      trend: "higher" as TrendDirection,
    },
    {
      label: "Tempo Médio até Conversão",
      current: currentTimeLabel,
      previous: previousTimeLabel,
      change: timeChangeLabel,
      currentValue: metrics.avgConversionTimeMs ?? 0,
      previousValue: metrics.previousAvgConversionTimeMs ?? 0,
      trend: "lower" as TrendDirection,
    },
    {
      label: "Média diária de conversas",
      current: formatNumber(metrics.avgDailyVolume, 1),
      previous: formatNumber(metrics.previousAvgDailyVolume, 1),
      change: formatChange(metrics.avgDailyVolume, metrics.previousAvgDailyVolume, 1),
      currentValue: metrics.avgDailyVolume,
      previousValue: metrics.previousAvgDailyVolume,
      trend: "higher" as TrendDirection,
    },
    {
      label: "Pico de volume",
      current: currentPeakLabel,
      previous: previousPeakLabel,
      change: peakChangeLabel,
      currentValue: metrics.peakHourVolume,
      previousValue: metrics.previousPeakHourVolume,
      trend: "higher" as TrendDirection,
    },
  ];

  return (
    <div className="metric-card fade-in">
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-muted-foreground">Resumo Comparativo</h3>
          <p className="text-xs text-muted-foreground/70">
            Comparação com o período anterior do intervalo selecionado ({formatPeriodLabel(period, customDateRange)}).
          </p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          {summaryItems.map(item => {
            const showBad = isBadChange(item.currentValue, item.previousValue, item.trend);

            return (
              <p key={item.label}>
                <span className="font-medium text-foreground">{item.label}:</span>{" "}
                Atual {item.current} · Anterior {item.previous} ·{" "}
                <span className={cn(showBad && "text-destructive")}>{item.change}</span>
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
