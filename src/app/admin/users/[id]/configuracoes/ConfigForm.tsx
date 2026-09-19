"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/editorial";
import { Save, Shield, KeyRound, Bell } from "lucide-react";
import { Button, Card, Checkbox, Label, ListBox, ListBoxItem, Select } from "@heroui/react";
import { toast } from "@/lib/toast";
import { updateUserConfig, resetUserPassword, forceUserLogoff } from "../support-actions";

const statusOptions = [
  { id: "active", label: "Ativo (pode acessar a plataforma)" },
  { id: "inactive", label: "Inativo (acesso bloqueado temporariamente)" },
  { id: "archived", label: "Arquivado (removido logicamente)" },
];

const roleOptions = [
  { id: "student", label: "Aluno" },
  { id: "instructor", label: "Instrutor" },
  { id: "admin", label: "Administrador" },
];

const communicationPrefs = [
  { id: "transactional", title: "E-mails transacionais", description: "Confirmações de matrícula e conclusão de curso." },
  { id: "marketing", title: "Marketing e novidades", description: "Novos cursos, newsletters e comunicados da plataforma." },
  { id: "reminders", title: "Lembretes de estudo", description: "Notificações sobre cursos parados e tarefas pendentes." },
];

type ConfigFormProps = {
  userId: string;
  email: string;
  initialStatus: string;
  initialRole: string;
};

export function ConfigForm({ userId, email, initialStatus, initialRole }: ConfigFormProps) {
  const [status, setStatus] = useState(initialStatus);
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await updateUserConfig(userId, { status, role });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.danger(res.message || "Erro ao salvar configurações.");
      }
    } catch {
      toast.danger("Erro ao salvar configurações.");
    } finally {
      setLoading(false);
    }
  };

  const handleSupportAction = async (actionId: string, actionFn: () => Promise<{success: boolean, message: string}>) => {
    setActionLoading(actionId);
    try {
      const res = await actionFn();
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.danger(res.message || "Ocorreu um erro ao realizar a ação.");
      }
    } catch {
      toast.danger("Ocorreu um erro ao realizar a ação.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-16">
      <PageHeader
        sticky
        back={{ href: `/admin/users/${userId}`, label: "Voltar para o perfil" }}
        eyebrow="Pessoas"
        title="Configurações de conta"
        description="Gerencie acessos, segurança e preferências de comunicação."
        actions={
          <Button variant="primary" className="gap-2" isDisabled={loading} onPress={handleSave}>
            <Save className="size-4" aria-hidden="true" />
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        }
      />

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
              <Select selectedKey={status} onSelectionChange={(key) => key && setStatus(String(key))}>
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

              <Select selectedKey={role} onSelectionChange={(key) => key && setRole(String(key))}>
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
                <Button 
                  variant="secondary" 
                  fullWidth 
                  className="md:w-auto"
                  isDisabled={Boolean(actionLoading)}
                  onPress={() => handleSupportAction("resetPassword", () => resetUserPassword(userId, email))}
                >
                  {actionLoading === "resetPassword" ? "Enviando link..." : "Enviar link de redefinição de senha"}
                </Button>
                <p className="text-xs text-muted mt-2">Um e-mail será enviado com instruções para que o usuário redefina sua própria senha.</p>
              </div>
              <div className="pt-4 border-t border-border">
                <Button 
                  variant="danger-soft" 
                  fullWidth 
                  className="md:w-auto"
                  isDisabled={Boolean(actionLoading)}
                  onPress={() => handleSupportAction("forceLogoff", () => forceUserLogoff(userId))}
                >
                  {actionLoading === "forceLogoff" ? "Desconectando sessões..." : "Forçar logoff de todas as sessões"}
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
