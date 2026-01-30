import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onClick: () => void;
  loading?: boolean;
  className?: string;
}

export function RefreshButton({ onClick, loading = false, className }: RefreshButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "gap-2 text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
      <span className="hidden sm:inline">Atualizar</span>
    </Button>
  );
}
