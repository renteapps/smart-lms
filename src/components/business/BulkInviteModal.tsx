"use client";

import React, { useState } from "react";
import {
  Button,
  Chip,
  Modal,
  TextArea,
  TextField,
  Label,
} from "@heroui/react";
import { Users, Upload, CheckCircle2, AlertTriangle, XCircle, Sparkles } from "lucide-react";
import { Company } from "@/types/business";
import { bulkInviteMembers, getAvailableSeats } from "@/lib/businessStorage";
import { toast } from "sonner";

interface BulkInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  onSuccess: () => void;
}

interface ParsedItem {
  raw: string;
  name: string;
  email: string;
  department: string;
  jobTitle: string;
  isValid: boolean;
  error?: string;
}

const EXAMPLE_PASTE = `Ana Paula Souza, ana.souza@empresa.com, Engenharia, Dev Pleno
Carlos Eduardo, carlos.eduardo@empresa.com, Comercial, Executivo de Vendas
Fernanda Lima, fernanda.lima@empresa.com, RH, Analista de T&D
Rodrigo Martins, rodrigo.martins@empresa.com, Produto, Product Manager`;

export function BulkInviteModal({
  isOpen,
  onClose,
  company,
  onSuccess,
}: BulkInviteModalProps) {
  const [rawText, setRawText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableSeats = getAvailableSeats(company.id);

  // Parser em tempo real
  const parseLines = (text: string): ParsedItem[] => {
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    return lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      // Casos:
      // 1. "Nome, email, dept, cargo"
      // 2. "Nome, email, dept"
      // 3. "Nome, email"
      // 4. "email"
      let name = "";
      let email = "";
      let department = "Geral";
      let jobTitle = "";

      if (parts.length === 1) {
        if (parts[0].includes("@")) {
          email = parts[0];
          name = email.split("@")[0];
        } else {
          return { raw: line, name: "", email: "", department: "", jobTitle: "", isValid: false, error: "Formato não reconhecido" };
        }
      } else if (parts.length === 2) {
        name = parts[0];
        email = parts[1];
      } else if (parts.length === 3) {
        name = parts[0];
        email = parts[1];
        department = parts[2];
      } else {
        name = parts[0];
        email = parts[1];
        department = parts[2];
        jobTitle = parts.slice(3).join(", ");
      }

      const isValidEmail = Boolean(email && email.includes("@") && email.includes("."));
      return {
        raw: line,
        name: name || email.split("@")[0],
        email,
        department: department || "Geral",
        jobTitle,
        isValid: isValidEmail,
        error: isValidEmail ? undefined : "E-mail inválido",
      };
    });
  };

  const parsedItems = parseLines(rawText);
  const validItems = parsedItems.filter((i) => i.isValid);
  const invalidItems = parsedItems.filter((i) => !i.isValid);
  const willExceedSeats = validItems.length > availableSeats;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = () => {
    if (validItems.length === 0) {
      toast.error("Nenhum registro válido para importar.");
      return;
    }

    if (availableSeats <= 0) {
      toast.error("Não há vagas disponíveis no plano.");
      return;
    }

    setIsSubmitting(true);
    const res = bulkInviteMembers(
      company.id,
      validItems.map((i) => ({
        name: i.name,
        email: i.email,
        department: i.department,
        jobTitle: i.jobTitle,
      }))
    );

    setIsSubmitting(false);

    if (res.success) {
      toast.success(`${res.addedCount} colaborador(es) importado(s) com sucesso!`);
      if (res.errors.length > 0) {
        toast.warning(`${res.errors.length} aviso(s): ${res.errors[0]}`);
      }
      setRawText("");
      onSuccess();
      onClose();
    } else {
      toast.error(res.errors[0] || "Erro ao processar convites em massa.");
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
                  <Users className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <Modal.Heading>Importar Colaboradores em Massa</Modal.Heading>
                  <p className="text-xs text-muted">
                    Cole uma lista de colaboradores ou carregue um arquivo CSV para disparar convites em lote.
                  </p>
                </div>
              </div>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              {/* Informações de Vagas */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary/50 p-3 text-xs">
                <span className="text-muted">
                  Vagas disponíveis na <strong className="text-foreground">{company.tradeName}</strong>:
                </span>
                <span className={`font-semibold px-2 py-0.5 rounded-md ${
                  availableSeats > 0 ? "bg-success-soft text-success-soft-foreground" : "bg-danger-soft text-danger"
                }`}>
                  {availableSeats} vagas livres
                </span>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-secondary transition-colors">
                  <Upload className="size-3.5 text-accent" />
                  Carregar arquivo .CSV
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>

                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={() => setRawText(EXAMPLE_PASTE)}
                  className="text-xs"
                >
                  <Sparkles className="size-3 text-warning mr-1" />
                  Carregar exemplo
                </Button>
              </div>

              {/* Textarea de Entrada */}
              <TextField value={rawText} onChange={setRawText}>
                <Label className="text-xs">
                  Cole abaixo os dados no formato: <code className="bg-surface-secondary px-1 py-0.5 rounded text-[11px]">Nome, e-mail, departamento, cargo</code> (um por linha)
                </Label>
                <TextArea
                  rows={5}
                  placeholder={`Mariana Costa, mariana@${company.domain || "empresa.com"}, Tecnologia, Tech Lead\nJoão Pedro, joao@${company.domain || "empresa.com"}, Vendas, Consultor`}
                  className="font-mono text-xs"
                />
              </TextField>

              {/* Pré-visualização da Importação */}
              {parsedItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Pré-visualização ({validItems.length} válidos, {invalidItems.length} inválidos)
                    </span>
                    {willExceedSeats && (
                      <span className="flex items-center gap-1 font-semibold text-warning">
                        <AlertTriangle className="size-3.5" />
                        Excede as {availableSeats} vagas livres (apenas os primeiros {availableSeats} serão adicionados)
                      </span>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-surface divide-y divide-separator text-xs">
                    {parsedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2.5 ${
                          !item.isValid ? "bg-danger/5" : idx < availableSeats ? "" : "opacity-60 bg-surface-secondary/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-3">
                          {item.isValid ? (
                            <CheckCircle2 className="size-4 shrink-0 text-success" />
                          ) : (
                            <XCircle className="size-4 shrink-0 text-danger" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {item.name} <span className="font-normal text-muted">({item.email})</span>
                            </p>
                            <p className="text-[11px] text-muted truncate">
                              {item.department} {item.jobTitle ? `· ${item.jobTitle}` : ""}
                            </p>
                          </div>
                        </div>

                        <div>
                          {item.isValid ? (
                            idx < availableSeats ? (
                              <Chip variant="soft" color="success" size="sm">Pronto</Chip>
                            ) : (
                              <Chip variant="soft" color="warning" size="sm">Sem vaga</Chip>
                            )
                          ) : (
                            <Chip variant="soft" color="danger" size="sm">{item.error}</Chip>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button type="button" variant="tertiary" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onPress={handleSubmit}
                isDisabled={validItems.length === 0 || availableSeats <= 0 || isSubmitting}
              >
                <Users className="size-4 mr-1.5" />
                Importar {Math.min(validItems.length, availableSeats)} Colaborador(es)
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
