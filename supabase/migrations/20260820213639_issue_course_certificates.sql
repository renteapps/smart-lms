-- Emite uma única credencial quando todas as aulas publicadas do curso forem
-- concluídas. SECURITY INVOKER mantém as políticas RLS do usuário que gravou o
-- progresso; a função não é uma API pública e só é executada pelo trigger.
alter table public.courses
  add column if not exists enable_certificates boolean not null default true;

create or replace function public.issue_course_certificate_after_progress()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_course_id uuid;
begin
  if new.is_completed is not true then
    return new;
  end if;

  select m.course_id
    into target_course_id
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where l.id = new.lesson_id
    and c.enable_certificates is true;

  if target_course_id is null then
    return new;
  end if;

  -- Um curso sem aulas publicadas nunca é considerado concluído.
  if not exists (
    select 1
    from public.lessons l
    join public.modules m on m.id = l.module_id
    where m.course_id = target_course_id
      and l.is_published is true
  ) then
    return new;
  end if;

  if exists (
    select 1
    from public.lessons l
    join public.modules m on m.id = l.module_id
    where m.course_id = target_course_id
      and l.is_published is true
      and not exists (
        select 1
        from public.lesson_progress lp
        where lp.user_id = new.user_id
          and lp.lesson_id = l.id
          and lp.is_completed is true
      )
  ) then
    return new;
  end if;

  insert into public.certificates (user_id, course_id, validation_hash)
  values (new.user_id, target_course_id, gen_random_uuid()::text)
  on conflict (user_id, course_id) do nothing;

  return new;
end;
$$;

revoke execute on function public.issue_course_certificate_after_progress()
  from public, anon, authenticated;

drop trigger if exists issue_course_certificate_after_progress on public.lesson_progress;
create trigger issue_course_certificate_after_progress
  after insert or update of is_completed on public.lesson_progress
  for each row
  when (new.is_completed is true)
  execute function public.issue_course_certificate_after_progress();

-- Backfill idempotente para conclusões anteriores à automação.
insert into public.certificates (user_id, course_id, validation_hash)
select distinct completed.user_id, completed.course_id, gen_random_uuid()::text
from (
  select lp.user_id, m.course_id
  from public.lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where lp.is_completed is true
    and l.is_published is true
    and c.enable_certificates is true
) completed
where not exists (
  select 1
  from public.lessons pending_lesson
  join public.modules pending_module on pending_module.id = pending_lesson.module_id
  where pending_module.course_id = completed.course_id
    and pending_lesson.is_published is true
    and not exists (
      select 1
      from public.lesson_progress pending_progress
      where pending_progress.user_id = completed.user_id
        and pending_progress.lesson_id = pending_lesson.id
        and pending_progress.is_completed is true
    )
)
on conflict (user_id, course_id) do nothing;

create index if not exists subscriptions_user_status_period_idx
  on public.subscriptions (user_id, status, current_period_end);
