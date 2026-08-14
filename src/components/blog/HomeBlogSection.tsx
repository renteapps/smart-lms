import Link from "next/link";
import { buttonVariants } from "@heroui/styles";
import { ArrowIcon } from "@/components/ui/AnimatedIcon";
import { Rise } from "@/components/ui/Rise";
import ArticleSpotlight from "./ArticleSpotlight";
import { articleMeta, shortDate } from "./articleMeta";
import type { Article } from "@/types/blog";
import { cn } from "@/lib/utils";

interface HomeBlogSectionProps {
  articles: Article[];
}

/**
 * Índice de leitura da home.
 *
 * Só o destaque leva imagem; os demais artigos entram como índice tipográfico.
 * É deliberado: a seção fica entre a trilha do dia (destaque + linhas com
 * miniatura) e o catálogo recomendado (grade de capas), e uma terceira grade de
 * imagens seguida faria as três parecerem a mesma seção.
 */
export function HomeBlogSection({ articles }: HomeBlogSectionProps) {
  if (articles.length === 0) return null;

  const [spotlight, ...others] = articles;
  const index = others.slice(0, 3);

  return (
    <section className="editorial-container section-rhythm">
      <Rise className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Para continuar pensando</p>
          <h2 className="display-2 mt-3 text-foreground">Ideias para levar com você</h2>
          <p className="lede mt-4">
            Artigos, áudios e reflexões para você acelerar seu crescimento profissional.
          </p>
        </div>
        <Link
          href="/blog"
          className={cn(buttonVariants({ variant: "tertiary" }), "icon-draw shrink-0")}
        >
          Ver todos os artigos
          <ArrowIcon size={16} />
        </Link>
      </Rise>

      <div
        className={cn(
          "mt-10 grid gap-6",
          index.length > 0 && "lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]",
        )}
      >
        <Rise className="h-full">
          <ArticleSpotlight article={spotlight} />
        </Rise>

        {index.length > 0 && (
          <Rise delay={80} className="h-full">
            {/*
             * `flex-1` reparte a altura do destaque entre as linhas: sem isso a
             * coluna termina antes e sobra um vão branco ao lado da imagem.
             */}
            <ul className="flex h-full flex-col">
              {index.map((article) => {
                const meta = articleMeta(article);

                return (
                  <li key={article.slug} className="flex-1 border-b border-hairline first:border-t">
                    <Link
                      href={`/blog/${article.slug}`}
                      className="icon-draw group flex h-full flex-col justify-center gap-2 py-6"
                    >
                      <p className="eyebrow">
                        <span className="text-accent">{article.category}</span>
                        {meta && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span data-numeric>{meta.label}</span>
                          </>
                        )}
                      </p>

                      <h3 className="font-display text-xl font-extrabold leading-snug tracking-[-0.025em] text-foreground transition-colors duration-[var(--duration-sm)] group-hover:text-accent">
                        {article.title}
                      </h3>

                      <p className="line-clamp-2 text-sm leading-6 text-muted">{article.excerpt}</p>

                      <span className="mt-1 flex items-center gap-2 text-xs text-muted">
                        {article.author}
                        <span aria-hidden="true">·</span>
                        <time dateTime={new Date(article.publishedAt).toISOString()}>
                          {shortDate(article.publishedAt)}
                        </time>
                        <span
                          aria-hidden="true"
                          className="ml-auto text-accent transition-transform duration-[var(--duration-md)] group-hover:translate-x-0.5"
                        >
                          <ArrowIcon size={16} />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Rise>
        )}
      </div>
    </section>
  );
}
