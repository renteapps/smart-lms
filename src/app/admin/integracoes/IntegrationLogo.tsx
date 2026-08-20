"use client";

import { useState } from "react";

interface IntegrationLogoProps {
  name: string;
  src: string;
  inactive?: boolean;
}

export function IntegrationLogo({ name, src, inactive = false }: IntegrationLogoProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-background-secondary">
      {hasError ? (
        <span
          aria-label={`${name} logo`}
          className={`text-sm font-bold text-muted ${inactive ? "opacity-70" : ""}`}
          role="img"
        >
          {name.charAt(0).toUpperCase()}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${name} logo`}
          className={`size-6 object-contain ${inactive ? "grayscale opacity-70" : ""}`}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
