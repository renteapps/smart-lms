-- Hardening de segurança (auditoria 2026-09-18) — reaplicação de parte da B.
--
-- A parte B foi aplicada antes do deploy do código novo, então os trechos de
-- agentes e quiz_results foram revertidos para não derrubar o chat e o envio
-- de quiz do código antigo. APLICAR DEPOIS DO DEPLOY do PR de segurança.

-- Nota do quiz: só o servidor grava (submitQuizResult usa service role).
drop policy if exists "Users can insert their own quiz results" on public.quiz_results;
drop policy if exists "Users can update their own quiz results" on public.quiz_results;

-- Prompt, contexto, arquivos e roteiro dos agentes fora do PostgREST.
revoke select on public.agents from anon, authenticated;
grant select (
  id, slug, name, role, description, category, status, avatar, created_by,
  course_id, course_title, skills, rating, avg_minutes, greeting, starters,
  unavailable_note, is_published, order_index, created_at, updated_at,
  course_ids, plan_ids, theme_color, icon_svg, photo_url
) on public.agents to anon, authenticated;
