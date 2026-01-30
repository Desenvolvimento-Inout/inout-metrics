import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, MessageSquare, Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PeriodFilter, Period, CustomDateRange } from "@/components/dashboard/PeriodFilter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useIntegration } from "@/hooks/useIntegration";
import { useUserControl } from "@/hooks/useUserControl";

type ChatMessageRow = {
  id: number;
  session_id: string;
  message: {
    type?: string;
    content?: string;
    [key: string]: unknown;
  } | string | null;
  created_at?: string | null;
};

const MESSAGE_TABLE = "n8n_chat_histories";

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

export default function ConversationHistory() {
  const navigate = useNavigate();
  const { integration, loading: integrationLoading } = useIntegration();
  const { canAccessApp, loading: userControlLoading } = useUserControl();

  const [sessions, setSessions] = useState<string[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [listFilter, setListFilter] = useState("");
  const [period, setPeriod] = useState<Period>("7days");
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>(() => getDefaultCustomRange());
  const [disableAgentLoading, setDisableAgentLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    if (!integrationLoading && !integration?.project_url) {
      navigate("/onboarding");
    }
  }, [canAccessApp, userControlLoading, integration, integrationLoading, navigate]);

  const fetchSessions = useCallback(async () => {
    if (!integration?.project_url || !integration?.anon_key) return;
    setSessionsLoading(true);
    try {
      const externalClient = createClient(integration.project_url, integration.anon_key);
      const dateRange = getDateRange(period, period === "custom" ? customDateRange : undefined);
      let query = externalClient
        .from(MESSAGE_TABLE)
        .select("session_id, id, created_at")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (period !== "all") {
        query = query
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const uniqueSessions: string[] = [];
      const seen = new Set<string>();
      (data || []).forEach((row) => {
        if (row.session_id && !seen.has(row.session_id)) {
          seen.add(row.session_id);
          uniqueSessions.push(row.session_id);
        }
      });

      setSessions(uniqueSessions);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar sessões";
      toast({
        title: "Erro ao buscar sessões",
        description: message,
        variant: "destructive",
      });
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [integration, period, customDateRange]);

  const fetchMessages = useCallback(async (sessionId: string) => {
    if (!integration?.project_url || !integration?.anon_key) return;
    setMessagesLoading(true);
    try {
      const externalClient = createClient(integration.project_url, integration.anon_key);
      const dateRange = getDateRange(period, period === "custom" ? customDateRange : undefined);
      let query = externalClient
        .from(MESSAGE_TABLE)
        .select("id, session_id, message, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (period !== "all") {
        query = query
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages((data || []) as ChatMessageRow[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar mensagens";
      toast({
        title: "Erro ao buscar mensagens",
        description: message,
        variant: "destructive",
      });
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [integration, period, customDateRange]);

  useEffect(() => {
    if (!integration?.project_url || !integration?.anon_key) return;
    fetchSessions();
  }, [fetchSessions, integration]);

  useEffect(() => {
    if (!activeSessionId) return;
    fetchMessages(activeSessionId);
  }, [activeSessionId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredSessions = useMemo(() => {
    if (!listFilter) return sessions;
    const normalized = listFilter.trim();
    return sessions.filter((sessionId) => sessionId.includes(normalized));
  }, [sessions, listFilter]);

  const handleOpenSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    if (!sessions.includes(sessionId)) {
      setSessions((prev) => [sessionId, ...prev]);
    }
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed) return;
    handleOpenSession(trimmed);
  };

  const formatContent = (message: ChatMessageRow["message"]) => {
    if (!message) return "";
    if (typeof message === "string") return message;
    if (typeof message.content === "string") return message.content;
    return JSON.stringify(message);
  };

  const formatTimestamp = (timestamp?: string | null) => {
    if (!timestamp) return "";
    try {
      return new Date(timestamp).toLocaleString("pt-BR");
    } catch {
      return "";
    }
  };

  const handleDisableAgentForLead = async () => {
    const leadId = activeSessionId?.trim();
    if (!leadId) {
      toast({
        title: "Selecione um lead",
        description: "Escolha uma sessão antes de desabilitar a IA.",
        variant: "destructive",
      });
      return;
    }
    if (!integration?.project_url || !integration?.anon_key) {
      toast({
        title: "Integração não configurada",
        description: "Configure a integração do Supabase para continuar.",
        variant: "destructive",
      });
      return;
    }

    setDisableAgentLoading(true);
    try {
      const externalClient = createClient(integration.project_url, integration.anon_key);
      const { data, error } = await externalClient
        .from("leads_metricas")
        .update({ agent_on: false })
        .eq("cliente_id", leadId)
        .select("cliente_id");

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Lead não encontrado",
          description: `Não foi possível localizar o lead ${leadId}.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "IA desabilitada",
        description: `O agente foi desabilitado para o lead ${leadId}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao desabilitar IA";
      toast({
        title: "Erro ao desabilitar IA",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDisableAgentLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header showLogout title="Histórico de Conversa" />
      <div className="glow-effect" />
      <main className="flex-1 container py-8 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Histórico de Conversa</h1>
            <p className="text-muted-foreground">Consulte as mensagens por período.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
              Voltar para o dashboard
            </Button>
            <PeriodFilter
              selected={period}
              onChange={setPeriod}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
            />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filtrar por número"
                value={listFilter}
                onChange={(event) => setListFilter(event.target.value)}
              />
              <Button variant="outline" size="icon" onClick={fetchSessions} disabled={sessionsLoading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="h-[65vh] rounded-lg border border-border bg-card">
              <div className="p-3 space-y-2">
                {sessionsLoading && (
                  <p className="text-sm text-muted-foreground">Carregando sessões...</p>
                )}
                {!sessionsLoading && filteredSessions.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma sessão encontrada.</p>
                )}
                {filteredSessions.map((sessionId) => (
                  <button
                    key={sessionId}
                    type="button"
                    onClick={() => handleOpenSession(sessionId)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                      activeSessionId === sessionId
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    {sessionId}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold">Chat do Lead</h2>
                <p className="text-sm text-muted-foreground">
                  {activeSessionId ? `Sessão: ${activeSessionId}` : "Selecione uma sessão para visualizar"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                  <Input
                    placeholder="Digite o número do lead"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    className="w-[220px]"
                  />
                  <Button type="submit" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Abrir
                  </Button>
                </form>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDisableAgentForLead}
                  disabled={!activeSessionId || disableAgentLoading}
                >
                  {disableAgentLoading ? "Desabilitando..." : "Desabilitar AI para esse LEAD"}
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 h-[60vh]">
              <div className="flex flex-col gap-4 p-4">
                {!activeSessionId && (
                  <div className="text-sm text-muted-foreground">
                    Digite o número do lead ou selecione uma sessão ao lado.
                  </div>
                )}
                {activeSessionId && messagesLoading && (
                  <div className="text-sm text-muted-foreground">Carregando mensagens...</div>
                )}
                {activeSessionId && !messagesLoading && messages.length === 0 && (
                  <div className="text-sm text-muted-foreground">Nenhuma mensagem encontrada.</div>
                )}
                {messages.map((row) => {
                  const type = typeof row.message === "string" ? "human" : row.message?.type;
                  const isHuman = type === "human";
                  const content = formatContent(row.message);
                  return (
                    <div
                      key={row.id}
                      className={`flex flex-col ${isHuman ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
                          isHuman
                            ? "bg-muted text-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {content || "Mensagem sem conteúdo"}
                      </div>
                      <span className="mt-1 text-xs text-muted-foreground">
                        {isHuman ? "Lead" : "IA"} {formatTimestamp(row.created_at)}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>
        </div>
      </main>
    </div>
  );
}
