"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Trash2 } from "lucide-react";
import { Card } from "@heroui/react/card";
import { EmptyState } from "@heroui/react/empty-state";
import { Button } from "@heroui/react";
import { StatusBadge } from "@/components/ui/editorial";
import { DeletePageDialog } from "./DeletePageDialog";
import { PAGE_STATUS_LABEL, PAGE_STATUS_TONE, type PageStatus } from "./pageStatus";

type CustomPageItem = { slug: string; title: string; description: string | null; status: PageStatus };

export function CustomPagesGrid({ pages }: { pages: CustomPageItem[] }) {
  const [pageToDelete, setPageToDelete] = useState<{ slug: string; title: string } | null>(null);

  if (pages.length === 0) {
    return (
      <EmptyState className="gap-4 py-16">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
          <FileText className="size-6" aria-hidden="true" />
        </span>
        <div className="max-w-sm text-center">
          <p className="font-display font-extrabold text-foreground">Nenhuma página personalizada ainda</p>
          <p className="mt-1 text-sm leading-6 text-muted">Use “Nova página”, no topo, para criar a primeira.</p>
        </div>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {pages.map((page) => (
          <Card key={page.slug} className="relative h-full lift">
            <Card.Header>
              <span className="mb-2 grid size-12 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                <FileText className="size-6" aria-hidden="true" />
              </span>
              <Card.Title>{page.title}</Card.Title>
              <Card.Description>{page.description || `/pagina/${page.slug}`}</Card.Description>
            </Card.Header>
            <Card.Footer className="flex items-center justify-between gap-3">
              <StatusBadge tone={PAGE_STATUS_TONE[page.status]}>{PAGE_STATUS_LABEL[page.status]}</StatusBadge>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={`Excluir ${page.title}`}
                className="relative z-10 text-danger"
                onPress={() => setPageToDelete({ slug: page.slug, title: page.title })}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </Card.Footer>
            {/*
             * Link esticado: o card inteiro é clicável sem aninhar <button>
             * dentro de <a>. O botão de excluir fica por cima (z-10 + seu
             * próprio stacking context) para capturar o clique primeiro.
             */}
            <Link href={`/admin/pages/${page.slug}`} className="absolute inset-0 rounded-lg" aria-label={`Editar ${page.title}`} />
          </Card>
        ))}
      </div>

      <DeletePageDialog page={pageToDelete} onClose={() => setPageToDelete(null)} />
    </>
  );
}
