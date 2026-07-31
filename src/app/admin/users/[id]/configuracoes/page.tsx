"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Shield, KeyRound, Bell } from "lucide-react";

export default function AdminUserConfiguracoesPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-16">
      <header className="sticky top-[76px] z-10 -mx-3 flex flex-col gap-4 rounded-[10px] border border-border bg-bg/95 p-4 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div>
          <Link href={`/admin/users/${id}`} className="inline-flex items-center gap-2 text-text-soft hover:text-primary transition-colors text-sm font-medium mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Perfil
          </Link>
          <h1 className="text-3xl font-display font-black text-primary">Configurações de Conta</h1>
          <p className="text-text-soft mt-1">Gerencie acessos, segurança e preferências de comunicação.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link 
            href={`/admin/users/${id}`}
            className="flex-1 md:flex-none text-center bg-canvas-soft hover:bg-surface-hover text-ink px-6 py-3 rounded-lg font-semibold border border-border transition-all"
          >
            Cancelar
          </Link>
          <button className="flex-1 md:flex-none bg-primary hover:bg-primary-active text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-transform hover:scale-[1.02] active:scale-95">
            <Save className="w-5 h-5" />
            Salvar
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-surface-card rounded-2xl p-6 md:p-8 space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
              <Shield className="w-5 h-5 text-primary" />
              Permissões e Acesso
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Status da Conta</label>
                <select 
                  defaultValue="Ativo"
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink appearance-none"
                >
                  <option value="Ativo">Ativo (Pode acessar a plataforma)</option>
                  <option value="Inativo">Inativo (Acesso bloqueado temporariamente)</option>
                  <option value="Arquivado">Arquivado (Removido logicamente)</option>
                </select>
                <p className="text-xs text-text-mute mt-1.5">Contas inativas não poderão realizar login nem receber notificações.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Papel no Sistema (Role)</label>
                <select 
                  defaultValue="Aluno"
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink appearance-none"
                >
                  <option value="Aluno">Aluno</option>
                  <option value="Instrutor">Instrutor</option>
                  <option value="Admin">Administrador</option>
                </select>
                <p className="text-xs text-text-mute mt-1.5">O nível de privilégio determina o que o usuário pode ver e editar.</p>
              </div>
            </div>
          </section>

          <section className="bg-surface-card rounded-2xl p-6 md:p-8 space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
              <KeyRound className="w-5 h-5 text-primary" />
              Segurança
            </h2>
            <div className="space-y-6">
              <div>
                <button className="bg-canvas-soft hover:bg-surface-hover text-ink border border-border px-4 py-2.5 rounded-lg font-semibold transition-colors w-full md:w-auto">
                  Enviar link de redefinição de senha
                </button>
                <p className="text-xs text-text-mute mt-2">Um e-mail será enviado com instruções para que o usuário redefina sua própria senha.</p>
              </div>
              <div className="pt-4 border-t border-border">
                <button className="bg-negative/10 hover:bg-negative/20 text-negative border border-negative/20 px-4 py-2.5 rounded-lg font-semibold transition-colors w-full md:w-auto">
                  Forçar logoff de todas as sessões
                </button>
                <p className="text-xs text-text-mute mt-2">Isto desconectará o usuário imediatamente de todos os dispositivos.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-surface-card rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 border border-border/40">
            <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
              <Bell className="w-5 h-5 text-primary" />
              Comunicações
            </h2>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-primary rounded border-border focus:ring-primary focus:ring-2" />
                <div>
                  <span className="block text-sm font-semibold text-ink">E-mails Transacionais</span>
                  <span className="block text-xs text-text-mute">Confirmações de matrícula e conclusão de curso.</span>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-primary rounded border-border focus:ring-primary focus:ring-2" />
                <div>
                  <span className="block text-sm font-semibold text-ink">Marketing e Novidades</span>
                  <span className="block text-xs text-text-mute">Novos cursos, newsletters e comunicados da plataforma.</span>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-primary rounded border-border focus:ring-primary focus:ring-2" />
                <div>
                  <span className="block text-sm font-semibold text-ink">Lembretes de Estudo</span>
                  <span className="block text-xs text-text-mute">Notificações sobre cursos parados e tarefas pendentes.</span>
                </div>
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
