import { Activity, TrendingUp } from "lucide-react";

interface OperationRhythmCardProps {
  avgDailyVolume: number;
  peakHour: number | null;
  peakHourVolume: number;
  loading?: boolean;
}

function formatHourRange(hour: number): string {
  const nextHour = (hour + 2) % 24;
  const formatHour = (h: number) => `${h.toString().padStart(2, '0')}h`;
  return `${formatHour(hour)} e ${formatHour(nextHour)}`;
}

export function OperationRhythmCard({ 
  avgDailyVolume, 
  peakHour, 
  peakHourVolume,
  loading = false 
}: OperationRhythmCardProps) {
  if (loading) {
    return (
      <div className="metric-card">
        <div className="space-y-4">
          <div className="skeleton-dark h-4 w-36" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="skeleton-dark h-3 w-20" />
              <div className="skeleton-dark h-8 w-16" />
            </div>
            <div className="space-y-2">
              <div className="skeleton-dark h-3 w-24" />
              <div className="skeleton-dark h-8 w-20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-card fade-in">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-muted-foreground">Ritmo da Operação</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground/70">Média diária</p>
            <p className="text-2xl font-semibold text-foreground tabular-nums">
              {avgDailyVolume.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground/70">conversas/dia</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground/70">Pico de volume</p>
            {peakHour !== null ? (
              <>
                <p className="text-2xl font-semibold text-metric-leads tabular-nums">
                  {formatHourRange(peakHour)}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {peakHourVolume} leads
                </p>
              </>
            ) : (
              <p className="text-lg text-muted-foreground">—</p>
            )}
          </div>
        </div>

        {peakHour !== null && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-success" />
              <span>Maior volume de leads entre {formatHourRange(peakHour)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
