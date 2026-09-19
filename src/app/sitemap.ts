import type { MetadataRoute } from "next";
import { getArticleSlugs } from "@/lib/data/blog";
import { createClient } from "@/lib/supabase/server";

function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://smartlms.com.br");
  return configured.replace(/\/$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const siteUrl = getSiteUrl();

  const [blogSlugs, coursesRes, pagesRes] = await Promise.all([
    getArticleSlugs(supabase).catch(() => []),
    supabase
      .from("courses")
      .select("slug, updated_at")
      .eq("is_published", true)
      .not("slug", "is", null),
    supabase
      .from("pages")
      .select("slug, updated_at")
      .eq("is_published", true)
      .not("slug", "is", null),
  ]);

  const blogUrls: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${siteUrl}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const courseUrls: MetadataRoute.Sitemap = (coursesRes.data ?? []).map((course) => ({
    url: `${siteUrl}/courses/${course.slug}`,
    lastModified: course.updated_at ? new Date(course.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const customPageUrls: MetadataRoute.Sitemap = (pagesRes.data ?? []).map((page) => ({
    url: `${siteUrl}/pagina/${page.slug}`,
    lastModified: page.updated_at ? new Date(page.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${siteUrl}/cursos`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/termos`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    },
    {
      url: `${siteUrl}/privacidade`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    },
    ...courseUrls,
    ...blogUrls,
    ...customPageUrls,
  ];
}
