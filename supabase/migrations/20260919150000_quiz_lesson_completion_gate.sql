-- Aula de quiz só é concluída com aprovação no quiz.
--
-- A interface esconde "Marcar como concluído" em aulas de quiz, mas o aluno
-- conseguia concluí-las gravando lesson_progress direto (PostgREST, action ou
-- /api/lesson-progress) — e, com isso, fechar o curso e ganhar o certificado
-- sem acertar nada. submitQuizResult grava o resultado (service role) antes
-- de marcar a aula, então o fluxo legítimo passa por esta checagem.

create or replace function public.enforce_quiz_lesson_completion()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if new.is_completed is not true
     or (tg_op = 'UPDATE' and old.is_completed is true) then
    return new;
  end if;

  if current_user in ('postgres', 'supabase_admin', 'service_role') or (select public.is_admin()) then
    return new;
  end if;

  if exists (select 1 from public.lessons l where l.id = new.lesson_id and l.type = 'quiz')
     and not exists (
       select 1 from public.quiz_results qr
       where qr.user_id = new.user_id and qr.lesson_id = new.lesson_id and qr.passed is true
     ) then
    raise check_violation using message = 'Esta aula é concluída ao atingir a nota mínima no quiz.';
  end if;

  return new;
end;
$function$;

revoke execute on function public.enforce_quiz_lesson_completion() from public, anon, authenticated;

drop trigger if exists enforce_quiz_lesson_completion on public.lesson_progress;
create trigger enforce_quiz_lesson_completion
  before insert or update on public.lesson_progress
  for each row execute function public.enforce_quiz_lesson_completion();
