"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Plug } from "lucide-react";
import {
  Button,
  Card,
  Table,
} from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  price: number;
  frequency: "mensal" | "anual" | "vitalicio" | "personalizado";
  status: "ativo" | "inativo";
  gateway?: "Eduzz" | "Hotmart";
}

const mockPlans: Plan[] = [
  { id: "1", name: "Plano Básico", price: 29.90, frequency: "mensal", status: "ativo", gateway: "Eduzz" },
  { id: "2", name: "Plano Pro", price: 59.90, frequency: "mensal", status: "ativo" },
  { id: "3", name: "Plano Anual Premium", price: 499.90, frequency: "anual", status: "ativo" },
];

export default function PlanosPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>(mockPlans);
  
  const handleDelete = (id: string) => {
    setPlans(plans.filter((p) => p.id !== id));
    toast.success("Plano removido com sucesso");
  };

  const isEmpty = plans.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Planos de Assinatura"
          description="Crie e gerencie os planos oferecidos na sua plataforma e mapeie para produtos da Eduzz."
        />
        <Button variant="primary" onPress={() => router.push("/admin/planos/novo")}>
          <Plus className="size-4 mr-2" /> Novo Plano
        </Button>
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
                          <Table.Cell className="capitalize">{plan.frequency}</Table.Cell>
                          <Table.Cell>
                            <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", plan.status === "ativo" ? "bg-success-soft text-success-soft-foreground" : "bg-default-100 text-default-600")}>
                              {plan.status === "ativo" ? "Ativo" : "Inativo"}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            {plan.gateway ? (
                               <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-soft text-primary-soft-foreground gap-1 w-fit">
                                 <Plug className="size-3" /> {plan.gateway}
                               </span>
                            ) : (
                              <span className="text-xs text-muted">Não configurada</span>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-2">
                              <Button isIconOnly variant="ghost" size="sm" aria-label="Editar" onPress={() => router.push(`/admin/planos/${plan.id}`)}>
                                <Pencil className="size-4 text-muted" />
                              </Button>
                              <Button 
                                isIconOnly 
                                variant="ghost" 
                                size="sm" 
                                aria-label="Excluir"
                                className="text-danger hover:text-danger hover:bg-danger/10"
                                onPress={() => handleDelete(plan.id)}
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
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
