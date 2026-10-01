-- Retrato compacto das trilhas para a aba "Saúde & Resultados" de /admin/onboarding.
--
-- O painel baixava `trail_data` inteiro de todas as trilhas (30–50 KB por
-- aluno, quase tudo o array `items`) só para contar itens. Esta função devolve
-- uma linha por trilha com os totais já calculados no banco e apenas o que o
-- resumo precisa ler: respostas, rotina e feedback de carga.
--
-- SECURITY INVOKER: a RLS de `student_trails` e `profiles` continua valendo —
-- admin enxerga todas as linhas, aluno só a própria.

create or replace function public.admin_trail_snapshots()
returns table (
  user_id uuid,
  full_name text,
  questionnaire_version integer,
  answers jsonb,
  availability jsonb,
  feedback_history jsonb,
  total_items integer,
  completed_items integer,
  pending_items integer,
  pending_minutes numeric,
  projected_end_date text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path to ''
as $function$
  select
    st.user_id,
    p.full_name,
    nullif(st.trail_data->>'questionnaireVersion', '')::integer,
    coalesce(st.trail_data->'answers', '{}'::jsonb),
    st.trail_data->'availability',
    coalesce(st.trail_data->'feedbackHistory', '[]'::jsonb),
    counts.total_items,
    counts.completed_items,
    counts.pending_items,
    counts.pending_minutes,
    counts.projected_end_date,
    st.updated_at
  from public.student_trails st
  left join public.profiles p on p.id = st.user_id
  cross join lateral (
    select
      count(*)::integer as total_items,
      count(*) filter (where item->>'status' = 'completed')::integer as completed_items,
      count(*) filter (where item->>'status' is distinct from 'completed')::integer as pending_items,
      coalesce(sum(
        case when jsonb_typeof(item->'durationMin') = 'number' then (item->>'durationMin')::numeric end
      ) filter (where item->>'status' is distinct from 'completed'), 0) as pending_minutes,
      -- Último dia agendado do que falta: é a data em que o motor prevê o fim da trilha.
      max(nullif(item->>'scheduledDate', ''))
        filter (where item->>'status' is distinct from 'completed') as projected_end_date
    from jsonb_array_elements(
      case when jsonb_typeof(st.trail_data->'items') = 'array' then st.trail_data->'items' else '[]'::jsonb end
    ) as item
  ) counts
  order by st.user_id;
$function$;

revoke execute on function public.admin_trail_snapshots() from public, anon;
grant execute on function public.admin_trail_snapshots() to authenticated, service_role;
