import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useUserControl } from "@/hooks/useUserControl";

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { canAccessApp, loading: userControlLoading } = useUserControl();

  useEffect(() => {
    const checkAuthAndIntegration = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          navigate("/auth");
          return;
        }

        if (userControlLoading) return;
        if (!canAccessApp) {
          navigate("/pending-approval");
          return;
        }

        const { data: integration } = await supabase
          .from("user_integrations")
          .select("id, selected_table")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (integration?.selected_table) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndIntegration();
  }, [navigate, canAccessApp, userControlLoading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glow-effect" />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default Index;
