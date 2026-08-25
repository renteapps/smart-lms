-- Respostas de agentes com formato estruturado (varias secoes/topicos) estavam sendo
-- cortadas no meio porque o teto de tokens de saida (max_output_tokens / maxTokens)
-- era de apenas 1500 tokens, compartilhado por todas as funcoes de IA. Eleva o
-- padrao e os valores ja gravados para 4000 tokens.

alter table public.ai_feature_policies
  alter column max_output_tokens set default 4000;

update public.ai_feature_policies
set max_output_tokens = 4000,
    updated_at = now()
where max_output_tokens = 1500;

update public.integrations
set config = jsonb_set(config, '{maxTokens}', '4000', true),
    updated_at = now()
where slug = 'openrouter'
  and coalesce((config ->> 'maxTokens')::numeric, 0) = 1500;
