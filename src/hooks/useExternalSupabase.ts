import { useState, useCallback, useRef, useEffect } from "react";
import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

export interface LeadData {
  id: string;
  cliente_id?: string;
  cliente_nome?: string;
  created_at: string;
  qualified?: boolean;
  disqualified?: boolean;
  converted?: boolean;
  data_conversao?: string | null;
}

export interface ExternalMetrics {
  conversations: number;
  conversions: number;
  qualified: number;
  disqualified: number;
  // Derived metrics
  lostLeads: number;
  conversionRate: number;
  qualificationRate: number;
  avgConversionTimeMs: number | null;
  // Period comparison
  previousConversations: number;
  previousConversions: number;
  previousQualified: number;
  previousDisqualified: number;
  previousLostLeads: number;
  previousConversionRate: number;
  previousQualificationRate: number;
  previousAvgConversionTimeMs: number | null;
  previousAvgDailyVolume: number;
  previousPeakHour: number | null;
  previousPeakHourVolume: number;
  conversationsChange: number;
  conversionsChange: number;
  qualifiedChange: number;
  // Operation rhythm
  avgDailyVolume: number;
  peakHour: number | null;
  peakHourVolume: number;
  // Raw data for funnel
  rawData: LeadData[];
}

export function useExternalSupabase() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const connect = useCallback((projectUrl: string, anonKey: string) => {
    try {
      if (!projectUrl.includes("supabase.co") && !projectUrl.includes("supabase.in")) {
        throw new Error("URL do projeto inválida");
      }

      const newClient = createClient(projectUrl, anonKey);
      setClient(newClient);
      setError(null);
      return newClient;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao conectar";
      setError(message);
      return null;
    }
  }, []);

  const testConnection = useCallback(async (projectUrl: string, anonKey: string) => {
    setLoading(true);
    setError(null);

    try {
      const testClient = createClient(projectUrl, anonKey);
      
      const { error: testError } = await testClient
        .from("_test_connection_")
        .select("*")
        .limit(1);

      if (testError && !testError.message.includes("does not exist") && !testError.message.includes("permission denied")) {
        throw new Error(testError.message);
      }

      setClient(testClient);
      return { success: true, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao testar conexão";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTables = useCallback(async (projectUrl: string, anonKey: string) => {
    setLoading(true);
    setError(null);

    try {
      const testClient = createClient(projectUrl, anonKey);
      
      const { data, error: fetchError } = await testClient
        .rpc('get_tables', {})
        .single();

      if (fetchError) {
        return { 
          tables: [], 
          error: "Para listar tabelas automaticamente, crie uma função RPC 'get_tables' no seu Supabase ou insira o nome da tabela manualmente." 
        };
      }

      return { tables: data || [], error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar tabelas";
      setError(message);
      return { tables: [], error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateMetrics = (
    data: LeadData[],
    previousData: LeadData[],
    periodDays: number
  ): ExternalMetrics => {
    const calcAvgConversionTimeMs = (rows: LeadData[]): number | null => {
      const conversionTimes: number[] = [];
      rows.forEach(row => {
        if (row.converted && row.data_conversao && row.created_at) {
          const createdAt = new Date(row.created_at).getTime();
          const convertedAt = new Date(row.data_conversao).getTime();
          if (convertedAt > createdAt) {
            conversionTimes.push(convertedAt - createdAt);
          }
        }
      });
      return conversionTimes.length > 0
        ? conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length
        : null;
    };

    const calcPeakHourInfo = (rows: LeadData[]) => {
      const hourCounts: Record<number, number> = {};
      rows.forEach(row => {
        const hour = new Date(row.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      let peakHour: number | null = null;
      let peakHourVolume = 0;
      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > peakHourVolume) {
          peakHour = parseInt(hour);
          peakHourVolume = count;
        }
      });

      return { peakHour, peakHourVolume };
    };

    const calcBaseMetrics = (rows: LeadData[]) => {
      const conversations = rows.length;
      const conversions = rows.filter(row => row.converted === true).length;
      const qualified = rows.filter(row => row.qualified === true).length;
      const disqualified = rows.filter(row => row.disqualified === true).length;
      const lostLeads = rows.filter(row => row.converted !== true).length;
      const conversionRate = conversations > 0 ? (conversions / conversations) * 100 : 0;
      const qualificationRate = conversations > 0 ? (qualified / conversations) * 100 : 0;
      const avgConversionTimeMs = calcAvgConversionTimeMs(rows);
      const { peakHour, peakHourVolume } = calcPeakHourInfo(rows);

      return {
        conversations,
        conversions,
        qualified,
        disqualified,
        lostLeads,
        conversionRate,
        qualificationRate,
        avgConversionTimeMs,
        peakHour,
        peakHourVolume,
      };
    };

    const currentMetrics = calcBaseMetrics(data || []);
    const previousMetrics = calcBaseMetrics(previousData || []);

    const avgDailyVolume = periodDays > 0
      ? currentMetrics.conversations / periodDays
      : currentMetrics.conversations;
    const previousAvgDailyVolume = periodDays > 0
      ? previousMetrics.conversations / periodDays
      : previousMetrics.conversations;

    // Calculate percentage changes
    const calcChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      conversations: currentMetrics.conversations,
      conversions: currentMetrics.conversions,
      qualified: currentMetrics.qualified,
      disqualified: currentMetrics.disqualified,
      lostLeads: currentMetrics.lostLeads,
      conversionRate: currentMetrics.conversionRate,
      qualificationRate: currentMetrics.qualificationRate,
      avgConversionTimeMs: currentMetrics.avgConversionTimeMs,
      previousConversations: previousMetrics.conversations,
      previousConversions: previousMetrics.conversions,
      previousQualified: previousMetrics.qualified,
      previousDisqualified: previousMetrics.disqualified,
      previousLostLeads: previousMetrics.lostLeads,
      previousConversionRate: previousMetrics.conversionRate,
      previousQualificationRate: previousMetrics.qualificationRate,
      previousAvgConversionTimeMs: previousMetrics.avgConversionTimeMs,
      previousAvgDailyVolume,
      previousPeakHour: previousMetrics.peakHour,
      previousPeakHourVolume: previousMetrics.peakHourVolume,
      conversationsChange: calcChange(currentMetrics.conversations, previousMetrics.conversations),
      conversionsChange: calcChange(currentMetrics.conversions, previousMetrics.conversions),
      qualifiedChange: calcChange(currentMetrics.qualified, previousMetrics.qualified),
      avgDailyVolume,
      peakHour: currentMetrics.peakHour,
      peakHourVolume: currentMetrics.peakHourVolume,
      rawData: data || [],
    };
  };

  const fetchMetrics = useCallback(async (
    projectUrl: string,
    anonKey: string,
    tableName: string,
    dateFilter?: { start: Date; end: Date },
    previousDateFilter?: { start: Date; end: Date }
  ): Promise<{ metrics: ExternalMetrics | null; error: string | null }> => {
    setLoading(true);
    setError(null);

    try {
      const externalClient = createClient(projectUrl, anonKey);

      // Fetch current period data
      let query = externalClient.from(tableName).select("*");

      if (dateFilter) {
        query = query
          .gte("created_at", dateFilter.start.toISOString())
          .lte("created_at", dateFilter.end.toISOString());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Fetch previous period data for comparison
      let previousData: LeadData[] = [];
      if (previousDateFilter) {
        const { data: prevData, error: prevError } = await externalClient
          .from(tableName)
          .select("*")
          .gte("created_at", previousDateFilter.start.toISOString())
          .lte("created_at", previousDateFilter.end.toISOString());

        if (!prevError && prevData) {
          previousData = prevData as LeadData[];
        }
      }

      // Calculate period days
      let periodDays = 1;
      if (dateFilter) {
        periodDays = Math.max(1, Math.ceil(
          (dateFilter.end.getTime() - dateFilter.start.getTime()) / (1000 * 60 * 60 * 24)
        ));
      }

      const metrics = calculateMetrics(
        (data || []) as LeadData[], 
        previousData,
        periodDays
      );

      return { metrics, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar métricas";
      setError(message);
      return { metrics: null, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const subscribeToChanges = useCallback((
    projectUrl: string,
    anonKey: string,
    tableName: string,
    onUpdate: () => void
  ) => {
    try {
      const externalClient = createClient(projectUrl, anonKey);
      
      // Unsubscribe from previous channel if exists
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }

      const channel = externalClient
        .channel(`public:${tableName}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: tableName 
          },
          () => {
            onUpdate();
          }
        )
        .subscribe();

      channelRef.current = channel;
      return channel;
    } catch (err) {
      console.error("Erro ao configurar realtime:", err);
      return null;
    }
  }, []);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    client,
    loading,
    error,
    connect,
    testConnection,
    fetchTables,
    fetchMetrics,
    subscribeToChanges,
    unsubscribe,
  };
}
