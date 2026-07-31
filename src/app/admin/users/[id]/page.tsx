"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Clock, Settings, UserRound, GraduationCap, ShieldCheck, List, Mail, KeyRound, MonitorOff, Phone, Briefcase } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui/editorial";

const mockUsers = {
  "1": { id: "1", name: "João Silva", email: "joao@email.com", role: "Aluno", status: "Ativo", progress: "72%", lastSeen: "Hoje, 10:24", enrollments: 4 },
  "2": { id: "2", name: "Maria Souza", email: "maria@email.com", role: "Aluno", status: "Ativo", progress: "48%", lastSeen: "Ontem, 18:10", enrollments: 2 },
  "3": { id: "3", name: "Pedro Costa", email: "pedro@email.com", role: "Aluno", status: "Inativo", progress: "12%", lastSeen: "20 jul, 09:02", enrollments: 1 },
  "4": { id: "4", name: "Ana Beatriz", email: "ana@email.com", role: "Instrutora", status: "Ativo", progress: "—", lastSeen: "Hoje, 08:41", enrollments: 0 },
};

export default function AdminUserDashboard() {
  const params = useParams();
  const id = params.id as string;
  
  // Use mock data or a fallback if not found
  const user = mockUsers[id as keyof typeof mockUsers] || {
    id,
    name: "Usuário Desconhecido",
    email: "desconhecido@email.com",
    role: "Aluno",
    status: "Inativo",
    progress: "0%",
    lastSeen: "Nunca",
    enrollments: 0
  };

  const cards = [
    {
      title: "Editar Perfil",
      description: "Atualize os dados pessoais e de contato",
      icon: UserRound,
      href: `/admin/users/${id}/editar`,
      color: "bg-primary"
    },
    {
      title: "Matrículas",
      description: "Gerencie os cursos e trilhas do usuário",
      icon: BookOpen,
      href: `/admin/users/${id}/matriculas`,
      color: "bg-positive"
    },
    {
      title: "Histórico",
      description: "Visualize acessos e atividades recentes",
      icon: Clock,
      href: `/admin/users/${id}/historico`,
      color: "bg-text-soft" // Using a generic color that exists
    },
    {
      title: "Configurações",
      description: "Permissões e acesso à plataforma",
      icon: Settings,
      href: `/admin/users/${id}/configuracoes`,
      color: "bg-accent-orange"
    }
  ];

  return (
    <div className="space-y-7">
      <div className="mb-6">
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-text-soft hover:text-primary transition-colors text-sm font-medium mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Lista
        </Link>
        <PageHeader 
          eyebrow="Perfil" 
          title={user.name} 
          description={user.email} 
          actions={<StatusBadge tone={user.status === "Ativo" ? "positive" : "negative"}>{user.status}</StatusBadge>}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Papel" 
          value={user.role} 
          icon={user.role === "Instrutora" || user.role === "Instrutor" ? ShieldCheck : GraduationCap} 
          tone="primary" 
        />
        <StatCard 
          label="Progresso Geral" 
          value={user.progress} 
          icon={BookOpen} 
          tone="sage" 
        />
        <StatCard 
          label="Último Acesso" 
          value={user.lastSeen.split(",")[0]} 
          helper={user.lastSeen.includes(",") ? user.lastSeen.split(",")[1].trim() : ""}
          icon={Clock} 
          tone="neutral" 
        />
        <StatCard 
          label="Matrículas" 
          value={user.enrollments.toString()} 
          icon={List} 
          tone="terracotta" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <section className="editorial-card p-5 sm:p-6 lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-ink">Resumo do Perfil</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas-soft text-text-soft">
                <Briefcase className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-text-mute font-medium">Empresa / Departamento</p>
                <p className="text-sm font-semibold text-ink">Smart Corp · Tecnologia</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas-soft text-text-soft">
                <Phone className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-text-mute font-medium">Telefone</p>
                <p className="text-sm font-semibold text-ink">(11) 98765-4321</p>
              </div>
            </div>
          </div>
        </section>

        <section className="editorial-card p-5 sm:p-6 space-y-4">
          <h2 className="text-lg font-bold text-ink">Ações de Suporte</h2>
          <div className="flex flex-col gap-2">
            <button className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-surface-hover text-left transition-colors border border-transparent hover:border-border group">
              <Mail className="h-4 w-4 text-text-soft group-hover:text-primary transition-colors" />
              <span className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">Reenviar e-mail de acesso</span>
            </button>
            <button className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-surface-hover text-left transition-colors border border-transparent hover:border-border group">
              <KeyRound className="h-4 w-4 text-text-soft group-hover:text-primary transition-colors" />
              <span className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">Redefinir Senha</span>
            </button>
            <button className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-negative/5 text-left transition-colors border border-transparent hover:border-negative/20 group">
              <MonitorOff className="h-4 w-4 text-negative/70 group-hover:text-negative transition-colors" />
              <span className="text-sm font-semibold text-negative/90 group-hover:text-negative transition-colors">Forçar Logoff</span>
            </button>
          </div>
        </section>
      </div>
      
      <div className="pt-4">
        <h2 className="mb-4 text-xl font-extrabold text-ink">Gerenciar Usuário</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => {
            const Icon = card.icon;
            // Handle bg-text-soft properly by using a known class or standard tailwind class for the icon container
            const colorClass = card.color === "bg-text-soft" ? "bg-canvas-soft text-text-soft border border-border" : card.color + " text-white";
            return (
              <Link 
                key={i} 
                href={card.href}
                className="editorial-card editorial-card-interactive group block p-6"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="mb-2 text-lg font-extrabold text-ink group-hover:text-primary-active">{card.title}</h3>
                <p className="text-text-soft text-sm leading-relaxed">{card.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
