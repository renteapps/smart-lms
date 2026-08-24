"use client";

import { useEffect, useState } from "react";
import { Heart, X } from "lucide-react";
import { Button, Card, toast } from "@heroui/react";
import { SparkIcon } from "@/components/ui/AnimatedIcon";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface DailyPillProps {
  pillId?: string;
  challenge?: string;
  title?: string;
  initialLikes?: number;
}

export default function DailyPill({
  pillId,
  title = "Prática de hoje",
  challenge = "Na sua próxima conversa, espere dois segundos antes de responder e confirme o que você entendeu.",
  initialLikes = 128,
}: DailyPillProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [isDismissed, setIsDismissed] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!pillId) return;
    let isMounted = true;

    async function loadUserInteraction() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        const { data } = await supabase
          .from("pilula_interactions")
          .select("liked, dismissed")
          .eq("pilula_id", pillId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (data && isMounted) {
          if (data.dismissed) {
            setIsDismissed(true);
            return;
          }
          setLiked(Boolean(data.liked));
        }
      } catch (err) {
        console.error("Erro ao carregar interação da pílula:", err);
      }
    }

    loadUserInteraction();
    return () => {
      isMounted = false;
    };
  }, [pillId, supabase]);

  const handleDismiss = async () => {
    setIsDismissed(true);
    toast.success("Pílula dispensada.");
    if (pillId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("pilula_interactions").upsert(
            {
              pilula_id: pillId,
              user_id: user.id,
              dismissed: true,
              dismissed_at: new Date().toISOString(),
            },
            { onConflict: "pilula_id,user_id" },
          );
        }
      } catch (err) {
        console.error("Erro ao dispensar pílula:", err);
      }
    }
  };

  const handleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    
    if (nextLiked) {
      toast.success("Você curtiu a pílula de hoje!");
    } else {
      toast.info("Você descurtiu a pílula.");
    }

    if (pillId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("pilula_interactions").upsert(
            {
              pilula_id: pillId,
              user_id: user.id,
              liked: nextLiked,
            },
            { onConflict: "pilula_id,user_id" },
          );
        }
      } catch (err) {
        console.error("Erro ao registrar curtida:", err);
      }
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Card className="icon-draw relative gap-0 overflow-hidden p-0">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-accent transition-colors duration-[var(--duration-md)]"
      />

      {/* Botão de Fechar / Dispensar Prática */}
      <button
        type="button"
        aria-label="Dispensar pílula"
        title="Dispensar pílula"
        onClick={handleDismiss}
        className="absolute top-2.5 right-2.5 z-10 grid size-7 place-items-center rounded-lg text-muted/70 hover:bg-surface-secondary hover:text-foreground transition-colors"
      >
        <X className="size-4" aria-hidden="true" />
      </button>

      <Card.Content className="flex flex-col gap-6 p-6 pl-7 pr-10 transition-colors duration-[var(--duration-md)] sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:p-8 sm:pl-9 sm:pr-12">
        <div className="flex min-w-0 items-start gap-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning-soft-foreground transition-colors duration-[var(--duration-md)]">
            <SparkIcon size={22} />
          </span>

          <div className="min-w-0">
            <h3 className="eyebrow">{title}</h3>
            <p className="mt-2.5 max-w-2xl font-display text-lg font-bold leading-snug tracking-tight text-foreground sm:text-xl">
              {challenge}
            </p>
          </div>
        </div>

        {/* Curtir / Descurtir - Exibição focada em Likes */}
        <div className="flex shrink-0 items-center gap-3">
          <Button
            variant={liked ? "danger-soft" : "outline"}
            size="md"
            aria-pressed={liked}
            aria-label={liked ? "Descurtir pílula" : "Curtir pílula"}
            onClick={handleLike}
            className="flex items-center gap-2 font-medium"
          >
            <Heart
              className={cn("size-4 transition-transform active:scale-125", liked ? "fill-current text-danger" : "text-muted")}
              aria-hidden="true"
            />
            <span data-numeric className="tabular-nums">{likesCount}</span>
            <span className="text-xs text-muted font-normal">{likesCount === 1 ? "curtida" : "curtidas"}</span>
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}
