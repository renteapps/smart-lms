import Link from "next/link";
import { Home, ShoppingBag } from "lucide-react";
import { Card } from "@heroui/react/card";
import { ArrowRight02Icon } from "@/components/ui/arrow-right-02";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import { requireAdmin } from "@/lib/supabase/auth";
import { getPageDraft } from "@/lib/data/pages";
import { PAGE_KEYS, PAGE_LABELS } from "@/lib/pageBuilder";
import type { PageKey } from "@/types/pageBuilder";

const PAGE_ICONS: Record<PageKey, typeof Home> = {
  "public-home": Home,
  "no-products": ShoppingBag,
};

export default async function AdminPagesPage() {
  const { adminClient } = await requireAdmin();
  const drafts = await Promise.all(PAGE_KEYS.map((key) => getPageDraft(adminClient, key)));

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Plataforma"
        title="Páginas"
        description="Monte a experiência de visitantes e de usuários que ainda não possuem produtos."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {PAGE_KEYS.map((key, index) => {
          const label = PAGE_LABELS[key];
          const draft = drafts[index];
          const Icon = PAGE_ICONS[key];
          return (
            <Link key={key} href={`/admin/pages/${key}`} className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2">
              <Card className="h-full lift">
                <Card.Header>
                  <span className="mb-2 grid size-12 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <Card.Title className="group-hover:text-accent">{label.title}</Card.Title>
                  <Card.Description>{label.description}</Card.Description>
                </Card.Header>
                <Card.Footer className="flex items-center justify-between gap-3">
                  <StatusBadge tone={draft.revision > 0 ? "positive" : "neutral"}>
                    {draft.revision > 0 ? "Rascunho salvo" : "Não configurada"}
                  </StatusBadge>
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
    </div>
  );
}
