"use client";

import React, { useState } from "react";
import {
  Button,
  Modal,
  TextArea,
  TextField,
  Label,
} from "@heroui/react";
import { Check, ShieldCheck, Zap } from "lucide-react";
import { Company } from "@/types/business";
import { saveCompany } from "@/app/actions/admin/platform";
import { toast } from "sonner";

interface SeatsUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  onSuccess: () => void;
}

const SEAT_PACKS = [
  { extra: 10, label: "+10 Vagas", discount: "Popular", perSeatMonth: 79 },
  { extra: 25, label: "+25 Vagas", discount: "15% OFF", perSeatMonth: 69 },
  { extra: 50, label: "+50 Vagas", discount: "25% OFF", perSeatMonth: 59 },
  { extra: 100, label: "+100 Vagas", discount: "35% OFF", perSeatMonth: 49 },
];

export function SeatsUpgradeModal({
  isOpen,
  onClose,
  company,
  onSuccess,
}: SeatsUpgradeModalProps) {
  const [selectedPack, setSelectedPack] = useState(SEAT_PACKS[0]);
  const [customSeats, setCustomSeats] = useState<number>(10);
  const [isCustom, setIsCustom] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const extraSeats = isCustom ? customSeats : selectedPack.extra;
  const currentTotal = company.seatsTotal;
  const newTotal = currentTotal + (extraSeats || 0);

  const handleInstantApply = async () => {
    setIsSubmitting(true);
    // Atualiza a empresa no armazenamento com o novo total de vagas
    const res = await saveCompany({
      id: company.id,
      seatsTotal: newTotal,
      contractValue: company.contractValue + (extraSeats * 69),
    });

    setIsSubmitting(false);
    
    if (res.success) {
      toast.success(
        `Expansão aprovada! Seu limite foi atualizado para ${newTotal} vagas corporativas.`,
        { duration: 5000 }
      );
      onSuccess();
      onClose();
    } else {
      toast.error(res.message || "Erro ao expandir vagas.");
    }
  };

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.Header>
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                  <Zap className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <Modal.Heading>Expandir Vagas Corporativas</Modal.Heading>
                  <p className="text-xs text-muted">
                    Adicione mais licenças para seus colaboradores sem perder o histórico.
                  </p>
                </div>
              </div>
            </Modal.Header>

            <Modal.Body className="space-y-5">
              {/* Status Atual */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary/40 p-3.5 text-xs">
                <div>
                  <p className="text-muted font-medium">Capacidade Atual</p>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    {company.seatsUsed} / {company.seatsTotal} vagas utilizadas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted font-medium">Nova Capacidade Estimada</p>
                  <p className="text-base font-bold text-accent mt-0.5">
                    {newTotal} vagas (+{extraSeats})
                  </p>
                </div>
              </div>

              {/* Pacotes de Expansão */}
              <div>
                <Label className="block text-xs font-semibold text-foreground mb-2">
                  Escolha um Pacote de Vagas
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SEAT_PACKS.map((pack) => {
                    const isSelected = !isCustom && selectedPack.extra === pack.extra;
                    return (
                      <button
                        key={pack.extra}
                        type="button"
                        onClick={() => {
                          setSelectedPack(pack);
                          setIsCustom(false);
                        }}
                        className={`relative p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-accent bg-accent-soft text-accent-soft-foreground ring-2 ring-accent"
                            : "border-border bg-surface hover:bg-surface-secondary text-foreground"
                        }`}
                      >
                        {pack.discount && (
                          <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-accent text-accent-foreground">
                            {pack.discount}
                          </span>
                        )}
                        <p className="font-bold text-sm">{pack.label}</p>
                        <p className="text-[11px] text-muted mt-1">
                          R$ {pack.perSeatMonth}/vaga/mês
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opção Customizada */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustom(!isCustom)}
                  className="text-xs text-accent font-semibold hover:underline flex items-center gap-1"
                >
                  {isCustom ? "← Voltar aos pacotes pré-definidos" : "Precisa de uma quantidade personalizada?"}
                </button>
              </div>

              {isCustom && (
                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/40 space-y-2">
                  <TextField
                    value={String(customSeats)}
                    onChange={(val) => setCustomSeats(Math.max(1, Number(val) || 1))}
                  >
                    <Label className="text-xs">Número Exato de Vagas Adicionais</Label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={customSeats}
                      onChange={(e) => setCustomSeats(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </TextField>
                </div>
              )}

              {/* Mensagem Opcional */}
              <TextField value={notes} onChange={setNotes}>
                <Label className="text-xs">Observações ou Centro de Custo (Opcional)</Label>
                <TextArea
                  rows={2}
                  placeholder="Ex: Faturar via boleto 30 dias para o CNPJ matriz..."
                  className="text-xs"
                />
              </TextField>

              {/* Garantias */}
              <div className="flex items-center gap-4 text-[11px] text-muted bg-surface-secondary/20 p-2.5 rounded-lg border border-border">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-success" /> Ativação imediata
                </span>
                <span className="flex items-center gap-1">
                  <Check className="size-3.5 text-accent" /> Faturamento pró-rata
                </span>
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button type="button" variant="tertiary" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onPress={handleInstantApply}
                isDisabled={extraSeats <= 0 || isSubmitting}
              >
                <Zap className="size-4 mr-1.5" />
                Confirmar Expansão (+{extraSeats} vagas)
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
