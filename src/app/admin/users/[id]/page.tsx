import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Clock,
  GraduationCap,
  KeyRound,
  List,
  Mail,
  MapPin,
  MonitorOff,
  Phone,
  Settings,
  ShieldCheck,
  UserRound,
  Calendar,
  Building,
} from "lucide-react";
import { ArrowRight02Icon } from "@/components/ui/arrow-right-02";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@heroui/react";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui/editorial";
import { getProfile, getLastLessonActivityAt, pickLatestTimestamp } from "@/lib/data/profiles";
import { getOverallProgress } from "@/lib/data/courses";
import { getAiCreditBalance } from "@/lib/aiCredits";
import { getAuthUserInfo } from "@/lib/supabase/authAdmin";
import { createClient } from "@/lib/supabase/server";
import { AiCreditAdminCard } from "./AiCreditAdminCard";
import { SupportActions } from "./SupportActions";

export default async function AdminUserDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getProfile(supabase, id);

  if (!profile) {
    notFound();
  }

  // Busca matrículas ativas do usuário
  const nowIso = new Date().toISOString();
  const [aiCreditBalance, { count: enrollments }, overallProgress, lastLessonActivityAt, authInfo] =
    await Promise.all([
      getAiCreditBalance(supabase, id),
      supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", id)
        .eq("status", "active")
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
      getOverallProgress(supabase, id),
      getLastLessonActivityAt(supabase, id),
      getAuthUserInfo(id),
    ]);

  const hasProgress = overallProgress.enrolledCourses > 0;
  const progressDisplay = hasProgress ? `${overallProgress.averagePercent}%` : "—";
  const progressHelper = hasProgress
    ? `${overallProgress.completedLessons}/${overallProgress.totalLessons} aulas concluídas`
    : "Sem matrículas ativas";
  const statusToDisplay = profile.status === "active" ? "Ativo" : "Inativo";

  const cards = [
    {
      title: "Editar Perfil",
      description: "Atualize os dados pessoais e de contato",
      icon: UserRound,
      href: `/admin/users/${id}/editar`,
      tone: "bg-accent-soft text-accent-soft-foreground",
    },
    {
      title: "Matrículas",
      description: "Gerencie os cursos e trilhas do usuário",
      icon: BookOpen,
      href: `/admin/users/${id}/matriculas`,
      tone: "bg-success-soft text-success-soft-foreground",
    },
    {
      title: "Histórico",
      description: "Visualize acessos e atividades recentes",
      icon: Clock,
      href: `/admin/users/${id}/historico`,
      tone: "bg-default text-default-foreground",
    },
    {
      title: "Configurações",
      description: "Permissões e acesso à plataforma",
      icon: Settings,
      href: `/admin/users/${id}/configuracoes`,
      tone: "bg-warning-soft text-warning-soft-foreground",
    }
  ];

  const lastAccessAt = pickLatestTimestamp(
    profile.lastAccessAt,
    authInfo?.lastSignInAt,
    lastLessonActivityAt,
  );
  const lastSeenDisplay = lastAccessAt
    ? new Date(lastAccessAt).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : "Nunca";

  const displayRole = profile.role === "admin" ? "Administrador" : profile.role === "instructor" ? "Instrutor" : "Aluno";

  return (
    <div className="space-y-7">
      <div>
        <Link
          href="/admin/users"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para Lista
        </Link>
        <PageHeader
          eyebrow="Perfil"
          title={profile.fullName}
          description={profile.email}
          actions={<StatusBadge tone={statusToDisplay === "Ativo" ? "positive" : "negative"}>{statusToDisplay}</StatusBadge>}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Papel"
          value={displayRole}
          icon={profile.role === "instructor" || profile.role === "admin" ? ShieldCheck : GraduationCap}
          tone="primary"
        />
        <StatCard label="Progresso Geral" value={progressDisplay} helper={progressHelper} icon={BookOpen} tone="sage" />
        <StatCard
          label="Último Acesso"
          value={lastSeenDisplay.split(",")[0] || lastSeenDisplay}
          helper={lastSeenDisplay.includes(",") ? lastSeenDisplay.split(",")[1]?.trim() : ""}
          icon={Clock}
          tone="neutral"
        />
        <StatCard label="Matrículas" value={(enrollments ?? 0).toString()} icon={List} tone="terracotta" />
      </div>

      <AiCreditAdminCard
        userId={id}
        userName={profile.fullName}
        initialBalance={aiCreditBalance}
      />

      <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumo do Perfil</CardTitle>
            <CardDescription>Dados profissionais, pessoais e de contato registrados</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Profissional */}
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background-secondary text-muted">
                <Building className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-muted">Empresa</p>
                <p className="text-sm font-semibold text-foreground">{profile.company || "Não informado"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background-secondary text-muted">
                <Briefcase className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-muted">Cargo / Departamento</p>
                <p className="text-sm font-semibold text-foreground">{profile.careerRole || "Não informado"}</p>
              </div>
            </div>

            {/* Contato */}
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background-secondary text-muted">
                <Phone className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-muted">Telefone</p>
                <p className="text-sm font-semibold text-foreground">{profile.phone || "Não informado"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background-secondary text-muted">
                <MapPin className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-muted">Localização</p>
                <p className="text-sm font-semibold text-foreground">
                  {[profile.city, profile.state, profile.country].filter(Boolean).join(", ") || profile.location || "Não informado"}
                </p>
              </div>
            </div>

            {/* Pessoais */}
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background-secondary text-muted">
                <Calendar className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-muted">Data de Nascimento</p>
                <p className="text-sm font-semibold text-foreground">
                  {profile.birthDate ? profile.birthDate.split('T')[0].split('-').reverse().join('/') : "Não informado"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background-secondary text-muted">
                <UserRound className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-muted">Gênero</p>
                <p className="text-sm font-semibold text-foreground">{profile.gender || "Não informado"}</p>
              </div>
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações de Suporte</CardTitle>
            <CardDescription>Resolva problemas de acesso do usuário</CardDescription>
          </CardHeader>
          <CardContent>
            <SupportActions userId={id} userEmail={profile.email} userName={profile.fullName} />
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <h2 className="mb-4 font-display text-xl font-bold text-foreground">Gerenciar Usuário</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href} className="group block rounded-xl">
                <Card className="h-full transition-shadow group-hover:shadow-overlay">
                  <CardHeader>
                    <span className={`mb-2 grid size-12 place-items-center rounded-xl ${card.tone}`}>
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <CardTitle className="group-hover:text-accent">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                      Abrir
                      <ArrowRight02Icon size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
