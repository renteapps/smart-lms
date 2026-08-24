import Image from "next/image";
import Link from "next/link";
import { Clock3, Headphones } from "lucide-react";
import { Card } from "@heroui/react/card";
import { ArrowIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
import { articleMeta, longDate } from "./articleMeta";
import type { Article } from "@/types/blog";
import { cn } from "@/lib/utils";

const FALLBACK_BLOG_COVER =
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=85&w=1400&auto=format&fit=crop";

type ArticleSpotlightProps = {
  article: Article;
  className?: string;
};

/**
 * Destaque editorial do blog na home.
 *
 * O cartão inteiro é o link: um botão "ler artigo" aninhado dentro de uma área
 * já clicável duplicava o alvo sem oferecer destino diferente.
 */
export default function ArticleSpotlight({ article, className }: ArticleSpotlightProps) {
  const meta = articleMeta(article);
  const coverSrc = article.cover && article.cover.trim() !== "" ? article.cover : FALLBACK_BLOG_COVER;

  return (
    <Link
      href={`/blog/${article.slug}`}
      className={cn("icon-draw group block h-full min-w-0 rounded-2xl", className)}
    >
      {/*
       * `Reveal` sem `edge`: o realce de borda é reservado a um cartão por tela e
       * a home já o gasta no bloco "continuar aprendendo". Aqui ficam só o foco
       * de luz e o `.lift` — as duas interações que o design.md §12 permite somar.
       */}
      <Reveal className="h-full rounded-2xl">
        <Card className="lift h-full gap-0 overflow-hidden border-hairline p-0">
          <div className="relative flex min-h-[26rem] flex-col justify-end p-7 sm:p-9 lg:min-h-[clamp(26rem,36vw,32rem)]">
            <Image
              src={coverSrc}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--spring)] group-hover:scale-[1.035]"
            />
            {/* Véu de baixo para cima: assenta o texto sem escurecer a imagem inteira. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/35 to-transparent"
            />

            <div className="relative flex flex-col gap-4">
              {/*
               * Material sobre imagem: a capa continua visível através da etiqueta.
               * Espessura `thick` nas duas porque há texto em cima — é a única que
               * o design.md garante em AA. A hierarquia vem da cor do texto.
               */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="material-thick rounded-full px-3 py-1 text-xs font-bold text-foreground">
                  {article.category}
                </span>
                {meta && (
                  <span className="material-thick flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-muted">
                    {meta.isAudio ? (
                      <Headphones className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Clock3 className="size-3.5" aria-hidden="true" />
                    )}
                    <span data-numeric>{meta.label}</span>
                  </span>
                )}
              </div>

              <h3 className="display-3 text-white">{article.title}</h3>

              <p className="line-clamp-2 max-w-xl text-base leading-7 text-white/80">
                {article.excerpt}
              </p>

              <div className="mt-2 flex items-center justify-between gap-4 border-t border-white/15 pt-5">
                <span className="flex min-w-0 items-center gap-3">
                  {article.authorDetails?.avatarUrl ? (
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-full border border-white/20">
                      <Image
                        src={article.authorDetails.avatarUrl}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="material-thick grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-foreground"
                    >
                      {article.author.charAt(0)}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {article.author}
                    </span>
                    <time
                      className="block text-xs text-white/70"
                      dateTime={new Date(article.publishedAt).toISOString()}
                    >
                      {article.authorDetails?.title ? `${article.authorDetails.title} · ` : ""}
                      {longDate(article.publishedAt)}
                    </time>
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 text-white backdrop-blur-md transition-[background-color,color,transform,translate] duration-[var(--duration-lg)] ease-[var(--spring)] group-hover:translate-x-0.5 group-hover:bg-white group-hover:text-accent"
                >
                  <ArrowIcon size={18} />
                </span>
              </div>
            </div>
          </div>
        </Card>
      </Reveal>
    </Link>
  );
}
