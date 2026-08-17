import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Clock,
  GraduationCap,
  KeyRound,
  List,
  Mail,
  MonitorOff,
  Phone,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button, Card } from "@heroui/react";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui/editorial";
import { getProfile } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUserDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getProfile(supabase, id);

  if (!profile) {
    notFound();
  }

  // Busca matrículas do usuário
  const { count: enrollments } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", id)
    .eq("status", "active");

  const progressDisplay = profile.role === "student" ? "Calculando..." : "—";
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

  const lastSeenDisplay = profile.lastAccessAt 
    ? new Date(profile.lastAccessAt).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) 
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
        <StatCard label="Progresso Geral" value={progressDisplay} icon={BookOpen} tone="sage" />
        <StatCard
          label="Último Acesso"
          value={lastSeenDisplay.split(",")[0] || lastSeenDisplay}
          helper={lastSeenDisplay.includes(",") ? lastSeenDisplay.split(",")[1]?.trim() : ""}
          icon={Clock}
          tone="neutral"
        />
        <StatCard label="Matrículas" value={(enrollments ?? 0).toString()} icon={List} tone="terracotta" />
      </div>

      <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title>Resumo do Perfil</Card.Title>
            <Card.Description>Dados profissionais e de contato registrados</Card.Description>
          </Card.Header>
          <Card.Content className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background-secondary text-muted">
                <Briefcase className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-muted">Empresa / Departamento</p>
                <p className="text-sm font-semibold text-foreground">{profile.careerRole || "Não informado"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background-secondary text-muted">
                <Phone className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-muted">Telefone</p>
                <p className="text-sm font-semibold text-foreground">{profile.phone || "Não informado"}</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Ações de Suporte</Card.Title>
            <Card.Description>Resolva problemas de acesso do usuário</Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col gap-2">
            <Button variant="tertiary" fullWidth className="justify-start gap-3">
              <Mail className="size-4" aria-hidden="true" />
              Reenviar e-mail de acesso
            </Button>
            <Button variant="tertiary" fullWidth className="justify-start gap-3">
              <KeyRound className="size-4" aria-hidden="true" />
              Redefinir Senha
            </Button>
            <Button variant="danger-soft" fullWidth className="justify-start gap-3">
              <MonitorOff className="size-4" aria-hidden="true" />
              Forçar Logoff
            </Button>
          </Card.Content>
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
                  <Card.Header>
                    <span className={`mb-2 grid size-12 place-items-center rounded-xl ${card.tone}`}>
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <Card.Title className="group-hover:text-accent">{card.title}</Card.Title>
                    <Card.Description>{card.description}</Card.Description>
                  </Card.Header>
                  <Card.Footer>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                      Abrir
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </Card.Footer>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
