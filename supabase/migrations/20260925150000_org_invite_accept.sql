-- Aceite de convite de empresa.
--
-- `organization_invites` já guardava um `token`, mas nada o consumia: o
-- convidado nunca virava membro. Estas duas funções fecham o fluxo usado pela
-- página /convite/[token]:
--
--   get_org_invite(token)    → o que mostrar na página (anon ou logado)
--   accept_org_invite(token) → vira membro, se o e-mail logado for o convidado
--
-- As duas são SECURITY DEFINER porque a RLS das tabelas de organização só deixa
-- gestores lerem convites/membros. O token é um UUID aleatório que só vai no
-- e-mail do convidado; é ele que autoriza a leitura, nada mais.

CREATE OR REPLACE FUNCTION public.get_org_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite record;
BEGIN
  SELECT i.email, i.status, i.expires_at, o.name, o.trade_name
    INTO v_invite
    FROM public.organization_invites i
    JOIN public.organizations o ON o.id = i.organization_id
   WHERE i.token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('state', 'invalid');
  END IF;

  RETURN jsonb_build_object(
    'state', CASE
      WHEN v_invite.status = 'accepted' THEN 'accepted'
      WHEN v_invite.status <> 'pending' THEN 'invalid'
      WHEN v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN 'expired'
      ELSE 'pending'
    END,
    'email', v_invite.email,
    'organization_name', coalesce(nullif(v_invite.trade_name, ''), v_invite.name)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_org_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite record;
  v_max_seats integer;
  v_occupied integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('state', 'unauthenticated');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- FOR UPDATE: dois cliques simultâneos não criam dois membros nem aceitam duas vezes.
  SELECT * INTO v_invite
    FROM public.organization_invites
   WHERE token = p_token
   FOR UPDATE;

  IF NOT FOUND OR v_invite.status NOT IN ('pending', 'accepted') THEN
    RETURN jsonb_build_object('state', 'invalid');
  END IF;

  IF lower(coalesce(v_user_email, '')) <> lower(v_invite.email) THEN
    RETURN jsonb_build_object('state', 'wrong_email', 'email', v_invite.email);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_members
     WHERE organization_id = v_invite.organization_id AND user_id = v_user_id
  ) THEN
    UPDATE public.organization_invites SET status = 'accepted' WHERE id = v_invite.id AND status = 'pending';
    RETURN jsonb_build_object('state', 'already_member');
  END IF;

  IF v_invite.status = 'accepted' THEN
    -- Aceito por outra conta com o mesmo e-mail (não deveria acontecer) ou membro removido depois.
    RETURN jsonb_build_object('state', 'invalid');
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    UPDATE public.organization_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN jsonb_build_object('state', 'expired');
  END IF;

  -- O convite pendente já ocupava a vaga (ver inviteMember); aqui só se barra
  -- quando o contrato encolheu depois do convite.
  SELECT max_seats INTO v_max_seats FROM public.organizations WHERE id = v_invite.organization_id;
  SELECT count(*) INTO v_occupied
    FROM public.organization_members
   WHERE organization_id = v_invite.organization_id
     AND status IS DISTINCT FROM 'disabled';
  IF v_max_seats IS NOT NULL AND v_occupied >= v_max_seats THEN
    RETURN jsonb_build_object('state', 'no_seats');
  END IF;

  INSERT INTO public.organization_members
    (organization_id, user_id, role, department, status, invited_at, joined_at)
  VALUES
    (v_invite.organization_id, v_user_id, coalesce(v_invite.role, 'employee'), v_invite.department,
     'active', v_invite.created_at, now());

  UPDATE public.organization_invites SET status = 'accepted' WHERE id = v_invite.id;

  RETURN jsonb_build_object('state', 'accepted', 'organization_id', v_invite.organization_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_org_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_org_invite(text) FROM PUBLIC;
-- Os default privileges do Supabase concedem EXECUTE a anon em toda função nova
-- do schema public; REVOKE FROM PUBLIC não cobre isso. Aceitar convite exige login.
REVOKE EXECUTE ON FUNCTION public.accept_org_invite(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_org_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_org_invite(text) TO authenticated;
