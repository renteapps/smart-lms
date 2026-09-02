-- A central administrativa pagina todas as gerações por data e pode filtrar
-- por status ou aluno sem depender do índice orientado a uma única aula.
create index personalized_lesson_generations_created_idx
  on public.personalized_lesson_generations (created_at desc, id desc);

create index personalized_lesson_generations_status_created_idx
  on public.personalized_lesson_generations (status, created_at desc, id desc);

create index personalized_lesson_generations_user_created_idx
  on public.personalized_lesson_generations (user_id, created_at desc, id desc);
