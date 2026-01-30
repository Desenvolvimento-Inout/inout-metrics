import { useEffect } from "react";
import { MessageCircle, Calendar, UserCheck, UserX, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface DashboardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const metrics = [
  { 
    key: "show_conversas" as const, 
    label: "Conversas Iniciadas", 
    icon: MessageCircle,
    description: "Total de registros criados"
  },
  { 
    key: "show_conversoes" as const, 
    label: "Conversões Realizadas", 
    icon: Calendar,
    description: "Leads convertidos"
  },
  { 
    key: "show_qualificados" as const, 
    label: "Leads Qualificados", 
    icon: UserCheck,
    description: "Leads qualificados para avançar"
  },
  { 
    key: "show_desqualificados" as const, 
    label: "Leads Desqualificados", 
    icon: UserX,
    description: "Leads fora do perfil"
  },
];

export function DashboardSettingsDialog({ open, onOpenChange }: DashboardSettingsDialogProps) {
  const { preferences, loading, saving, updatePreferences, fetchPreferences } = useUserPreferences();

  useEffect(() => {
    if (open) {
      fetchPreferences();
    }
  }, [open, fetchPreferences]);

  const handleToggle = async (key: keyof typeof preferences) => {
    await updatePreferences({ [key]: !preferences[key] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Configurações do Dashboard</DialogTitle>
          <DialogDescription>
            Escolha quais métricas deseja visualizar no painel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            metrics.map((metric) => {
              const Icon = metric.icon;
              const isChecked = preferences[metric.key];
              
              return (
                <div
                  key={metric.key}
                  className="flex items-start space-x-4 p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
                >
                  <Checkbox
                    id={metric.key}
                    checked={isChecked}
                    onCheckedChange={() => handleToggle(metric.key)}
                    disabled={saving}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={metric.key}
                      className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {metric.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {metric.description}
                    </p>
                  </div>
                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              );
            })
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Suas preferências são salvas automaticamente.
        </p>
      </DialogContent>
    </Dialog>
  );
}
