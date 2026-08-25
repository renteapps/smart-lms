"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Copy, KeyRound, ListChecks, Pencil, Plus, RefreshCw, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";

import {
  clearHotmartApiCredentials,
  deleteHotmartMapping,
  getHotmartAdminConfig,
  listHotmartCatalog,
  saveHotmartConfiguration,
  saveHotmartMapping,
  type HotmartAdminConfig,
} from "@/app/actions/admin/hotmart";
import type { HotmartProductSummary } from "@/lib/billing/hotmartApi";
import { PageHeader } from "@/components/ui/editorial";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50";

/** Mesmo indicativo de "salvo" da tela da Eduzz — ver o comentário lá para o porquê. */
function SavedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
      <CheckCircle2 className="size-3.5" /> {label}
    </span>
  );
}

/**
 * Tela de integração Hotmart, no mesmo formato de `EduzzIntegrationContent`:
 * webhook + chaves, credenciais de API (client-credentials em vez de OAuth por
 * redirecionamento), catálogo de produtos e mapeamento produto → acesso.
 *
 * A versão anterior desta tela era só aparência — "Conectar" era um
 * `setTimeout` e nada persistia. Isto substitui por `saveHotmartConfiguration`,
 * que grava as credenciais e valida pedindo um token de verdade antes de
 * marcar como conectada.
 */
