import { LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SettingsMenu } from "@/components/settings/SettingsMenu";
import { useUserControl } from "@/hooks/useUserControl";
import { BrandLogo } from "@/components/layout/BrandLogo";

interface HeaderProps {
  showLogout?: boolean;
  title?: string;
}

export function Header({ showLogout = false, title = "Inout IA Metrics" }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserControl();
  const isAdminPage = location.pathname === "/admin-control";

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
            <BrandLogo className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">{title}</span>
        </div>
        
        {showLogout && (
          <div className="flex items-center gap-2">
            {isAdmin && !isAdminPage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin-control")}
                className="text-muted-foreground hover:text-foreground gap-2"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            )}
            <SettingsMenu />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
