"use client";

import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@heroui/react";
import { ArrowRight, Clock3, LockKeyhole, Sparkles } from "lucide-react";
import PandaVideoPlayer from "@/components/classroom/PandaVideoPlayer";
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
const widthClasses: Record<SectionStyle["width"], string> = {
  narrow: "max-w-3xl",
  normal: "max-w-6xl",
  wide: "max-w-[90rem]",
};

function SectionShell({ section, children }: { section: PageSection; children: React.ReactNode }) {
  return (
    <section id={section.id} className={cn(backgroundClasses[section.style.background], spacingClasses[section.style.spacing])}>
      <div className={cn("mx-auto w-full px-5 sm:px-8", widthClasses[section.style.width])}>{children}</div>
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

function CourseCards({ courses }: { courses: CatalogCourse[] }) {
  if (!courses.length) return <EmptyContent />;
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {courses.map((course, index) => {
        const state = course.studentState;
        const locked = state?.kind === "locked";
        const salesUrl = state?.kind === "locked" ? state.salesUrl : null;
        const href = locked && salesUrl ? salesUrl : `/courses/${course.slug || course.id}`;
        return (
          <Link key={course.id} href={href} className="group overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-elev-1 transition hover:-translate-y-1 hover:shadow-elev-3">
            <div className="relative aspect-video overflow-hidden bg-default">
              <Image src={course.cover} alt={course.title} fill unoptimized sizes="(max-width: 768px) 100vw, 25vw" className="object-cover transition-transform group-hover:scale-105" priority={index < 2} />
              {locked && <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-foreground/75 text-background"><LockKeyhole className="size-4" /></span>}
            </div>
            <div className="p-5">
              <p className="eyebrow text-accent">{course.category}</p>
              <h3 className="mt-2 font-display text-lg font-extrabold text-foreground">{course.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{course.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-accent">{locked ? "Conhecer curso" : "Acessar curso"}<ArrowRight className="size-4" /></span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function GalleryRows({ rows }: { rows: HomeCarouselRow[] }) {
  if (!rows.length) return <EmptyContent />;
  return (
    <div className="space-y-12">
      {rows.map((row) => (
        <div key={row.courseId}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h3 className="font-display text-xl font-extrabold text-foreground">{row.courseTitle}</h3>
            <Link href={row.courseHref} className="inline-flex items-center gap-2 text-sm font-bold text-accent">Ver curso <ArrowRight className="size-4" /></Link>
          </div>
          <div className="flex snap-x gap-4 overflow-x-auto pb-4">
            {row.lessons.map((lesson) => (
              <Link key={lesson.id} href={row.courseHref} className="group w-[min(76vw,260px)] shrink-0 snap-start overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-elev-1">
                <div className="relative aspect-[4/5] overflow-hidden bg-default">
                  <Image src={lesson.cover} alt={lesson.title} fill unoptimized sizes="260px" className="object-cover transition-transform group-hover:scale-105" />
                  {row.locked && <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-foreground/75 text-background"><LockKeyhole className="size-4" /></span>}
                </div>
                <div className="p-4">
                  <h4 className="line-clamp-2 font-display font-bold text-foreground">{lesson.title}</h4>
                  <span className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Clock3 className="size-3.5" />{lesson.durationInMinutes} min</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ArticleCards({ articles }: { articles: Article[] }) {
  if (!articles.length) return <EmptyContent />;
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {articles.map((article) => (
        <Link key={article.slug} href={`/blog/${article.slug}`} className="group overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-elev-1 transition hover:-translate-y-1">
          {article.cover && <div className="relative aspect-video"><Image src={article.cover} alt="" fill unoptimized sizes="25vw" className="object-cover" /></div>}
          <div className="p-5">
            <p className="eyebrow text-accent">{article.category}</p>
            <h3 className="mt-2 font-display text-lg font-extrabold text-foreground">{article.title}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{article.excerpt}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function TestCards({ tests }: { tests: ProfileTest[] }) {
  if (!tests.length) return <EmptyContent />;
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {tests.map((test) => (
        <Link key={test.id} href={`/diagnostico/${test.slug}`} className="group overflow-hidden rounded-2xl border border-border/60 bg-surface p-5 shadow-elev-1 transition hover:-translate-y-1">
          <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent"><Sparkles className="size-5" /></span>
          <h3 className="mt-5 font-display text-lg font-extrabold text-foreground">{test.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{test.description}</p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent">Fazer teste <ArrowRight className="size-4" /></span>
        </Link>
      ))}
    </div>
  );
}

function EmptyContent() {
  return <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">Nenhum conteúdo publicado corresponde a esta seção.</p>;
}

function RenderSection({ section, data }: { section: PageSection; data: PageBuilderData }) {
  if (!section.visible) return null;
  if (section.type === "hero") {
    return (
      <SectionShell section={section}>
        <div className={cn("grid items-center gap-12", section.media && "lg:grid-cols-2", section.style.alignment === "center" && !section.media && "text-center")}>
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
    return <SectionShell section={section}><Heading section={section} />{validImages.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{validImages.map((image) => <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl"><Image src={image.url} alt={image.alt} fill unoptimized sizes="33vw" className="object-cover" /></div>)}</div> : <EmptyContent />}</SectionShell>;
  }
  const items = resolvePageSectionItems(section, data);
  return <SectionShell section={section}><Heading section={section} />
    {section.type === "course-carousel" && <CourseCards courses={items as CatalogCourse[]} />}
    {section.type === "gallery-course-carousel" && <GalleryRows rows={items as HomeCarouselRow[]} />}
    {section.type === "article-carousel" && <ArticleCards articles={items as Article[]} />}
    {section.type === "profile-test-carousel" && <TestCards tests={items as ProfileTest[]} />}
  </SectionShell>;
}

export function PageRenderer({ document, data, className }: { document: PageDocument; data: PageBuilderData; className?: string }) {
  return <div className={cn("w-full overflow-hidden", className)}>{document.sections.map((section) => <RenderSection key={section.id} section={section} data={data} />)}</div>;
}
