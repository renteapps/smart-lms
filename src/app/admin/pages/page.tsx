import Link from "next/link";
import { Home, ShoppingBag } from "lucide-react";
import { Card } from "@heroui/react/card";
import { ArrowRight02Icon } from "@/components/ui/arrow-right-02";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import { requireAdmin } from "@/lib/supabase/auth";
import { getPageDraft, getPublishedPageSlugs, listPages } from "@/lib/data/pages";
import { SYSTEM_PAGE_LABELS } from "@/lib/pageBuilder";
import type { SystemPageKey } from "@/types/pageBuilder";
import { CreatePageDialog } from "./CreatePageDialog";
import { CustomPagesGrid } from "./CustomPagesGrid";
import { PAGE_STATUS_LABEL, PAGE_STATUS_TONE, resolvePageStatus } from "./pageStatus";

const SYSTEM_PAGE_ICONS: Record<SystemPageKey, typeof Home> = {
  "public-home": Home,
  "no-products": ShoppingBag,
};

export default async function AdminPagesPage() {
  const { adminClient } = await requireAdmin();
  const entries = await listPages(adminClient);
  const systemEntries = entries.filter((entry) => entry.kind === "system");
  const customEntries = entries.filter((entry) => entry.kind === "custom");

  const [drafts, publishedSlugs] = await Promise.all([
    Promise.all(entries.map((entry) => getPageDraft(adminClient, entry.slug))),
    getPublishedPageSlugs(adminClient, entries.map((entry) => entry.slug)),
  ]);
  const draftBySlug = new Map(entries.map((entry, index) => [entry.slug, drafts[index]]));

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Plataforma"
        title="Páginas"
        description="Monte a experiência de visitantes, de usuários sem produtos e crie novas páginas públicas."
        actions={<CreatePageDialog />}
      />

      <section className="space-y-4">
        <h2 className="font-display font-extrabold text-foreground">Páginas do sistema</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {systemEntries.map((entry) => {
            const key = entry.slug as SystemPageKey;
            const label = SYSTEM_PAGE_LABELS[key] ?? { title: entry.title, description: entry.description ?? "" };
            const draft = draftBySlug.get(entry.slug);
            const Icon = SYSTEM_PAGE_ICONS[key] ?? Home;
            const status = resolvePageStatus(Boolean(draft && draft.revision > 0), publishedSlugs.has(entry.slug));
            return (
              <Link
                key={entry.slug}
                href={`/admin/pages/${entry.slug}`}
                className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              >
                <Card className="h-full lift">
                  <Card.Header>
                    <span className="mb-2 grid size-12 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <Card.Title className="group-hover:text-accent">{label.title}</Card.Title>
                    <Card.Description>{label.description}</Card.Description>
                  </Card.Header>
                  <Card.Footer className="flex items-center justify-between gap-3">
                    <StatusBadge tone={PAGE_STATUS_TONE[status]}>{PAGE_STATUS_LABEL[status]}</StatusBadge>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                      Abrir
                      <ArrowRight02Icon size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </Card.Footer>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display font-extrabold text-foreground">Páginas personalizadas</h2>
        <CustomPagesGrid
          pages={customEntries.map((entry) => ({
            slug: entry.slug,
            title: entry.title,
            description: entry.description,
            status: resolvePageStatus((draftBySlug.get(entry.slug)?.revision ?? 0) > 0, publishedSlugs.has(entry.slug)),
          }))}
        />
      </section>
    </div>
  );
}
