-- Limpeza do histórico do Assistente IA pelo próprio aluno.
--
-- O aluno precisa poder recomeçar a conversa, mas o histórico é registro
-- auditável (crédito de IA cobrado, resposta dada em nome da plataforma) e a
-- própria interface promete que o administrador pode revisá-lo. Em vez de
-- apagar as linhas, marcamos o instante da limpeza: tudo que veio antes some
-- do chat do aluno e do contexto enviado ao modelo, e continua visível no
-- /admin/chat. A exclusão definitiva segue sendo ação administrativa.

alter table public.platform_assistant_conversations
  add column if not exists cleared_at timestamptz;

comment on column public.platform_assistant_conversations.cleared_at is
  'Momento em que o aluno limpou o próprio histórico. Mensagens anteriores somem do chat dele e do contexto da IA, mas continuam auditáveis no /admin/chat.';
