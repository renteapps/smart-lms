"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Edit3, FileText, Headphones, Newspaper, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Label,
  ListBox,
  ListBoxItem,
  SearchField,
  Select,
  Table,
  Tooltip,
  buttonVariants,
  toast,
} from "@heroui/react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import { deleteArticle } from "@/app/actions/admin/content";
import { cn } from "@/lib/utils";

export type AdminArticleRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  cover?: string | null;
  format: string;
  isPublished: boolean;
  featured: boolean;
  updatedAt: string;
};

const formatIcon = (format: string) => (format === "audio" ? Headphones : format === "both" ? Sparkles : FileText);

export function AdminBlogClient({ initialArticles }: { initialArticles: AdminArticleRow[] }) {
  const [articles, setArticles] = useState<AdminArticleRow[]>(initialArticles);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoriesList = Array.from(new Set(articles.map((a) => a.category)));

  const filtered = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const publishedCount = articles.filter((a) => a.isPublished).length;
  const draftCount = articles.length - publishedCount;
  const isEmpty = filtered.length === 0;

  const handleDelete = (article: AdminArticleRow) => {
    if (!confirm(`Tem certeza que deseja excluir o artigo "${article.title}"?`)) return;

    setDeletingId(article.id);
    startTransition(async () => {
      const result = await deleteArticle(article.id);
      if (result.success) {
        setArticles((prev) => prev.filter((a) => a.id !== article.id));
        toast.success("Artigo excluído com sucesso!");
      } else {
        toast.danger("Erro ao excluir", { description: result.message });
      }
      setDeletingId(null);
    });
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Conteúdo"
        title="Blog"
        description="Crie e gerencie os artigos publicados em /blog."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/blog/categorias" className={buttonVariants({ variant: "secondary" })}>
              Gerenciar Categorias
            </Link>
            <Link href="/admin/blog/novo" className={cn(buttonVariants({ variant: "primary" }), "gap-2")}>
              <Plus className="size-4" aria-hidden="true" /> Novo artigo
            </Link>
          </div>
        }
      />

      <Card>
        <Card.Header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SearchField value={searchTerm} onChange={setSearchTerm} className="w-full md:w-80">
            <Label>Buscar artigos</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Buscar por título ou categoria…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <div className="flex w-full flex-wrap items-end gap-3 md:w-auto">
            <Select
              selectedKey={categoryFilter}
              onSelectionChange={(key) => setCategoryFilter(String(key))}
              className="w-full sm:w-56"
            >
              <Label>Categoria</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {[{ id: "all", label: "Todas as categorias" }, ...categoriesList.map((cat) => ({ id: cat, label: cat }))].map(
                    (opt) => (
                      <ListBoxItem key={opt.id} id={opt.id}>
                        {opt.label}
                      </ListBoxItem>
                    ),
                  )}
                </ListBox>
              </Select.Popover>
            </Select>

            <div className="flex items-center gap-2">
              <StatusBadge tone="positive">{publishedCount} publicados</StatusBadge>
              <StatusBadge tone="warning">{draftCount} rascunhos</StatusBadge>
            </div>
          </div>
        </Card.Header>

        <Card.Content className="px-0 pb-0">
          {isEmpty ? (
            <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                <Newspaper className="size-5 text-muted" aria-hidden="true" />
              </span>
              <p className="font-semibold text-foreground">
                {searchTerm ? `Nenhum artigo encontrado para "${searchTerm}"` : "Nenhum artigo publicado"}
              </p>
              <p className="text-sm text-muted">
                {searchTerm ? "Tente outro termo ou limpe a busca." : "Crie o primeiro artigo para alimentar o blog."}
              </p>
              <Link href="/admin/blog/novo" className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-2 gap-2")}>
                <Plus className="size-4" aria-hidden="true" /> Novo artigo
              </Link>
            </EmptyState>
          ) : (
            <>
              <div className="hidden md:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Artigos do blog">
                      <Table.Header>
                        <Table.Column isRowHeader>Artigo</Table.Column>
                        <Table.Column>Categoria</Table.Column>
                        <Table.Column>Formato</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column>Atualização</Table.Column>
                        <Table.Column className="text-right">Ações</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {filtered.map((article) => {
                          const FormatIcon = formatIcon(article.format);
                          return (
                            <Table.Row key={article.id} id={article.id}>
                              <Table.Cell>
                                <Link
                                  href={`/admin/blog/${article.id}`}
                                  className="flex items-center gap-3 font-semibold text-foreground hover:text-accent"
                                >
                                  {article.cover ? (
                                    <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-background-secondary">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={article.cover} alt="" className="size-full object-cover" />
                                    </div>
                                  ) : (
                                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                                      <Newspaper className="size-4" aria-hidden="true" />
                                    </span>
                                  )}
                                  <span className="line-clamp-2">{article.title}</span>
                                </Link>
                              </Table.Cell>
                              <Table.Cell>
                                <Chip color="default" variant="soft" size="sm">
                                  {article.category}
                                </Chip>
                              </Table.Cell>
                              <Table.Cell>
                                <div className="flex items-center gap-1.5 text-sm text-muted">
                                  <FormatIcon className="size-3.5" aria-hidden="true" />
                                  {article.format === "audio" ? "Áudio" : article.format === "both" ? "Texto + Áudio" : "Texto"}
                                </div>
                              </Table.Cell>
                              <Table.Cell>
                                <StatusBadge tone={article.isPublished ? "positive" : "warning"}>
                                  {article.isPublished ? "Publicado" : "Rascunho"}
                                </StatusBadge>
                              </Table.Cell>
                              <Table.Cell className="text-muted">
                                {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(
                                  new Date(article.updatedAt),
                                )}
                              </Table.Cell>
                              <Table.Cell>
                                <div className="flex justify-end gap-1">
                                  <Tooltip.Root>
                                    <Tooltip.Trigger>
                                      <Link
                                        href={`/admin/blog/${article.id}`}
                                        className={buttonVariants({ variant: "ghost", size: "sm", isIconOnly: true })}
                                        aria-label={`Editar ${article.title}`}
                                      >
                                        <Edit3 className="size-4" aria-hidden="true" />
                                      </Link>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Editar artigo</Tooltip.Content>
                                  </Tooltip.Root>
                                  <Tooltip.Root>
                                    <Tooltip.Trigger>
                                      <Button
                                        isIconOnly
                                        variant="danger-soft"
                                        size="sm"
                                        aria-label={`Excluir ${article.title}`}
                                        isDisabled={isPending && deletingId === article.id}
                                        onClick={() => handleDelete(article)}
                                      >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                      </Button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Excluir artigo</Tooltip.Content>
                                  </Tooltip.Root>
                                </div>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              <ul className="divide-y divide-separator md:hidden">
                {filtered.map((article) => {
                  const FormatIcon = formatIcon(article.format);
                  return (
                    <li key={article.id} className="p-4">
                      <div className="flex items-start gap-3">
                        {article.cover ? (
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-background-secondary">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={article.cover} alt="" className="size-full object-cover" />
                          </div>
                        ) : (
                          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                            <Newspaper className="size-4" aria-hidden="true" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <Link href={`/admin/blog/${article.id}`} className="block font-semibold leading-5 text-foreground">
                            {article.title}
                          </Link>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                            <Chip color="default" variant="soft" size="sm">
                              {article.category}
                            </Chip>
                            <FormatIcon className="size-3.5" aria-hidden="true" />
                          </p>
                        </div>
                        <StatusBadge tone={article.isPublished ? "positive" : "warning"}>
                          {article.isPublished ? "Publicado" : "Rascunho"}
                        </StatusBadge>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-xs text-muted">
                          Atualizado{" "}
                          {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                            .format(new Date(article.updatedAt))
                            .toLowerCase()}
                        </span>
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/blog/${article.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                            Editar
                          </Link>
                          <Button
                            isIconOnly
                            variant="danger-soft"
                            size="sm"
                            aria-label={`Excluir ${article.title}`}
                            isDisabled={isPending && deletingId === article.id}
                            onClick={() => handleDelete(article)}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
