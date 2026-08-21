-- ============================================================================
-- MIGRAÇÃO: Atualiza a trigger de handle_new_user para capturar metadados do cadastro
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    avatar_url, 
    email,
    username,
    phone,
    birth_date,
    gender,
    career_role
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'phone',
    NULLIF(new.raw_user_meta_data->>'birth_date', '')::date,
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'role'
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    birth_date = COALESCE(public.profiles.birth_date, EXCLUDED.birth_date),
    gender = COALESCE(public.profiles.gender, EXCLUDED.gender),
    career_role = COALESCE(public.profiles.career_role, EXCLUDED.career_role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
