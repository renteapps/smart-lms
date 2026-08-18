"use client";

import { useState } from "react";
import { CheckCircle2, Heart } from "lucide-react";
import { Button, Card, Chip, toast } from "@heroui/react";
import { ArrowIcon, SparkIcon } from "@/components/ui/AnimatedIcon";
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
  const [accepted, setAccepted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes);

  const supabase = createClient();

  const handleLike = async () => {
    if (!liked) {
      setLiked(true);
      setLikesCount((prev) => prev + 1);
      toast.success("Você curtiu a pílula de hoje!");
      
      if (pillId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('pilula_interactions').upsert({
            pilula_id: pillId,
            user_id: user.id,
            interaction_type: 'like'
          });
        }
      }
    } else {
      setLiked(false);
      setLikesCount((prev) => prev - 1);
      
      if (pillId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('pilula_interactions').delete()
            .eq('pilula_id', pillId)
            .eq('user_id', user.id)
            .eq('interaction_type', 'like');
        }
      }
    }
  };

  const handleAccept = async () => {
    const newAccepted = !accepted;
    setAccepted(newAccepted);
    
    if (pillId && newAccepted) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('pilula_interactions').upsert({
          pilula_id: pillId,
          user_id: user.id,
          interaction_type: 'accept'
        });
      }
    }
  };

  return (
    /*
     * A pílula do dia é um bloco de uma linha só: o desafio é a informação, o
     * resto é moldura. A trilha de cor na borda esquerda troca de accent para
     * success quando a prática é aceita — o estado muda de material, não só de
     * texto, e continua legível sem depender da cor (há ícone e rótulo).
     */
    <Card className="icon-draw relative gap-0 overflow-hidden p-0">
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1 transition-colors duration-[var(--duration-md)]",
          accepted ? "bg-success" : "bg-accent",
        )}
      />

      <Card.Content
        className={cn(
          "flex flex-col gap-6 p-6 pl-7 transition-colors duration-[var(--duration-md)] sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:p-8 sm:pl-9",
          accepted && "bg-success-soft",
        )}
      >
        <div className="flex min-w-0 items-start gap-5">
          <span
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-xl transition-colors duration-[var(--duration-md)]",
              accepted
                ? "bg-success text-success-foreground"
                : "bg-warning-soft text-warning-soft-foreground",
            )}
          >
            <SparkIcon size={22} />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="eyebrow">{title}</h3>
              {accepted && (
                <Chip color="success" variant="soft" size="sm">
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  Na sua rotina
                </Chip>
              )}
            </div>
            <p className="mt-2.5 max-w-2xl font-display text-lg font-bold leading-snug tracking-tight text-foreground sm:text-xl">
              {challenge}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button
            variant={liked ? "danger-soft" : "outline"}
            aria-pressed={liked}
            aria-label={liked ? "Descurtir pílula" : "Curtir pílula"}
            onClick={handleLike}
          >
            <Heart
              className={cn("size-4 transition-transform active:scale-125", liked && "fill-current")}
              aria-hidden="true"
            />
            <span data-numeric>{likesCount}</span>
          </Button>

          <Button
            variant={accepted ? "secondary" : "primary"}
            aria-pressed={accepted}
            onClick={handleAccept}
          >
            {accepted ? (
              <>
                <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> Prática adicionada
              </>
            ) : (
              <>
                Aceitar prática <ArrowIcon size={16} />
              </>
            )}
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}
