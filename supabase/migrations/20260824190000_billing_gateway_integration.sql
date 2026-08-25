-- ============================================================================
-- Integração de pagamento: Eduzz / Hotmart
-- ============================================================================
--
-- Até aqui o fluxo de venda existia só pela metade. O admin cadastra códigos de
-- gateway em dois lugares — `plans.features` (gateway/productId/offerId) e
-- `courses.sales_config.integracoes[]` (produtoId/codigoOferta/tempoAcesso) — e
-- a tela do plano promete que "o acesso do aluno é liberado automaticamente via
-- Webhook assim que a compra for aprovada". Só que o webhook da Eduzz era um
-- `console.log` e o da Hotmart nem existia: nada no código jamais escreveu uma
-- linha em `subscriptions`.
--
-- Esta migração cria o que faltava do lado do banco:
--
--   1. `gateway_products`      — de qual produto/oferta do gateway nasce qual
--                                plano OU curso. Sem isso o webhook recebe um
--                                número de produto e não tem para onde ir.
--   2. `gateway_webhook_events` — log bruto + a trava de idempotência. Gateway
--                                reenvia o mesmo evento em qualquer falha de
--                                rede; sem dedupe uma compra vira duas.
--   3. `gateway_transactions`  — o registro financeiro. Hoje as análises somam
--                                `plans.price` porque não existe outra fonte.
--   4. Vocabulário de status, índices únicos para upsert idempotente e a
--      expiração automática de assinaturas vencidas.
--   5. A correção do buraco de entitlement: `modules`/`lessons`/`attachments`/
--      `content_embeddings` só enxergavam `enrollments`, então quem comprava um
--      plano recebia `hasAccess: true` da aplicação e zero linhas do banco.
--
-- ----------------------------------------------------------------------------
-- 1. Mapeamento produto do gateway -> plano ou curso
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gateway_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway TEXT NOT NULL,
  product_id TEXT NOT NULL,
  -- NULL = curinga: vale para qualquer oferta daquele produto.
  offer_id TEXT,
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  -- NULL = segue a frequência do plano (ou vitalício, para curso avulso).
  access_days INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.gateway_products DROP CONSTRAINT IF EXISTS gateway_products_gateway_check;
ALTER TABLE public.gateway_products ADD CONSTRAINT gateway_products_gateway_check
  CHECK (gateway IN ('eduzz', 'hotmart', 'kiwify', 'stripe', 'manual'));

-- Exatamente um alvo: ou o produto vira assinatura de plano, ou vira matrícula
-- em curso. Nunca os dois, nunca nenhum.
ALTER TABLE public.gateway_products DROP CONSTRAINT IF EXISTS gateway_products_single_target;
ALTER TABLE public.gateway_products ADD CONSTRAINT gateway_products_single_target
  CHECK (num_nonnulls(plan_id, course_id) = 1);

ALTER TABLE public.gateway_products DROP CONSTRAINT IF EXISTS gateway_products_access_days_positive;
ALTER TABLE public.gateway_products ADD CONSTRAINT gateway_products_access_days_positive
  CHECK (access_days IS NULL OR access_days > 0);

-- `coalesce` no índice porque em SQL dois NULL são distintos: sem isso daria
-- para cadastrar o mesmo produto-curinga várias vezes.
CREATE UNIQUE INDEX IF NOT EXISTS gateway_products_lookup_key
  ON public.gateway_products (gateway, product_id, coalesce(offer_id, ''));

CREATE INDEX IF NOT EXISTS gateway_products_plan_idx ON public.gateway_products (plan_id);
CREATE INDEX IF NOT EXISTS gateway_products_course_idx ON public.gateway_products (course_id);

ALTER TABLE public.gateway_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins gerenciam produtos de gateway" ON public.gateway_products;
CREATE POLICY "Admins gerenciam produtos de gateway" ON public.gateway_products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS set_updated_at ON public.gateway_products;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.gateway_products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 2. Eventos de webhook: auditoria e idempotência
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gateway_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT,
  fallback_warning TEXT,
  api_enriched BOOLEAN NOT NULL DEFAULT false,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  processing_started_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.gateway_webhook_events DROP CONSTRAINT IF EXISTS gateway_webhook_events_status_check;
