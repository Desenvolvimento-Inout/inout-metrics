import { BrandLogo } from "@/components/layout/BrandLogo";

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = "Nenhuma métrica encontrada para este período" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 fade-in">
      <div className="p-4 bg-muted/50 rounded-full mb-4">
        <BrandLogo className="h-8 w-8 opacity-70" />
      </div>
      <p className="text-muted-foreground text-center max-w-sm">{message}</p>
    </div>
  );
}
