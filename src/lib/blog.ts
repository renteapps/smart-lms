import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Article, ArticleFormat } from '../types/blog';

const BLOG_DIR = path.join(process.cwd(), 'content/blog');

export function getArticleSlugs() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR).filter((file) => file.endsWith('.mdx'));
}

export function getArticleBySlug(slug: string): Article | null {
  const realSlug = slug.replace(/\.mdx$/, '');
  const fullPath = path.join(BLOG_DIR, `${realSlug}.mdx`);
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug: realSlug,
    title: data.title || '',
    excerpt: data.excerpt || '',
    cover: data.cover || '',
    category: data.category || 'Geral',
    author: data.author || 'Equipe',
    publishedAt: data.publishedAt || Date.now(),
    readingTime: data.readingTime,
    format: (data.format as ArticleFormat) || 'text',
    body: content,
    audio: data.audio ? {
      url: data.audio.url,
      duration: data.audio.duration,
      transcript: data.audio.transcript,
    } : undefined,
    relatedCourseSlug: data.relatedCourseSlug,
    featured: data.featured || false,
    premium: data.premium || false,
  };
}

export function getAllArticles(): Article[] {
  const slugs = getArticleSlugs();
  const articles = slugs
    .map((slug) => getArticleBySlug(slug))
    .filter((article): article is Article => article !== null)
    .sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1));
  
  return articles;
}

export function getArticlesByCategory(category: string): Article[] {
  return getAllArticles().filter((article) => article.category.toLowerCase() === category.toLowerCase());
}
