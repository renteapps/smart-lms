-- E-mails de ciclo de vida da assinatura (aviso de vencimento, expiração e
-- sequência de reconquista) — ver src/lib/billing/lifecycleEmails.ts.
--
-- subscription_email_sends: um registro por (assinatura, tipo, período). A
-- UNIQUE é a trava contra e-mail repetido: o cron diário pode rodar quantas
-- vezes for, cada passo sai uma vez por período. Quando a assinatura renova,
-- `current_period_end` muda e o ciclo recomeça naturalmente.
--
-- email_opt_outs: quem pediu para não receber uma categoria de e-mail
-- (hoje só 'winback'). Gravado pela página /descadastrar e pelo
-- List-Unsubscribe de um clique, ambos no servidor com service role.

CREATE TABLE IF NOT EXISTS public.subscription_email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN (
    'renewal_reminder', 'expiration_warning', 'subscription_expired',
    'winback_1', 'winback_2', 'winback_3', 'winback_4'
  )),
  period_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_email_sends_once UNIQUE (subscription_id, kind, period_end)
);

CREATE INDEX IF NOT EXISTS subscription_email_sends_user_idx
  ON public.subscription_email_sends (user_id);

-- DROP … IF EXISTS antes de cada CREATE: o arquivo pode ser rodado de novo
-- (ex.: colado no SQL Editor) sem erro de "already exists".
DROP TRIGGER IF EXISTS set_updated_at ON public.subscription_email_sends;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscription_email_sends
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.subscription_email_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins leem envios de ciclo de vida" ON public.subscription_email_sends;
CREATE POLICY "Admins leem envios de ciclo de vida"
  ON public.subscription_email_sends FOR SELECT
  USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.email_opt_outs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('winback')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);

ALTER TABLE public.email_opt_outs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário e admin leem descadastros" ON public.email_opt_outs;
CREATE POLICY "Usuário e admin leem descadastros"
  ON public.email_opt_outs FOR SELECT
  USING ((SELECT auth.uid()) = user_id OR public.is_admin());

-- Assinaturas por data de término: o cron varre uma janela de ~48 dias.
CREATE INDEX IF NOT EXISTS subscriptions_period_end_idx
  ON public.subscriptions (current_period_end)
  WHERE user_id IS NOT NULL AND current_period_end IS NOT NULL;
