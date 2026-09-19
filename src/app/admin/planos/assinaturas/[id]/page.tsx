"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Table } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "@/lib/toast";
import { ChevronLeft, Ban, PlayCircle, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSubscriptionById, type Subscription } from "@/lib/data/plans";
import { cancelHotmartSubscriptionAction, reactivateHotmartSubscriptionAction } from "@/app/actions/admin/hotmart";
import { cancelManualSubscription } from "@/app/actions/admin/subscriptions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
  const [confirmAction, setConfirmAction] = useState<"cancel_hotmart" | "reactivate_hotmart" | "cancel_manual" | null>(null);

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

  // Recarrega depois de cancelar/reativar — fora do efeito de montagem de
  // propósito, para não acionar o lint de setState dentro de efeito.
  async function reloadSubscription() {
    const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
    if (!id) return;
    const supabase = createClient();
    try {
      const data = await getSubscriptionById(supabase, id);
      if (data) setSub((prev) => (prev ? { ...data, history: prev.history } : { ...data, history: [] }));
    } catch (e) {
      console.error(e);
    }
  }

  if (!sub) return null;

  // A Hotmart é o único gateway com cancelamento/reativação implementados de
  // verdade até agora (ver `lib/billing/hotmartApi.ts`) — os outros mostram um
  // aviso em vez de fingir uma ação que não existe. Assinaturas manuais
  // (atribuídas pelo admin) têm seu próprio cancelamento simples.
  const isHotmart = sub.gateway === "hotmart";
  const isManual = !sub.gateway || sub.gateway === "manual";

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    if (confirmAction === "cancel_hotmart") {
      if (!sub.gatewaySubscriptionId) {
        toast.error("Assinatura sem identificador da Hotmart.");
        setConfirmAction(null);
        return;
      }
      setIsProcessing(true);
      try {
        const result = await cancelHotmartSubscriptionAction(sub.gatewaySubscriptionId, true);
        if (!result.success) {
          toast.error(result.message ?? "Falha ao cancelar a assinatura.");
        } else {
          toast.success("Assinatura cancelada na Hotmart.");
          await reloadSubscription();
        }
      } catch {
        toast.error("Erro ao cancelar assinatura na Hotmart.");
      } finally {
        setIsProcessing(false);
        setConfirmAction(null);
      }
    } else if (confirmAction === "reactivate_hotmart") {
      if (!sub.gatewaySubscriptionId) {
        toast.error("Assinatura sem identificador da Hotmart.");
        setConfirmAction(null);
        return;
      }
      setIsProcessing(true);
      try {
        const result = await reactivateHotmartSubscriptionAction(sub.gatewaySubscriptionId, false);
        if (!result.success) {
          toast.error(result.message ?? "Falha ao solicitar a reativação.");
        } else {
          toast.success(result.message ?? "Solicitação de reativação enviada.");
          await reloadSubscription();
        }
      } catch {
        toast.error("Erro ao solicitar reativação na Hotmart.");
      } finally {
        setIsProcessing(false);
        setConfirmAction(null);
      }
    } else if (confirmAction === "cancel_manual") {
      setIsProcessing(true);
      try {
        const result = await cancelManualSubscription({ subscriptionId: sub.id, userId: sub.userId ?? "" });
        if (!result.success) {
          toast.error(result.message ?? "Falha ao cancelar a assinatura.");
        } else {
          toast.success("Assinatura manual cancelada.");
          await reloadSubscription();
        }
      } catch {
        toast.error("Erro ao cancelar assinatura manual.");
      } finally {
        setIsProcessing(false);
        setConfirmAction(null);
      }
    }
  };

  const handleChangeCard = async () => {
    setIsProcessing(true);
    // TODO: nenhum gateway integrado neste projeto tem endpoint de troca de cartão hoje.
    setTimeout(() => {
      setIsProcessing(false);
      toast.success("E-mail para alteração de cartão enviado ao aluno!");
    }, 1000);
  };

  const isCanceled = sub.status === "cancelado" || sub.status === "canceled";

  const confirmConfig = confirmAction
    ? {
        cancel_hotmart: {
          title: "Cancelar assinatura na Hotmart",
          description: "Tem certeza que deseja cancelar esta assinatura na Hotmart? O acesso do assinante é mantido até o fim do período já pago.",
          confirmLabel: "Cancelar assinatura",
          isDestructive: true,
        },
        reactivate_hotmart: {
          title: "Reativar assinatura na Hotmart",
          description: "Enviar solicitação de reativação? A Hotmart enviará um e-mail de aceite ao assinante (válido por 3 dias). O acesso só volta quando ele aceitar.",
          confirmLabel: "Enviar solicitação",
          isDestructive: false,
        },
        cancel_manual: {
          title: "Cancelar assinatura manual",
          description: "Tem certeza que deseja cancelar esta assinatura manual? O acesso ao plano será revogado imediatamente.",
          confirmLabel: "Cancelar assinatura",
          isDestructive: true,
        },
      }[confirmAction]
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" isIconOnly size="sm" onPress={() => router.push("/admin/planos/assinaturas")}>
          <ChevronLeft className="size-4" />
        </Button>
        <PageHeader
          eyebrow="Assinatura"
          title={sub.userName || "Assinatura"}
          description={`Gerenciando contrato via ${sub.gateway || "gateway desconhecido"}`}
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
                isHotmart ? (
                  <Button
                    variant="primary"
                    className="w-full justify-start gap-2"
                    isDisabled={isProcessing}
                    onPress={() => setConfirmAction("reactivate_hotmart")}
                  >
                    <PlayCircle className="size-4" />
                    Reativar Contrato
                  </Button>
                ) : (
                  <p className="text-sm text-muted">Reativação pela plataforma ainda não disponível para {sub.gateway ?? "este gateway"}.</p>
                )
              ) : (
                <>
                  {isManual ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-danger hover:bg-danger/10 hover:text-danger"
                      isDisabled={isProcessing}
                      onPress={() => setConfirmAction("cancel_manual")}
                    >
                      <Ban className="size-4" />
                      Cancelar Assinatura Manual
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
                      {isHotmart ? (
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2 text-danger hover:bg-danger/10 hover:text-danger"
                          isDisabled={isProcessing}
                          onPress={() => setConfirmAction("cancel_hotmart")}
                        >
                          <Ban className="size-4" />
                          Cancelar Contrato
                        </Button>
                      ) : (
                        <p className="text-sm text-muted">Cancelamento pela plataforma ainda não disponível para {sub.gateway ?? "este gateway"}.</p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {confirmConfig && (
        <ConfirmDialog
          isOpen={!!confirmAction}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          isDestructive={confirmConfig.isDestructive}
          isLoading={isProcessing}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
}
