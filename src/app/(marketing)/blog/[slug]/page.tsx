import { notFound } from 'next/navigation';
import { getArticleBySlug, getArticleSlugs } from '@/lib/blog';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { Clock, Headphones, BookOpen, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PlayArticleButton } from '@/components/audio/PlayArticleButton';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { ComponentPropsWithoutRef } from 'react';

export async function generateStaticParams() {
  const slugs = getArticleSlugs();
  return slugs.map((slug) => ({ slug: slug.replace(/\.mdx$/, '') }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const article = getArticleBySlug(resolvedParams.slug);
  if (!article) return { title: 'Artigo não encontrado' };
  return {
    title: `${article.title} | Blog`,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const article = getArticleBySlug(resolvedParams.slug);
  
  if (!article) {
    notFound();
  }

  // Define components for MDX replacement (could be expanded)
  const components = {
    h2: (props: ComponentPropsWithoutRef<'h2'>) => <h2 className="mb-6 mt-12 text-3xl font-extrabold tracking-[-0.035em] text-ink" {...props} />,
    h3: (props: ComponentPropsWithoutRef<'h3'>) => <h3 className="mb-4 mt-8 text-2xl font-extrabold text-ink" {...props} />,
    p: (props: ComponentPropsWithoutRef<'p'>) => <p className="mb-6 text-lg leading-8 text-text-soft" {...props} />,
    ul: (props: ComponentPropsWithoutRef<'ul'>) => <ul className="mb-6 list-inside list-disc space-y-2 text-lg text-text-soft" {...props} />,
    li: (props: ComponentPropsWithoutRef<'li'>) => <li className="text-text-soft" {...props} />,
    blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
      <blockquote className="border-l-4 border-primary pl-6 my-8 italic text-xl text-muted-foreground" {...props} />
    ),
    strong: (props: ComponentPropsWithoutRef<'strong'>) => <strong className="font-bold text-ink" {...props} />,
  };

  return (
    <article className="pb-24 pt-[120px] sm:pt-36">
      {/* Header */}
      <header className="editorial-container mb-14 max-w-4xl">
        <Link 
          href="/blog"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-[var(--duration-sm)] mb-8 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o blog
        </Link>
        
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm font-bold text-primary tracking-wider uppercase bg-primary-pale px-3 py-1 rounded-full">
            {article.category}
          </span>
          
          <span className="text-sm text-muted-foreground">
            {new Date(article.publishedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        <h1 className="mb-8 text-4xl font-extrabold leading-[1.06] tracking-[-0.05em] text-ink md:text-5xl lg:text-6xl">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted border border-border/50 flex items-center justify-center font-bold text-muted-foreground text-lg">
              {article.author.charAt(0)}
            </div>
            <div>
              <p className="text-base font-bold text-foreground">{article.author}</p>
            </div>
          </div>
          
          <div className="w-px h-8 bg-border/50 hidden md:block"></div>
          
          <div className="flex items-center gap-4">
            {article.format === 'text' && article.readingTime && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span>{article.readingTime} minutos de leitura</span>
              </div>
            )}
            {article.format === 'audio' && article.audio && (
              <div className="flex items-center gap-2 text-primary">
                <Headphones className="w-5 h-5" />
                <span>{Math.round(article.audio.duration / 60)} minutos de áudio</span>
              </div>
            )}
            {article.format === 'both' && (
              <div className="flex items-center gap-2 text-primary">
                <BookOpen className="w-5 h-5" />
                <span>Ouvir ou Ler</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Cover Image */}
      <div className="editorial-container mb-16 max-w-5xl">
        <div className="relative aspect-[21/9] rounded-[var(--radius-xl)] overflow-hidden bg-muted border border-border/30 shadow-sm">
          <Image 
            src={article.cover} 
            alt={article.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
          />
        </div>
      </div>

      {/* Content */}
      <div className="editorial-container max-w-3xl">
        {/* Placeholder para Player de Áudio - Fase 2 */}
        {(article.format === 'audio' || article.format === 'both') && article.audio && (
          <div className="p-8 rounded-[var(--radius-xl)] bg-card border border-border/30 shadow-sm mb-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
            
            <Headphones className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-2xl font-bold text-foreground mb-2">Episódio em Áudio</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Ouça este conteúdo enquanto navega pelo site. O player continuará tocando mesmo se você mudar de página.
            </p>
            <PlayArticleButton article={article} />
          </div>
        )}

        <div className="max-w-none">
          <MDXRemote source={article.body} components={components} />
        </div>
        
        {/* Course CTA */}
        {article.relatedCourseSlug && (
          <div className="mt-24 p-8 md:p-12 rounded-[var(--radius-xl)] bg-gradient-to-br from-primary/10 to-card border border-primary/20 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-foreground mb-4">Gostou desse conteúdo?</h3>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Aprofunde seus conhecimentos e acelere sua carreira no curso completo relacionado a este tema.
            </p>
            <Link 
              href="/cursos"
              className={cn(buttonVariants({ size: "lg" }), "min-h-12 rounded-[13px] px-7 font-bold text-base")}
            >
              Conhecer o Curso
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
