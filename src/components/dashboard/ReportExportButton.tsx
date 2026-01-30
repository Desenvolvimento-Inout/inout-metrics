import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportExportModal } from "./ReportExportModal";
import { ExternalMetrics } from "@/hooks/useExternalSupabase";
import { UserPreferences } from "@/hooks/useUserPreferences";

interface ReportExportButtonProps {
  metrics: ExternalMetrics;
  preferences: UserPreferences;
  integration: {
    project_url: string;
    anon_key: string;
    selected_table: string;
  } | null;
}

export function ReportExportButton({ metrics, preferences, integration }: ReportExportButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setModalOpen(true)}
        className="gap-2 text-muted-foreground hover:text-foreground border-border/50 hover:border-border transition-colors"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Gerar relatório
      </Button>

      <ReportExportModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        currentMetrics={metrics}
        preferences={preferences}
        integration={integration}
      />
    </>
  );
}
