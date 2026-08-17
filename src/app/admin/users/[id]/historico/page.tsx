import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, LogIn, Monitor, FileEdit, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/editorial";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUserHistoricoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("actor_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Erro ao carregar histórico:", error);
    // Podemos exibir logs vazios ou tratar erro
  }

  // Mapear logs para a visualização
  const historico = (logs ?? []).map((log) => {
    let acao = log.action || "Ação genérica";
    let detalhe = "Nenhum detalhe disponível";
    let icon = Info;
    let cor = "text-neutral";
    let bg = "bg-neutral/10";

    if (log.action === "login") {
      acao = "Login";
      detalhe = "Acesso à plataforma";
      icon = LogIn;
      cor = "text-positive";
      bg = "bg-positive/10";
    } else if (log.action === "update_profile") {
      acao = "Atualização de Perfil";
      detalhe = "Alterou dados do perfil";
      icon = FileEdit;
      cor = "text-primary";
      bg = "bg-primary-pale";
    } else if (log.action === "course_access") {
      acao = "Acesso a Curso";
      detalhe = log.metadata?.course_name ? `Acessou: ${log.metadata.course_name}` : "Acessou um curso";
      icon = Monitor;
      cor = "text-accent-orange";
      bg = "bg-accent-orange/14";
    }

    return {
      id: log.id,
      acao,
      detalhe,
      data: new Date(log.created_at).toLocaleString("pt-BR", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      ip: log.ip_address || "Desconhecido",
      icon,
      cor,
      bg,
    };
  });

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
              {historico.map((log) => {
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
              {historico.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-text-mute">
                    Nenhuma atividade registrada para este usuário.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {historico.map((log) => {
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
          {historico.length === 0 && (
            <div className="p-8 text-center text-sm text-text-mute">
              Nenhuma atividade registrada para este usuário.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
