import { Clock } from "lucide-react";

interface ConversionTimeCardProps {
  avgTimeMs: number | null;
  loading?: boolean;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }
  if (minutes > 0) {
    return `${minutes}min`;
  }
  return `${seconds}s`;
}

export function ConversionTimeCard({ avgTimeMs, loading = false }: ConversionTimeCardProps) {
  if (loading) {
    return (
      <div className="metric-card">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="skeleton-dark h-4 w-40" />
            <div className="skeleton-dark h-10 w-24" />
            <div className="skeleton-dark h-3 w-48" />
          </div>
          <div className="skeleton-dark h-12 w-12 rounded-lg" />
        </div>
      </div>
    );
  }

  const hasData = avgTimeMs !== null && avgTimeMs > 0;
  const formattedTime = hasData ? formatDuration(avgTimeMs) : "—";

  return (
    <div className="metric-card fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Tempo Médio até Conversão
          </p>
          <p className="text-3xl font-semibold tracking-tight text-primary">
            {formattedTime}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {hasData 
              ? "Do primeiro contato à conversão"
              : "Sem dados de conversão no período"
            }
          </p>
        </div>
        <div className="p-3 rounded-lg bg-primary/10">
          <Clock className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
