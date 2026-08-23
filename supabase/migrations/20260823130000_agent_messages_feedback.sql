-- Feedback do aluno (👍/👎) em respostas dos Agentes de IA.
--
-- Dá ao aluno uma forma rápida de sinalizar se uma resposta ajudou, sem abrir
-- outro canal — e alimenta, no futuro, a mesma tela de admin que já mostra
-- rating/sentiment por conversa.

alter table public.agent_messages
  add column if not exists feedback text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'agent_messages_feedback_check'
  ) then
    alter table public.agent_messages
      add constraint agent_messages_feedback_check
      check (feedback is null or feedback in ('up', 'down'));
  end if;
end
$$;

comment on column public.agent_messages.feedback is
  'Avaliação do aluno para uma resposta do agente: up, down ou null (sem avaliação).';
