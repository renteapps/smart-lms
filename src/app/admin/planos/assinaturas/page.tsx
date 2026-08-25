"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Filter } from "lucide-react";
import {
  Button,
  Card,
  Table,
  SearchField,
} from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSubscriptions, type Subscription as DbSubscription } from "@/lib/data/plans";

export default function AssinaturasPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<DbSubscription[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    async function loadData() {
      const supabase = createClient();
      try {
        const subs = await getSubscriptions(supabase);
        if (active) setSubscriptions(subs);
      } catch (error) {
        console.error(error);
      }
    }
    void loadData();
    return () => { active = false; };
  }, []);

  const filteredSubs = subscriptions.filter(sub => 
    (sub.userName?.toLowerCase().includes(search.toLowerCase()) || 
    sub.userEmail?.toLowerCase().includes(search.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const labels: Record<string, { label: string; classes: string }> = {
      active: { label: "Ativa", classes: "bg-success-soft text-success-soft-foreground" },
      trialing: { label: "Em teste", classes: "bg-success-soft text-success-soft-foreground" },
      pending: { label: "Pendente", classes: "bg-default-100 text-default-600" },
      past_due: { label: "Em atraso", classes: "bg-warning-soft text-warning-soft-foreground" },
      suspended: { label: "Suspensa", classes: "bg-warning-soft text-warning-soft-foreground" },
      canceled: { label: "Cancelada", classes: "bg-danger-soft text-danger-soft-foreground" },
      refunded: { label: "Reembolsada", classes: "bg-danger-soft text-danger-soft-foreground" },
      chargeback: { label: "Chargeback", classes: "bg-danger-soft text-danger-soft-foreground" },
      expired: { label: "Expirada", classes: "bg-default-100 text-default-600" },
    };
    const badge = labels[status] ?? { label: status || "Desconhecido", classes: "bg-default-100 text-default-600" };
    return <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${badge.classes}`}>{badge.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="Vendas"
          title="Assinaturas"
          description="Gerencie as assinaturas ativas, atrasadas e canceladas dos seus alunos."
        />
        <Button variant="outline" className="gap-2">
          <Filter className="size-4" /> Filtros
        </Button>
      </div>

      <Card>
        <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <SearchField className="w-full sm:max-w-md" aria-label="Buscar assinaturas" value={search} onChange={setSearch}>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Buscar por aluno ou e-mail..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </Card.Header>
        <Card.Content className="px-0 pb-0 pt-0">
          <div className="hidden md:block">
            <Table.Root>
              <Table.ScrollContainer>
                <Table.Content aria-label="Lista de assinaturas">
                  <Table.Header>
                    <Table.Column isRowHeader>ALUNO</Table.Column>
                    <Table.Column>PLANO</Table.Column>
                    <Table.Column>GATEWAY</Table.Column>
                    <Table.Column>STATUS</Table.Column>
                    <Table.Column>VENCIMENTO</Table.Column>
                    <Table.Column>AÇÕES</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {filteredSubs.map((sub) => (
                      <Table.Row key={sub.id}>
                        <Table.Cell>
                          <Link href={`/admin/planos/assinaturas/${sub.id}`} className="group block">
                            <span className="block text-sm font-semibold text-foreground group-hover:text-accent">
                              {sub.userName || "Sem nome"}
                            </span>
                            <span className="block text-xs text-muted">{sub.userEmail || "Sem e-mail"}</span>
                          </Link>
                        </Table.Cell>
                        <Table.Cell>{sub.planName || "-"}</Table.Cell>
                        <Table.Cell>
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-soft text-primary-soft-foreground">
                            {sub.gateway || "Manual"}
                          </span>
                        </Table.Cell>
                        <Table.Cell>{getStatusBadge(sub.status)}</Table.Cell>
                        <Table.Cell className="text-sm text-muted">
                          {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR") : "-"}
                        </Table.Cell>
                        <Table.Cell>
                          <Button 
                            isIconOnly 
                            variant="ghost" 
                            size="sm" 
                            aria-label="Ver detalhes"
                            onPress={() => router.push(`/admin/planos/assinaturas/${sub.id}`)}
                          >
                            <Eye className="size-4 text-muted" />
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table.Root>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