ALTER TABLE public.gateway_webhook_events ADD CONSTRAINT gateway_webhook_events_status_check
  CHECK (status IN ('received', 'processing', 'processed', 'ignored', 'failed'));

/*
 * Este índice é a trava de idempotência, não um detalhe de performance.
 *
 * O handler INSERE antes de processar: se a inserção violar a unicidade (23505)
 * o evento já foi visto e a requisição responde 200 sem reprocessar. É o mesmo
 * desenho de `ai_usage_events.request_key` (20260820223252), que impede uma
 * chamada de IA de ser cobrada duas vezes — aqui impede que um reenvio da Eduzz
 * conceda o mesmo acesso duas vezes.
 */
CREATE UNIQUE INDEX IF NOT EXISTS gateway_webhook_events_dedup_key
  ON public.gateway_webhook_events (gateway, event_id);

CREATE INDEX IF NOT EXISTS gateway_webhook_events_received_idx
  ON public.gateway_webhook_events (received_at DESC);
CREATE INDEX IF NOT EXISTS gateway_webhook_events_status_idx
  ON public.gateway_webhook_events (status, received_at DESC);

/*
 * Só leitura, e só para admin. Não existe policy de escrita de propósito: quem
 * grava é o webhook pela service role, que ignora RLS. Assim nenhuma sessão de
 * navegador consegue forjar um evento "processado".
 */
ALTER TABLE public.gateway_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins leem eventos de webhook" ON public.gateway_webhook_events;
CREATE POLICY "Admins leem eventos de webhook" ON public.gateway_webhook_events
  FOR SELECT USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. Transações: a fonte de verdade financeira
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gateway_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.gateway_transactions DROP CONSTRAINT IF EXISTS gateway_transactions_status_check;
ALTER TABLE public.gateway_transactions ADD CONSTRAINT gateway_transactions_status_check
  CHECK (status IN ('pending', 'approved', 'canceled', 'refunded', 'chargeback'));

CREATE UNIQUE INDEX IF NOT EXISTS gateway_transactions_key
  ON public.gateway_transactions (gateway, transaction_id);
CREATE INDEX IF NOT EXISTS gateway_transactions_occurred_idx
  ON public.gateway_transactions (occurred_at DESC);
CREATE INDEX IF NOT EXISTS gateway_transactions_user_idx
  ON public.gateway_transactions (user_id, occurred_at DESC);

ALTER TABLE public.gateway_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins leem transações" ON public.gateway_transactions;
CREATE POLICY "Admins leem transações" ON public.gateway_transactions
  FOR SELECT USING (public.is_admin());

DROP TRIGGER IF EXISTS set_updated_at ON public.gateway_transactions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.gateway_transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 4. `subscriptions`: vocabulário de status e travas de unicidade
-- ----------------------------------------------------------------------------

/*
 * `status` era TEXT livre com default 'active', e cada camada inventou o seu
 * vocabulário: a resolução de créditos de IA aceita ('active','trialing'),
 * `can_access_profile_test` exige 'active', e a lista do admin compara com
 * 'ativo'/'atrasado'/'cancelado' — motivo pelo qual toda linha real aparecia
 * como "Desconhecido" na tela. Normaliza e tranca.
 *
 * Qualquer valor fora do de-para vira 'canceled': é o lado seguro do erro, já
 * que status desconhecido não deve conceder acesso pago.
 */
UPDATE public.subscriptions SET status = CASE
  WHEN lower(coalesce(status, '')) IN ('active', 'ativo', 'ativa')                  THEN 'active'
  WHEN lower(coalesce(status, '')) IN ('trialing', 'trial', 'teste')                THEN 'trialing'
  WHEN lower(coalesce(status, '')) IN ('past_due', 'atrasado', 'atrasada', 'overdue') THEN 'past_due'
  WHEN lower(coalesce(status, '')) IN ('canceled', 'cancelled', 'cancelado', 'cancelada') THEN 'canceled'
  WHEN lower(coalesce(status, '')) IN ('refunded', 'reembolsado', 'reembolsada')    THEN 'refunded'
  WHEN lower(coalesce(status, '')) IN ('chargeback', 'protest', 'protesto')         THEN 'chargeback'
  WHEN lower(coalesce(status, '')) IN ('expired', 'expirado', 'expirada')           THEN 'expired'
  ELSE 'canceled'
