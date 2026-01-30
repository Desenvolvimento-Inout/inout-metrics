import { cn } from "@/lib/utils";

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

interface FunnelCardProps {
  steps: FunnelStep[];
  loading?: boolean;
}

export function FunnelCard({ steps, loading = false }: FunnelCardProps) {
  if (loading) {
    return (
      <div className="metric-card">
        <div className="space-y-4">
          <div className="skeleton-dark h-4 w-32" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="skeleton-dark h-4 w-28" />
                <div className="skeleton-dark h-8 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...steps.map(s => s.value), 1);

  return (
    <div className="metric-card fade-in">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Funil de Conversão</h3>
        
        <div className="space-y-3">
          {steps.map((step, index) => {
            const percentage = (step.value / maxValue) * 100;
            const isLast = index === steps.length - 1;
            
            return (
              <div key={step.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/80">{step.label}</span>
                  <span className={cn(
                    "text-lg font-semibold tabular-nums",
                    step.color
                  )}>
                    {step.value.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="relative h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                      index === 0 ? "bg-metric-leads" :
                      index === 1 ? "bg-metric-qualified" :
                      "bg-metric-conversion"
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {!isLast && (
                  <div className="flex justify-center py-1">
                    <svg 
                      className="h-3 w-3 text-muted-foreground/40" 
                      viewBox="0 0 12 12" 
                      fill="currentColor"
                    >
                      <path d="M6 8L2 4h8L6 8z" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
