"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Table } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "sonner";
import { ChevronLeft, Ban, PlayCircle, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSubscriptionById, type Subscription } from "@/lib/data/plans";

type SubscriptionDetail = Subscription & {
  history?: {
    id: string;
    date: string;
    amount: number;
    status: "pago" | "pendente" | "falhou";
  }[];
};

export default function AssinaturaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const [sub, setSub] = useState<SubscriptionDetail | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function loadData() {
      const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
      if (!id) return;

      const supabase = createClient();
      try {
        const data = await getSubscriptionById(supabase, id);
        if (data) {
          setSub({ ...data, history: [] }); // History not mapped yet
        } else {
          toast.error("Assinatura não encontrada.");
          router.push("/admin/planos/assinaturas");
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, [params.id, router]);

  if (!sub) return null;

  // ==== API Mocks (Simulando integrações com Eduzz) ====
  
  const handleCancelContract = async () => {
    if (!confirm("Tem certeza que deseja cancelar essa assinatura na Eduzz?")) return;
    
    setIsProcessing(true);
    // TODO: fetch('/api/eduzz/cancel-contract', { method: 'POST', body: JSON.stringify({ contractId: sub.id }) })
    setTimeout(() => {
      setSub({ ...sub, status: "canceled" });
      setIsProcessing(false);
      toast.success("Contrato cancelado com sucesso na Eduzz!");
    }, 1000);
  };

  const handleReactivateContract = async () => {
    setIsProcessing(true);
    // TODO: fetch('/api/eduzz/reactivate-contract', { method: 'POST', body: JSON.stringify({ contractId: sub.id }) })
    setTimeout(() => {
      setSub({ ...sub, status: "active" });
      setIsProcessing(false);
      toast.success("Contrato reativado com sucesso na Eduzz!");
    }, 1000);
  };

  const handleChangeCard = async () => {
    setIsProcessing(true);
    // TODO: fetch('/api/eduzz/request-card-change', { method: 'POST', body: JSON.stringify({ contractId: sub.id }) })
    setTimeout(() => {
      setIsProcessing(false);
      toast.success("E-mail para alteração de cartão enviado ao aluno!");
    }, 1000);
  };

  // =====================================================

  const isCanceled = sub.status === "cancelado" || sub.status === "canceled";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" isIconOnly size="sm" onPress={() => router.push("/admin/planos/assinaturas")}>
          <ChevronLeft className="size-4" />
        </Button>
        <PageHeader
          eyebrow="Assinatura"
          title={sub.userName || "Assinatura"}
          description={`Gerenciando contrato via ${sub.gateway || "Eduzz"}`}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Painel Principal */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">Detalhes do Contrato</h2>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                  <div className="text-xl font-bold text-foreground">{sub.userName || "Sem nome"}</div>
                  <div className="text-sm text-muted">{sub.userEmail || "Sem e-mail"}</div>
              </div>
              <div>
                <p className="text-muted mb-1">Plano Assinado</p>
                        <div className="font-semibold">{sub.planName || "-"}</div>
                        <div className="text-muted text-sm">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.amount || 0)} / {sub.gateway || "Manual"}</div>
                <p className="font-mono text-xs">{sub.id}</p>
              </div>
              <div>
                <p className="text-muted mb-1">Status Atual</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${sub.status === "ativo" ? "bg-success-soft text-success-soft-foreground" : sub.status === "cancelado" ? "bg-danger-soft text-danger-soft-foreground" : "bg-warning-soft text-warning-soft-foreground"}`}>
                  {sub.status.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-muted mb-1">Criado em</p>
                <div className="font-semibold">{sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('pt-BR') : "-"}</div>
              </div>
              <div>
                <p className="text-muted mb-1">Próximo Vencimento</p>
                <p className="font-semibold">{isCanceled ? "-" : sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR') : "-"}</p>
              </div>
            </div>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Histórico de Faturas</Card.Title>
            </Card.Header>
            <Card.Content className="px-0 pb-0">
              {!sub.history || sub.history.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted">
                  Nenhum histórico de faturas encontrado.
                </div>
              ) : (
                <Table.Root>
                <Table.Content>
                  <Table.Header>
                    <Table.Column>DATA</Table.Column>
                    <Table.Column>VALOR</Table.Column>
                    <Table.Column>STATUS</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {sub.history.map((invoice) => (
                      <Table.Row key={invoice.id}>
                        <Table.Cell>{invoice.date}</Table.Cell>
                        <Table.Cell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}</Table.Cell>
                        <Table.Cell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${invoice.status === "pago" ? "bg-success-soft text-success-soft-foreground" : "bg-warning-soft text-warning-soft-foreground"}`}>
                            {invoice.status.toUpperCase()}
                          </span>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
                </Table.Root>
              )}
            </Card.Content>
          </Card>
        </div>

        {/* Ações */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-bold mb-4 text-sm uppercase text-muted tracking-wider">Ações ({sub.gateway})</h3>
            <div className="flex flex-col gap-3">
              {isCanceled ? (
                <Button 
                  variant="primary" 
                  className="w-full justify-start gap-2"
                  isDisabled={isProcessing}
                  onPress={handleReactivateContract}
                >
                  <PlayCircle className="size-4" />
                  Reativar Contrato
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    isDisabled={isProcessing}
                    onPress={handleChangeCard}
                  >
                    <RefreshCw className="size-4" />
                    Solicitar Troca de Cartão
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 text-danger hover:bg-danger/10 hover:text-danger"
                    isDisabled={isProcessing}
                    onPress={handleCancelContract}
                  >
                    <Ban className="size-4" />
                    Cancelar Contrato
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