END;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS gateway_status TEXT,
  ADD COLUMN IF NOT EXISTS gateway_updated_at TIMESTAMPTZ;

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS gateway TEXT,
  ADD COLUMN IF NOT EXISTS gateway_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_updated_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS enrollments_gateway_ref_key
  ON public.enrollments (gateway, gateway_subscription_id)
  WHERE gateway_subscription_id IS NOT NULL;

ALTER TABLE public.subscriptions ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'trialing', 'pending', 'past_due', 'suspended', 'canceled', 'refunded', 'chargeback', 'expired'));

/*
 * Sem esta unicidade o webhook não consegue fazer upsert idempotente: ele
 * precisa de uma chave estável para dizer "esta é a mesma assinatura da Eduzz
 * que eu já vi", e o único candidato é (gateway, gateway_subscription_id).
 */
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_gateway_ref_key
  ON public.subscriptions (gateway, gateway_subscription_id)
  WHERE gateway_subscription_id IS NOT NULL;

-- Desativa duplicatas antigas antes de trancar, mantendo a mais recente de cada
-- par (user_id, plan_id) — do contrário o índice abaixo não seria criado.
WITH ranked AS (
  SELECT id, row_number() OVER (
           PARTITION BY user_id, plan_id
           ORDER BY coalesce(started_at, created_at) DESC, created_at DESC
         ) AS rn
  FROM public.subscriptions
  WHERE user_id IS NOT NULL AND plan_id IS NOT NULL
    AND status IN ('active', 'trialing')
)
UPDATE public.subscriptions s
SET status = 'expired'
FROM ranked r
WHERE s.id = r.id AND r.rn > 1;

/*
 * Uma pessoa não tem duas assinaturas vivas do mesmo plano. Além de ser a regra
 * de negócio, isso conserta `getMySubscription`, que usa `.maybeSingle()` sobre
 * um filtro que podia devolver várias linhas e estourava em runtime.
 */
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_plan_active_key
  ON public.subscriptions (user_id, plan_id)
  WHERE user_id IS NOT NULL AND plan_id IS NOT NULL AND status IN ('active', 'trialing');

CREATE INDEX IF NOT EXISTS subscriptions_period_end_idx
  ON public.subscriptions (current_period_end)
  WHERE current_period_end IS NOT NULL;

