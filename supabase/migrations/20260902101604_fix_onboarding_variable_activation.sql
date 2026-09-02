-- Alguns bancos aplicam proteção contra UPDATE sem filtro. A publicação
-- desativa somente definições ativas antes de reativar as presentes na versão.
-- Reescrevemos a função já criada, preservando assinatura e permissões.
DO $migration$
DECLARE
  current_definition TEXT;
  fixed_definition TEXT;
BEGIN
  SELECT pg_get_functiondef(
    'public.publish_trail_questionnaire(jsonb,text)'::regprocedure
  ) INTO current_definition;

  IF current_definition IS NULL THEN
    RAISE EXCEPTION 'Função publish_trail_questionnaire não encontrada.';
  END IF;

  fixed_definition := regexp_replace(
    current_definition,
    $pattern$UPDATE public[.]onboarding_variable_definitions[[:space:]]+SET active = false;$pattern$,
    'UPDATE public.onboarding_variable_definitions SET active = FALSE WHERE active IS DISTINCT FROM FALSE;',
    'i'
  );

  IF fixed_definition = current_definition THEN
    RAISE EXCEPTION 'A definição da função não contém o UPDATE esperado.';
  END IF;

  EXECUTE fixed_definition;
END;
$migration$;

NOTIFY pgrst, 'reload schema';
