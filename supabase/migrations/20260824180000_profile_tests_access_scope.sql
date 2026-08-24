-- A lista de restrição só significa alguma coisa dentro do seu modo de acesso.
--
-- O teste "Descubra seu Perfil de Liderança" estava como 'public' carregando um
-- curso em required_course_ids: alguém restringiu por curso, voltou para livre e
-- a lista ficou. É um resíduo invisível — o seletor some da tela quando o modo
-- muda — que voltaria a valer sozinho se o modo fosse trocado de volta.

UPDATE public.profile_tests
SET required_course_ids = '{}'
WHERE access_type <> 'course_owners' AND cardinality(required_course_ids) > 0;

UPDATE public.profile_tests
SET required_plan_ids = '{}'
WHERE access_type <> 'plan_owners' AND cardinality(required_plan_ids) > 0;

-- Só `saveProfileTest` e `duplicateProfileTest` escrevem nesta tabela, e ambos
-- normalizam antes de gravar; a restrição mantém o invariante verdadeiro para
-- qualquer escrita futura.
ALTER TABLE public.profile_tests
DROP CONSTRAINT IF EXISTS profile_tests_access_scope;

ALTER TABLE public.profile_tests
ADD CONSTRAINT profile_tests_access_scope CHECK (
  (access_type = 'course_owners' OR cardinality(required_course_ids) = 0)
  AND (access_type = 'plan_owners' OR cardinality(required_plan_ids) = 0)
);
