"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  Select,
  Switch,
  TextArea,
  TextField,
} from "@heroui/react";
import { toast } from "sonner";
import { Ban, CreditCard, Plus } from "lucide-react";
import type { Plan, Subscription } from "@/lib/data/plans";
import { assignManualSubscription, cancelManualSubscription } from "@/app/actions/admin/subscriptions";
import { type ExpirationOption } from "@/lib/enrollmentUtils";

type SubscriptionCardProps = {
  userId: string;
  userName: string;
  initialSubscription: Subscription | null;
  plans: Plan[];
};

const EXPIRATION_OPTIONS: { id: ExpirationOption; label: string }[] = [
  { id: "indefinite", label: "Indeterminado (sem vencimento)" },
  { id: "30d", label: "30 dias" },
  { id: "90d", label: "90 dias" },
  { id: "180d", label: "180 dias" },
  { id: "365d", label: "365 dias" },
  { id: "custom", label: "Data específica" },
];

const STATUS_OPTIONS: { id: "active" | "trialing"; label: string }[] = [
  { id: "active", label: "Ativo" },
  { id: "trialing", label: "Em teste (trialing)" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  trialing: "Em teste",
  pending: "Pendente",
  past_due: "Pagamento atrasado",
  suspended: "Suspenso",
  canceled: "Cancelado",
  refunded: "Reembolsado",
  chargeback: "Chargeback",
  expired: "Expirado",
};

export function SubscriptionCard({ userId, userName, initialSubscription, plans }: SubscriptionCardProps) {
  const router = useRouter();
  const [subscription, setSubscription] = useState(initialSubscription);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [planId, setPlanId] = useState<string>("");
  const [wasPaid, setWasPaid] = useState(true);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [status, setStatus] = useState<"active" | "trialing">("active");
  const [expirationType, setExpirationType] = useState<ExpirationOption>("indefinite");
  const [customDate, setCustomDate] = useState<string>("");
  const [reason, setReason] = useState("");

  const isActive = !!subscription && (subscription.status === "active" || subscription.status === "trialing");
  const isManual = !subscription?.gateway || subscription.gateway === "manual";

  function openModal() {
    const defaultPlan = plans.find((p) => p.id === subscription?.planId) ?? plans[0];
    setPlanId(defaultPlan?.id ?? "");
    setWasPaid(true);
    setAmountPaid(defaultPlan ? String(defaultPlan.price) : "");
    setStatus("active");
    setExpirationType("indefinite");
    setCustomDate("");
    setReason("");
    setIsModalOpen(true);
  }

  function handlePlanChange(id: string) {
    setPlanId(id);
    const selectedPlan = plans.find((p) => p.id === id);
    if (selectedPlan) setAmountPaid(String(selectedPlan.price));
  }

  function handleSubmit() {
    if (!planId) {
      toast.error("Selecione um plano.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Informe o motivo da atribuição manual.");
      return;
    }
    if (expirationType === "custom" && !customDate) {
      toast.error("Informe a data de vencimento.");
      return;
    }
    const amountNum = wasPaid ? Number(amountPaid.toString().replace(",", ".")) : 0;
    if (wasPaid && (Number.isNaN(amountNum) || amountNum < 0)) {
      toast.error("Informe um valor pago válido.");
      return;
    }

    startTransition(async () => {
      const result = await assignManualSubscription({
        userId,
        planId,
        wasPaid,
        amountPaid: amountNum,
        status,
        expirationType,
        customDate: expirationType === "custom" ? customDate : null,
        reason: reason.trim(),
      });

      if (!result.success || !result.data) {
        toast.error(result.message || "Erro ao atribuir plano.");
        return;
      }

      const selectedPlan = plans.find((p) => p.id === planId);
      setSubscription({
        id: result.data.subscriptionId,
        userId,
        planId,
        planName: selectedPlan?.name,
        status,
        amount: amountNum,
        gateway: "manual",
        currentPeriodEnd: expirationType === "custom" && customDate ? new Date(customDate).toISOString() : undefined,
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString(),
      });
      setIsModalOpen(false);
      toast.success(`Plano atribuído manualmente para ${userName}.`);
      router.refresh();
    });
  }

  function handleCancel() {
    if (!subscription) return;
    if (!confirm(`Cancelar a assinatura manual de ${userName}? O acesso ao plano será revogado.`)) return;

    startTransition(async () => {
      const result = await cancelManualSubscription({ subscriptionId: subscription.id, userId });
      if (!result.success) {
        toast.error(result.message || "Erro ao cancelar assinatura.");
        return;
      }
      setSubscription((prev) => (prev ? { ...prev, status: "canceled" } : prev));
      toast.success("Assinatura cancelada.");
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
              <CreditCard className="size-5" aria-hidden="true" />
            </span>
            <div>
              <Card.Title>Assinatura / Plano</Card.Title>
              <Card.Description>Atribua um plano manualmente quando o pagamento não chegar via webhook.</Card.Description>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isActive && isManual && (
              <Button
                variant="ghost"
                className="text-danger hover:bg-danger/10 hover:text-danger"
                onPress={handleCancel}
                isDisabled={isPending}
              >
                <Ban className="size-4" aria-hidden="true" />
                Cancelar Assinatura Manual
              </Button>
            )}
            <Button variant="primary" onPress={openModal} isDisabled={plans.length === 0}>
              <Plus className="size-4" aria-hidden="true" />
              {isActive ? "Alterar Plano" : "Atribuir Plano Manualmente"}
            </Button>
          </div>
        </Card.Header>

        <Card.Content>
          {subscription ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-background-secondary p-4">
                <p className="text-xs font-semibold text-muted">Plano</p>
                <p className="mt-1 text-lg font-bold text-foreground">{subscription.planName || "-"}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {formatCurrency(subscription.amount)} · {subscription.gateway || "Manual"}
                </p>
              </div>
              <div className="rounded-xl bg-background-secondary p-4">
                <p className="text-xs font-semibold text-muted">Status</p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {STATUS_LABELS[subscription.status] || subscription.status}
                </p>
              </div>
              <div className="rounded-xl bg-background-secondary p-4">
                <p className="text-xs font-semibold text-muted">Vencimento</p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "Sem vencimento"}
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-background-secondary p-4 text-sm text-muted">
              Nenhuma assinatura registrada para este usuário.
            </p>
          )}
        </Card.Content>
      </Card>

      <Modal.Root isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg" scroll="inside">
            <Modal.Dialog className="max-w-2xl sm:w-[42rem]">
              <Modal.Header>
                <div className="flex items-center gap-3">
                  <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
                    <CreditCard className="size-5" aria-hidden="true" />
                  </Modal.Icon>
                  <div>
                    <Modal.Heading>Atribuir Plano Manualmente</Modal.Heading>
                    <p className="text-xs text-muted">
                      Use quando o pagamento de <strong>{userName}</strong> não chegou via webhook da Hotmart/Eduzz.
                    </p>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="space-y-5 py-4">
                <Select selectedKey={planId} onSelectionChange={(k) => handlePlanChange(String(k))} isDisabled={isPending}>
                  <Label>Plano</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {plans.map((plan) => (
                        <ListBoxItem key={plan.id} id={plan.id}>
                          {plan.name} — {formatCurrency(plan.price)}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Switch
                  isSelected={wasPaid}
                  onChange={setWasPaid}
                  isDisabled={isPending}
                  className="w-full items-center justify-between gap-4"
                >
                  <Switch.Content className="flex-1 text-left">
                    <span className="block text-sm font-semibold text-foreground">Aluno pagou por este plano</span>
                    <span className="mt-0.5 block text-xs font-normal text-muted">
                      Desligue para conceder cortesia (valor zerado).
                    </span>
                  </Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>

                {wasPaid && (
                  <TextField value={amountPaid} onChange={setAmountPaid} isDisabled={isPending} isRequired>
                    <Label>Valor pago (R$)</Label>
                    <Input type="number" step="0.01" min="0" />
                  </TextField>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    selectedKey={status}
                    onSelectionChange={(k) => setStatus(String(k) as "active" | "trialing")}
                    isDisabled={isPending}
                  >
                    <Label>Status</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {STATUS_OPTIONS.map((opt) => (
                          <ListBoxItem key={opt.id} id={opt.id}>
                            {opt.label}
                          </ListBoxItem>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>

                  <Select
                    selectedKey={expirationType}
                    onSelectionChange={(k) => setExpirationType(String(k) as ExpirationOption)}
                    isDisabled={isPending}
                  >
                    <Label>Vigência</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {EXPIRATION_OPTIONS.map((opt) => (
                          <ListBoxItem key={opt.id} id={opt.id}>
                            {opt.label}
                          </ListBoxItem>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                {expirationType === "custom" && (
                  <div>
                    <Label htmlFor="subscriptionCustomDate" className="text-xs text-foreground mb-1 block">
                      Data de vencimento
                    </Label>
                    <Input
                      id="subscriptionCustomDate"
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full sm:w-64"
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}

                <TextField value={reason} onChange={setReason} isDisabled={isPending} isRequired>
                  <Label>Motivo</Label>
                  <TextArea rows={3} placeholder='Ex.: "Hotmart não confirmou o pagamento via webhook, comprovante em anexo."' />
                </TextField>
              </Modal.Body>

              <Modal.Footer className="justify-between">
                <Button variant="tertiary" onPress={() => setIsModalOpen(false)} isDisabled={isPending}>
                  Cancelar
                </Button>
                <Button variant="primary" onPress={handleSubmit} isDisabled={isPending || plans.length === 0}>
                  <Plus className="size-4" aria-hidden="true" />
                  {isPending ? "Salvando..." : "Confirmar Atribuição"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </>
  );
}
