import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Calendar, UserCheck, UserX, Percent, Target, UserMinus } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DerivedMetricCard } from "@/components/dashboard/DerivedMetricCard";
import { PeriodFilter, Period, CustomDateRange } from "@/components/dashboard/PeriodFilter";
import { FunnelCard } from "@/components/dashboard/FunnelCard";
import { ConversionTimeCard } from "@/components/dashboard/ConversionTimeCard";
import { OperationRhythmCard } from "@/components/dashboard/OperationRhythmCard";
import { ExecutiveSummary } from "@/components/dashboard/ExecutiveSummary";
import { ComparativeSummary } from "@/components/dashboard/ComparativeSummary";
import { RefreshButton } from "@/components/dashboard/RefreshButton";
import { ReportExportButton } from "@/components/dashboard/ReportExportButton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ConnectionError } from "@/components/dashboard/ConnectionError";
import { supabase } from "@/integrations/supabase/client";
import { useIntegration } from "@/hooks/useIntegration";
import { useExternalSupabase, ExternalMetrics } from "@/hooks/useExternalSupabase";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useUserControl } from "@/hooks/useUserControl";

function getDefaultCustomRange(): CustomDateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function getDateRange(period: Period, customRange?: CustomDateRange): { start: Date; end: Date } {
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

function getPreviousDateRange(period: Period, customRange?: CustomDateRange): { start: Date; end: Date } | null {
  if (period === "custom" && !customRange) return null;

  const currentRange = getDateRange(period, customRange);
  const periodMs = currentRange.end.getTime() - currentRange.start.getTime();

  const end = new Date(currentRange.start.getTime() - 1);
  end.setHours(23, 59, 59, 999);

  const start = new Date(end.getTime() - periodMs);
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

const defaultMetrics: ExternalMetrics = {
  conversations: 0,
  conversions: 0,
  qualified: 0,
  disqualified: 0,
  lostLeads: 0,
  conversionRate: 0,
  qualificationRate: 0,
  avgConversionTimeMs: null,
  previousConversations: 0,
  previousConversions: 0,
  previousQualified: 0,
  previousDisqualified: 0,
  previousLostLeads: 0,
  previousConversionRate: 0,
  previousQualificationRate: 0,
  previousAvgConversionTimeMs: null,
  previousAvgDailyVolume: 0,
  previousPeakHour: null,
  previousPeakHourVolume: 0,
  conversationsChange: 0,
  conversionsChange: 0,
  qualifiedChange: 0,
  avgDailyVolume: 0,
  peakHour: null,
  peakHourVolume: 0,
  rawData: [],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { integration, loading: integrationLoading, fetchIntegration } = useIntegration();
  const { fetchMetrics, subscribeToChanges, unsubscribe, loading: metricsLoading } = useExternalSupabase();
  const { preferences, loading: preferencesLoading } = useUserPreferences();
  const { canAccessApp, loading: userControlLoading } = useUserControl();
  
  const [period, setPeriod] = useState<Period>("7days");
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>(() => getDefaultCustomRange());
  const [metrics, setMetrics] = useState<ExternalMetrics>(defaultMetrics);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const subscriptionSetup = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
    });
  }, [navigate]);

  useEffect(() => {
    if (userControlLoading) return;
    if (!canAccessApp) {
      navigate("/pending-approval");
      return;
    }
    if (!integrationLoading && !integration) {
      navigate("/onboarding");
    }
  }, [canAccessApp, userControlLoading, integration, integrationLoading, navigate]);

  const loadMetrics = useCallback(async () => {
    if (!integration?.project_url || !integration?.anon_key || !integration?.selected_table) {
      return;
    }

    setConnectionError(null);
    const dateRange = getDateRange(period, period === "custom" ? customDateRange : undefined);
    const previousRange = getPreviousDateRange(period, period === "custom" ? customDateRange : undefined);

    const result = await fetchMetrics(
      integration.project_url,
      integration.anon_key,
      integration.selected_table,
      dateRange,
      previousRange || undefined
    );

    if (result.error) {
      setConnectionError(result.error);
    } else if (result.metrics) {
      setMetrics(result.metrics);
    }
  }, [integration, period, customDateRange, fetchMetrics]);

  // Setup realtime subscription
  useEffect(() => {
    if (!integration?.project_url || !integration?.anon_key || !integration?.selected_table) {
      return;
    }

    if (subscriptionSetup.current) return;
    subscriptionSetup.current = true;

    subscribeToChanges(
      integration.project_url,
      integration.anon_key,
      integration.selected_table,
      () => {
        loadMetrics();
      }
    );

    return () => {
      unsubscribe();
      subscriptionSetup.current = false;
    };
  }, [integration, subscribeToChanges, unsubscribe, loadMetrics]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMetrics();
    setIsRefreshing(false);
  };

  const handleRetry = () => {
    fetchIntegration();
    loadMetrics();
  };

  const loading = integrationLoading || metricsLoading || preferencesLoading;

  // Funnel data - only include visible metrics
  const funnelSteps = [
    ...(preferences.show_conversas ? [{ label: "Novas Conversas Iniciada", value: metrics.conversations, color: "text-metric-leads" }] : []),
    ...(preferences.show_qualificados ? [{ label: "Leads Qualificados", value: metrics.qualified, color: "text-metric-qualified" }] : []),
    ...(preferences.show_conversoes ? [{ label: "Conversões", value: metrics.conversions, color: "text-metric-conversion" }] : []),
  ];

  if (connectionError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header showLogout title="Inout IA Metrics" />
        <div className="glow-effect" />
        <main className="flex-1 container py-8 relative z-10">
          <ConnectionError message={connectionError} onRetry={handleRetry} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showLogout title="Inout IA Metrics" />
      <div className="glow-effect" />

      <main className="flex-1 container py-8 relative z-10">
        <div className="space-y-8">
          {/* Header with filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                {integration?.selected_table ? (
                  <>Dados da tabela <code className="text-primary">{integration.selected_table}</code></>
                ) : (
                  "Visualize suas métricas comerciais"
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate("/conversation-history")}
              >
                <MessageCircle className="h-4 w-4" />
                Histórico de Conversa
              </Button>
              <ReportExportButton 
                metrics={metrics} 
                preferences={preferences}
                integration={integration}
              />
              <RefreshButton onClick={handleRefresh} loading={isRefreshing} />
              <PeriodFilter
                selected={period}
                onChange={setPeriod}
                customDateRange={customDateRange}
                onCustomDateRangeChange={setCustomDateRange}
              />
            </div>
          </div>

          {/* Main Metrics Grid - Respects user preferences */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {preferences.show_conversas && (
              <MetricCard
                title="Novas Conversas Iniciada"
                value={metrics.conversations}
                icon={MessageCircle}
                variant="leads"
                description="Total de registros"
                tooltip="Quantidade de novos leads que iniciaram uma conversa no período selecionado."
                loading={loading}
              />
            )}
            {preferences.show_conversoes && (
              <MetricCard
                title="Conversões"
                value={metrics.conversions}
                icon={Calendar}
                variant="conversion"
                description={`${metrics.conversionRate.toFixed(1)}% de conversão`}
                tooltip="Quantidade de leads que executaram o evento de conversão no período selecionado. Exemplo: Marcou reunião, Marcou Visita, etc."
                loading={loading}
              />
            )}
            {preferences.show_qualificados && (
              <MetricCard
                title="Leads Qualificados"
                value={metrics.qualified}
                icon={UserCheck}
                variant="qualified"
                description="Prontos para avançar"
                tooltip="Quantidade de leads que cumprem os requisitos das perguntas de qualificação."
                loading={loading}
              />
            )}
            {preferences.show_desqualificados && (
              <MetricCard
                title="Leads Desqualificados"
                value={metrics.disqualified}
                icon={UserX}
                variant="disqualified"
                description="Fora do perfil"
                tooltip="Leads que responderam as perguntas de qualificação mas não cumprem os requisitos."
                loading={loading}
              />
            )}
          </div>

          {/* Derived Metrics - Always visible but adapt to preferences */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {preferences.show_conversoes && (
              <DerivedMetricCard
                title="Taxa de Conversão"
                value={`${metrics.conversionRate.toFixed(1)}%`}
                subValue={`${metrics.conversions} de ${metrics.conversations} conversas`}
                icon={Percent}
                variant="success"
                change={metrics.conversionsChange}
                showChange={period !== "all" && period !== "custom"}
                loading={loading}
              />
            )}
            {preferences.show_qualificados && (
              <DerivedMetricCard
                title="Taxa de Qualificação"
                value={`${metrics.qualificationRate.toFixed(1)}%`}
                subValue={`${metrics.qualified} leads qualificados`}
                icon={Target}
                variant="success"
                change={metrics.qualifiedChange}
                showChange={period !== "all" && period !== "custom"}
                loading={loading}
              />
            )}
            <DerivedMetricCard
              title="Leads Perdidos"
              value={metrics.lostLeads.toString()}
              subValue={metrics.conversations > 0 
                ? `${((metrics.lostLeads / metrics.conversations) * 100).toFixed(1)}% do total`
                : "Nenhum lead no período"
              }
              icon={UserMinus}
              variant={metrics.lostLeads > 0 ? "danger" : "default"}
              loading={loading}
            />
          </div>

          {/* Funnel and Time Cards - Only show funnel if there are steps */}
          <div className="grid gap-6 lg:grid-cols-2">
            {funnelSteps.length > 0 && (
              <FunnelCard steps={funnelSteps} loading={loading} />
            )}
            <div className={`space-y-6 ${funnelSteps.length === 0 ? 'lg:col-span-2' : ''}`}>
              <ConversionTimeCard avgTimeMs={metrics.avgConversionTimeMs} loading={loading} />
              <OperationRhythmCard
                avgDailyVolume={metrics.avgDailyVolume}
                peakHour={metrics.peakHour}
                peakHourVolume={metrics.peakHourVolume}
                loading={loading}
              />
            </div>
          </div>

          {/* Executive Summary */}
          {!loading && metrics.conversations > 0 && (
            <ExecutiveSummary
              period={period}
              customDateRange={period === "custom" ? customDateRange : undefined}
              conversations={metrics.conversations}
              conversions={metrics.conversions}
              qualified={metrics.qualified}
              disqualified={metrics.disqualified}
              lostLeads={metrics.lostLeads}
              conversionRate={metrics.conversionRate}
              qualificationRate={metrics.qualificationRate}
              avgDailyVolume={metrics.avgDailyVolume}
              peakHour={metrics.peakHour}
              conversationsChange={metrics.conversationsChange}
              conversionsChange={metrics.conversionsChange}
              loading={loading}
            />
          )}

          {!loading && (
            <ComparativeSummary
              metrics={metrics}
              period={period}
              customDateRange={period === "custom" ? customDateRange : undefined}
            />
          )}

          {!loading && metrics.conversations === 0 && <EmptyState />}
        </div>
      </main>
    </div>
  );
}
