import { useState } from "react";
import { Download, Loader2, Check, Calendar, CalendarDays, CalendarRange, History, CalendarCheck } from "lucide-react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ExternalMetrics } from "@/hooks/useExternalSupabase";
import { UserPreferences } from "@/hooks/useUserPreferences";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ReportPeriod = "today" | "7days" | "15days" | "30days" | "all" | "custom";

interface CustomDateRange {
  start: Date;
  end: Date;
}

interface ReportExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMetrics: ExternalMetrics;
  preferences: UserPreferences;
  integration: {
    project_url: string;
    anon_key: string;
    selected_table: string;
  } | null;
}

const periodOptions: { value: Exclude<ReportPeriod, "custom">; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "today", label: "Hoje", icon: Calendar },
  { value: "7days", label: "Últimos 7 dias", icon: CalendarDays },
  { value: "15days", label: "Últimos 15 dias", icon: CalendarDays },
  { value: "30days", label: "Últimos 30 dias", icon: CalendarRange },
  { value: "all", label: "Todo o histórico", icon: History },
];

function getDefaultCustomRange(): CustomDateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

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

function getDateRange(period: ReportPeriod, customRange?: CustomDateRange): { start: Date; end: Date } {
  if (period === "custom" && customRange) {
    const start = new Date(customRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customRange.end);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      break;
    case "7days":
      start.setDate(start.getDate() - 7);
      break;
    case "15days":
      start.setDate(start.getDate() - 15);
      break;
    case "30days":
      start.setDate(start.getDate() - 30);
      break;
    case "all":
      start.setFullYear(2000);
      break;
  }

  return { start, end };
}

function getPeriodLabel(period: ReportPeriod, customRange?: CustomDateRange): string {
  if (period === "custom" && customRange) {
    return `personalizado-${dateToInputValue(customRange.start)}-a-${dateToInputValue(customRange.end)}`;
  }
  switch (period) {
    case "today": return "hoje";
    case "7days": return "7dias";
    case "15days": return "15dias";
    case "30days": return "30dias";
    case "all": return "historico-completo";
    case "custom": return "personalizado";
  }
}

