import Link from "next/link";
import { ArrowLeft, Clock, LogIn, Monitor, FileEdit, Info } from "lucide-react";
import { Card, EmptyState, Table } from "@heroui/react";
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
    let cor = "text-muted";
    let bg = "bg-background-secondary";

    if (log.action === "login") {
      acao = "Login";
      detalhe = "Acesso à plataforma";
      icon = LogIn;
      cor = "text-success-soft-foreground";
      bg = "bg-success-soft";
    } else if (log.action === "update_profile") {
      acao = "Atualização de Perfil";
      detalhe = "Alterou dados do perfil";
      icon = FileEdit;
      cor = "text-accent-soft-foreground";
      bg = "bg-accent-soft";
    } else if (log.action === "course_access") {
      acao = "Acesso a Curso";
      detalhe = log.metadata?.course_name ? `Acessou: ${log.metadata.course_name}` : "Acessou um curso";
      icon = Monitor;
      cor = "text-warning-soft-foreground";
      bg = "bg-warning-soft";
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
        <Link href={`/admin/users/${id}`} className="inline-flex items-center gap-2 text-muted hover:text-accent transition-colors text-sm font-medium mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Perfil
        </Link>
        <PageHeader 
          eyebrow="Logs e Atividades" 
          title="Histórico de Acesso" 
          description="Visualize as últimas ações e sessões do usuário na plataforma."
        />
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Últimas atividades</Card.Title>
        </Card.Header>

        <Card.Content className="px-0 pb-0">
          {historico.length === 0 ? (
            <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                <Clock className="size-5 text-muted" aria-hidden="true" />
              </span>
              <p className="font-semibold text-foreground">Nenhuma atividade registrada</p>
              <p className="text-sm text-muted">As ações deste usuário aparecerão aqui assim que acontecerem.</p>
            </EmptyState>
          ) : (
            <>
              <div className="hidden md:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Histórico de acesso do usuário">
                      <Table.Header>
                        <Table.Column isRowHeader>Ação</Table.Column>
                        <Table.Column>Detalhe</Table.Column>
                        <Table.Column>Data e hora</Table.Column>
                        <Table.Column>Endereço IP</Table.Column>
                      </Table.Header>
                      <Table.Body items={historico}>
                        {(log) => {
                          const Icon = log.icon;
                          return (
                            <Table.Row id={log.id}>
                              <Table.Cell>
                                <div className="flex items-center gap-3">
                                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${log.bg} ${log.cor}`}>
                                    <Icon className="size-4" aria-hidden="true" />
                                  </span>
                                  <span className="font-semibold text-foreground">{log.acao}</span>
                                </div>
                              </Table.Cell>
                              <Table.Cell className="text-muted">{log.detalhe}</Table.Cell>
                              <Table.Cell className="font-medium text-foreground">{log.data}</Table.Cell>
                              <Table.Cell className="font-mono text-xs text-muted">{log.ip}</Table.Cell>
                            </Table.Row>
                          );
                        }}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              <ul className="divide-y divide-separator md:hidden">
                {historico.map((log) => {
                  const Icon = log.icon;
                  return (
                    <li key={log.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${log.bg} ${log.cor}`}>
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground">{log.acao}</p>
                          <p className="mt-1 text-sm text-muted">{log.detalhe}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-muted">
                        <span className="flex items-center gap-1 font-medium"><Clock className="size-3" aria-hidden="true" /> {log.data}</span>
                        <span className="font-mono">{log.ip}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
