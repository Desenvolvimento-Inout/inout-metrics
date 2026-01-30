import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/layout/BrandLogo";

export default function PendingApproval() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <div className="glow-effect" />
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center space-y-4 slide-up">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
            <BrandLogo className="h-8 w-8" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Inout Metrics</h1>
            <p className="text-muted-foreground">Visualize suas métricas com clareza</p>
          </div>
        </div>

        <div className="metric-card slide-up flex flex-col items-center text-center space-y-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-warning/10 border border-warning/20">
            <Clock className="h-7 w-7 text-warning" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Conta criada</h2>
            <p className="text-muted-foreground text-sm">
              Aguardando liberação do administrador.
            </p>
            <p className="text-muted-foreground text-xs pt-2">
              Você poderá acessar o dashboard assim que um admin aprovar seu acesso.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
