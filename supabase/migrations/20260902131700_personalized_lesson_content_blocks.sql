-- Aulas personalizadas passam a ser renderizadas pelo mesmo BlockViewer das aulas
-- normais. A geração continua produzindo Markdown enriquecido, mas o servidor o
-- converte para blocos (LessonContentBlock[]) e persiste em `content_blocks`.
--
-- Alto risco: o histórico legado de gerações é Markdown puro, sem blocos, e é
-- incompatível com o novo renderizador. O conteúdo antigo é descartado de
-- propósito (decisão do produto — nenhum aluno perde acesso, apenas gera de novo).
-- `ai_usage_events` (histórico financeiro) fica intacto.

-- 1) Coluna de blocos (mesmo padrão de `source_manifest` / `assistant_avatar`).
alter table public.personalized_lesson_generations
  add column content_blocks jsonb not null default '[]'::jsonb;

alter table public.personalized_lesson_generations
  add constraint personalized_lesson_generations_blocks_check
  check (jsonb_typeof(content_blocks) = 'array');

comment on column public.personalized_lesson_generations.content_blocks is
  'Conteúdo da aula em blocos do BlockViewer, convertido do Markdown enriquecido na conclusão da geração.';

-- 2) Limpeza autorizada do histórico legado. TRUNCATE não dispara o trigger
--    de imutabilidade (que é BEFORE UPDATE OR DELETE FOR EACH ROW) e nenhuma
--    FK aponta para esta tabela.
truncate table public.personalized_lesson_generations;

-- 3) A RPC de conclusão passa a gravar os blocos na MESMA transação de
--    liquidação. `p_content_blocks` entra por último e com default, então
--    chamadas posicionais mais curtas continuam resolvendo; o caller real usa
--    parâmetros nomeados.
drop function if exists public.complete_personalized_lesson_generation(
  uuid, text, numeric, numeric, numeric, numeric, bigint, bigint, bigint, bigint, text, text, jsonb
);

create or replace function public.complete_personalized_lesson_generation(
  p_generation_id uuid,
  p_content_markdown text,
  p_credits_charged numeric,
  p_provider_cost_usd numeric,
  p_provider_cost_brl numeric,
  p_protected_cost_brl numeric,
  p_prompt_tokens bigint,
  p_completion_tokens bigint,
  p_reasoning_tokens bigint default 0,
  p_cached_tokens bigint default 0,
  p_provider_generation_id text default null,
  p_pricing_source text default 'provider',
  p_metadata jsonb default '{}'::jsonb,
  p_content_blocks jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  generation public.personalized_lesson_generations%rowtype;
  usage_event public.ai_usage_events%rowtype;
  settlement jsonb;
begin
  if jsonb_typeof(coalesce(p_content_blocks, '[]'::jsonb)) <> 'array' then
    raise check_violation using message = 'content_blocks deve ser um array JSON.';
  end if;

  select * into generation
  from public.personalized_lesson_generations
  where id = p_generation_id
  for update;

  if not found then
    raise no_data_found using message = 'Geração personalizada não encontrada.';
  end if;
  if generation.status = 'ready' then
    return jsonb_build_object(
      'credits_charged', generation.credits_charged,
      'idempotent', true
    );
  end if;
  if generation.status <> 'generating' or generation.usage_event_id is null then
    raise check_violation using message = 'Geração personalizada não pode ser concluída.';
  end if;

  select * into usage_event
  from public.ai_usage_events
  where id = generation.usage_event_id
  for update;

  if not found
     or usage_event.user_id is distinct from generation.user_id
     or usage_event.feature <> 'personalized_lesson'
     or usage_event.model <> generation.model then
    raise check_violation using message = 'O evento financeiro não pertence a esta geração personalizada.';
  end if;

  settlement := public.settle_ai_usage(
    generation.usage_event_id,
    p_credits_charged,
    p_provider_cost_usd,
    p_provider_cost_brl,
    p_protected_cost_brl,
    p_prompt_tokens,
    p_completion_tokens,
    p_reasoning_tokens,
    p_cached_tokens,
    p_provider_generation_id,
    p_pricing_source,
    coalesce(p_metadata, '{}'::jsonb)
  );

  update public.personalized_lesson_generations
  set status = 'ready',
      content_markdown = btrim(p_content_markdown),
      content_blocks = coalesce(p_content_blocks, '[]'::jsonb),
      credits_charged = coalesce((settlement->>'credits_charged')::numeric, 0),
      finished_at = now(),
      error_code = null
  where id = p_generation_id;

  return settlement || jsonb_build_object('generation_id', p_generation_id);
end;
$$;

revoke all on function public.complete_personalized_lesson_generation(
  uuid, text, numeric, numeric, numeric, numeric, bigint, bigint, bigint, bigint, text, text, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.complete_personalized_lesson_generation(
  uuid, text, numeric, numeric, numeric, numeric, bigint, bigint, bigint, bigint, text, text, jsonb, jsonb
) to service_role;

notify pgrst, 'reload schema';
