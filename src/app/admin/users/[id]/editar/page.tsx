"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, UserRound, MapPin, Briefcase } from "lucide-react";

export default function AdminUserEditarPage() {
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
          <h1 className="text-3xl font-display font-black text-primary">Editar Perfil</h1>
          <p className="text-text-soft mt-1">Atualize as informações pessoais e profissionais do usuário.</p>
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
              <UserRound className="w-5 h-5 text-primary" />
              Informações Pessoais
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">Nome Completo</label>
                  <input 
                    type="text" 
                    defaultValue="João Silva"
                    className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">E-mail</label>
                  <input 
                    type="email" 
                    defaultValue="joao@email.com"
                    className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">Telefone</label>
                  <input 
                    type="tel" 
                    defaultValue="(11) 98765-4321"
                    className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">Data de Nascimento</label>
                  <input 
                    type="date" 
                    defaultValue="1990-05-15"
                    className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-surface-card rounded-2xl p-6 md:p-8 space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
              <MapPin className="w-5 h-5 text-primary" />
              Endereço
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">CEP</label>
                <input 
                  type="text" 
                  defaultValue="01001-000"
                  className="w-full md:w-1/3 bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-text mb-1.5">Logradouro</label>
                  <input 
                    type="text" 
                    defaultValue="Praça da Sé"
                    className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">Número</label>
                  <input 
                    type="text" 
                    defaultValue="123"
                    className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">Bairro</label>
                  <input 
                    type="text" 
                    defaultValue="Sé"
                    className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">Cidade</label>
                  <input 
                    type="text" 
                    defaultValue="São Paulo"
                    className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1.5">Estado</label>
                  <select 
                    defaultValue="SP"
                    className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink appearance-none"
                  >
                    <option value="SP">São Paulo</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="MG">Minas Gerais</option>
                  </select>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-surface-card rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 border border-border/40">
            <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
              <Briefcase className="w-5 h-5 text-primary" />
              Profissional
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Empresa</label>
                <input 
                  type="text" 
                  defaultValue="Smart Corp"
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Cargo</label>
                <input 
                  type="text" 
                  defaultValue="Desenvolvedor"
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Departamento</label>
                <input 
                  type="text" 
                  defaultValue="Tecnologia"
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
