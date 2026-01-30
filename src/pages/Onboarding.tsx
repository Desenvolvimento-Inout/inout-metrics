import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Key, Table2, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useIntegration } from "@/hooks/useIntegration";
import { useExternalSupabase } from "@/hooks/useExternalSupabase";
import { useUserControl } from "@/hooks/useUserControl";

interface ConnectionConfig {
  projectUrl: string;
  anonKey: string;
  selectedTable: string;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { saveIntegration } = useIntegration();
  const { testConnection, loading: testingConnection } = useExternalSupabase();
  const { canAccessApp, loading: userControlLoading } = useUserControl();
  
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [config, setConfig] = useState<ConnectionConfig>({
    projectUrl: "",
    anonKey: "",
    selectedTable: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
    });
  }, [navigate]);

  useEffect(() => {
    if (userControlLoading) return;
    if (!canAccessApp) navigate("/pending-approval");
  }, [canAccessApp, userControlLoading, navigate]);

  const updateConfig = (field: keyof ConnectionConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    if (field !== "selectedTable") {
      setConnectionStatus("idle");
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus("testing");
    
    const result = await testConnection(config.projectUrl, config.anonKey);
    
    if (result.success) {
      setConnectionStatus("success");
      toast({
        title: "Conexão estabelecida!",
        description: "Seu Supabase foi conectado com sucesso.",
      });
      setStep(3);
    } else {
      setConnectionStatus("error");
      toast({
        title: "Erro na conexão",
        description: result.error || "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!config.projectUrl) {
        toast({ title: "URL do projeto é obrigatória", variant: "destructive" });
        return;
      }
      // Validate URL format
      if (!config.projectUrl.includes("supabase.co") && !config.projectUrl.includes("supabase.in")) {
        toast({ title: "URL do projeto parece inválida", description: "Deve conter supabase.co", variant: "destructive" });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!config.anonKey) {
        toast({ title: "Chave pública é obrigatória", variant: "destructive" });
        return;
      }
      // Test connection
      await handleTestConnection();
    } else if (step === 3) {
      if (!config.selectedTable) {
        toast({ title: "Nome da tabela é obrigatório", variant: "destructive" });
        return;
      }
      
      // Save configuration
      setSaving(true);
      const { error } = await saveIntegration({
        projectUrl: config.projectUrl,
        anonKey: config.anonKey,
        selectedTable: config.selectedTable,
      });
      
      if (error) {
        toast({ 
          title: "Erro ao salvar configuração", 
          description: error,
          variant: "destructive" 
        });
        setSaving(false);
        return;
      }

      toast({
        title: "Configuração salva!",
        description: "Redirecionando para o dashboard...",
      });
      
      navigate("/dashboard");
    }
  };

  const stepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 fade-in">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">URL do Projeto</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Encontre a URL do seu projeto Supabase nas configurações do projeto.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectUrl">Supabase Project URL</Label>
              <Input
                id="projectUrl"
                placeholder="https://seu-projeto.supabase.co"
                value={config.projectUrl}
                onChange={(e) => updateConfig("projectUrl", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: https://abcdefgh.supabase.co
              </p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 fade-in">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Key className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Chave Pública</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                A chave anônima pública permite leitura segura dos seus dados.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="anonKey">Supabase Anon Key</Label>
              <PasswordInput
                id="anonKey"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={config.anonKey}
                onChange={(e) => updateConfig("anonKey", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Encontre em Project Settings → API → anon public
              </p>
            </div>
            {connectionStatus === "testing" && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Testando conexão...</span>
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 fade-in">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <h2 className="text-xl font-semibold">Nome da Tabela</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Digite o nome exato da tabela que contém suas métricas comerciais.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tableName">Nome da Tabela</Label>
              <div className="relative">
                <Table2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tableName"
                  placeholder="leads, conversas, metrics..."
                  value={config.selectedTable}
                  onChange={(e) => updateConfig("selectedTable", e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Esta tabela será usada para gerar o dashboard. A tabela deve ter uma coluna <code className="text-primary">created_at</code> para filtros de período.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Dica:</strong> Sua tabela pode ter colunas como <code className="text-primary">status</code>, <code className="text-primary">qualified</code>, <code className="text-primary">converted</code> para métricas automáticas.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="glow-effect" />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <StepIndicator currentStep={step} totalSteps={3} />
          
          <div className="metric-card">
            {stepContent()}
            
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 gap-2"
                  disabled={saving || testingConnection}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={saving || testingConnection}
                className="flex-1 gap-2"
              >
                {saving || testingConnection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {step === 3 ? "Finalizar" : "Continuar"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