export function HotmartIntegrationContent() {
  const [data, setData] = useState<HotmartAdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hottok, setHottok] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [basicToken, setBasicToken] = useState("");
  const [productId, setProductId] = useState("");
  const [mappingId, setMappingId] = useState<string | undefined>();
  const [offerId, setOfferId] = useState("");
  const [target, setTarget] = useState("");
  const [accessDays, setAccessDays] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogItems, setCatalogItems] = useState<HotmartProductSummary[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    const result = await getHotmartAdminConfig();
    if (result.success && result.data) setData(result.data);
    else toast.error(result.message ?? "Não foi possível carregar a integração.");
    setLoading(false);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setWebhookUrl(`${window.location.origin}/api/webhooks/hotmart`);
      void reload();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [reload]);

  const targets = useMemo(() => [
    ...(data?.plans ?? []).map((plan) => ({ value: `plan:${plan.id}`, label: `Plano · ${plan.name}` })),
    ...(data?.courses ?? []).map((course) => ({ value: `course:${course.id}`, label: `Curso · ${course.title}` })),
  ], [data]);

  async function saveCredentials() {
    setBusy(true);
    const result = await saveHotmartConfiguration({
      enabled: true, hottok, clientId, clientSecret, basicToken,
    });
    setBusy(false);
    if (!result.success) return toast.error(result.message ?? "Falha ao salvar.");
    setHottok(""); setClientId(""); setClientSecret(""); setBasicToken("");
    toast.success("Configuração salva.");
    await reload();
  }

  async function addMapping() {
    const [targetType, targetId] = target.split(":") as ["plan" | "course", string];
    if (!productId.trim() || !targetId) return toast.error("Informe o produto e o destino.");
    setBusy(true);
    const result = await saveHotmartMapping({
      id: mappingId, productId, offerId, targetType, targetId,
      accessDays: accessDays ? Number(accessDays) : null,
    });
    setBusy(false);
    if (!result.success) return toast.error(result.message ?? "Falha ao mapear.");
    setMappingId(undefined); setProductId(""); setOfferId(""); setTarget(""); setAccessDays("");
    toast.success("Mapeamento salvo.");
    await reload();
  }

  async function toggleCatalog() {
    const next = !catalogOpen;
    setCatalogOpen(next);
    if (!next || catalogItems.length > 0) return;
    setCatalogLoading(true);
    const result = await listHotmartCatalog();
    setCatalogLoading(false);
    if (!result.success || !result.data) return toast.error(result.message ?? "Não foi possível listar os produtos.");
    setCatalogItems(result.data);
  }

  function applyProduct(product: HotmartProductSummary) {
    setMappingId(undefined);
    setProductId(product.id);
    setOfferId("");
    toast.success(`Produto preenchido: ${product.name}`);
  }

  const copyWebhookUrl = () => { void navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada."); };

  if (loading && !data) return <div className="p-8 text-center text-muted">Carregando integração…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrações"
        title="Hotmart"
        description="Sincronização de compras, reembolsos e cancelamentos via webhook, com catálogo pela API de produtos."
      />

      <section className="rounded-xl border border-border bg-surface p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold"><Webhook className="size-5 text-accent" /> Webhook e chaves</h2>
            <p className="mt-1 text-sm text-muted">
              Cadastre este endereço no painel da Hotmart. Aceita tanto o token fixo (<code>X-HOTMART-HOTTOK</code>) quanto a assinatura HMAC — use o que a sua conta oferecer.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${data?.enabled ? "bg-success-soft text-success" : "bg-surface-secondary text-muted"}`}>
            {data?.enabled ? "Ativa" : "Desativada"} · {data?.webhookKeyCount ?? 0} chave(s)
          </span>
        </div>
        <div className="rounded-lg bg-background-secondary p-3">
          <p className="mb-2 text-xs font-semibold text-muted">URL pública do webhook</p>
          <div className="flex gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto text-xs">{webhookUrl}</code>
            <button className={buttonClass} onClick={copyWebhookUrl}><Copy className="size-4" /></button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <input className={inputClass} type="password" value={hottok} onChange={(e) => setHottok(e.target.value)} placeholder="Hottok ou chave HMAC da conta" />
            {Boolean(data?.webhookKeyCount) && <SavedBadge label={`${data!.webhookKeyCount} chave(s) salva(s) no servidor`} />}
          </div>
          <button className={`${buttonClass} bg-accent text-accent-foreground`} disabled={busy || !hottok} onClick={() => void saveCredentials()}>
            <CheckCircle2 className="size-4" /> Adicionar chave
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 space-y-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="size-5 text-accent" /> API de Produtos (Client Credentials)</h2>
          <p className="mt-1 text-sm text-muted">
            Gere uma credencial em{" "}
            <a href="https://app-vlc.hotmart.com/tools/credentials" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Hotmart Developers
            </a>{" "}
            e cole os três valores. O token &quot;Basic&quot; é o que o painel já entrega pronto — não precisa calcular nada.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <input className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder={data?.hasClientId ? "Client ID configurado — deixe vazio para manter" : "Client ID"} />
            {data?.hasClientId && <SavedBadge label="Client ID salvo" />}
          </div>
          <div className="space-y-1">
            <input className={inputClass} type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder={data?.hasClientSecret ? "Client Secret configurado — deixe vazio para manter" : "Client Secret"} />
            {data?.hasClientSecret && <SavedBadge label="Client Secret salvo" />}
          </div>
          <div className="space-y-1 md:col-span-2">
            <input className={inputClass} type="password" value={basicToken} onChange={(e) => setBasicToken(e.target.value)} placeholder={data?.hasBasicToken ? "Token Basic configurado — deixe vazio para manter" : "Token (Basic)"} />
            {data?.hasBasicToken && <SavedBadge label="Token Basic salvo" />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className={`${buttonClass} bg-accent text-accent-foreground`} disabled={busy || (!clientId && !clientSecret && !basicToken)} onClick={() => void saveCredentials()}>
            {data?.apiConnected ? "Atualizar credenciais" : "Conectar com a Hotmart"}
          </button>
          {data?.apiConnected && (
            <button
              className={`${buttonClass} border border-danger/40 text-danger`}
              onClick={async () => {
                const result = await clearHotmartApiCredentials();
                if (!result.success) toast.error(result.message);
                else { toast.success("Credenciais removidas."); await reload(); }
              }}
            >
              Desconectar
            </button>
          )}
          <span className="text-sm text-muted">{data?.apiConnected ? "Conectada" : "Não conectada"} · saúde: {data?.status}</span>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => void toggleCatalog()}>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold"><ListChecks className="size-5 text-accent" /> Lista de Produtos</h2>
            <p className="mt-1 text-sm text-muted">Catálogo de produtos da conta conectada. A Hotmart não expõe uma listagem de ofertas por API — informe o código da oferta manualmente no mapeamento abaixo, se houver mais de uma.</p>
          </div>
          {catalogOpen ? <ChevronDown className="size-5 text-muted" /> : <ChevronRight className="size-5 text-muted" />}
        </button>

        {catalogOpen && (
          !data?.apiConnected ? (
            <p className="rounded-lg bg-background-secondary p-4 text-sm text-muted">Conecte as credenciais de API acima para listar o catálogo.</p>
          ) : (
            <div className="space-y-3">
              {catalogLoading && <p className="p-4 text-center text-sm text-muted">Carregando produtos…</p>}
              {!catalogLoading && catalogItems.length === 0 && <p className="p-4 text-sm text-muted">Nenhum produto encontrado.</p>}
              <div className="divide-y divide-border rounded-lg border border-border">
                {catalogItems.map((product) => (
                  <div key={product.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                    <code className="font-semibold">{product.id}</code>
                    <span className="flex-1">{product.name}</span>
                    {product.status && <span className="rounded-full bg-background-secondary px-2 py-1 text-xs">{product.status}</span>}
                    <button className={`${buttonClass} border border-border`} onClick={() => applyProduct(product)}>Usar produto</button>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold">Mapeamentos produto → acesso</h2>
          <p className="mt-1 text-sm text-muted">A oferta fica vazia por padrão, valendo para qualquer oferta do produto; preencha só quando ofertas diferentes do mesmo produto derem acesso a planos ou cursos diferentes.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <input className={inputClass} value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="ID do produto *" />
          <input className={inputClass} value={offerId} onChange={(e) => setOfferId(e.target.value)} placeholder="Oferta (opcional)" />
          <select className={inputClass} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Plano ou curso *</option>
            {targets.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <input className={inputClass} type="number" min="1" value={accessDays} onChange={(e) => setAccessDays(e.target.value)} placeholder="Dias (opcional)" />
          <button className={`${buttonClass} bg-accent text-accent-foreground`} disabled={busy} onClick={() => void addMapping()}>
            <Plus className="size-4" /> {mappingId ? "Atualizar" : "Adicionar"}
          </button>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border">
          {(data?.mappings ?? []).map((mapping) => {
            const plan = data?.plans.find((item) => item.id === mapping.planId)?.name;
            const course = data?.courses.find((item) => item.id === mapping.courseId)?.title;
            return (
              <div key={mapping.id} className="flex items-center gap-3 p-3 text-sm">
                <code className="font-semibold">{mapping.productId}</code>
                <span className="text-muted">{mapping.offerId ? `/ ${mapping.offerId}` : "/ qualquer oferta"}</span>
                <span className="flex-1">→ {plan ? `Plano ${plan}` : `Curso ${course ?? "removido"}`}</span>
                <button
                  aria-label="Editar mapeamento"
                  className="text-accent"
                  onClick={() => {
                    setMappingId(mapping.id);
                    setProductId(mapping.productId);
                    setOfferId(mapping.offerId ?? "");
                    setTarget(mapping.planId ? `plan:${mapping.planId}` : `course:${mapping.courseId}`);
                    setAccessDays(mapping.accessDays ? String(mapping.accessDays) : "");
                  }}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  aria-label="Excluir mapeamento"
                  className="text-danger"
                  onClick={async () => {
                    const result = await deleteHotmartMapping(mapping.id);
                    if (!result.success) toast.error(result.message);
                    else await reload();
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })}
          {data?.mappings.length === 0 && <p className="p-4 text-sm text-muted">Nenhum produto mapeado.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Eventos recentes</h2>
            <p className="text-sm text-muted">Payloads não são enviados ao navegador; apenas estado e erro.</p>
          </div>
          <button className={`${buttonClass} border border-border`} onClick={() => void reload()}><RefreshCw className="size-4" /> Atualizar</button>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border">
          {(data?.events ?? []).map((event) => (
            <div key={event.id} className="grid gap-1 p-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <code>{event.eventType}</code>
                <p className="text-xs text-muted">{new Date(event.receivedAt).toLocaleString("pt-BR")}</p>
                {event.error && <p className="text-xs text-danger">{event.error}</p>}
              </div>
              <span className="rounded-full bg-background-secondary px-2 py-1 text-xs">{event.status}</span>
            </div>
          ))}
          {data?.events.length === 0 && <p className="p-4 text-sm text-muted">Nenhum evento recebido.</p>}
        </div>
      </section>
    </div>
  );
}