-- Regra canônica de acesso, usada pelo banco e espelhada no TypeScript.
CREATE OR REPLACE FUNCTION public.subscription_grants_access(
  p_status TEXT,
  p_access_end TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_status IN ('active', 'trialing') THEN p_access_end IS NULL OR p_access_end > now()
    WHEN p_status IN ('past_due', 'suspended', 'canceled') THEN p_access_end IS NOT NULL AND p_access_end > now()
    ELSE false
  END
$$;

REVOKE ALL ON FUNCTION public.subscription_grants_access(TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscription_grants_access(TEXT, TIMESTAMPTZ) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.user_entitled_course_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT coalesce(array_agg(DISTINCT cid), '{}'::uuid[])
  FROM (
    SELECT e.course_id AS cid
    FROM public.enrollments e
    WHERE e.user_id = (SELECT auth.uid())
      AND e.status = 'active'
      AND (e.expires_at IS NULL OR e.expires_at > now())
    UNION
    SELECT c.id
    FROM public.courses c
    WHERE EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.plans p ON p.id = s.plan_id
      WHERE s.user_id = (SELECT auth.uid())
        AND public.subscription_grants_access(s.status, s.current_period_end)
        AND coalesce(p.is_active, true)
        AND public.plan_allows_course(p.features, c.id)
    )
  ) entitled;
$$;

REVOKE ALL ON FUNCTION public.user_entitled_course_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_entitled_course_ids() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_access_profile_test(
  p_access_type TEXT,
  p_required_course_ids UUID[],
  p_required_plan_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid UUID := (SELECT auth.uid());
BEGIN
  IF public.is_admin() THEN RETURN true; END IF;
  IF coalesce(p_access_type, 'logged_in') = 'public' THEN RETURN true; END IF;
  IF uid IS NULL THEN RETURN false; END IF;
  IF p_access_type = 'course_owners' THEN
    IF coalesce(array_length(p_required_course_ids, 1), 0) = 0 THEN RETURN true; END IF;
    RETURN public.user_entitled_course_ids() && p_required_course_ids;
  END IF;
  IF p_access_type = 'plan_owners' THEN
    IF coalesce(array_length(p_required_plan_ids, 1), 0) = 0 THEN RETURN true; END IF;
    RETURN EXISTS (
      SELECT 1 FROM public.subscriptions s JOIN public.plans p ON p.id = s.plan_id
      WHERE s.user_id = uid AND s.plan_id = ANY (p_required_plan_ids)
        AND public.subscription_grants_access(s.status, s.current_period_end)
        AND coalesce(p.is_active, true)
    );
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_profile_test(TEXT, UUID[], UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_profile_test(TEXT, UUID[], UUID[]) TO anon, authenticated, service_role;

-- O cálculo de créditos de IA também precisa enxergar o período de tolerância.
-- Preserva integralmente a função madura de cobrança e troca somente o
-- predicado de entitlement nas duas consultas de plano.
DO $$
DECLARE
  definition TEXT;
  adjusted TEXT;
BEGIN
  definition := pg_catalog.pg_get_functiondef(
    'public.reserve_ai_usage(uuid,text,text,uuid,numeric,numeric,numeric,boolean)'::regprocedure
  );
  adjusted := replace(
    definition,
    's.status in (''active'', ''trialing'')',
    'public.subscription_grants_access(s.status, s.current_period_end)'
  );
  IF adjusted = definition THEN
    RAISE EXCEPTION 'Não foi possível atualizar o entitlement de reserve_ai_usage';
  END IF;
  EXECUTE adjusted;
END;
$$;

-- Claim transacional: um request ganha o lease; concluídos são duplicatas e
-- falhas/leases abandonados há cinco minutos podem ser retomados.
CREATE OR REPLACE FUNCTION public.claim_gateway_webhook_event(
  p_gateway TEXT,
  p_event_id TEXT,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  event_row public.gateway_webhook_events%ROWTYPE;
  inserted_count INTEGER;
BEGIN
  INSERT INTO public.gateway_webhook_events (
    gateway, event_id, event_type, signature_verified, payload, status,
    attempt_count, processing_started_at
  ) VALUES (
    p_gateway, p_event_id, p_event_type, true, p_payload, 'processing', 1, now()
  ) ON CONFLICT (gateway, event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  SELECT * INTO event_row
  FROM public.gateway_webhook_events
  WHERE gateway = p_gateway AND event_id = p_event_id
  FOR UPDATE;

  IF inserted_count = 1 THEN
    RETURN jsonb_build_object('state', 'claimed', 'id', event_row.id);
  END IF;
  IF event_row.status IN ('processed', 'ignored') THEN
    RETURN jsonb_build_object('state', 'duplicate', 'id', event_row.id);
  END IF;
  IF event_row.status = 'processing'
     AND event_row.processing_started_at > now() - interval '5 minutes' THEN
    RETURN jsonb_build_object('state', 'busy', 'id', event_row.id);
  END IF;

  UPDATE public.gateway_webhook_events
  SET status = 'processing', attempt_count = attempt_count + 1,
      processing_started_at = now(), processed_at = NULL, error_message = NULL,
      event_type = p_event_type, payload = p_payload
  WHERE id = event_row.id;
  RETURN jsonb_build_object('state', 'claimed', 'id', event_row.id);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_gateway_webhook_event(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_gateway_webhook_event(TEXT, TEXT, TEXT, JSONB) TO service_role;

-- Sincroniza plano ou matrícula por contrato sob um advisory lock. O snapshot
-- da API é autoritativo; fallback só aplica quando não é anterior ao estado já
-- persistido.
CREATE OR REPLACE FUNCTION public.sync_gateway_subscription(
  p_gateway TEXT,
  p_gateway_subscription_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_plan_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'pending',
  p_gateway_status TEXT DEFAULT NULL,
  p_current_period_end TIMESTAMPTZ DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL,
  p_gateway_updated_at TIMESTAMPTZ DEFAULT NULL,
  p_cancel_at_period_end BOOLEAN DEFAULT false,
  p_authoritative BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  sub_row public.subscriptions%ROWTYPE;
  enrollment_row public.enrollments%ROWTYPE;
  effective_updated_at TIMESTAMPTZ := coalesce(p_gateway_updated_at, now());
  access_allowed BOOLEAN;
  resolved_access_end TIMESTAMPTZ;
BEGIN
  IF nullif(trim(p_gateway), '') IS NULL OR nullif(trim(p_gateway_subscription_id), '') IS NULL THEN
    RAISE EXCEPTION 'gateway e gateway_subscription_id são obrigatórios';
  END IF;
  IF p_status NOT IN ('active','trialing','pending','past_due','suspended','canceled','refunded','chargeback','expired') THEN
    RAISE EXCEPTION 'status de assinatura inválido';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_gateway || ':' || p_gateway_subscription_id, 0));

  SELECT * INTO sub_row FROM public.subscriptions
  WHERE gateway = p_gateway AND gateway_subscription_id = p_gateway_subscription_id
  FOR UPDATE;

  IF FOUND THEN
    IF NOT p_authoritative AND sub_row.gateway_updated_at IS NOT NULL
       AND effective_updated_at < sub_row.gateway_updated_at THEN
      RETURN jsonb_build_object('applied', false, 'stale', true, 'subscription_id', sub_row.id);
    END IF;
    resolved_access_end := CASE
      WHEN p_status IN ('past_due', 'canceled') AND p_current_period_end IS NULL
        THEN sub_row.current_period_end
      ELSE p_current_period_end
    END;
    IF coalesce(p_plan_id, sub_row.plan_id) IS NOT NULL
       AND public.subscription_grants_access(p_status, resolved_access_end) THEN
      UPDATE public.subscriptions
      SET status = 'expired', current_period_end = now(), updated_at = now()
      WHERE user_id = sub_row.user_id AND plan_id = coalesce(p_plan_id, sub_row.plan_id)
        AND id <> sub_row.id AND status IN ('active', 'trialing');
    END IF;
    UPDATE public.subscriptions SET
      user_id = coalesce(user_id, p_user_id),
      plan_id = coalesce(p_plan_id, plan_id),
      status = p_status,
      gateway_status = p_gateway_status,
      gateway_updated_at = effective_updated_at,
      current_period_end = resolved_access_end,
      amount = coalesce(p_amount, amount),
      cancel_at_period_end = p_cancel_at_period_end,
      canceled_at = CASE WHEN p_status = 'canceled' THEN coalesce(canceled_at, now()) ELSE NULL END,
      updated_at = now()
    WHERE id = sub_row.id;
    RETURN jsonb_build_object('applied', true, 'stale', false, 'subscription_id', sub_row.id);
  END IF;

  SELECT * INTO enrollment_row FROM public.enrollments
  WHERE gateway = p_gateway AND gateway_subscription_id = p_gateway_subscription_id
  FOR UPDATE;
  IF FOUND THEN
    IF NOT p_authoritative AND enrollment_row.gateway_updated_at IS NOT NULL
       AND effective_updated_at < enrollment_row.gateway_updated_at THEN
      RETURN jsonb_build_object('applied', false, 'stale', true, 'enrollment_id', enrollment_row.id);
    END IF;
    resolved_access_end := CASE
      WHEN p_status IN ('past_due', 'canceled') AND p_current_period_end IS NULL
        THEN enrollment_row.expires_at
      ELSE p_current_period_end
    END;
    access_allowed := public.subscription_grants_access(p_status, resolved_access_end);
    UPDATE public.enrollments SET
      course_id = coalesce(p_course_id, course_id),
      status = CASE WHEN access_allowed THEN 'active' ELSE 'inactive' END,
      expires_at = resolved_access_end,
      gateway_updated_at = effective_updated_at
    WHERE id = enrollment_row.id;
    RETURN jsonb_build_object('applied', true, 'stale', false, 'enrollment_id', enrollment_row.id);
  END IF;

  -- Atualização pendente/suspensa de contrato desconhecido fica só na auditoria.
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'stale', false);
  END IF;

  IF p_plan_id IS NOT NULL THEN
    SELECT * INTO sub_row FROM public.subscriptions
    WHERE user_id = p_user_id AND plan_id = p_plan_id AND status IN ('active', 'trialing')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    IF FOUND THEN
      UPDATE public.subscriptions SET
        status = p_status, amount = coalesce(p_amount, amount), gateway = p_gateway,
        gateway_subscription_id = p_gateway_subscription_id,
        gateway_status = p_gateway_status, gateway_updated_at = effective_updated_at,
        current_period_end = p_current_period_end,
        cancel_at_period_end = p_cancel_at_period_end,
        canceled_at = CASE WHEN p_status = 'canceled' THEN coalesce(canceled_at, now()) ELSE NULL END,
        updated_at = now()
      WHERE id = sub_row.id;
      RETURN jsonb_build_object('applied', true, 'stale', false, 'subscription_id', sub_row.id);
    END IF;
    INSERT INTO public.subscriptions (
      user_id, plan_id, status, amount, gateway, gateway_subscription_id,
      gateway_status, gateway_updated_at, started_at, current_period_end,
      cancel_at_period_end, canceled_at, updated_at
    ) VALUES (
      p_user_id, p_plan_id, p_status, coalesce(p_amount, 0), p_gateway,
      p_gateway_subscription_id, p_gateway_status, effective_updated_at, now(),
      p_current_period_end, p_cancel_at_period_end,
      CASE WHEN p_status = 'canceled' THEN now() ELSE NULL END, now()
    ) RETURNING * INTO sub_row;
    RETURN jsonb_build_object('applied', true, 'stale', false, 'subscription_id', sub_row.id);
  END IF;

  IF p_course_id IS NOT NULL THEN
    access_allowed := public.subscription_grants_access(p_status, p_current_period_end);
    INSERT INTO public.enrollments (
      user_id, course_id, status, enrolled_at, expires_at, gateway,
      gateway_subscription_id, gateway_updated_at
    ) VALUES (
      p_user_id, p_course_id, CASE WHEN access_allowed THEN 'active' ELSE 'inactive' END,
      now(), p_current_period_end, p_gateway, p_gateway_subscription_id, effective_updated_at
    )
    ON CONFLICT (user_id, course_id) DO UPDATE SET
      status = EXCLUDED.status, expires_at = EXCLUDED.expires_at,
      gateway = EXCLUDED.gateway, gateway_subscription_id = EXCLUDED.gateway_subscription_id,
      gateway_updated_at = EXCLUDED.gateway_updated_at
    RETURNING * INTO enrollment_row;
    RETURN jsonb_build_object('applied', true, 'stale', false, 'enrollment_id', enrollment_row.id);
  END IF;

  RETURN jsonb_build_object('applied', false, 'stale', false);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_gateway_subscription(TEXT, TEXT, UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, NUMERIC, TIMESTAMPTZ, BOOLEAN, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_gateway_subscription(TEXT, TEXT, UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, NUMERIC, TIMESTAMPTZ, BOOLEAN, BOOLEAN) TO service_role;

/*
 * `pg_cron` não está instalado neste projeto (ver 20260821180000), então a
 * expiração é disparada por um cron da Vercel que chama esta função pela
 * service role. As consultas de acesso já comparam `current_period_end`, mas o
 * status precisa acompanhar para as listas e as análises não mentirem.
 */
CREATE OR REPLACE FUNCTION public.expire_ended_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired'
  WHERE status IN ('active', 'trialing', 'past_due')
    AND current_period_end IS NOT NULL
    AND current_period_end <= now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Só a service role executa: não há caso de uso para o navegador.
REVOKE ALL ON FUNCTION public.expire_ended_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_ended_subscriptions() TO service_role;

-- ----------------------------------------------------------------------------
-- 5. Buraco de entitlement: plano que dá acesso a curso não dava acesso à aula
-- ----------------------------------------------------------------------------

/*
 * As policies de `modules`, `lessons`, `attachments` e `content_embeddings`
 * (20260815115400, revistas em 20260820120000) olhavam SÓ para `enrollments`.
 * Nenhuma migração posterior acrescentou assinatura. O resultado: quem comprava
 * um plano recebia `hasAccess: true` de `hasCourseAccess` (courseAccess.ts) — a
 * camada TS sempre considerou plano — e o banco devolvia zero aulas. A busca já
 * contornava isso com SECURITY DEFINER e a vitrine com `gallery_lesson_previews`;
 * a sala de aula não tinha contorno nenhum.
 *
 * A regra correta já existe pronta em `user_entitled_course_ids()`
 * (20260823140000): matrícula ativa não expirada UNION cursos cobertos por
 * assinatura ativa em plano ativo, via `plan_allows_course`. Reusar em vez de
 * escrever a terceira cópia da mesma regra é o ponto: quando a definição de
 * "tem direito ao curso" mudar, muda num lugar só.
 *
 * Ganho de performance de brinde: a função não recebe argumentos e é STABLE,
 * então o planner a avalia uma vez por statement, enquanto o EXISTS correlato
 * de antes reexecutava por linha.
 */

/*
 * A função tinha `REVOKE ALL ... FROM PUBLIC, anon, authenticated` porque era
 * "de uso interno de search_documents". Agora ela é chamada de dentro de uma
 * policy, e a expressão da policy roda com os privilégios de quem consulta —
 * sem este GRANT, todo SELECT de aula quebraria por permissão negada.
 *
 * Devolver o EXECUTE não vaza nada: a função lê `auth.uid()` internamente e só
 * consegue devolver os direitos de quem chamou. Chamá-la por
 * `/rest/v1/rpc/user_entitled_course_ids` devolve à pessoa a lista de cursos que
 * ela já sabe que tem — nenhuma informação nova.
 *
 * O linter do Supabase marca isto como `authenticated_security_definer_function_executable`.
 * É esperado e o aviso deve ficar: REVOGAR ESTE GRANT DERRUBA O ACESSO ÀS AULAS,
 * porque a expressão de uma policy roda com os privilégios de quem consulta.
 */
GRANT EXECUTE ON FUNCTION public.user_entitled_course_ids() TO authenticated;

DROP POLICY IF EXISTS "Módulos visíveis apenas para alunos matriculados ou admin" ON public.modules;
CREATE POLICY "Módulos visíveis apenas para alunos matriculados ou admin" ON public.modules
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR course_id = ANY (public.user_entitled_course_ids())
);

DROP POLICY IF EXISTS "Aulas visíveis apenas para alunos matriculados ou admin" ON public.lessons;
CREATE POLICY "Aulas visíveis apenas para alunos matriculados ou admin" ON public.lessons
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = lessons.module_id
      AND m.course_id = ANY (public.user_entitled_course_ids())
  )
);

DROP POLICY IF EXISTS "Anexos seguem a aula" ON public.attachments;
CREATE POLICY "Anexos seguem a aula" ON public.attachments
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    WHERE l.id = attachments.lesson_id
      AND m.course_id = ANY (public.user_entitled_course_ids())
  )
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'content_embeddings') THEN
    DROP POLICY IF EXISTS "Acesso as embeddings requer matrícula na aula ou admin" ON public.content_embeddings;
    CREATE POLICY "Acesso as embeddings requer matrícula na aula ou admin" ON public.content_embeddings
    FOR SELECT TO authenticated
    USING (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.lessons l
        JOIN public.modules m ON m.id = l.module_id
        WHERE l.id = content_embeddings.lesson_id
          AND m.course_id = ANY (public.user_entitled_course_ids())
      )
    );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Backfill: aproveita o que o admin já cadastrou
