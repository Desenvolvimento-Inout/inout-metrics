import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Header } from "@/components/layout/Header";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client"; // owner singleton
import { toast } from "@/hooks/use-toast";

export default function AgentSettings() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<string>("");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [userSupabaseClient, setUserSupabaseClient] = useState<any | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  useEffect(() => {
    const fetchPrompt = async () => {
      setLoading(true);
      try {
        // 1) pegar sessão/usuário atual (owner project) para identificar o perfil onde guardamos as credenciais
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          navigate("/auth");
          return;
        }

        // 2) buscar as credenciais do usuário no owner DB (tabela user_integrations)
        let integration: any = null;

        // primeiro tenta buscar por user_id (assumindo que exista coluna user_id)
        const { data: byUser, error: byUserError } = await supabase
          .from("user_integrations")
          .select("project_url, anon_key")
          .eq("user_id", user.id)
          .maybeSingle?.() ?? { data: null, error: null };

        if (byUser) {
          integration = byUser;
        } else {
          // fallback: pega a primeira integração disponível (caso o seu esquema não tenha user_id)
          const { data: firstRow, error: firstErr } = await supabase
            .from("user_integrations")
            .select("project_url, anon_key")
            .limit(1)
            .single();

          if (firstRow && !firstErr) {
            integration = firstRow;
          } else {
            // se nenhum dos dois funcionou, reporta erro (exibe a mensagem original quando houver)
            const message = byUserError?.message ?? (firstErr?.message ?? "Integração do usuário não encontrada.");
            toast({ title: "Erro ao carregar integração", description: message, variant: "destructive" });
            setPrompt("");
            setSettingsId(null);
            setLoading(false);
            return;
          }
        }

        const userUrl = integration.project_url;
        const userKey = integration.anon_key;

        if (!userUrl || !userKey) {
          toast({ title: "Credenciais incompletas", description: "Usuário não forneceu URL ou PUBLIC key do Supabase.", variant: "destructive" });
          setPrompt("");
          setSettingsId(null);
          setLoading(false);
          return;
        }

        // 3) criar client temporário para o Supabase do usuário
        const userSupabase = createClient<any>(userUrl, userKey, {
          auth: { persistSession: false }
        });
        setUserSupabaseClient(userSupabase);

        // 4) buscar a tabela agent_settings no projeto do usuário
        const { data, error } = await userSupabase
          .from("agent_settings") // ajuste o nome se for singular ou diferente
          .select("id, agent_prompt")
          .single();

        if (error) {
          toast({ title: "Erro ao carregar prompt", description: error.message, variant: "destructive" });
          setPrompt("");
          setSettingsId(null);
        } else if (data) {
          setPrompt(data.agent_prompt ?? "");
          setSettingsId(data.id ?? null);
        } else {
          setPrompt("");
          setSettingsId(null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        console.error("AgentSettings fetch error:", err);
        toast({ title: "Erro ao carregar prompt", description: msg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchPrompt();
  }, [navigate]);

  const handleSave = async () => {
    if (!settingsId) {
      toast({
        title: "Não foi possível salvar",
        description: "Nenhuma linha de agent_settings encontrada para atualizar.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // usa o client já criado (se disponível), senão recria buscando credenciais novamente
      let userClient = userSupabaseClient;
      if (!userClient) {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          navigate("/auth");
          return;
        }
        const { data: integration, error: integrationError } = await supabase
          .from("user_integrations")
          .select("project_url, anon_key")
          .eq("user_id", user.id)
          .maybeSingle?.() ?? { data: null, error: null };

        if (!integration || integrationError) {
          toast({ title: "Credenciais faltando", description: "Não foi possível obter as credenciais do usuário.", variant: "destructive" });
          setSaving(false);
          return;
        }

        userClient = createClient<any>(integration.project_url, integration.anon_key, { auth: { persistSession: false } });
        setUserSupabaseClient(userClient);
      }

      const { error } = await userClient
        .from("agent_settings")
        .update({ agent_prompt: prompt })
        .eq("id", settingsId);

      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      toast({ title: "Prompt salvo com sucesso" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header showLogout title="Inout Metrics" />
      <div className="glow-effect" />
      <main className="flex-1 container py-8 relative z-10">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Prompt do Agente</h1>
              <p className="text-sm text-muted-foreground">Edite o prompt usado pelo agente de IA.</p>
            </div>
          </div>

          <div className="metric-card p-6">
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="agentPrompt">Prompt do Agente</Label>
                    <Textarea
                      id="agentPrompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="h-[40vh] min-h-[200px] font-mono text-sm"
                      placeholder="Escreva ou cole aqui o prompt do agente..."
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button variant="secondary" onClick={() => navigate("/dashboard")} disabled={saving}>
                      Voltar
                    </Button>
                    <Button variant="outline" onClick={() => window.location.reload()} disabled={saving}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Salvar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