export function ReportExportModal({ 
  open, 
  onOpenChange, 
  currentMetrics, 
  preferences, 
  integration 
}: ReportExportModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>("7days");
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>(() => getDefaultCustomRange());
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCustomStart = (value: string) => {
    const start = inputValueToDate(value, false);
    const end = new Date(customDateRange.end);
    if (end < start) end.setTime(start.getTime());
    end.setHours(23, 59, 59, 999);
    setCustomDateRange({ start, end });
  };

  const handleCustomEnd = (value: string) => {
    const end = inputValueToDate(value, true);
    const start = new Date(customDateRange.start);
    start.setHours(0, 0, 0, 0);
    if (start > end) start.setTime(end.getTime());
    setCustomDateRange({ start, end });
  };

  const handleExport = async () => {
    if (!integration) return;

    setLoading(true);
    setSuccess(false);

    try {
      const externalClient = createClient(integration.project_url, integration.anon_key);
      const dateRange = getDateRange(selectedPeriod, selectedPeriod === "custom" ? customDateRange : undefined);

      let query = externalClient
        .from(integration.selected_table)
        .select("*")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Calculate metrics from data
      const conversations = data?.length || 0;
      const conversions = data?.filter((d: any) => d.converted === true).length || 0;
      const qualified = data?.filter((d: any) => d.qualified === true).length || 0;
      const disqualified = data?.filter((d: any) => d.disqualified === true).length || 0;
      const lostLeads = conversations - conversions;
      const conversionRate = conversations > 0 ? (conversions / conversations) * 100 : 0;
      const qualificationRate = conversations > 0 ? (qualified / conversations) * 100 : 0;

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData: any[] = [
        ["Relatório Inout Metrics"],
        [""],
        ["Período", getPeriodLabel(selectedPeriod, selectedPeriod === "custom" ? customDateRange : undefined).replace(/-/g, " ")],
        ["Data de geração", format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })],
        [""],
        ["RESUMO DE MÉTRICAS"],
        [""],
      ];

      if (preferences.show_conversas) {
        summaryData.push(["Conversas Iniciadas", conversations]);
      }
      if (preferences.show_conversoes) {
        summaryData.push(["Conversões Realizadas", conversions]);
        summaryData.push(["Taxa de Conversão", `${conversionRate.toFixed(1)}%`]);
      }
      if (preferences.show_qualificados) {
        summaryData.push(["Leads Qualificados", qualified]);
        summaryData.push(["Taxa de Qualificação", `${qualificationRate.toFixed(1)}%`]);
      }
      if (preferences.show_desqualificados) {
        summaryData.push(["Leads Desqualificados", disqualified]);
      }
      
      summaryData.push(["Leads Perdidos", lostLeads]);
      summaryData.push([""], [""], ["DADOS DETALHADOS"]);

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

      // Detail sheet with raw data
      if (data && data.length > 0) {
        const detailHeaders = [
          "ID",
          "Cliente ID", 
          "Cliente Nome",
          "Data de Criação",
          "Qualificado",
          "Desqualificado", 
          "Convertido",
          "Data de Conversão"
        ];

        const detailData = [
          detailHeaders,
          ...data.map((row: any) => [
            row.id,
            row.cliente_id,
            row.cliente_nome,
            row.created_at ? format(new Date(row.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "",
            row.qualified ? "Sim" : "Não",
            row.disqualified ? "Sim" : "Não",
            row.converted ? "Sim" : "Não",
            row.data_conversao ? format(new Date(row.data_conversao), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "",
          ])
        ];

        const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
        
        // Set column widths
        wsDetail["!cols"] = [
          { wch: 40 }, // ID
          { wch: 15 }, // Cliente ID
          { wch: 25 }, // Cliente Nome
          { wch: 18 }, // Data de Criação
          { wch: 12 }, // Qualificado
          { wch: 14 }, // Desqualificado
          { wch: 12 }, // Convertido
          { wch: 18 }, // Data de Conversão
        ];

        XLSX.utils.book_append_sheet(wb, wsDetail, "Dados");
      }

      // Generate file
      const fileName = `clarity-metrics-relatorio-${getPeriodLabel(selectedPeriod, selectedPeriod === "custom" ? customDateRange : undefined)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Gerar Relatório</DialogTitle>
          <DialogDescription>
            Selecione o período para exportar as métricas.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedPeriod}
            onValueChange={(value) => setSelectedPeriod(value as ReportPeriod)}
            className="space-y-3"
          >
            {periodOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors cursor-pointer"
                  onClick={() => setSelectedPeriod(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={option.value} className="cursor-pointer flex-1">
                    {option.label}
                  </Label>
                </div>
              );
            })}
            <div
              className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors cursor-pointer"
              onClick={() => setSelectedPeriod("custom")}
            >
              <RadioGroupItem value="custom" id="custom" />
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="custom" className="cursor-pointer flex-1">
                Data personalizada
              </Label>
            </div>
          </RadioGroup>

          {selectedPeriod === "custom" && (
            <div className="flex flex-wrap items-center gap-4 pt-4 pl-7 border-t border-border/50 mt-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="export-start" className="text-sm text-muted-foreground whitespace-nowrap">
                  De
                </Label>
                <Input
                  id="export-start"
                  type="date"
                  value={dateToInputValue(customDateRange.start)}
                  onChange={(e) => handleCustomStart(e.target.value)}
                  className="h-9 w-[140px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="export-end" className="text-sm text-muted-foreground whitespace-nowrap">
                  Até
                </Label>
                <Input
                  id="export-end"
                  type="date"
                  value={dateToInputValue(customDateRange.end)}
                  onChange={(e) => handleCustomEnd(e.target.value)}
                  className="h-9 w-[140px]"
                />
              </div>
            </div>
          )}
        </div>

        {success && (
          <div className="flex items-center justify-center gap-2 text-sm text-metric-qualified pb-2">
            <Check className="h-4 w-4" />
            Relatório gerado com sucesso!
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={loading || success || !integration}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
