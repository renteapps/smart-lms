import { MetadataRoute } from 'next';
import { getArticleSlugs } from '@/lib/blog';

const URL = 'https://seusite.com.br'; // TODO: Replace with actual domain

export default function sitemap(): MetadataRoute.Sitemap {
  const blogSlugs = getArticleSlugs().map((slug) => slug.replace(/\.mdx$/, ''));
  
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
