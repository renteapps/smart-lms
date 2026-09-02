import { createClient } from "@/lib/supabase/server";
import { getContentIndex } from "@/lib/data/content";
import { getDraftQuestionnaire, getPublishedQuestionnaire, listQuestionnaireVersions } from "@/lib/data/trail";
import { getOnboardingVariableDefinitions } from "@/lib/data/userVariables";
import { OnboardingClient } from "./OnboardingClient";

export const dynamic = "force-dynamic";

/**
 * Server Component: busca o rascunho, o publicado, o histórico de versões e o
 * catálogo real de conteúdo (cursos, módulos, aulas e artigos publicados) de
 * uma vez, sem o flash de dados mock que a versão anterior mostrava enquanto
 * o client component ainda não tinha ido ao Supabase.
 *
 * O `ContentIndex` não atravessa a fronteira server/client como objeto — ele
 * carrega métodos (`resolve`, `byId`...). Por isso repassamos os dados crus
 * (`items`, `eligibleLessons`) e o `OnboardingClient` remonta o índice local
 * com `createContentIndex`.
 */
export default async function AdminOnboardingPage() {
  const supabase = await createClient();

  const [draft, published, versions, index, variableDefinitions] = await Promise.all([
    getDraftQuestionnaire(supabase),
    getPublishedQuestionnaire(supabase),
    listQuestionnaireVersions(supabase),
    getContentIndex(supabase),
    getOnboardingVariableDefinitions(supabase),
  ]);

  return (
    <OnboardingClient
      initialDraft={draft}
      initialPublished={published}
      initialVersions={versions}
      contentItems={index.items}
      eligibleLessons={index.eligibleLessons}
      initialVariableDefinitions={variableDefinitions}
    />
  );
}
