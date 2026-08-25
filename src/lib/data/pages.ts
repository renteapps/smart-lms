import { cloneDefaultPage, selectPageItems, validatePageDocument } from "@/lib/pageBuilder";
import { isEnrollmentActive, isSubscriptionActive } from "@/lib/courseAccess";
import type { PageBuilderData, PageDocument, PageDraft, PageKey, PageSection } from "@/types/pageBuilder";
import { getAllArticles } from "@/lib/data/blog";
import { getCatalogCourses, getPageGalleryRows } from "@/lib/data/courses";
import { getAccessibleProfileTests, getProfileTests } from "@/lib/data/profileTests";
import { logQueryError, type DB, type Row } from "./types";

export const publishedPageSettingKey = (pageKey: PageKey) => `page-builder:${pageKey}`;

export async function getPublishedPage(db: DB, pageKey: PageKey): Promise<PageDocument> {
  const { data, error } = await db
    .from("app_settings")
    .select("value")
    .eq("key", publishedPageSettingKey(pageKey))
    .maybeSingle();

  logQueryError(`getPublishedPage:${pageKey}`, error);
  const parsed = validatePageDocument(data?.value, pageKey);
  return parsed.success ? parsed.document : cloneDefaultPage(pageKey);
}

export async function getPageDraft(db: DB, pageKey: PageKey): Promise<PageDraft> {
  const { data, error } = await db
    .from("page_builder_drafts")
    .select("document, revision, updated_at")
    .eq("page_key", pageKey)
    .maybeSingle();

  if (error) logQueryError(`getPageDraft:${pageKey}`, error);
  const parsed = validatePageDocument(data?.document, pageKey);
  return {
    document: parsed.success ? parsed.document : cloneDefaultPage(pageKey),
    revision: typeof data?.revision === "number" ? data.revision : 0,
    updatedAt: typeof data?.updated_at === "string" ? data.updated_at : null,
  };
}

function sectionNeeds(sections: PageSection[], type: PageSection["type"] | PageSection["type"][]) {
  const types = Array.isArray(type) ? type : [type];
  return sections.some((section) => section.visible && types.includes(section.type));
}

export async function getPageBuilderData(
  db: DB,
  document: PageDocument,
  userId?: string | null,
): Promise<PageBuilderData> {
  const sections = document.sections;
  const needsCourses = sectionNeeds(sections, "course-carousel");
  const needsGallery = sectionNeeds(sections, "gallery-course-carousel");
  const needsArticles = sectionNeeds(sections, "article-carousel");
  const needsTests = sectionNeeds(sections, "profile-test-carousel");

  const [courses, galleryRows, articles, rawTests] = await Promise.all([
    needsCourses ? getCatalogCourses(db, userId) : Promise.resolve([]),
    needsGallery ? getPageGalleryRows(db, userId) : Promise.resolve([]),
    needsArticles ? getAllArticles(db) : Promise.resolve([]),
    needsTests ? getProfileTests(db, true) : Promise.resolve([]),
  ]);

  const profileTests = needsTests
    ? userId
      ? await getAccessibleProfileTests(db, userId, rawTests)
      : rawTests.filter((test) => test.accessType === "public")
    : [];

  return { courses, galleryRows, articles, profileTests };
}

export async function getPageBuilderAdminData(db: DB): Promise<PageBuilderData> {
  const [courses, galleryRows, articles, profileTests] = await Promise.all([
    getCatalogCourses(db),
    getPageGalleryRows(db),
    getAllArticles(db),
    getProfileTests(db, true),
  ]);
  return { courses, galleryRows, articles, profileTests };
}

export async function hasActiveProductAccess(db: DB, userId: string, now = new Date()): Promise<boolean> {
  const [enrollments, subscriptions] = await Promise.all([
    db.from("enrollments").select("status, expires_at").eq("user_id", userId),
    db.from("subscriptions").select("status, current_period_end, plans!inner(is_active)").eq("user_id", userId),
  ]);

  logQueryError("hasActiveProductAccess:enrollments", enrollments.error);
  logQueryError("hasActiveProductAccess:subscriptions", subscriptions.error);

  // Em falha de leitura, preserva a home do aluno. É melhor mostrar o painel
  // existente do que tratar por engano um cliente pagante como sem produto.
  if (enrollments.error || subscriptions.error) return true;

  return deriveHasActiveProductAccess(enrollments.data ?? [], subscriptions.data ?? [], now);
}

export function deriveHasActiveProductAccess(enrollments: Row[], subscriptions: Row[], now = new Date()): boolean {
  const hasEnrollment = enrollments.some((row: Row) => isEnrollmentActive({
    status: row.status,
    expiresAt: row.expires_at,
  }, now));
  const hasSubscription = subscriptions.some((row: Row) => {
    const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
    return plan?.is_active !== false && isSubscriptionActive({
      status: row.status,
      currentPeriodEnd: row.current_period_end,
    }, now);
  });
  return hasEnrollment || hasSubscription;
}

export function resolvePageSectionItems(section: PageSection, data: PageBuilderData) {
  if (section.type === "course-carousel") {
    return selectPageItems(data.courses, section.source, {
      id: (course) => course.id,
      featured: (course) => Boolean(course.isFeatured),
      category: (course) => course.category,
    });
  }
  if (section.type === "gallery-course-carousel") {
    return selectPageItems(data.galleryRows, section.source, {
      id: (row) => row.courseId,
      featured: (row) => Boolean(row.isFeatured),
      category: (row) => row.category,
    });
  }
  if (section.type === "article-carousel") {
    return selectPageItems(data.articles, section.source, {
      id: (article) => article.slug,
      featured: (article) => Boolean(article.featured),
      category: (article) => article.category,
    });
  }
  if (section.type === "profile-test-carousel") {
    return selectPageItems(data.profileTests, section.source, {
      id: (test) => test.id,
    });
  }
  return [];
}
