"use client";

import { useState, useEffect } from "react";
import { Button, Card, Label, SearchField, Table, Tabs } from "@heroui/react";
import { AdminEmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui/editorial";
import { toast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  AlertTriangle,
  FileText,
  FlaskConical,
  Send,
  Trash2,
  X,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import { EmailLog } from "@/types/resend";
import { getEmailLogs, clearEmailLogs } from "@/lib/resendService";

export default function ResendLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "simulated" | "failed">("all");
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadLogs() {
      try {
        const res = await fetch("/api/admin/integracoes/resend");
        const data = await res.json();
        if (isMounted && data.success && data.logs) {
          setLogs(data.logs);
        } else if (isMounted) {
          setLogs(getEmailLogs());
        }
      } catch {
        if (isMounted) {
          setLogs(getEmailLogs());
        }
      }
    }

    loadLogs();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleConfirmClearLogs = async () => {
    setIsClearing(true);
    try {
      await fetch("/api/admin/integracoes/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_logs" }),
      });
      clearEmailLogs();
      setLogs([]);
      setSelectedLog(null);
      toast.success("Histórico de envios limpo com sucesso.");
    } catch {
      clearEmailLogs();
      setLogs([]);
      toast.success("Histórico limpo.");
    } finally {
      setIsClearing(false);
      setIsClearConfirmOpen(false);
    }
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success("Copiado!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.resendId && log.resendId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.template.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;
    return log.status === statusFilter;
  });

  const totalSent = logs.filter((l) => l.status === "sent").length;
  const totalSimulated = logs.filter((l) => l.status === "simulated").length;
  const totalFailed = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="space-y-7">
      <PageHeader
        back={{ href: "/admin/integracoes/resend", label: "Voltar para Resend" }}
        eyebrow="Resend · Auditoria"
        title="Histórico e logs de envios"
        description="Acompanhe em tempo real todos os e-mails transacionais e comunicados disparados via Resend."
        actions={
          logs.length > 0 ? (
            <Button variant="outline" className="gap-2" onPress={() => setIsClearConfirmOpen(true)}>
              <Trash2 className="size-4" aria-hidden="true" />
              Limpar histórico
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total registrado" value={String(logs.length)} helper="Disparos no sistema" icon={Mail} />
        <StatCard label="Enviados reais (live)" value={String(totalSent)} helper="Via API Resend" icon={Send} tone="sage" />
        <StatCard label="Modo sandbox" value={String(totalSimulated)} helper="Ambiente de teste" icon={FlaskConical} tone="terracotta" />
        <StatCard label="Falhas e erros" value={String(totalFailed)} helper="Rejeições ou timeout" icon={AlertTriangle} tone="neutral" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs.Root selectedKey={statusFilter} onSelectionChange={(key) => setStatusFilter(String(key) as typeof statusFilter)}>
          <Tabs.List aria-label="Filtrar por status de envio" className="overflow-x-auto">
            <Tabs.Tab id="all">Todos ({logs.length})</Tabs.Tab>
            <Tabs.Tab id="sent">Enviados ({totalSent})</Tabs.Tab>
            <Tabs.Tab id="simulated">Simulados ({totalSimulated})</Tabs.Tab>
            <Tabs.Tab id="failed">Falhas ({totalFailed})</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>

        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          aria-label="Buscar nos logs"
          className="w-full sm:w-80"
        >
          <Label className="sr-only">Buscar nos logs</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Buscar por e-mail, assunto ou ID..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Table of Logs */}
      <Card>
        <Card.Content className="p-0">
        {filteredLogs.length === 0 ? (
          <AdminEmptyState
            icon={Mail}
            title="Nenhum registro encontrado"
            description="Os e-mails disparados pela plataforma, automações e testes aparecerão aqui em tempo real."
          />
        ) : (
          <Table.Root>
            <Table.ScrollContainer>
              <Table.Content aria-label="Histórico de e-mails enviados" onRowAction={(key) => {
                const log = filteredLogs.find((item) => item.id === key);
                if (log) setSelectedLog(log);
              }}>
                <Table.Header>
                  <Table.Column isRowHeader>Status</Table.Column>
                  <Table.Column>Destinatário</Table.Column>
                  <Table.Column>Assunto</Table.Column>
                  <Table.Column>Modelo</Table.Column>
                  <Table.Column>ID Resend</Table.Column>
                  <Table.Column className="text-right">Data e hora</Table.Column>
                </Table.Header>
                <Table.Body>
                  {filteredLogs.map((log) => (
                    <Table.Row key={log.id} id={log.id} className="cursor-pointer">
                      <Table.Cell>
                        <StatusBadge tone={log.status === "sent" ? "positive" : log.status === "simulated" ? "warning" : "negative"}>
                          {log.status === "sent" ? "Enviado" : log.status === "simulated" ? "Simulado" : "Falhou"}
                        </StatusBadge>
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">{log.to}</Table.Cell>
                      <Table.Cell className="max-w-[240px] text-foreground">
                        <span className="block truncate" title={log.subject}>
                          {log.subject}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="font-mono text-2xs uppercase text-muted">{log.template}</Table.Cell>
                      <Table.Cell className="max-w-[140px] truncate font-mono text-2xs text-muted">
                        {log.resendId || "—"}
                      </Table.Cell>
                      <Table.Cell className="text-right font-mono text-2xs text-muted">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table.Root>
        )}
        </Card.Content>
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary-soft text-accent grid place-items-center">
                  <FileText className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Detalhes do Disparo</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-background-secondary border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted font-medium">Status da Entrega:</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-bold ${
                      selectedLog.status === "sent"
                        ? "bg-success-soft text-success"
                        : selectedLog.status === "simulated"
                        ? "bg-warning-soft text-warning"
                        : "bg-danger-soft text-danger"
                    }`}
                  >
                    {selectedLog.status === "sent" && "Enviado via Resend"}
                    {selectedLog.status === "simulated" && "Simulado no Sandbox"}
                    {selectedLog.status === "failed" && "Falhou"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted font-medium">Destinatário:</span>
                  <strong className="text-foreground">{selectedLog.to}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted font-medium">Modelo Utilizado:</span>
                  <span className="font-mono text-foreground uppercase font-bold">{selectedLog.template}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted font-medium">Data e Hora:</span>
                  <span className="font-mono text-foreground">{new Date(selectedLog.createdAt).toLocaleString("pt-BR")}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">Assunto da Mensagem</label>
                <div className="p-2.5 rounded-xl border border-border bg-background-secondary font-mono text-xs text-foreground">
                  {selectedLog.subject}
                </div>
              </div>

              {selectedLog.resendId && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-foreground">ID da Mensagem (Resend)</label>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedLog.resendId!, "resend_id")}
                      className="text-3xs text-accent hover:underline font-semibold flex items-center gap-1"
                    >
                      {copiedField === "resend_id" ? <Check className="size-3" /> : <Copy className="size-3" />} Copiar ID
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border bg-background-secondary font-mono text-xs text-foreground">
                    {selectedLog.resendId}
                  </div>
                </div>
              )}

              {selectedLog.error && (
                <div>
                  <label className="block font-bold text-danger mb-1">Detalhes do Erro</label>
                  <div className="p-2.5 rounded-xl border border-danger/20 bg-danger-soft text-danger text-xs">
                    {selectedLog.error}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-full rounded-xl bg-accent py-2.5 font-bold text-primary-foreground hover:bg-accent-hover transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}
        title="Limpar histórico de disparos"
        description="Deseja realmente limpar todo o histórico de disparos de e-mail? Esta ação não pode ser desfeita."
        confirmLabel="Limpar histórico"
        isDestructive
        isLoading={isClearing}
        onConfirm={handleConfirmClearLogs}
      />
    </div>
  );
}
