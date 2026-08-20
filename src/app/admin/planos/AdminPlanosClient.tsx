"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Plus,
  Plug,
  Sparkles,
  Building2,
  Trash2,
  Edit2,
  Loader2,
} from "lucide-react";
import {
  Button,
  buttonVariants,
  Card,
  Modal,
  SearchField,
  Table,
  toast,
} from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/data/plans";
import { deletePlan } from "@/app/actions/admin/platform";

export function AdminPlanosClient({ initialPlans }: { initialPlans: Plan[] }) {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "b2b" | "highlighted">("all");
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // Filter by category/status
      if (filter === "active" && !plan.isActive) return false;
      if (filter === "inactive" && plan.isActive) return false;
      if (filter === "b2b" && !plan.isB2B) return false;
      if (filter === "highlighted" && !plan.isHighlighted) return false;

      // Search query
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        plan.name.toLowerCase().includes(term) ||
        plan.slug?.toLowerCase().includes(term) ||
        plan.gatewayProductId?.toLowerCase().includes(term) ||
        plan.gateway?.toLowerCase().includes(term)
      );
    });
  }, [plans, search, filter]);

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);

    try {
      const res = await deletePlan(planToDelete.id);
      if (res.success) {
        toast.success(`Plano "${planToDelete.name}" excluído com sucesso!`);
        setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));
        setPlanToDelete(null);
        router.refresh();
      } else {
        toast.danger(res.message || "Erro ao excluir plano.");
      }
    } catch (err) {
      console.error(err);
      toast.danger("Erro inesperado ao excluir plano.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case "monthly":
      case "mensal":
        return "Mensal";
      case "yearly":
      case "anual":
        return "Anual";
      case "lifetime":
      case "vitalicio":
        return "Vitalício";
      case "weekly":
      case "semanal":
        return "Semanal";
      case "biweekly":
      case "quinzenal":
        return "Quinzenal";
      case "quarterly":
      case "trimestral":
        return "Trimestral";
      case "semiannual":
      case "semestral":
        return "Semestral";
      case "custom":
      case "personalizado":
        return "Personalizado";
      default:
        return freq;
    }
  };

  const isGlobalEmpty = plans.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="Monetização"
          title="Planos de Assinatura"
          description="Crie e gerencie os planos oferecidos na plataforma e vincule integrações com Eduzz, Hotmart e outros gateways."
        />
        <Link href="/admin/planos/novo" className={cn(buttonVariants({ variant: "primary" }), "gap-2")}>
          <Plus className="size-4" /> Novo Plano
        </Link>
      </div>

      <Card>
        {/* Barra de Filtros & Busca */}
        {!isGlobalEmpty && (
          <Card.Header className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchField
              className="w-full sm:max-w-xs"
              aria-label="Buscar planos"
              value={search}
              onChange={setSearch}
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Buscar por nome ou gateway..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Button
                variant={filter === "all" ? "primary" : "outline"}
                size="sm"
                onPress={() => setFilter("all")}
              >
                Todos ({plans.length})
              </Button>
              <Button
                variant={filter === "active" ? "primary" : "outline"}
                size="sm"
                onPress={() => setFilter("active")}
              >
                Ativos ({plans.filter((p) => p.isActive).length})
              </Button>
              <Button
                variant={filter === "highlighted" ? "primary" : "outline"}
                size="sm"
                onPress={() => setFilter("highlighted")}
              >
                Destaques ({plans.filter((p) => p.isHighlighted).length})
              </Button>
              <Button
                variant={filter === "b2b" ? "primary" : "outline"}
                size="sm"
                onPress={() => setFilter("b2b")}
              >
                Corporativos ({plans.filter((p) => p.isB2B).length})
              </Button>
            </div>
          </Card.Header>
        )}

        <Card.Content className="px-0 pb-0 pt-0">
          {isGlobalEmpty ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
                <CreditCard className="size-7" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-bold text-foreground">Nenhum plano cadastrado</h3>
                <p className="text-sm text-muted">
                  Comece criando seu primeiro plano de assinatura para liberar acesso a cursos, tutores de IA e conteúdos da sua plataforma.
                </p>
              </div>
              <Link href="/admin/planos/novo" className={cn(buttonVariants({ variant: "primary" }), "mt-2 gap-2")}>
                <Plus className="size-4" /> Criar Primeiro Plano
              </Link>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <p className="text-sm font-semibold text-foreground">Nenhum plano corresponde aos filtros aplicados.</p>
              <Button
                variant="outline"
                size="sm"
                onPress={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <>
              {/* Tabela Desktop */}
              <div className="hidden md:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Lista de planos de assinatura">
                      <Table.Header>
                        <Table.Column isRowHeader>NOME DO PLANO</Table.Column>
                        <Table.Column>PREÇO</Table.Column>
                        <Table.Column>FREQUÊNCIA</Table.Column>
                        <Table.Column>STATUS</Table.Column>
                        <Table.Column>INTEGRAÇÃO</Table.Column>
                        <Table.Column className="text-right">AÇÕES</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {filteredPlans.map((plan) => (
                          <Table.Row key={plan.id}>
                            <Table.Cell className="font-medium">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/admin/planos/${plan.id}`}
                                    className="font-semibold text-foreground hover:text-accent hover:underline"
                                  >
                                    {plan.name}
                                  </Link>
                                  {plan.isHighlighted && (
                                    <span className="inline-flex items-center gap-1 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent-soft-foreground">
                                      <Sparkles className="size-3" /> Destaque
                                    </span>
                                  )}
                                  {plan.isB2B && (
                                    <span className="inline-flex items-center gap-1 rounded bg-default-100 px-1.5 py-0.5 text-[10px] font-semibold text-default-700">
                                      <Building2 className="size-3" /> B2B {plan.seats ? `(${plan.seats} vagas)` : ""}
                                    </span>
                                  )}
                                </div>
                                {plan.slug && <p className="text-xs font-mono text-muted">/{plan.slug}</p>}
                              </div>
                            </Table.Cell>

                            <Table.Cell className="font-semibold text-foreground">
                              {plan.price === 0 ? (
                                <span className="text-success font-bold">Gratuito</span>
                              ) : (
                                new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(plan.price)
                              )}
                            </Table.Cell>

                            <Table.Cell>
                              <span className="capitalize">{getFrequencyLabel(plan.frequency)}</span>
                              {plan.accessTimeDays && (
                                <p className="text-xs text-muted">{plan.accessTimeDays} dias</p>
                              )}
                            </Table.Cell>

                            <Table.Cell>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                                  plan.isActive
                                    ? "bg-success-soft text-success-soft-foreground"
                                    : "bg-default-100 text-default-600"
                                )}
                              >
                                {plan.isActive ? "Ativo" : "Inativo"}
                              </span>
                            </Table.Cell>

                            <Table.Cell>
                              {plan.gatewayProductId ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-soft-foreground w-fit">
                                    <Plug className="size-3" /> {plan.gateway || "Eduzz"}
                                  </span>
                                  <p className="text-[11px] font-mono text-muted">ID: {plan.gatewayProductId}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted">Manual / Não vinculada</span>
                              )}
                            </Table.Cell>

                            <Table.Cell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/admin/planos/${plan.id}`}
                                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                                >
                                  <Edit2 className="size-3.5" /> Editar
                                </Link>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  isIconOnly
                                  aria-label={`Excluir plano ${plan.name}`}
                                  className="text-muted hover:text-danger hover:bg-danger-soft"
                                  onPress={() => setPlanToDelete(plan)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              {/* Versão Mobile */}
              <ul className="divide-y divide-separator md:hidden">
                {filteredPlans.map((plan) => (
                  <li key={plan.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <Link href={`/admin/planos/${plan.id}`} className="font-bold text-foreground hover:text-accent">
                          {plan.name}
                        </Link>
                        <div className="flex flex-wrap gap-1.5">
                          {plan.isHighlighted && (
                            <span className="inline-flex items-center gap-1 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent-soft-foreground">
                              <Sparkles className="size-3" /> Destaque
                            </span>
                          )}
                          {plan.isB2B && (
                            <span className="inline-flex items-center gap-1 rounded bg-default-100 px-1.5 py-0.5 text-[10px] font-semibold text-default-700">
                              <Building2 className="size-3" /> B2B
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {plan.price === 0
                            ? "Gratuito"
                            : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(plan.price)}{" "}
                          • {getFrequencyLabel(plan.frequency)}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium shrink-0",
                          plan.isActive
                            ? "bg-success-soft text-success-soft-foreground"
                            : "bg-default-100 text-default-600"
                        )}
                      >
                        {plan.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
                      <span className="text-muted">
                        {plan.gatewayProductId ? `Gateway: ${plan.gateway || "Eduzz"}` : "Sem gateway"}
                      </span>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/planos/${plan.id}`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          Editar
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          isIconOnly
                          aria-label="Excluir"
                          className="text-muted hover:text-danger hover:bg-danger-soft"
                          onPress={() => setPlanToDelete(plan)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Modal de Confirmação de Exclusão */}
      <Modal.Root isOpen={!!planToDelete} onOpenChange={(open) => !open && setPlanToDelete(null)}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading className="text-lg font-bold text-danger">
                  Excluir Plano de Assinatura
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-3 py-3 text-sm text-foreground">
                <p>
                  Tem certeza que deseja excluir o plano <strong>&quot;{planToDelete?.name}&quot;</strong>?
                </p>
                <p className="text-xs text-muted">
                  Esta ação é irreversível e removerá este plano das opções de contratação.
                </p>
              </Modal.Body>
              <Modal.Footer className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onPress={() => setPlanToDelete(null)}
                  isDisabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="bg-danger hover:bg-danger/90 text-white gap-2"
                  onPress={handleDeleteConfirm}
                  isDisabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  Confirmar Exclusão
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </div>
  );
}
