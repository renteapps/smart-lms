-- Sincronização de Role de Perfil com auth.users.raw_app_meta_data e ajuste da função is_admin()

-- 1. Sincroniza perfis existentes de administradores com o app_metadata
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE id IN (
  SELECT id FROM public.profiles WHERE role = 'admin'
);

-- 2. Trigger para manter raw_app_meta_data sempre sincronizado com public.profiles.role
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_app_metadata()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role) OR (TG_OP = 'INSERT') THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS on_profile_role_changed ON public.profiles;
CREATE TRIGGER on_profile_role_changed
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_to_app_metadata();

-- 3. Atualiza is_admin() para checar tanto o app_metadata do token JWT quanto a tabela profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- 1. Checagem rápida no token JWT (app_metadata seguro)
  IF (COALESCE(auth.jwt()->'app_metadata'->>'role', '') = 'admin') THEN
    RETURN true;
  END IF;

  -- 2. Checagem direta na tabela profiles (usando o id do usuário logado)
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
