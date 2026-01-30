import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, Loader2, Database, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useIntegration } from "@/hooks/useIntegration";
import { useUserControl } from "@/hooks/useUserControl";
import { BrandLogo } from "@/components/layout/BrandLogo";

export default function Auth() {
  const navigate = useNavigate();
  const { integration, loading: integrationLoading, fetchIntegration } = useIntegration();
  const { canAccessApp, loading: userControlLoading, refetch: refetchUserControl } = useUserControl();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [showSupabaseFields, setShowSupabaseFields] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setTimeout(() => {
          fetchIntegration();
          refetchUserControl();
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchIntegration();
        refetchUserControl();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchIntegration, refetchUserControl]);

  // Navigate after integration + userControl check
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || integrationLoading || userControlLoading) return;
      if (integration === undefined) return;

      if (!canAccessApp) {
        navigate("/pending-approval");
        return;
      }
      if (integration?.selected_table) {
        navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
    };

    checkSession();
  }, [integration, integrationLoading, userControlLoading, canAccessApp, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: "Bem-vindo de volta!",
          description: "Login realizado com sucesso.",
        });
      } else {
        // For signup, check if they want to provide Supabase credentials
        if (!showSupabaseFields) {
          setShowSupabaseFields(true);
          setLoading(false);
          return;
        }

        // Validate Supabase credentials if provided
        if (projectUrl && !projectUrl.includes("supabase.co") && !projectUrl.includes("supabase.in")) {
          toast({ 
            title: "URL inválida", 
            description: "A URL do projeto deve conter supabase.co", 
            variant: "destructive" 
          });
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;

        if (data.user) {
          const { error: ucError } = await supabase.from("user_control").insert({
            user_id: data.user.id,
            email: data.user.email ?? email,
            role: "user",
            approved: false,
          });
          if (ucError) console.error("Erro ao criar controle de acesso:", ucError);
        }

        if (projectUrl && anonKey && data.user) {
          const { error: saveError } = await supabase
            .from("user_integrations")
            .insert({
              user_id: data.user.id,
              project_url: projectUrl,
              anon_key: anonKey,
              selected_table: null,
            });
          if (saveError) console.error("Erro ao salvar integração:", saveError);
        }

        toast({
          title: "Conta criada!",
          description: "Aguardando liberação do administrador.",
        });
      }
    } catch (error: any) {
      let message = error.message;
      if (error.message.includes("User already registered")) {
        message = "Este email já está cadastrado. Tente fazer login.";
      } else if (error.message.includes("Invalid login credentials")) {
        message = "Email ou senha incorretos.";
      }
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <div className="glow-effect" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4 slide-up">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
            <BrandLogo className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Inout Metrics</h1>
            <p className="text-muted-foreground mt-1">
              Visualize suas métricas com clareza
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="metric-card slide-up" style={{ animationDelay: "100ms" }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {/* Supabase credentials for signup */}
              {!isLogin && showSupabaseFields && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Opcional: Configure suas credenciais do Supabase agora para não precisar inserir depois.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="projectUrl">Supabase Project URL</Label>
                    <div className="relative">
                      <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="projectUrl"
                        type="url"
                        placeholder="https://seu-projeto.supabase.co"
                        value={projectUrl}
                        onChange={(e) => setProjectUrl(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anonKey">Supabase Anon Key</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <PasswordInput
                        id="anonKey"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={anonKey}
                        onChange={(e) => setAnonKey(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Entrar" : (showSupabaseFields ? "Criar conta" : "Continuar")}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setShowSupabaseFields(false);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin
                ? "Não tem uma conta? Cadastre-se"
                : "Já tem uma conta? Faça login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
