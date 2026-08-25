-- ============================================================================
-- Correção: colunas ausentes em `gateway_webhook_events`
-- ============================================================================
--
-- A migração 20260824190000 declara `gateway_webhook_events` com as colunas de
-- rastreio do pipeline de sincronização (`attempt_count`, `processing_started_at`,
-- `fallback_warning`, `api_enriched`, `enrollment_id`). Só que ela declara isso
-- **dentro de um `CREATE TABLE IF NOT EXISTS`** — e a tabela já tinha sido criada
-- por uma versão anterior da mesma migração, sem essas colunas.
--
-- `CREATE TABLE IF NOT EXISTS` é no-op quando a tabela existe: ele não compara
-- colunas nem acrescenta as que faltam. As funções da mesma migração entraram
-- normalmente porque usam `CREATE OR REPLACE`, o que criou um estado
-- inconsistente e silencioso — schema "aplicado" com sucesso, tabela defasada.
--
-- Dois efeitos, ambos invisíveis no console do navegador:
--
--   1. `getEduzzAdminConfig` seleciona `attempt_count` e `fallback_warning`; o
--      PostgREST devolvia 42703 (coluna inexistente), a Server Action retornava
--      `{ success: false }` e a tela de integração renderizava tudo como
--      "não conectada" mesmo com o OAuth concluído e o token salvo.
--   2. `claim_gateway_webhook_event` grava `attempt_count` e
--      `processing_started_at` — ou seja, **todo webhook de pagamento falharia**
--      ao tentar reivindicar o evento.
--
-- `ADD COLUMN IF NOT EXISTS` funciona em tabela existente, que é justamente o
-- que faltava aqui.

ALTER TABLE public.gateway_webhook_events
  ADD COLUMN IF NOT EXISTS fallback_warning TEXT,
  ADD COLUMN IF NOT EXISTS api_enriched BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.gateway_webhook_events.attempt_count IS
  'Quantas vezes o evento foi reivindicado para processamento. Incrementado por claim_gateway_webhook_event.';
COMMENT ON COLUMN public.gateway_webhook_events.processing_started_at IS
  'Início do lease de processamento. Lease com mais de 5 minutos é considerado abandonado e pode ser retomado.';
COMMENT ON COLUMN public.gateway_webhook_events.fallback_warning IS
  'Motivo pelo qual o evento caiu para o payload do webhook em vez do snapshot autoritativo da API.';
COMMENT ON COLUMN public.gateway_webhook_events.api_enriched IS
  'true quando o estado veio do snapshot da API do gateway, não apenas do payload do webhook.';
