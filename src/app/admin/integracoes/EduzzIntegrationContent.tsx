"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Copy, KeyRound, Link2, ListChecks, Pencil, Plus, RefreshCw, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";

import {
  deleteEduzzMapping,
  disconnectEduzzOAuth,
  getEduzzAdminConfig,
  replayEduzzEvent,
  saveEduzzConfiguration,
  saveEduzzMapping,
  type EduzzAdminConfig,
} from "@/app/actions/admin/eduzz";
import { listEduzzCatalog, listEduzzOffersForProduct } from "@/app/actions/admin/gatewayProducts";
import type { EduzzOfferSummary, EduzzProductSummary } from "@/lib/billing/eduzzProducts";
import { PageHeader } from "@/components/ui/editorial";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50";

/**
 * Confirmação visual de que um segredo já está gravado no servidor.
 *
 * Os campos de Client ID/Secret e a chave de webhook são `type="password"` e
 * voltam vazios depois de salvar (nunca redigitam o valor real) — sem um sinal
 * explícito, isso parece "não salvou nada" mesmo quando salvou. O placeholder
 * sozinho ("Client ID configurado…") não estava sendo notado.
 */
function SavedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
      <CheckCircle2 className="size-3.5" /> {label}
    </span>
  );
}

export function EduzzIntegrationContent() {
  const [data, setData] = useState<EduzzAdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [productId, setProductId] = useState("");
  const [mappingId, setMappingId] = useState<string | undefined>();
  const [offerId, setOfferId] = useState("");
  const [target, setTarget] = useState("");
  const [accessDays, setAccessDays] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  // Lista de Produtos: catálogo real da conta conectada, para não exigir
  // digitar ID de produto/oferta de cabeça no formulário de mapeamento acima.
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogItems, setCatalogItems] = useState<EduzzProductSummary[]>([]);
  const [catalogPage, setCatalogPage] = useState({ page: 1, pages: 1 });
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [offersByProduct, setOffersByProduct] = useState<Record<string, EduzzOfferSummary[]>>({});
  const [offersLoadingId, setOffersLoadingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const result = await getEduzzAdminConfig();
    if (result.success && result.data) setData(result.data);
    else toast.error(result.message ?? "Não foi possível carregar a integração.");
    setLoading(false);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setWebhookUrl(`${window.location.origin}/api/webhooks/eduzz`);
      void reload();
    });
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") === "connected") toast.success("Conta Eduzz conectada.");
    if (params.get("oauth_error")) toast.error(params.get("oauth_error")!);
    return () => window.cancelAnimationFrame(frame);
  }, [reload]);

  const targets = useMemo(() => [
    ...(data?.plans ?? []).map((plan) => ({ value: `plan:${plan.id}`, label: `Plano · ${plan.name}` })),
    ...(data?.courses ?? []).map((course) => ({ value: `course:${course.id}`, label: `Curso · ${course.title}` })),
  ], [data]);

  async function saveCredentials(replaceWebhookSecrets = false) {
    setBusy(true);
    const result = await saveEduzzConfiguration({
      enabled: true, webhookSecret, replaceWebhookSecrets, clientId, clientSecret,
    });
    setBusy(false);
    if (!result.success) return toast.error(result.message ?? "Falha ao salvar.");
    setWebhookSecret(""); setClientId(""); setClientSecret("");
    toast.success("Configuração salva sem apagar credenciais existentes.");
    await reload();
  }

  async function addMapping() {
    const [targetType, targetId] = target.split(":") as ["plan" | "course", string];
    if (!productId.trim() || !targetId) return toast.error("Informe o produto e o destino.");
    setBusy(true);
    const result = await saveEduzzMapping({
      id: mappingId, productId, offerId, targetType, targetId,
      accessDays: accessDays ? Number(accessDays) : null,
    });
    setBusy(false);
    if (!result.success) return toast.error(result.message ?? "Falha ao mapear.");
    setMappingId(undefined); setProductId(""); setOfferId(""); setTarget(""); setAccessDays("");
    toast.success("Mapeamento salvo.");
    await reload();
  }

  async function loadCatalog(page = 1) {
    setCatalogLoading(true);
    const result = await listEduzzCatalog(page);
    setCatalogLoading(false);
    if (!result.success || !result.data) return toast.error(result.message ?? "Não foi possível listar os produtos.");
    setCatalogItems(result.data.items);
    setCatalogPage({ page: result.data.page, pages: result.data.pages });
  }

  async function toggleCatalog() {
    const next = !catalogOpen;
    setCatalogOpen(next);
    if (next && catalogItems.length === 0) await loadCatalog(1);
  }

  async function toggleOffers(product: EduzzProductSummary) {
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
      return;
    }
    setExpandedProductId(product.id);
    if (offersByProduct[product.id]) return;

    setOffersLoadingId(product.id);
    const result = await listEduzzOffersForProduct(product.id);
    setOffersLoadingId(null);
    if (!result.success || !result.data) return toast.error(result.message ?? "Não foi possível listar as ofertas.");
    setOffersByProduct((prev) => ({ ...prev, [product.id]: result.data! }));
  }

  function applyProduct(product: EduzzProductSummary, offer?: EduzzOfferSummary) {
    setMappingId(undefined);
    setProductId(product.id);
    setOfferId(offer?.id ?? "");
    toast.success(offer ? `Produto e oferta preenchidos: ${product.name} · ${offer.name}` : `Produto preenchido: ${product.name}`);
  }

  if (loading && !data) return <div className="p-8 text-center text-muted">Carregando integração…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrações"
        title="Eduzz"
        description="Sincronização de contratos, acesso e auditoria usando os webhooks oficiais e a API MyEduzz."
      />

      <section className="rounded-xl border border-border bg-surface p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold"><Webhook className="size-5 text-accent" /> Webhook e chaves</h2>
            <p className="mt-1 text-sm text-muted">Você pode cadastrar os 19 eventos exibidos pela Eduzz. Todos são auditados, mas somente contratos e estados financeiros finais alteram o acesso; eventos informativos são ignorados com segurança. O ping é tratado automaticamente.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${data?.enabled ? "bg-success-soft text-success" : "bg-surface-secondary text-muted"}`}>
            {data?.enabled ? "Ativa" : "Desativada"} · {data?.webhookKeyCount ?? 0} chave(s)
          </span>
        </div>
        <div className="rounded-lg bg-background-secondary p-3">
          <p className="mb-2 text-xs font-semibold text-muted">URL pública do webhook</p>
          <div className="flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto text-xs">{webhookUrl}</code><button className={buttonClass} onClick={() => { void navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada."); }}><Copy className="size-4" /></button></div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <input className={inputClass} type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="Nova chave HMAC (adiciona para rotação)" />
            {Boolean(data?.webhookKeyCount) && <SavedBadge label={`${data!.webhookKeyCount} chave(s) salva(s) no servidor`} />}
          </div>
          <div className="flex gap-2">
            <button className={`${buttonClass} bg-accent text-accent-foreground`} disabled={busy || (!webhookSecret && !clientId && !clientSecret)} onClick={() => void saveCredentials()}><CheckCircle2 className="size-4" /> Adicionar chave</button>
            {Boolean(data?.webhookKeyCount) && <button className={`${buttonClass} border border-border`} disabled={busy || !webhookSecret} onClick={() => void saveCredentials(true)}>Trocar e aposentar anteriores</button>}
            <button className={`${buttonClass} border border-border`} disabled={busy || !data?.enabled} onClick={async () => { setBusy(true); const result = await saveEduzzConfiguration({ enabled: false }); setBusy(false); if (!result.success) toast.error(result.message); else { toast.success("Novos webhooks foram desativados; acessos existentes foram preservados."); await reload(); } }}>Desativar</button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 space-y-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="size-5 text-accent" /> API MyEduzz (OAuth)</h2>
          <p className="mt-1 text-sm text-muted">A API com escopo <code>myeduzz_subscriptions_read</code> é a fonte preferencial. O webhook assinado permanece como fallback.</p>
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
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className={`${buttonClass} border border-border`} disabled={busy || (!clientId && !clientSecret)} onClick={() => void saveCredentials()}>Salvar credenciais</button>
          <a className={`${buttonClass} bg-accent text-accent-foreground`} href="/api/admin/integracoes/eduzz/connect"><Link2 className="size-4" /> {data?.oauthConnected ? "Reconectar Eduzz" : "Conectar Eduzz"}</a>
          {data?.oauthConnected && <button className={`${buttonClass} border border-danger/40 text-danger`} onClick={async () => { const result = await disconnectEduzzOAuth(); if (!result.success) toast.error(result.message); else { toast.success("OAuth desconectado."); await reload(); } }}>Desconectar</button>}
          <span className="text-sm text-muted">{data?.oauthConnected ? `Conectada${data.accountName ? `: ${data.accountName}` : ""}` : "Não conectada"} · saúde: {data?.status}</span>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => void toggleCatalog()}
        >
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold"><ListChecks className="size-5 text-accent" /> Lista de Produtos</h2>
            <p className="mt-1 text-sm text-muted">Catálogo de produtos e ofertas cadastrados na conta Eduzz conectada. Clique em &quot;Usar&quot; para preencher o mapeamento abaixo sem digitar IDs.</p>
          </div>
          {catalogOpen ? <ChevronDown className="size-5 text-muted" /> : <ChevronRight className="size-5 text-muted" />}
        </button>

        {catalogOpen && (
          !data?.oauthConnected ? (
            <p className="rounded-lg bg-background-secondary p-4 text-sm text-muted">Conecte a conta Eduzz via OAuth acima para listar o catálogo.</p>
          ) : (
            <div className="space-y-3">
              {catalogLoading && <p className="p-4 text-center text-sm text-muted">Carregando produtos…</p>}
              {!catalogLoading && catalogItems.length === 0 && <p className="p-4 text-sm text-muted">Nenhum produto encontrado.</p>}
              <div className="divide-y divide-border rounded-lg border border-border">
                {catalogItems.map((product) => (
                  <div key={product.id}>
                    <div className="flex flex-wrap items-center gap-3 p-3 text-sm">
                      <button type="button" className="text-muted" aria-label="Ver ofertas" onClick={() => void toggleOffers(product)}>
                        {expandedProductId === product.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </button>
                      <code className="font-semibold">{product.id}</code>
                      <span className="flex-1">{product.name}</span>
                      <span className="rounded-full bg-background-secondary px-2 py-1 text-xs">{product.status}</span>
                      {product.priceValue != null && (
                        <span className="text-xs text-muted">{product.currency ?? "BRL"} {product.priceValue.toFixed(2)}</span>
                      )}
                      <button className={`${buttonClass} border border-border`} onClick={() => applyProduct(product)}>Usar produto</button>
                    </div>
                    {expandedProductId === product.id && (
                      <div className="space-y-2 border-t border-border bg-background-secondary p-3">
                        {offersLoadingId === product.id && <p className="text-xs text-muted">Carregando ofertas…</p>}
                        {offersLoadingId !== product.id && (offersByProduct[product.id]?.length ?? 0) === 0 && (
                          <p className="text-xs text-muted">Nenhuma oferta cadastrada para este produto.</p>
                        )}
                        {(offersByProduct[product.id] ?? []).map((offer) => (
                          <div key={offer.id} className="flex flex-wrap items-center gap-3 text-xs">
                            <code className="font-semibold">{offer.id}</code>
                            <span className="flex-1">{offer.name}{offer.isDefault ? " · padrão" : ""}</span>
                            {offer.priceValue != null && <span className="text-muted">{offer.currency ?? "BRL"} {offer.priceValue.toFixed(2)}</span>}
                            <button className={`${buttonClass} border border-border`} onClick={() => applyProduct(product, offer)}>Usar oferta</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {catalogPage.pages > 1 && (
                <div className="flex items-center justify-center gap-3 text-sm text-muted">
                  <button className={`${buttonClass} border border-border`} disabled={catalogLoading || catalogPage.page <= 1} onClick={() => void loadCatalog(catalogPage.page - 1)}>Anterior</button>
                  <span>Página {catalogPage.page} de {catalogPage.pages}</span>
                  <button className={`${buttonClass} border border-border`} disabled={catalogLoading || catalogPage.page >= catalogPage.pages} onClick={() => void loadCatalog(catalogPage.page + 1)}>Próxima</button>
                </div>
              )}
            </div>
          )
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold">Mapeamentos produto → acesso</h2>
          <p className="mt-1 text-sm text-muted">O curinga por produto (oferta vazia) é obrigatório na prática; uma oferta específica apenas tem precedência quando vier no evento.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <input className={inputClass} value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="ID do produto *" />
          <input className={inputClass} value={offerId} onChange={(e) => setOfferId(e.target.value)} placeholder="Oferta (opcional)" />
          <select className={inputClass} value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Plano ou curso *</option>{targets.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <input className={inputClass} type="number" min="1" value={accessDays} onChange={(e) => setAccessDays(e.target.value)} placeholder="Dias (opcional)" />
          <button className={`${buttonClass} bg-accent text-accent-foreground`} disabled={busy} onClick={() => void addMapping()}><Plus className="size-4" /> {mappingId ? "Atualizar" : "Adicionar"}</button>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border">
          {(data?.mappings ?? []).map((mapping) => {
            const plan = data?.plans.find((item) => item.id === mapping.planId)?.name;
            const course = data?.courses.find((item) => item.id === mapping.courseId)?.title;
            return <div key={mapping.id} className="flex items-center gap-3 p-3 text-sm"><code className="font-semibold">{mapping.productId}</code><span className="text-muted">{mapping.offerId ? `/ ${mapping.offerId}` : "/ qualquer oferta"}</span><span className="flex-1">→ {plan ? `Plano ${plan}` : `Curso ${course ?? "removido"}`}</span><button aria-label="Editar mapeamento" className="text-accent" onClick={() => { setMappingId(mapping.id); setProductId(mapping.productId); setOfferId(mapping.offerId ?? ""); setTarget(mapping.planId ? `plan:${mapping.planId}` : `course:${mapping.courseId}`); setAccessDays(mapping.accessDays ? String(mapping.accessDays) : ""); }}><Pencil className="size-4" /></button><button aria-label="Excluir mapeamento" className="text-danger" onClick={async () => { const result = await deleteEduzzMapping(mapping.id); if (!result.success) toast.error(result.message); else await reload(); }}><Trash2 className="size-4" /></button></div>;
          })}
          {data?.mappings.length === 0 && <p className="p-4 text-sm text-muted">Nenhum produto mapeado.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Eventos recentes</h2><p className="text-sm text-muted">Payloads não são enviados ao navegador; apenas estado, avisos e tentativas.</p></div><button className={`${buttonClass} border border-border`} onClick={() => void reload()}><RefreshCw className="size-4" /> Atualizar</button></div>
        <div className="divide-y divide-border rounded-lg border border-border">
          {(data?.events ?? []).map((event) => <div key={event.id} className="grid gap-1 p-3 text-sm md:grid-cols-[1fr_auto_auto] md:items-center"><div><code>{event.eventType}</code><p className="text-xs text-muted">{new Date(event.receivedAt).toLocaleString("pt-BR")} · tentativa {event.attempts}{event.warning ? ` · fallback: ${event.warning}` : ""}</p>{event.error && <p className="text-xs text-danger">{event.error}</p>}</div><span className="rounded-full bg-background-secondary px-2 py-1 text-xs">{event.status}</span>{event.status === "failed" ? <button className={`${buttonClass} border border-border`} onClick={async () => { const result = await replayEduzzEvent(event.id); if (!result.success) toast.error(result.message); else { toast.success("Evento reprocessado."); await reload(); } }}><RefreshCw className="size-3" /> Reprocessar</button> : <span />}</div>)}
          {data?.events.length === 0 && <p className="p-4 text-sm text-muted">Nenhum evento recebido.</p>}
        </div>
      </section>
    </div>
  );
}
