import { MetadataRoute } from 'next';
import { getArticleSlugs } from '@/lib/data/blog';
import { createClient } from '@/lib/supabase/server';

const URL = 'https://seusite.com.br'; // TODO: Replace with actual domain

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const blogSlugs = await getArticleSlugs(supabase);

  const blogUrls = blogSlugs.map((slug) => ({
    url: `${URL}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...blogUrls,
  ];
}