-- ----------------------------------------------------------------------------

/*
 * Os códigos de gateway já estavam preenchidos em dois lugares — só não havia
 * nada que os lesse. Migra os dois para `gateway_products` para que a
 * integração comece já mapeada em vez de exigir recadastro manual.
 */

-- 6a. Planos: `gateway_product_id` + metadados dentro de `features`.
INSERT INTO public.gateway_products (gateway, product_id, offer_id, plan_id, access_days, is_active)
SELECT
  lower(coalesce(p.features ->> 'gateway', 'eduzz')),
  trim(p.gateway_product_id),
  nullif(trim(coalesce(p.features ->> 'offerId', '')), ''),
  p.id,
  CASE
    WHEN coalesce(p.features ->> 'accessTimeDays', '') ~ '^[0-9]+$'
     AND (p.features ->> 'accessTimeDays')::integer > 0
    THEN (p.features ->> 'accessTimeDays')::integer
  END,
  coalesce(p.is_active, true)
FROM public.plans p
WHERE nullif(trim(coalesce(p.gateway_product_id, '')), '') IS NOT NULL
  AND lower(coalesce(p.features ->> 'gateway', 'eduzz')) IN ('eduzz', 'hotmart', 'kiwify', 'stripe', 'manual')
ON CONFLICT DO NOTHING;

