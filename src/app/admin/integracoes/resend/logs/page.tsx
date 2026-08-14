"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "sonner";
import {
  FileText,
  Trash2,
  ArrowLeft,
  Search,
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

  const handleClearLogs = async () => {
    if (!confirm("Deseja realmente limpar todo o histórico de disparos de e-mail?")) {
      return;
    }

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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resend • Auditoria"
        title="Histórico & Logs de Envios"
        description="Acompanhe em tempo real todos os e-mails transacionais e comunicados disparados via Resend."
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/admin/integracoes/resend"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text hover:bg-canvas-soft transition-colors"
            >
              <ArrowLeft className="size-3.5" /> Voltar para Resend
            </Link>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-text-mute hover:text-negative hover:border-negative/30 transition-colors"
              >
                <Trash2 className="size-3.5" /> Limpar Histórico
              </button>
            )}
          </div>
        }
      />

      {/* Top Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="editorial-card p-4">
          <p className="text-xs font-medium text-text-mute">Total Registrado</p>
          <p className="font-display text-2xl font-bold text-text mt-1">{logs.length}</p>
          <p className="text-[11px] text-text-mute mt-0.5">Disparos no sistema</p>
        </div>

        <div className="editorial-card p-4">
          <p className="text-xs font-medium text-text-mute">Enviados Reais (Live)</p>
          <p className="font-display text-2xl font-bold text-success mt-1">{totalSent}</p>
          <p className="text-[11px] text-text-mute mt-0.5">Via API Resend</p>
        </div>

        <div className="editorial-card p-4">
          <p className="text-xs font-medium text-text-mute">Modo Sandbox</p>
          <p className="font-display text-2xl font-bold text-warning mt-1">{totalSimulated}</p>
          <p className="text-[11px] text-text-mute mt-0.5">Ambiente de teste</p>
        </div>

        <div className="editorial-card p-4">
          <p className="text-xs font-medium text-text-mute">Falhas / Erros</p>
          <p className="font-display text-2xl font-bold text-negative mt-1">{totalFailed}</p>
          <p className="text-[11px] text-text-mute mt-0.5">Rejeições ou timeout</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-surface border border-border text-text-mute hover:text-text"
            }`}
          >
            Todos ({logs.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("sent")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === "sent"
                ? "bg-success text-success-foreground shadow-sm"
                : "bg-surface border border-border text-text-mute hover:text-text"
            }`}
          >
            Enviados ({totalSent})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("simulated")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === "simulated"
                ? "bg-warning text-warning-foreground shadow-sm"
                : "bg-surface border border-border text-text-mute hover:text-text"
            }`}
          >
            Simulados ({totalSimulated})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("failed")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === "failed"
                ? "bg-negative text-negative-foreground shadow-sm"
                : "bg-surface border border-border text-text-mute hover:text-text"
            }`}
          >
            Falhas ({totalFailed})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-mute" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por e-mail, assunto ou ID..."
            className="w-full min-h-9 rounded-xl border border-border bg-canvas-soft pl-9 pr-3 text-xs text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      {/* Table of Logs */}
      <div className="editorial-card p-6 space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-text-mute space-y-2">
            <Mail className="size-10 mx-auto opacity-30 text-text-mute" />
            <p className="font-semibold text-sm text-text">Nenhum registro encontrado</p>
            <p className="text-xs max-w-sm mx-auto">
              Os e-mails disparados pela plataforma, automações e testes aparecerão aqui em tempo real.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-text-mute font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Destinatário</th>
                  <th className="py-3 px-3">Assunto</th>
                  <th className="py-3 px-3">Modelo</th>
                  <th className="py-3 px-3">ID Resend</th>
                  <th className="py-3 px-3 text-right">Data & Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-canvas-soft transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === "sent"
                            ? "bg-success-soft text-success"
                            : log.status === "simulated"
                            ? "bg-warning-soft text-warning"
                            : "bg-negative-soft text-negative"
                        }`}
                      >
                        {log.status === "sent" && "Enviado"}
                        {log.status === "simulated" && "Simulado"}
                        {log.status === "failed" && "Falhou"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-text group-hover:text-primary transition-colors">
                      {log.to}
                    </td>
                    <td className="py-3 px-3 text-text truncate max-w-[240px]" title={log.subject}>
                      {log.subject}
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] uppercase text-text-mute">
                      {log.template}
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-text-mute truncate max-w-[140px]">
                      {log.resendId || "—"}
                    </td>
                    <td className="py-3 px-3 text-right text-text-mute font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary-soft text-primary grid place-items-center">
                  <FileText className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-ink">Detalhes do Disparo</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-text-mute hover:text-text rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-canvas-soft border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-text-mute font-medium">Status da Entrega:</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedLog.status === "sent"
                        ? "bg-success-soft text-success"
                        : selectedLog.status === "simulated"
                        ? "bg-warning-soft text-warning"
                        : "bg-negative-soft text-negative"
                    }`}
                  >
                    {selectedLog.status === "sent" && "Enviado via Resend"}
                    {selectedLog.status === "simulated" && "Simulado no Sandbox"}
                    {selectedLog.status === "failed" && "Falhou"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-mute font-medium">Destinatário:</span>
                  <strong className="text-text">{selectedLog.to}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-mute font-medium">Modelo Utilizado:</span>
                  <span className="font-mono text-text uppercase font-bold">{selectedLog.template}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-mute font-medium">Data e Hora:</span>
                  <span className="font-mono text-text">{new Date(selectedLog.createdAt).toLocaleString("pt-BR")}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-text mb-1">Assunto da Mensagem</label>
                <div className="p-2.5 rounded-xl border border-border bg-canvas-soft font-mono text-xs text-text">
                  {selectedLog.subject}
                </div>
              </div>

              {selectedLog.resendId && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-text">ID da Mensagem (Resend)</label>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedLog.resendId!, "resend_id")}
                      className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      {copiedField === "resend_id" ? <Check className="size-3" /> : <Copy className="size-3" />} Copiar ID
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border bg-canvas-soft font-mono text-xs text-text">
                    {selectedLog.resendId}
                  </div>
                </div>
              )}

              {selectedLog.error && (
                <div>
                  <label className="block font-bold text-negative mb-1">Detalhes do Erro</label>
                  <div className="p-2.5 rounded-xl border border-negative/20 bg-negative-soft text-negative text-xs">
                    {selectedLog.error}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary-active transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
