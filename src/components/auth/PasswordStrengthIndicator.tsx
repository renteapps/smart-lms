"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password?: string;
  showCriteria?: boolean;
}

export function PasswordStrengthIndicator({ password = "", showCriteria = true }: PasswordStrengthProps) {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const criteria = [
    { label: "Mínimo 8 caracteres", met: hasMinLength },
    { label: "Letra maiúscula", met: hasUppercase },
    { label: "Número", met: hasNumber },
    { label: "Caractere especial", met: hasSpecial },
  ];

  const metCount = criteria.filter((c) => c.met).length;

  const getStrengthMeta = () => {
    if (!password) return { label: "", color: "bg-border", width: "0%" };
    if (metCount <= 1) return { label: "Muito fraca", color: "bg-danger", width: "25%" };
    if (metCount === 2) return { label: "Razoável", color: "bg-warning", width: "50%" };
    if (metCount === 3) return { label: "Boa", color: "bg-accent", width: "75%" };
    return { label: "Forte e segura", color: "bg-success", width: "100%" };
  };

  const strength = getStrengthMeta();

  if (!password && !showCriteria) return null;

  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      {password && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-muted">Força da senha</span>
            <span
              className={cn(
                "font-bold",
                metCount <= 1
                  ? "text-danger"
                  : metCount === 2
                    ? "text-warning"
                    : metCount === 3
                      ? "text-accent"
                      : "text-success"
              )}
            >
              {strength.label}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
            <div
              className={cn("h-full transition-all duration-300 ease-out", strength.color)}
              style={{ width: strength.width }}
            />
          </div>
        </div>
      )}

      {showCriteria && (
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {criteria.map((item) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                item.met ? "text-success font-medium" : "text-muted"
              )}
            >
              {item.met ? (
                <Check className="size-3.5 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <X className="size-3.5 shrink-0 text-muted/60" aria-hidden="true" />
              )}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
