import { useState } from "react";
import { Settings, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardSettingsDialog } from "./DashboardSettingsDialog";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

export function SettingsMenu() {
  const [dashboardDialogOpen, setDashboardDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-card border-border animate-fade-in"
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
            Dashboard
          </DropdownMenuLabel>
          <DropdownMenuItem 
            onClick={() => setDashboardDialogOpen(true)}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            Configurar métricas
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Novo item para abrir a página de Agent Settings */}
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
            Sistema
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigate("/agent-settings")}
            className="cursor-pointer"
          >
            {/* Você pode trocar o ícone por outro mais adequado */}
            <ChevronDown className="mr-2 h-4 w-4" />
            Prompt do Agente
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* restante do menu (trocar conforme existente) */}
        </DropdownMenuContent>
      </DropdownMenu>

      <DashboardSettingsDialog open={dashboardDialogOpen} onOpenChange={setDashboardDialogOpen} />
      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </>
  );
}