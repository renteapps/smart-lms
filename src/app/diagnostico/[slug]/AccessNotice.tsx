import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type NoticeAction = { label: string; href: string };

/** Tela de bloqueio dos links compartilháveis: diz o que houve e para onde ir. */
export function AccessNotice({
  title,
  message,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  message: string;
  primaryAction?: NoticeAction;
  secondaryAction?: NoticeAction;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black font-display text-foreground">{title}</h1>
          <p className="text-muted leading-relaxed">{message}</p>
        </div>

        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {primaryAction && (
              <Link
                href={primaryAction.href}
                className={cn(buttonVariants({ variant: "default", size: "lg" }), "rounded-full px-8")}
              >
                {primaryAction.label}
              </Link>
            )}
            {secondaryAction && (
              <Link
                href={secondaryAction.href}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-full px-8")}
              >
                {secondaryAction.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
