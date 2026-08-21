-- Funções RPC para reordenação atômica de módulos e aulas.
-- Substitui as N chamadas individuais .update() do supabase-js por uma única
-- chamada RPC, eliminando problemas de cache e garantindo atomicidade.

-- =============================================================================
-- reorder_modules: reordena módulos de um curso
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reorder_modules(
  p_course_id uuid,
  p_ordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_expected_count int;
  v_actual_count int;
BEGIN
  -- Validate: no duplicates
  IF array_length(p_ordered_ids, 1) IS DISTINCT FROM (
    SELECT count(DISTINCT u) FROM unnest(p_ordered_ids) u
  ) THEN
    RAISE EXCEPTION 'A lista de módulos contém itens duplicados.';
  END IF;

  -- Validate: all IDs belong to this course and the count matches
  SELECT count(*) INTO v_expected_count
  FROM public.modules
  WHERE course_id = p_course_id;

  SELECT count(*) INTO v_actual_count
  FROM public.modules
  WHERE course_id = p_course_id
    AND id = ANY(p_ordered_ids);

  IF v_expected_count <> array_length(p_ordered_ids, 1)
     OR v_actual_count <> array_length(p_ordered_ids, 1) THEN
    RAISE EXCEPTION 'A lista de módulos não corresponde ao conteúdo atual do curso.';
  END IF;

  -- Perform the reorder in a single UPDATE
  UPDATE public.modules
  SET order_index = array_position(p_ordered_ids, id)
  WHERE course_id = p_course_id
    AND id = ANY(p_ordered_ids);
END;
$$;

-- =============================================================================
-- reorder_lessons: reordena aulas de um módulo
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reorder_lessons(
  p_module_id uuid,
  p_ordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_expected_count int;
  v_actual_count int;
BEGIN
  -- Validate: no duplicates
  IF array_length(p_ordered_ids, 1) IS DISTINCT FROM (
    SELECT count(DISTINCT u) FROM unnest(p_ordered_ids) u
  ) THEN
    RAISE EXCEPTION 'A lista de aulas contém itens duplicados.';
  END IF;

  -- Validate: all IDs belong to this module and the count matches
  SELECT count(*) INTO v_expected_count
  FROM public.lessons
  WHERE module_id = p_module_id;

  SELECT count(*) INTO v_actual_count
  FROM public.lessons
  WHERE module_id = p_module_id
    AND id = ANY(p_ordered_ids);

  IF v_expected_count <> array_length(p_ordered_ids, 1)
     OR v_actual_count <> array_length(p_ordered_ids, 1) THEN
    RAISE EXCEPTION 'A lista de aulas não corresponde ao conteúdo atual do módulo.';
  END IF;

  -- Perform the reorder in a single UPDATE
  UPDATE public.lessons
  SET order_index = array_position(p_ordered_ids, id)
  WHERE module_id = p_module_id
    AND id = ANY(p_ordered_ids);
END;
$$;