-- 6b. Cursos: cada oferta de `sales_config.integracoes[]` vira uma linha.
INSERT INTO public.gateway_products (gateway, product_id, offer_id, course_id, access_days, is_active)
SELECT
  lower(oferta ->> 'plataforma'),
  trim(oferta ->> 'produtoId'),
  nullif(trim(coalesce(oferta ->> 'codigoOferta', '')), ''),
  c.id,
  CASE
    WHEN coalesce(oferta ->> 'tempoAcesso', '') ~ '^[0-9]+$'
     AND (oferta ->> 'tempoAcesso')::integer > 0
    THEN (oferta ->> 'tempoAcesso')::integer
  END,
  true
FROM public.courses c
CROSS JOIN LATERAL jsonb_array_elements(c.sales_config -> 'integracoes') AS oferta
WHERE jsonb_typeof(c.sales_config -> 'integracoes') = 'array'
  AND lower(coalesce(oferta ->> 'plataforma', '')) IN ('eduzz', 'hotmart', 'kiwify', 'stripe', 'manual')
  AND nullif(trim(coalesce(oferta ->> 'produtoId', '')), '') IS NOT NULL
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. Documentação das colunas menos óbvias
-- ----------------------------------------------------------------------------

COMMENT ON TABLE public.gateway_products IS
  'De qual produto/oferta do gateway nasce qual plano ou curso. Exatamente um alvo por linha.';
COMMENT ON COLUMN public.gateway_products.offer_id IS
  'NULL funciona como curinga: vale para qualquer oferta do produto. A resolução tenta a oferta exata antes do curinga.';
COMMENT ON COLUMN public.gateway_products.access_days IS
  'Dias de acesso concedidos na compra. NULL = segue a frequência do plano, ou vitalício para curso avulso.';
COMMENT ON TABLE public.gateway_webhook_events IS
  'Log autenticado dos webhooks. O índice único e o lease de processamento garantem idempotência.';
COMMENT ON TABLE public.gateway_transactions IS
  'Registro financeiro por transação do gateway. Fonte de verdade das análises de receita.';

-- Configuração e auditoria passam apenas por Server Actions/service role.
REVOKE ALL ON TABLE public.gateway_products FROM anon, authenticated;
REVOKE ALL ON TABLE public.gateway_webhook_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.gateway_transactions FROM anon, authenticated;
GRANT ALL ON TABLE public.gateway_products TO service_role;
GRANT ALL ON TABLE public.gateway_webhook_events TO service_role;
GRANT ALL ON TABLE public.gateway_transactions TO service_role;
