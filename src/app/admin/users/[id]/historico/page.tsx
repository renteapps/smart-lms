"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, LogIn, Monitor, FileEdit } from "lucide-react";
import { PageHeader } from "@/components/ui/editorial";

const mockHistorico = [
  { id: "1", acao: "Login", detalhe: "Acesso via plataforma Web", data: "Hoje, 10:24", ip: "192.168.1.45", icon: LogIn, cor: "text-positive", bg: "bg-positive/10" },
  { id: "2", acao: "Atualização de Perfil", detalhe: "Alterou a foto de perfil", data: "Ontem, 14:12", ip: "192.168.1.45", icon: FileEdit, cor: "text-primary", bg: "bg-primary-pale" },
  { id: "3", acao: "Acesso a Curso", detalhe: "Iniciou: Inteligência Emocional no Trabalho", data: "20 jul, 09:05", ip: "200.155.10.2", icon: Monitor, cor: "text-accent-orange", bg: "bg-accent-orange/14" },
  { id: "4", acao: "Login", detalhe: "Acesso via aplicativo Mobile", data: "18 jul, 18:30", ip: "177.12.34.5", icon: LogIn, cor: "text-positive", bg: "bg-positive/10" },
];

export default function AdminUserHistoricoPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="space-y-7 pb-16">
      <div>
        <Link href={`/admin/users/${id}`} className="inline-flex items-center gap-2 text-text-soft hover:text-primary transition-colors text-sm font-medium mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Perfil
        </Link>
        <PageHeader 
          eyebrow="Logs e Atividades" 
          title="Histórico de Acesso" 
          description="Visualize as últimas ações e sessões do usuário na plataforma."
        />
      </div>

      <section className="editorial-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <h2 className="font-bold text-ink text-lg">Últimas Atividades</h2>
        </div>

        <div className="hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-canvas-soft/75 text-[11px] font-bold uppercase tracking-[0.09em] text-text-mute">
                <th className="px-5 py-3.5">Ação</th>
                <th className="px-5 py-3.5">Detalhe</th>
                <th className="px-5 py-3.5">Data e Hora</th>
                <th className="px-5 py-3.5">Endereço IP</th>
              </tr>
            </thead>
            <tbody>
              {mockHistorico.map((log) => {
                const Icon = log.icon;
                return (
                  <tr key={log.id} className="border-t border-border/70 hover:bg-primary-pale/20">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`grid h-9 w-9 place-items-center rounded-[11px] ${log.bg} ${log.cor}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="font-bold text-ink">{log.acao}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-text-soft">{log.detalhe}</td>
                    <td className="px-5 py-4 text-sm font-medium text-ink">{log.data}</td>
                    <td className="px-5 py-4 text-xs font-mono text-text-mute">{log.ip}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {mockHistorico.map((log) => {
            const Icon = log.icon;
            return (
              <article key={log.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${log.bg} ${log.cor}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{log.acao}</p>
                    <p className="mt-1 text-sm text-text-soft">{log.detalhe}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-text-mute">
                  <span className="font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> {log.data}</span>
                  <span className="font-mono">{log.ip}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
