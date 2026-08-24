import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/supabase/auth";
import {
  EMPTY_ACCESS_CONTEXT,
  getProfileTestAccessContext,
  getProfileTestBySlug,
} from "@/lib/data/profileTests";
import {
  evaluateProfileTestAccess,
  getProfileTestDenialCopy,
  isProfileTestSlug,
} from "@/lib/profileTestAccess";
import { AccessNotice } from "./AccessNotice";
import { TakeTestClient } from "./TakeTestClient";

const NOT_FOUND_COPY = {
  title: "Teste indisponível",
  message: "Este teste não foi encontrado ou não está mais disponível.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isProfileTestSlug(slug)) return { title: NOT_FOUND_COPY.title };

  const { supabase } = await getSessionUser();
  const test = await getProfileTestBySlug(supabase, slug);
  if (!test || test.status !== "published") return { title: NOT_FOUND_COPY.title };

  // O link é feito para circular: garante card decente em WhatsApp e redes.
  return {
    title: test.title,
    description: test.description,
    alternates: { canonical: `/diagnostico/${test.slug}` },
    openGraph: {
      type: "website",
      title: test.title,
      description: test.description,
      url: `/diagnostico/${test.slug}`,
      images: test.coverUrl ? [{ url: test.coverUrl }] : undefined,
    },
    twitter: {
      card: test.coverUrl ? "summary_large_image" : "summary",
      title: test.title,
      description: test.description,
      images: test.coverUrl ? [test.coverUrl] : undefined,
    },
  };
}

export default async function DiagnosticoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isProfileTestSlug(slug)) return <AccessNotice {...NOT_FOUND_COPY} />;

  const { supabase, user } = await getSessionUser();
  const test = await getProfileTestBySlug(supabase, slug);
  if (!test) return <AccessNotice {...NOT_FOUND_COPY} />;

  const context = user
    ? await getProfileTestAccessContext(supabase, user.id, test.requiredCourseIds ?? [])
    : EMPTY_ACCESS_CONTEXT;

  const decision = evaluateProfileTestAccess({
    test,
    isLoggedIn: Boolean(user),
    isAdmin: context.isAdmin,
    courseIds: context.courseIds,
    planIds: context.planIds,
  });

  if (!decision.allowed) {
    if (decision.reason === "requires_login") {
      redirect(`/acessar?redirect=${encodeURIComponent(`/diagnostico/${test.slug}`)}`);
    }

    const copy = getProfileTestDenialCopy(decision.reason);
    return (
      <AccessNotice
        {...copy}
        primaryAction={
          decision.reason === "unpublished" ? { label: "Ver cursos", href: "/cursos" } : undefined
        }
        secondaryAction={
          decision.reason === "unpublished" ? undefined : { label: "Ir para o início", href: "/" }
        }
      />
    );
  }

  // Sem perguntas não há teste: rascunho em montagem, ou a RPC omitiu o
  // questionário por acesso — em ambos os casos abrir o runner só confundiria.
  if (test.questions.length === 0) {
    return (
      <AccessNotice
        title="Teste em preparação"
        message="Este teste ainda não tem perguntas publicadas. Tente novamente mais tarde."
        secondaryAction={{ label: "Ir para o início", href: "/" }}
      />
    );
  }

  return <TakeTestClient test={test} isPublicFlow={decision.anonymous} />;
}
