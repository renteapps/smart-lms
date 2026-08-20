"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Plus, Sparkles, Zap } from "lucide-react";
import { Button, Card, Label, Modal, NumberField } from "@heroui/react";
import { toast } from "sonner";
import {
  formatAiCreditRenewal,
  type AiCreditBalance,
} from "@/lib/aiCredits";
import { addAiCreditsToUser } from "./actions";

type AiCreditAdminCardProps = {
  userId: string;
  userName: string;
  initialBalance: AiCreditBalance | null;
};

export function AiCreditAdminCard({ userId, userName, initialBalance }: AiCreditAdminCardProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [amount, setAmount] = useState(25);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAddCredits = () => {
    startTransition(async () => {
      const result = await addAiCreditsToUser(userId, amount);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setBalance(result.balance);
      setIsModalOpen(false);
      toast.success(`${amount} créditos de IA adicionados para ${userName}.`);
    });
  };

  return (
    <>
      <Card>
        <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div>
              <Card.Title>Créditos de IA</Card.Title>
              <Card.Description>Consulte a franquia e conceda créditos extras sem vencimento.</Card.Description>
            </div>
          </div>
          <Button variant="primary" onPress={() => setIsModalOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Adicionar créditos
          </Button>
        </Card.Header>

        <Card.Content>
          {balance ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl bg-background-secondary p-4">
                <p className="text-xs font-semibold text-muted">Disponíveis agora</p>
                <p className="mt-1 text-2xl font-bold text-foreground" data-numeric>{balance.availableCredits}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(balance.availableCredits * balance.creditValueBrl)} nominais
                </p>
              </div>
              <div className="rounded-xl bg-background-secondary p-4">
                <p className="text-xs font-semibold text-muted">Franquia diária</p>
                <p className="mt-1 text-xl font-bold text-foreground" data-numeric>
                  {balance.dailyRemaining} <span className="text-sm font-medium text-muted">de {balance.dailyLimit}</span>
                </p>
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
                  <CalendarClock className="size-3" aria-hidden="true" />
                  {formatAiCreditRenewal(balance.dailyRenewsAt)}
                </p>
              </div>
              <div className="rounded-xl bg-background-secondary p-4">
                <p className="text-xs font-semibold text-muted">Franquia semanal</p>
                <p className="mt-1 text-xl font-bold text-foreground" data-numeric>
                  {balance.weeklyRemaining} <span className="text-sm font-medium text-muted">de {balance.weeklyLimit}</span>
                </p>
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
                  <CalendarClock className="size-3" aria-hidden="true" />
                  {formatAiCreditRenewal(balance.weeklyRenewsAt)}
                </p>
              </div>
              <div className="rounded-xl bg-background-secondary p-4">
                <p className="text-xs font-semibold text-muted">Franquia mensal</p>
                <p className="mt-1 text-xl font-bold text-foreground" data-numeric>
                  {balance.monthlyRemaining} <span className="text-sm font-medium text-muted">de {balance.monthlyLimit}</span>
                </p>
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
                  <CalendarClock className="size-3" aria-hidden="true" />
                  {formatAiCreditRenewal(balance.monthlyRenewsAt)}
                </p>
              </div>
              <div className="rounded-xl border border-accent/20 bg-accent-soft p-4">
                <p className="text-xs font-semibold text-accent-soft-foreground">Créditos extras</p>
                <p className="mt-1 text-2xl font-bold text-accent-soft-foreground" data-numeric>
                  +{balance.additionalCredits}
                </p>
                <p className="mt-1.5 text-[11px] text-accent-soft-foreground/80">Não expiram nas renovações.</p>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-background-secondary p-4 text-sm text-muted">
              Não foi possível carregar o saldo de créditos deste usuário.
            </p>
          )}
        </Card.Content>
      </Card>

      <Modal.Root isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <div className="flex items-center gap-3">
                  <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
                    <Zap className="size-5" aria-hidden="true" />
                  </Modal.Icon>
                  <div>
                    <Modal.Heading>Adicionar créditos de IA</Modal.Heading>
                    <p className="text-xs text-muted">O saldo extra de {userName} não terá vencimento.</p>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="space-y-4">
                <NumberField
                  value={amount}
                  onChange={(value) => setAmount(Number.isNaN(value) ? 1 : value)}
                  minValue={1}
                  maxValue={10000}
                  isDisabled={isPending}
                >
                  <Label>Quantidade de créditos</Label>
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                </NumberField>

                <div className="rounded-xl bg-background-secondary p-3 text-xs text-muted">
                  Novo saldo extra estimado:{" "}
                  <strong className="font-semibold text-foreground" data-numeric>
                    {(balance?.additionalCredits ?? 0) + amount} créditos
                  </strong>
                </div>
              </Modal.Body>

              <Modal.Footer className="justify-between">
                <Button variant="tertiary" onPress={() => setIsModalOpen(false)} isDisabled={isPending}>
                  Cancelar
                </Button>
                <Button variant="primary" onPress={handleAddCredits} isDisabled={isPending || amount < 1 || amount > 10000}>
                  <Plus className="size-4" aria-hidden="true" />
                  {isPending ? "Adicionando..." : `Adicionar ${amount}`}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </>
  );
}
