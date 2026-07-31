"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Heart, Lightbulb, Target } from "lucide-react";
import { toast } from "sonner";

interface DailyPillProps {
  challenge?: string;
  title?: string;
  initialLikes?: number;
}

export default function DailyPill({
  title = "Prática de hoje",
  challenge = "Na sua próxima conversa, espere dois segundos antes de responder e confirme o que você entendeu.",
  initialLikes = 128,
}: DailyPillProps) {
  const [accepted, setAccepted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes);

  const handleLike = () => {
    if (!liked) {
      setLiked(true);
      setLikesCount((prev) => prev + 1);
      toast.success("Você curtiu a pílula de hoje!");
    } else {
      setLiked(false);
      setLikesCount((prev) => prev - 1);
    }
  };

  return (
    <article className={`editorial-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 transition-all ${accepted ? "border-positive/25 bg-positive/[0.035]" : ""}`}>
      <div className="flex min-w-0 items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-accent-orange/12 text-accent-orange">
          <Lightbulb className="h-5 w-5" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            <h3 className="eyebrow">{title}</h3>
          </div>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-body-text sm:text-base">{challenge}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          aria-pressed={liked}
          onClick={handleLike}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] px-3.5 text-sm font-bold border transition-all ${
            liked
              ? "border-negative/30 bg-negative/10 text-negative"
              : "border-border bg-surface text-text-mute hover:border-negative/30 hover:text-negative"
          }`}
          title={liked ? "Descurtir pílula" : "Curtir pílula"}
        >
          <Heart className={`h-4 w-4 transition-transform active:scale-125 ${liked ? "fill-negative text-negative" : ""}`} />
          <span>{likesCount}</span>
        </button>

        <button
          type="button"
          aria-pressed={accepted}
          onClick={() => setAccepted((current) => !current)}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-bold transition-all ${accepted ? "bg-positive text-white hover:bg-positive/90" : "bg-primary-pale text-primary-active hover:bg-primary hover:text-on-primary"}`}
        >
          {accepted ? <><CheckCircle2 className="h-4 w-4" /> Prática adicionada</> : <>Aceitar prática <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </article>
  );
}

