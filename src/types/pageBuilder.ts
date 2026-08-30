import type { Article } from "@/types/blog";
import type { CatalogCourse, HomeCarouselRow } from "@/types/course";
import type { ProfileTest } from "@/types/profileTest";

/** Qualquer slug cadastrado em `pages` — validado em runtime, não por union. */
export type PageKey = string;
/** As 2 páginas fixas, com lógica própria de roteamento em `src/app/page.tsx`. */
export type SystemPageKey = "public-home" | "no-products";

export type PageRegistryEntry = {
  slug: string;
  title: string;
  description: string | null;
  kind: "system" | "custom";
  createdAt: string;
  updatedAt: string;
};
export type SectionBackground = "default" | "muted" | "accent" | "dark";
export type SectionWidth = "narrow" | "normal" | "wide";
export type SectionSpacing = "compact" | "normal" | "spacious";
export type SectionAlignment = "left" | "center";

export type PageCta = {
  label: string;
  href: string;
  variant: "primary" | "secondary";
};

export type SectionStyle = {
  background: SectionBackground;
  width: SectionWidth;
  spacing: SectionSpacing;
  alignment: SectionAlignment;
};

export type ContentSource = {
  mode: "manual" | "automatic";
  itemIds: string[];
  rule: "all" | "featured" | "recent" | "category";
  category?: string;
  limit: number;
};

type BaseSection = {
  id: string;
  visible: boolean;
  style: SectionStyle;
};

export type HeroSection = BaseSection & {
  type: "hero";
  eyebrow?: string;
  title: string;
  text: string;
  media?: {
    type: "image" | "video";
    url: string;
    provider?: "youtube" | "panda" | "direct";
  };
  ctas: PageCta[];
};

export type TextCtaSection = BaseSection & {
  type: "text-cta";
  eyebrow?: string;
  title: string;
  text: string;
  cta?: PageCta;
};

export type VideoSection = BaseSection & {
  type: "video";
  eyebrow?: string;
  title: string;
  text?: string;
  provider: "youtube" | "panda" | "direct";
  url: string;
};

export type ImageGallerySection = BaseSection & {
  type: "image-gallery";
  eyebrow?: string;
  title: string;
  text?: string;
  images: Array<{ id: string; url: string; alt: string }>;
};

type ContentSection = BaseSection & {
  eyebrow?: string;
  title: string;
  text?: string;
  source: ContentSource;
};

export type CourseCarouselSection = ContentSection & { type: "course-carousel" };
export type GalleryCourseCarouselSection = ContentSection & { type: "gallery-course-carousel" };
export type ArticleCarouselSection = ContentSection & { type: "article-carousel" };
export type ProfileTestCarouselSection = ContentSection & { type: "profile-test-carousel" };

export type PageSection =
  | HeroSection
  | TextCtaSection
  | VideoSection
  | ImageGallerySection
  | CourseCarouselSection
  | GalleryCourseCarouselSection
  | ArticleCarouselSection
  | ProfileTestCarouselSection;

export type PageDocument = {
  version: 1;
  pageKey: PageKey;
  sections: PageSection[];
};

export type PageBuilderData = {
  courses: CatalogCourse[];
  galleryRows: HomeCarouselRow[];
  articles: Article[];
  profileTests: ProfileTest[];
};

export type PageDraft = {
  document: PageDocument;
  revision: number;
  updatedAt: string | null;
};
