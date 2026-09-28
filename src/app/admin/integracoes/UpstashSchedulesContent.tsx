"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Chip, Skeleton } from "@heroui/react";
import { AlertTriangle, CalendarClock, Play, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "@/lib/toast";

type JobState = "ok" | "missing" | "outdated" | "paused";

type Job = {
  id: string;
  name: string;
  description: string;
  schedule: string;
  destination: string;
  state: JobState;
};

type Config = { token: boolean; signingKeys: boolean };

const STATE_LABEL: Record<JobState, { label: string; color: "success" | "warning" | "danger" }> = {
  ok: { label: "Agendado", color: "success" },
  missing: { label: "Não criado", color: "danger" },
  outdated: { label: "Desatualizado", color: "warning" },
  paused: { label: "Pausado", color: "warning" },
};

/**
 * Rotinas agendadas no QStash (Upstash Schedules): expirar assinaturas e os
 * e-mails de vencimento/reconquista. Ver src/lib/cronJobs.ts.
 */
export function UpstashSchedulesContent() {
  const [config, setConfig] = useState<Config | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/agendamentos")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) throw new Error(data.error);
        setConfig(data.config);
        setJobs(data.jobs);
      })
      .catch((error) => {
        if (!cancelled) toast.danger(error instanceof Error ? error.message : "Não foi possível consultar o QStash.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setJobs(data.jobs);
      toast.success("Agendamentos criados/atualizados no QStash.");
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Falha ao sincronizar os agendamentos.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRun = async (job: Job) => {
    setRunningJob(job.id);
    try {
      const res = await fetch("/api/admin/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", job: job.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(`"${job.name}" enviada para execução.`, {
        description: "O resultado aparece nos logs do QStash em alguns segundos.",
      });
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Falha ao disparar a rotina.");
    } finally {
      setRunningJob(null);
    }
  };

  const missingEnv = config && (!config.token || !config.signingKeys);
  const needsSync = jobs?.some((job) => job.state !== "ok");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrações"
        title="Agendamentos (Upstash QStash)"
        description="Rotinas automáticas da plataforma, executadas pelo QStash no horário de Brasília, com novas tentativas em caso de falha."
        actions={
          <Button variant="primary" onPress={handleSync} isDisabled={isSyncing || !config?.token} className="gap-2">
            <RefreshCw className={isSyncing ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
            Criar/atualizar agendamentos
          </Button>
        }
      />

      {missingEnv && (
        <Alert status="danger">
          <Alert.Indicator>
            <AlertTriangle className="size-4" aria-hidden="true" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Variáveis do QStash ausentes neste ambiente</Alert.Title>
            <Alert.Description>
              {!config?.token && "Falta QSTASH_TOKEN (para criar os agendamentos). "}
              {!config?.signingKeys && "Faltam QSTASH_CURRENT_SIGNING_KEY e QSTASH_NEXT_SIGNING_KEY (para aceitar as chamadas). "}
              Configure na Vercel, em Settings → Environment Variables, e faça um novo deploy.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {needsSync && !missingEnv && (
        <Alert status="warning">
          <Alert.Indicator>
            <AlertTriangle className="size-4" aria-hidden="true" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Há rotinas sem agendamento válido</Alert.Title>
            <Alert.Description>
              Clique em &ldquo;Criar/atualizar agendamentos&rdquo;. Sem isso, as assinaturas não expiram e os e-mails de
              vencimento e reconquista não saem.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="grid gap-4">
        {isLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : jobs ? (
          jobs.map((job) => {
            const state = STATE_LABEL[job.state];
            return (
              <Card key={job.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CalendarClock className="size-4 text-accent" aria-hidden="true" />
                      <h2 className="font-semibold text-foreground">{job.name}</h2>
                      <Chip size="sm" variant="soft" color={state.color} className="text-3xs">{state.label}</Chip>
                    </div>
                    <p className="text-sm text-muted">{job.description}</p>
                    <p className="text-xs text-muted">
                      {job.schedule} · <span className="break-all font-mono">{job.destination}</span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => handleRun(job)}
                    isDisabled={runningJob !== null || missingEnv === true}
                    className="shrink-0 gap-2"
                  >
                    <Play className="size-3.5" aria-hidden="true" />
                    {runningJob === job.id ? "Enviando..." : "Executar agora"}
                  </Button>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="p-6 text-sm text-muted">
            Sem QSTASH_TOKEN neste ambiente não é possível consultar os agendamentos.
          </Card>
        )}
      </div>

      <p className="text-xs text-muted">
        Executar de novo no mesmo dia é seguro: assinaturas já expiradas não mudam e cada e-mail sai no máximo uma vez
        por período. O histórico de cada execução fica no painel do Upstash, em QStash → Logs.
      </p>
    </div>
  );
}
