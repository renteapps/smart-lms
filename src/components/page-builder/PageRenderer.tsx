import Image from "next/image";
import Link from "next/link";
// `buttonVariants` vem direto de @heroui/styles (não do barrel @heroui/react):
// o barrel principal reexporta módulos que importam `client-only`, o que
// quebra a renderização em servidor mesmo para um valor que não é componente.
import { buttonVariants } from "@heroui/styles";
import { EmptyState } from "@heroui/react/empty-state";
import { ArrowRight, Sparkles } from "lucide-react";
import PandaVideoPlayer from "@/components/classroom/PandaVideoPlayer";
import CarouselRow from "@/components/CarouselRow";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { BuilderCourseCard } from "@/components/page-builder/cards/BuilderCourseCard";
import { BuilderGalleryItem } from "@/components/page-builder/cards/BuilderGalleryItem";
import { BuilderTestCard } from "@/components/page-builder/cards/BuilderTestCard";
import { Rise } from "@/components/ui/Rise";
import { extractYouTubeId, youtubeEmbedUrl } from "@/lib/editor/youtube";
import { resolvePageSectionItems } from "@/lib/data/pages";
import { isSafePageUrl } from "@/lib/pageBuilder";
import { cn } from "@/lib/utils";
import type { Article } from "@/types/blog";
import type { CatalogCourse, HomeCarouselRow } from "@/types/course";
import type { PageBuilderData, PageCta, PageDocument, PageSection, SectionStyle } from "@/types/pageBuilder";
import type { ProfileTest } from "@/types/profileTest";

const backgroundClasses: Record<SectionStyle["background"], string> = {
  default: "bg-background",
  muted: "bg-background-secondary",
  accent: "bg-accent-soft text-accent-soft-foreground",
  dark: "bg-foreground text-background",
};
const spacingClasses: Record<SectionStyle["spacing"], string> = {
  compact: "py-10 md:py-14",
  normal: "py-16 md:py-24",
  spacious: "py-24 md:py-32",
};
// Mesmos tokens de contêiner que o resto do site usa (NavBar, Footer, todas
// as páginas do produto) — antes, esta seção tinha sua própria largura e
// respiro (px-5 sm:px-8 + max-w-*), desalinhada com tudo em volta.
const widthClasses: Record<SectionStyle["width"], string> = {
  narrow: "editorial-container-narrow",
  normal: "editorial-container",
  wide: "editorial-container-wide",
};

/**
 * `@container` faz as grades internas reagirem à largura da própria seção
 * (via `@min-[...]:`), não ao viewport inteiro — uma seção "estreita" passa a
 * mostrar menos colunas de verdade, e o preview mobile/tablet do editor (que
 * só limita o max-width de um ancestral) passa a refletir breakpoints reais.
 */
function SectionShell({ section, children }: { section: PageSection; children: React.ReactNode }) {
  return (
    <section id={section.id} className={cn(backgroundClasses[section.style.background], spacingClasses[section.style.spacing])}>
      <div className={cn("@container", widthClasses[section.style.width])}>{children}</div>
    </section>
  );
}

function Heading({ section }: { section: Exclude<PageSection, { type: "hero" }> }) {
  if (!("title" in section)) return null;
  return (
    <div className={cn("mb-9", section.style.alignment === "center" && "mx-auto max-w-3xl text-center")}>
      {section.eyebrow && <p className="eyebrow text-accent">{section.eyebrow}</p>}
      <h2 className="display-2 mt-3 text-current">{section.title}</h2>
      {section.text && <p className="lede mt-4 text-current/70">{section.text}</p>}
    </div>
  );
}

