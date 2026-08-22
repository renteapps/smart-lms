import { notFound } from 'next/navigation';
import { getArticleBySlug, getAllArticles } from '@/lib/data/blog';
import { createClient } from '@/lib/supabase/server';
import BlockViewer from '@/components/classroom/BlockViewer';
import { Clock, Headphones, BookOpen, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PlayArticleButton } from '@/components/audio/PlayArticleButton';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ArticleCard } from '@/components/blog/ArticleCard';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const article = await getArticleBySlug(supabase, resolvedParams.slug);
  if (!article) return { title: 'Artigo não encontrado' };
  return {
    title: `${article.title} | Blog`,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const article = await getArticleBySlug(supabase, resolvedParams.slug);

  if (!article) {
    notFound();
  }

  const allArticles = await getAllArticles(supabase);
  const relatedArticles = allArticles.filter(a => a.slug !== article.slug).slice(0, 3);

  let relatedCourse = null;
  if (article.relatedCourseSlug) {
    const { data: courseData } = await supabase
      .from('courses')
      .select('title, short_description, description, cover_url, slug')
      .eq('slug', article.relatedCourseSlug)
      .maybeSingle();
    relatedCourse = courseData;
  }

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
          <span className="text-xs font-bold text-primary tracking-wider uppercase bg-primary/10 px-3 py-1.5 rounded-full">
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
      {article.cover && article.cover.trim() !== "" && (
        <div className="editorial-container mb-16 max-w-5xl">
          <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-[var(--radius-xl)] overflow-hidden bg-muted border border-border/30 shadow-sm">
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
      )}

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
          <BlockViewer blocks={article.blocks ?? []} />
        </div>
        
        {/* Course CTA */}
        {relatedCourse && (
          <div className="mt-24 relative overflow-hidden rounded-[var(--radius-xl)] bg-foreground shadow-elev-4 group flex flex-col md:flex-row min-h-[320px]">
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none">
              {relatedCourse.cover_url && (
                <Image 
                  src={relatedCourse.cover_url} 
                  alt="" 
                  fill 
                  className="object-cover opacity-30 md:opacity-40 transition-transform duration-[800ms] group-hover:scale-[1.03]" 
                />
              )}
              {/* Overlay para legibilidade do texto */}
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/95 via-black/80 to-black/30 md:to-transparent" />
            </div>
            
            <div className="relative z-10 w-full md:w-3/5 p-8 md:p-12 lg:p-16 flex flex-col justify-center text-left">
              <span className="inline-flex w-max items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider rounded-full mb-6 border border-white/20">
                <BookOpen className="w-3.5 h-3.5" />
                Curso Completo Recomendado
              </span>
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-5 tracking-[-0.02em] leading-[1.1] transition-colors duration-300">
                {relatedCourse.title}
              </h3>
              <p className="text-white/80 text-lg leading-relaxed mb-8 max-w-lg line-clamp-3">
                {relatedCourse.short_description || relatedCourse.description || "Aprofunde seus conhecimentos e acelere sua carreira no curso completo relacionado a este tema."}
              </p>
              
              <div>
                <Link 
                  href={`/courses/${relatedCourse.slug}`}
                  className={cn(buttonVariants({ variant: "default", size: "lg" }), "h-14 rounded-full px-8 font-bold text-base text-white shadow-lg")}
                >
                  Conhecer o Curso
                </Link>
              </div>
            </div>

            {/* Imagem Normal à direita (Capa "física" estilo box/livro) */}
            <div className="relative z-10 hidden md:flex md:w-2/5 p-8 md:p-12 items-center justify-center pointer-events-none">
              <div className="relative w-full aspect-[4/5] max-w-[260px] rounded-[var(--radius-lg)] overflow-hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] border border-white/10 -rotate-2 group-hover:rotate-0 group-hover:scale-105 transition-all duration-[600ms] ease-[var(--ease-zen)]">
                <Image 
                  src={relatedCourse.cover_url || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=85&w=1200&auto=format&fit=crop"} 
                  alt={relatedCourse.title} 
                  fill 
                  className="object-cover" 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="editorial-container mt-24 border-t border-border/40 pt-16 max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2">
                Continue aprendendo
              </h2>
              <p className="text-muted-foreground text-lg">Artigos que você também vai gostar de ler</p>
            </div>
            <Link 
              href="/blog" 
              className={cn(buttonVariants({ variant: "outline" }), "rounded-full font-bold px-6 shrink-0")}
            >
              Ver todos
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {relatedArticles.map((rel) => (
              <ArticleCard key={rel.slug} article={rel} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
