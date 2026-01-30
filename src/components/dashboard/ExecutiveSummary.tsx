import { FileText } from "lucide-react";
import { Period, CustomDateRange } from "./PeriodFilter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExecutiveSummaryProps {
  period: Period;
  customDateRange?: CustomDateRange;
  conversations: number;
  conversions: number;
  qualified: number;
  disqualified: number;
  lostLeads: number;
  conversionRate: number;
  qualificationRate: number;
  avgDailyVolume: number;
  peakHour: number | null;
  conversationsChange: number;
  conversionsChange: number;
  loading?: boolean;
}

function getPeriodText(period: Period, customDateRange?: CustomDateRange): string {
  if (period === "custom" && customDateRange) {
    const start = format(customDateRange.start, "dd/MM/yyyy", { locale: ptBR });
    const end = format(customDateRange.end, "dd/MM/yyyy", { locale: ptBR });
    return `De ${start} a ${end}`;
  }
  switch (period) {
    case "today": return "Hoje";
    case "7days": return "Nos últimos 7 dias";
    case "15days": return "Nos últimos 15 dias";
    case "30days": return "Nos últimos 30 dias";
    case "all": return "Em todo o período";
    case "custom": return "No período personalizado";
    default: return "No período selecionado";
  }
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}h`;
}

function getChangeText(change: number, label: string): string {
  if (change === 0) return "";
  const direction = change > 0 ? "aumento" : "queda";
  return `, representando ${direction} de ${Math.abs(change).toFixed(0)}% em ${label}`;
}

export function ExecutiveSummary({
  period,
  customDateRange,
  conversations,
  conversions,
  qualified,
  disqualified,
  lostLeads,
  conversionRate,
  qualificationRate,
  avgDailyVolume,
  peakHour,
  conversationsChange,
  conversionsChange,
  loading = false,
}: ExecutiveSummaryProps) {
  if (loading) {
    return (
      <div className="metric-card">
        <div className="flex items-start gap-4">
          <div className="skeleton-dark h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-3">
            <div className="skeleton-dark h-4 w-32" />
            <div className="skeleton-dark h-4 w-full" />
            <div className="skeleton-dark h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (conversations === 0) {
    return null;
  }

  const periodText = getPeriodText(period, customDateRange);
  const peakHourText = peakHour !== null 
    ? ` O pico de atividade ocorre entre ${formatHour(peakHour)} e ${formatHour((peakHour + 2) % 24)}.`
    : "";

  // Build summary text
  const summaryParts: string[] = [];
  
  summaryParts.push(
    `${periodText}, ${conversations.toLocaleString("pt-BR")} conversas foram iniciadas${getChangeText(conversationsChange, "conversas")}.`
  );

  summaryParts.push(
    `${qualificationRate.toFixed(0)}% dos leads foram qualificados e ${conversionRate.toFixed(0)}% resultaram em conversão${getChangeText(conversionsChange, "conversões")}.`
  );

  if (lostLeads > 0) {
    const lostPercentage = ((lostLeads / conversations) * 100).toFixed(0);
    summaryParts.push(
      `${lostLeads.toLocaleString("pt-BR")} leads (${lostPercentage}%) não foram convertidos.`
    );
  }

  if (avgDailyVolume > 0 && period !== "today") {
    summaryParts.push(
      `Média de ${avgDailyVolume.toFixed(1)} conversas por dia.${peakHourText}`
    );
  }

  return (
    <div className="metric-card slide-up">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Resumo Executivo
          </p>
          <div className="space-y-2 text-foreground leading-relaxed">
            {summaryParts.map((part, index) => (
              <p key={index} className="text-sm">
                {part.split(/(\d+(?:,\d+)?(?:\.\d+)?%?)/g).map((segment, i) => {
                  if (/^\d+(?:,\d+)?(?:\.\d+)?%?$/.test(segment)) {
                    return (
                      <span key={i} className="font-semibold text-primary">
                        {segment}
                      </span>
                    );
                  }
                  return segment;
                })}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
