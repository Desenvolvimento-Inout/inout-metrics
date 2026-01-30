import { useState } from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

export function BrandLogo({ className, alt = "Inout IA Metrics" }: BrandLogoProps) {
  const [src, setSrc] = useState("/inout-logo.png");

  return (
    <img
      src={src}
      alt={alt}
      className={cn("h-5 w-5 object-contain", className)}
      loading="lazy"
      decoding="async"
      onError={() => setSrc("/placeholder.svg")}
    />
  );
}
