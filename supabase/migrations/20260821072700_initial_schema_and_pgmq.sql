-- ============================================================================
-- PGMQ: Habilitar extensão e criar filas de background para o LMS
-- ============================================================================
-- Esta migração NÃO recria tabelas que já existem (courses, modules, lessons,
-- enrollments, lesson_progress). Ela apenas habilita o PGMQ e cria as filas
-- de mensageria necessárias para processar tarefas assíncronas em larga escala.
-- ============================================================================

-- 1. Habilitar a extensão pgmq
create extension if not exists pgmq;

-- 2. Criar as filas de mensageria para o LMS
--    Cada fila é consumida por workers dedicados (Edge Functions ou cron jobs).

-- Fila para envio de e-mails (boas-vindas, recuperação, notificações em massa)
select pgmq.create('email_jobs');

-- Fila para geração de certificados em PDF
select pgmq.create('certificate_jobs');

-- Fila para processamento de webhooks de pagamento (Stripe, Pagar.me, etc.)
select pgmq.create('webhook_jobs');

-- Fila para eventos de matrícula (dispara automações pós-matrícula)
select pgmq.create('enrollment_events');

-- 3. Índices de performance para hot paths existentes
--    O schema original não indexou todas as FKs. Em 600k alunos, JOINs
--    sem índice nas FKs causam sequential scans que travam o banco.

-- enrollments: FK course_id não tinha índice (user_id tem via UNIQUE)
create index if not exists idx_enrollments_course_id
  on public.enrollments (course_id);

-- lesson_progress: FK lesson_id não tinha índice (user_id tem via UNIQUE)
create index if not exists idx_lesson_progress_lesson_id
  on public.lesson_progress (lesson_id);

-- modules: FK course_id não tinha índice
create index if not exists idx_modules_course_id
  on public.modules (course_id);

-- lessons: FK module_id não tinha índice
create index if not exists idx_lessons_module_id
  on public.lessons (module_id);

-- courses: busca por slug é o hot path do catálogo (já tem UNIQUE, que cria índice)
-- courses: busca por is_published para catálogo público
create index if not exists idx_courses_published
  on public.courses (is_published)
  where is_published = true;

-- enrollments: busca de matrículas ativas por usuário (hot path do aluno)
create index if not exists idx_enrollments_user_active
  on public.enrollments (user_id)
  where status = 'active';

-- lesson_progress: busca de aulas completadas por usuário (cálculo de progresso)
create index if not exists idx_lesson_progress_user_completed
  on public.lesson_progress (user_id)
  where is_completed = true;