function CtaLink({ cta }: { cta: PageCta }) {
  const href = isSafePageUrl(cta.href) ? cta.href : "#";
  const external = /^https?:\/\//.test(href);
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={cn(buttonVariants({ variant: cta.variant === "primary" ? "primary" : "secondary", size: "lg" }), "gap-2")}
    >
      {cta.label}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

function VideoEmbed({ provider, url, title }: { provider: "youtube" | "panda" | "direct"; url: string; title: string }) {
  if (!url || !isSafePageUrl(url)) return <div className="grid aspect-video place-items-center rounded-2xl bg-default text-sm text-muted">Selecione um vídeo válido.</div>;
  if (provider === "panda") return <PandaVideoPlayer embedUrl={url} className="aspect-video w-full overflow-hidden rounded-2xl bg-black" />;
  const youtubeId = provider === "youtube" ? extractYouTubeId(url) : null;
  const src = youtubeId ? youtubeEmbedUrl(youtubeId) : url;
  return (
    <iframe
      src={src}
      title={title}
      className="aspect-video w-full rounded-2xl bg-black shadow-elev-3"
      allow="accelerated-video-playback; autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}

const GRID_PROGRESSION = "grid grid-cols-1 gap-5 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3 @min-[1280px]:grid-cols-4";

function CourseCards({ courses }: { courses: CatalogCourse[] }) {
  if (!courses.length) return <EmptyContent />;
  return (
    <div className={GRID_PROGRESSION}>
      {courses.map((course, index) => (
        <Rise key={course.id} className="min-w-0" delay={Math.min(index, 5) * 60}>
          <BuilderCourseCard course={course} eager={index < 2} featured={index === 0} className="h-full" />
        </Rise>
      ))}
    </div>
  );
}

function GalleryRows({ rows }: { rows: HomeCarouselRow[] }) {
  return (
    <div className="space-y-10">
      {rows.map((row) => (
        <CarouselRow
          key={row.courseId}
          title={row.courseTitle}
          action={
            <Link href={row.courseHref} className="inline-flex items-center gap-2 text-sm font-bold text-accent">
              Ver curso <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        >
          {row.lessons.map((lesson) => (
            <BuilderGalleryItem key={lesson.id} lesson={lesson} href={row.courseHref} locked={row.locked} />
          ))}
        </CarouselRow>
      ))}
    </div>
  );
}

function ArticleCards({ articles }: { articles: Article[] }) {
  if (!articles.length) return <EmptyContent />;
  return (
    <div className={GRID_PROGRESSION}>
      {articles.map((article, index) => (
        <Rise key={article.slug} className="min-w-0" delay={Math.min(index, 5) * 60}>
          <ArticleCard article={article} className="h-full" />
        </Rise>
      ))}
    </div>
  );
}

function TestCards({ tests }: { tests: ProfileTest[] }) {
  if (!tests.length) return <EmptyContent />;
  return (
    <div className={GRID_PROGRESSION}>
      {tests.map((test, index) => (
        <Rise key={test.id} className="min-w-0" delay={Math.min(index, 5) * 60}>
          <BuilderTestCard test={test} className="h-full" />
        </Rise>
      ))}
    </div>
  );
}

function EmptyContent() {
  return (
    <EmptyState className="gap-4 py-16">
      <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
        <Sparkles className="size-6" aria-hidden="true" />
      </span>
      <p className="max-w-sm text-center text-sm leading-6 text-muted">Nenhum conteúdo publicado corresponde a esta seção.</p>
    </EmptyState>
  );
}

function RenderSection({ section, data }: { section: PageSection; data: PageBuilderData }) {
  if (!section.visible) return null;
  if (section.type === "hero") {
    return (
      <SectionShell section={section}>
        <div className={cn("grid items-center gap-12", section.media && "@min-[1024px]:grid-cols-2", section.style.alignment === "center" && !section.media && "text-center")}>
          <div className={cn(section.style.alignment === "center" && !section.media && "mx-auto max-w-4xl")}>
            {section.eyebrow && <p className="eyebrow text-accent">{section.eyebrow}</p>}
            <h1 className="display-1 mt-4 text-current">{section.title}</h1>
            <p className="lede mt-6 text-current/70">{section.text}</p>
            {section.ctas.length > 0 && <div className={cn("mt-9 flex flex-wrap gap-3", section.style.alignment === "center" && !section.media && "justify-center")}>{section.ctas.map((cta) => <CtaLink key={`${cta.label}-${cta.href}`} cta={cta} />)}</div>}
          </div>
          {section.media?.type === "image" && (isSafePageUrl(section.media.url) ? <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-elev-3"><Image src={section.media.url} alt="" fill unoptimized sizes="50vw" className="object-cover" /></div> : <div className="grid aspect-[4/3] place-items-center rounded-3xl bg-default text-sm text-muted">Selecione uma imagem.</div>)}
          {section.media?.type === "video" && <VideoEmbed provider={section.media.provider ?? "direct"} url={section.media.url} title={section.title} />}
        </div>
      </SectionShell>
    );
  }
  if (section.type === "text-cta") {
    return <SectionShell section={section}><div className={cn("max-w-4xl", section.style.alignment === "center" && "mx-auto text-center")}>
      {section.eyebrow && <p className="eyebrow text-accent">{section.eyebrow}</p>}
      <h2 className="display-2 mt-3 text-current">{section.title}</h2><p className="lede mt-5 text-current/70 whitespace-pre-line">{section.text}</p>
      {section.cta && <div className="mt-8"><CtaLink cta={section.cta} /></div>}
    </div></SectionShell>;
  }
  if (section.type === "video") return <SectionShell section={section}><Heading section={section} /><VideoEmbed provider={section.provider} url={section.url} title={section.title} /></SectionShell>;
  if (section.type === "image-gallery") {
    const validImages = section.images.filter((image) => isSafePageUrl(image.url));
    return <SectionShell section={section}><Heading section={section} />{validImages.length ? <div className="grid grid-cols-1 gap-4 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3">{validImages.map((image) => <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl"><Image src={image.url} alt={image.alt} fill unoptimized sizes="33vw" className="object-cover" /></div>)}</div> : <EmptyContent />}</SectionShell>;
  }
  if (section.type === "gallery-course-carousel") {
    // CarouselRow já traz seu próprio .editorial-container (é o carrossel real
    // usado em todo o resto do site) — aninhar outro contêiner por fora dele
    // dobraria a margem lateral. Por isso esta seção não passa pelo
    // SectionShell genérico: só a introdução (Heading) respeita a largura
    // configurada, o carrossel em si é sempre full-bleed até a borda da seção.
    const rows = resolvePageSectionItems(section, data) as HomeCarouselRow[];
    return (
      <section id={section.id} className={cn(backgroundClasses[section.style.background], spacingClasses[section.style.spacing])}>
        <div className={widthClasses[section.style.width]}><Heading section={section} /></div>
        {rows.length ? <GalleryRows rows={rows} /> : <div className={widthClasses[section.style.width]}><EmptyContent /></div>}
      </section>
    );
  }
  const items = resolvePageSectionItems(section, data);
  return <SectionShell section={section}><Heading section={section} />
    {section.type === "course-carousel" && <CourseCards courses={items as CatalogCourse[]} />}
    {section.type === "article-carousel" && <ArticleCards articles={items as Article[]} />}
    {section.type === "profile-test-carousel" && <TestCards tests={items as ProfileTest[]} />}
  </SectionShell>;
}

export function PageRenderer({
  document,
  data,
  className,
  offsetForFixedHeader = false,
}: {
  document: PageDocument;
  data: PageBuilderData;
  className?: string;
  /** A NavBar pública é fixa (76px) — passe true para páginas renderizadas
   * sob ela. O preview do editor não tem NavBar por cima, então deixa `false`. */
  offsetForFixedHeader?: boolean;
}) {
  return (
    <div className={cn("w-full overflow-hidden", offsetForFixedHeader && "pt-[76px]", className)}>
      {document.sections.map((section) => <RenderSection key={section.id} section={section} data={data} />)}
    </div>
  );
}
