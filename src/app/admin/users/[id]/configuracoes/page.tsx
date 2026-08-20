"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Shield, KeyRound, Bell } from "lucide-react";
import { Button, Card, Checkbox, Label, ListBox, ListBoxItem, Select } from "@heroui/react";

const statusOptions = [
  { id: "Ativo", label: "Ativo (pode acessar a plataforma)" },
  { id: "Inativo", label: "Inativo (acesso bloqueado temporariamente)" },
  { id: "Arquivado", label: "Arquivado (removido logicamente)" },
];

const roleOptions = [
  { id: "Aluno", label: "Aluno" },
  { id: "Instrutor", label: "Instrutor" },
  { id: "Admin", label: "Administrador" },
];

const communicationPrefs = [
  { id: "transactional", title: "E-mails transacionais", description: "Confirmações de matrícula e conclusão de curso." },
  { id: "marketing", title: "Marketing e novidades", description: "Novos cursos, newsletters e comunicados da plataforma." },
  { id: "reminders", title: "Lembretes de estudo", description: "Notificações sobre cursos parados e tarefas pendentes." },
];

export default function AdminUserConfiguracoesPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <header className="sticky top-[92px] z-10 -mx-1 flex flex-col gap-4 rounded-xl border border-border bg-surface/95 p-4 shadow-elev-2 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div>
          <Link href={`/admin/users/${id}`} className="inline-flex items-center gap-2 text-muted hover:text-accent transition-colors text-sm font-medium mb-4">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar para o Perfil
          </Link>
          <h1 className="text-3xl font-display font-black text-foreground">Configurações de Conta</h1>
          <p className="text-muted mt-1">Gerencie acessos, segurança e preferências de comunicação.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link
            href={`/admin/users/${id}`}
            className="flex-1 md:flex-none text-center bg-background-secondary hover:bg-surface-hover text-foreground px-6 py-3 rounded-lg font-semibold border border-border transition-all"
          >
            Cancelar
          </Link>
          <Button variant="primary" className="flex-1 gap-2 md:flex-none">
            <Save className="size-4" aria-hidden="true" />
            Salvar
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Shield className="size-5 text-accent" aria-hidden="true" />
                Permissões e acesso
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-6">
              <Select defaultSelectedKey="Ativo">
                <Label>Status da conta</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {statusOptions.map((opt) => (
                      <ListBoxItem key={opt.id} id={opt.id}>{opt.label}</ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <p className="-mt-4 text-xs text-muted">Contas inativas não poderão realizar login nem receber notificações.</p>

              <Select defaultSelectedKey="Aluno">
                <Label>Papel no sistema (role)</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {roleOptions.map((opt) => (
                      <ListBoxItem key={opt.id} id={opt.id}>{opt.label}</ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <p className="-mt-4 text-xs text-muted">O nível de privilégio determina o que o usuário pode ver e editar.</p>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <KeyRound className="size-5 text-accent" aria-hidden="true" />
                Segurança
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-6">
              <div>
                <Button variant="secondary" fullWidth className="md:w-auto">
                  Enviar link de redefinição de senha
                </Button>
                <p className="text-xs text-muted mt-2">Um e-mail será enviado com instruções para que o usuário redefina sua própria senha.</p>
              </div>
              <div className="pt-4 border-t border-border">
                <Button variant="danger-soft" fullWidth className="md:w-auto">
                  Forçar logoff de todas as sessões
                </Button>
                <p className="text-xs text-muted mt-2">Isto desconectará o usuário imediatamente de todos os dispositivos.</p>
              </div>
            </Card.Content>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Bell className="size-5 text-accent" aria-hidden="true" />
                Comunicações
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              {communicationPrefs.map((pref) => (
                <Checkbox key={pref.id} defaultSelected className="items-start gap-3">
                  <Checkbox.Control className="mt-0.5">
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <span className="block text-sm font-semibold text-foreground">{pref.title}</span>
                    <span className="block text-xs font-normal text-muted">{pref.description}</span>
                  </Checkbox.Content>
                </Checkbox>
              ))}
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}
