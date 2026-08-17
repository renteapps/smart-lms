import { Plus, Plug } from "lucide-react";
import {
  Button,
  buttonVariants,
  Card,
  Table,
} from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPlans } from "@/lib/data/plans";

export default async function PlanosPage() {
  const supabase = await createClient();
  const plans = await getPlans(supabase);
  
  const isEmpty = plans.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Planos de Assinatura"
          description="Crie e gerencie os planos oferecidos na sua plataforma e mapeie para produtos da Eduzz."
        />
        <Link href="/admin/planos/novo" className={cn(buttonVariants({ variant: "primary" }), "gap-2")}>
          <Plus className="size-4 mr-2" /> Novo Plano
        </Link>
      </div>

      <Card>
        <Card.Content className="px-0 pb-0 pt-0">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <p className="font-semibold text-foreground">Nenhum plano encontrado.</p>
            </div>
          ) : (
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
                      <Table.Column>AÇÕES</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {plans.map((plan) => (
                        <Table.Row key={plan.id}>
                          <Table.Cell className="font-medium">
                            <Link href={`/admin/planos/${plan.id}`} className="hover:text-accent hover:underline">
                              {plan.name}
                            </Link>
                          </Table.Cell>
                          <Table.Cell>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}
                          </Table.Cell>
                          <Table.Cell className="capitalize">
                            {plan.frequency === "monthly" ? "Mensal" :
                             plan.frequency === "yearly" ? "Anual" :
                             plan.frequency === "lifetime" ? "Vitalício" : "Personalizado"}
                          </Table.Cell>
                          <Table.Cell>
                            <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", plan.isActive ? "bg-success-soft text-success-soft-foreground" : "bg-default-100 text-default-600")}>
                              {plan.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            {plan.gatewayProductId ? (
                               <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-soft text-primary-soft-foreground gap-1 w-fit">
                                 <Plug className="size-3" /> Integrado
                               </span>
                            ) : (
                              <span className="text-xs text-muted">Não configurada</span>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/admin/planos/${plan.id}`}
                                className={buttonVariants({ variant: "outline", size: "sm" })}
                              >
                                Editar
                              </Link>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table.Root>
            </div>
          )}

          {/* Versão Mobile */}
          {!isEmpty && (
            <ul className="divide-y divide-separator md:hidden">
              {plans.map((plan) => (
                <li key={plan.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/admin/planos/${plan.id}`} className="font-medium hover:text-accent">
                        {plan.name}
                      </Link>
                      <p className="mt-1 text-sm text-muted">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)} • {
                          plan.frequency === "monthly" ? "Mensal" :
                          plan.frequency === "yearly" ? "Anual" :
                          plan.frequency === "lifetime" ? "Vitalício" : "Personalizado"
                        }
                      </p>
                    </div>
                    <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", plan.isActive ? "bg-success-soft text-success-soft-foreground" : "bg-default-100 text-default-600")}>
                      {plan.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/admin/planos/${plan.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full text-center")}>
                      Editar
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
