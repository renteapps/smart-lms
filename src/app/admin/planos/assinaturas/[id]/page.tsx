"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Table } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "sonner";
import { ChevronLeft, Ban, PlayCircle, RefreshCw } from "lucide-react";

interface SubscriptionDetail {
  id: string;
  studentName: string;
  studentEmail: string;
  planName: string;
  status: "ativo" | "atrasado" | "cancelado";
  gateway: string;
  contractId: string;
  createdAt: string;
  nextDue: string;
  history: {
    id: string;
    date: string;
    amount: number;
    status: "pago" | "pendente" | "falhou";
  }[];
}

const mockDetail: SubscriptionDetail = {
  id: "sub_1",
  studentName: "Ana Clara Silva",
  studentEmail: "ana@email.com",
  planName: "Plano Pro",
  status: "ativo",
  gateway: "Eduzz",
  contractId: "CTR-987654321",
  createdAt: "15/01/2026",
  nextDue: "15/09/2026",
  history: [
    { id: "inv_3", date: "15/08/2026", amount: 59.90, status: "pago" },
    { id: "inv_2", date: "15/07/2026", amount: 59.90, status: "pago" },
    { id: "inv_1", date: "15/06/2026", amount: 59.90, status: "pago" },
  ],
};

export default function AssinaturaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const [sub, setSub] = useState<SubscriptionDetail | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Simulando fetch API
    setSub(mockDetail);
  }, [params.id]);

  if (!sub) return null;

  // ==== API Mocks (Simulando integrações com Eduzz) ====
  
  const handleCancelContract = async () => {
    if (!confirm("Tem certeza que deseja cancelar essa assinatura na Eduzz?")) return;
    
    setIsProcessing(true);
    // TODO: fetch('/api/eduzz/cancel-contract', { method: 'POST', body: JSON.stringify({ contractId: sub.contractId }) })
    setTimeout(() => {
      setSub({ ...sub, status: "cancelado" });
      setIsProcessing(false);
      toast.success("Contrato cancelado com sucesso na Eduzz!");
    }, 1000);
  };

  const handleReactivateContract = async () => {
    setIsProcessing(true);
    // TODO: fetch('/api/eduzz/reactivate-contract', { method: 'POST', body: JSON.stringify({ contractId: sub.contractId }) })
    setTimeout(() => {
      setSub({ ...sub, status: "ativo" });
      setIsProcessing(false);
      toast.success("Contrato reativado com sucesso na Eduzz!");
    }, 1000);
  };

  const handleChangeCard = async () => {
    setIsProcessing(true);
    // TODO: fetch('/api/eduzz/request-card-change', { method: 'POST', body: JSON.stringify({ contractId: sub.contractId }) })
    setTimeout(() => {
      setIsProcessing(false);
      toast.success("E-mail para alteração de cartão enviado ao aluno!");
    }, 1000);
  };

  // =====================================================

  const isCanceled = sub.status === "cancelado";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" isIconOnly size="sm" onPress={() => router.push("/admin/planos/assinaturas")}>
          <ChevronLeft className="size-4" />
        </Button>
        <PageHeader
          eyebrow="Assinatura"
          title={sub.studentName}
          description={`Gerenciando contrato via ${sub.gateway}`}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Painel Principal */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">Detalhes do Contrato</h2>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <p className="text-muted mb-1">E-mail</p>
                <p className="font-semibold">{sub.studentEmail}</p>
              </div>
              <div>
                <p className="text-muted mb-1">Plano Assinado</p>
                <p className="font-semibold">{sub.planName}</p>
              </div>
              <div>
                <p className="text-muted mb-1">ID do Contrato ({sub.gateway})</p>
                <p className="font-mono text-xs">{sub.contractId}</p>
              </div>
              <div>
                <p className="text-muted mb-1">Status Atual</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${sub.status === "ativo" ? "bg-success-soft text-success-soft-foreground" : sub.status === "cancelado" ? "bg-danger-soft text-danger-soft-foreground" : "bg-warning-soft text-warning-soft-foreground"}`}>
                  {sub.status.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-muted mb-1">Criado em</p>
                <p className="font-semibold">{sub.createdAt}</p>
              </div>
              <div>
                <p className="text-muted mb-1">Próximo Vencimento</p>
                <p className="font-semibold">{isCanceled ? "-" : sub.nextDue}</p>
              </div>
            </div>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Histórico de Faturas</Card.Title>
            </Card.Header>
            <Card.Content className="px-0 pb-0">
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
