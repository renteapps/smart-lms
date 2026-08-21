"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  Clock3,
  GraduationCap,
  Headphones,
  MessageSquare,
  Palette,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  AlertDialog,
  Button,
  Card,
  Chip,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  SearchField,
  Select,
  Separator,
  Switch,
  Tabs,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { AssistantAvatar, ASSISTANT_ICON_LABELS, getContrastText } from "@/components/platform-assistant/AssistantAvatar";
import { AgentMarkdown } from "@/components/agentes/AgentMarkdown";
import { ImageUpload } from "@/components/ui/ImageUpload";
import type { OpenRouterModel } from "@/types/openrouter";
import {
  ASSISTANT_ICON_KEYS,
  type AssistantConversation,
  type AssistantIconKey,
  type PlatformAssistantSettings,
} from "@/types/platformAssistant";
import {
  deletePlatformAssistantConversation,
  savePlatformAssistantSettings,
  type AssistantSettingsInput,
} from "./actions";
import { cn } from "@/lib/utils";

const ICON_COMPONENTS = {
  sparkles: Sparkles,
  bot: Bot,
  message: MessageSquare,
  brain: BrainCircuit,
  graduation: GraduationCap,
  headset: Headphones,
};

function initialDraft(settings: PlatformAssistantSettings): AssistantSettingsInput {
  return {
    enabled: settings.enabled,
    displayName: settings.displayName,
    avatarType: settings.avatarType,
    iconKey: settings.iconKey,
    avatarUrl: settings.avatarUrl,
    primaryColor: settings.primaryColor,
    welcomeMessage: settings.welcomeMessage,
    systemPrompt: settings.systemPrompt,
    model: settings.model,
    platformKnowledge: settings.platformKnowledge,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function scopeLabel(conversation: AssistantConversation) {
  return conversation.scope === "course" ? conversation.courseTitle || "Curso removido" : "Plataforma";
}

export function ChatAdminClient({
  settings,
  conversations,
  models,
}: {
  settings: PlatformAssistantSettings;
  conversations: AssistantConversation[];
  models: OpenRouterModel[];
}) {
  const [draft, setDraft] = useState<AssistantSettingsInput>(() => initialDraft(settings));
  const [history, setHistory] = useState(conversations);
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AssistantConversation | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  const previewColor = /^#[0-9a-f]{6}$/i.test(draft.primaryColor) ? draft.primaryColor : "#3157B7";
  const previewConfig = { ...draft, primaryColor: previewColor };
  const selectedModel = models.find((model) => model.id === draft.model) ?? models[0];
  const courses = useMemo(
    () =>
      Array.from(
        new Map(
          history
            .filter((conversation) => conversation.courseId)
            .map((conversation) => [conversation.courseId as string, conversation.courseTitle || "Curso removido"]),
        ),
      ).sort((a, b) => a[1].localeCompare(b[1], "pt-BR")),
    [history],
  );
  const filteredHistory = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return history.filter((conversation) => {
      if (scopeFilter !== "all" && conversation.scope !== scopeFilter) return false;
      if (courseFilter !== "all" && conversation.courseId !== courseFilter) return false;
      const day = conversation.updatedAt.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (!query) return true;
      return [conversation.title, conversation.studentName, conversation.studentEmail]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("pt-BR").includes(query));
    });
  }, [courseFilter, dateFrom, dateTo, history, scopeFilter, search]);
  const selectedConversation =
    filteredHistory.find((conversation) => conversation.id === selectedId) ?? filteredHistory[0] ?? null;

  const updateDraft = <Key extends keyof AssistantSettingsInput>(key: Key, value: AssistantSettingsInput[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    startSaving(async () => {
      const result = await savePlatformAssistantSettings(draft);
      if (result.success) toast.success(result.message);
      else toast.danger("Não foi possível salvar", { description: result.message });
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startDeleting(async () => {
      const result = await deletePlatformAssistantConversation(deleteTarget.id);
      if (!result.success) {
        toast.danger("Não foi possível excluir", { description: result.message });
        return;
      }
      const remaining = history.filter((conversation) => conversation.id !== deleteTarget.id);
      setHistory(remaining);
      if (selectedId === deleteTarget.id) setSelectedId(remaining[0]?.id ?? "");
      setDeleteTarget(null);
      toast.success(result.message);
    });
  };

  return (
    <Tabs.Root defaultSelectedKey="identity">
      <Tabs.List aria-label="Configurações do Assistente IA">
        <Tabs.Tab id="identity">Identidade</Tabs.Tab>
        <Tabs.Tab id="knowledge">IA e conhecimento</Tabs.Tab>
        <Tabs.Tab id="history">Histórico</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel id="identity" className="pt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <Card>
              <Card.Header className="flex flex-row items-center justify-between gap-5">
                <div>
                  <Card.Title>Disponibilidade</Card.Title>
                  <Card.Description className="mt-1">
                    O sticker aparece somente para alunos autenticados nas áreas permitidas.
                  </Card.Description>
                </div>
                <Switch
                  aria-label="Ativar Assistente IA"
                  isSelected={draft.enabled}
                  onChange={(selected) => updateDraft("enabled", selected)}
                >
                  <Switch.Control><Switch.Thumb /></Switch.Control>
                </Switch>
              </Card.Header>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>Nome e avatar</Card.Title>
                <Card.Description>Essa identidade é global e vale dentro e fora dos cursos.</Card.Description>
              </Card.Header>
              <Card.Content className="space-y-6">
                <TextField value={draft.displayName} onChange={(value) => updateDraft("displayName", value)}>
                  <Label>Nome do assistente</Label>
                  <Input maxLength={60} placeholder="Assistente IA" />
                </TextField>

                <div>
                  <Label className="mb-2 block">Tipo de avatar</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["icon", "photo"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateDraft("avatarType", type)}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-sm font-bold transition-colors",
                          draft.avatarType === type
                            ? "border-accent bg-accent-soft text-accent-soft-foreground"
                            : "border-border bg-surface text-muted hover:bg-surface-hover",
                        )}
                      >
                        {type === "icon" ? "Ícone predefinido" : "Foto personalizada"}
                      </button>
                    ))}
                  </div>
                </div>

                {draft.avatarType === "icon" ? (
                  <div>
                    <Label className="mb-2 block">Ícone</Label>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {ASSISTANT_ICON_KEYS.map((key) => {
                        const Icon = ICON_COMPONENTS[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            title={ASSISTANT_ICON_LABELS[key]}
                            aria-label={ASSISTANT_ICON_LABELS[key]}
                            aria-pressed={draft.iconKey === key}
                            onClick={() => updateDraft("iconKey", key as AssistantIconKey)}
                            className={cn(
                              "grid aspect-square place-items-center rounded-xl border transition-colors",
                              draft.iconKey === key
                                ? "border-accent bg-accent-soft text-accent-soft-foreground"
                                : "border-border text-muted hover:bg-surface-hover",
                            )}
                          >
                            <Icon className="size-5" aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <ImageUpload
                    value={draft.avatarUrl}
                    onChange={(url) => updateDraft("avatarUrl", url || undefined)}
                    folder="platform-assistant"
                    label="Foto do assistente"
                    description="Use uma imagem quadrada. Ela será otimizada antes do envio."
                    aspect="square"
                    previewClassName="rounded-full"
                  />
                )}
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>Cor e abertura</Card.Title>
              </Card.Header>
              <Card.Content className="space-y-6">
                <div>
                  <Label className="mb-2 block">Cor principal</Label>
                  <div className="flex items-center gap-3">
                    <label
                      className="relative grid size-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-border"
                      style={{ backgroundColor: previewColor }}
                    >
                      <span className="sr-only">Escolher cor</span>
                      <input
                        type="color"
                        value={previewColor}
                        onChange={(event) => updateDraft("primaryColor", event.target.value.toUpperCase())}
                        className="absolute -inset-2 cursor-pointer opacity-0"
                      />
                      <Palette className="size-4" style={{ color: getContrastText(previewColor) }} aria-hidden="true" />
                    </label>
                    <TextField value={draft.primaryColor} onChange={(value) => updateDraft("primaryColor", value.toUpperCase())} className="flex-1">
                      <Label className="sr-only">Cor hexadecimal</Label>
                      <Input maxLength={7} className="font-mono uppercase" placeholder="#3157B7" />
                    </TextField>
                  </div>
                  <p className="mt-2 text-xs text-muted">A cor do texto é calculada automaticamente para manter contraste acessível.</p>
                </div>

                <TextField value={draft.welcomeMessage} onChange={(value) => updateDraft("welcomeMessage", value)}>
                  <Label>Mensagem inicial</Label>
                  <TextArea rows={4} maxLength={500} className="resize-none" />
                  <p className="text-right text-xs text-muted">{draft.welcomeMessage.length}/500</p>
                </TextField>
              </Card.Content>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card className="overflow-hidden">
              <Card.Header>
                <Card.Title>Preview</Card.Title>
                <Card.Description>Como o aluno verá o assistente.</Card.Description>
              </Card.Header>
              <Separator />
              <div className="flex items-center gap-3 px-5 py-4">
                <AssistantAvatar config={previewConfig} className="size-10 rounded-xl" />
                <div>
                  <p className="font-display text-sm font-extrabold text-foreground">{draft.displayName || "Assistente IA"}</p>
                  <p className="text-xs text-muted">Assistente da plataforma</p>
                </div>
              </div>
              <Card.Content className="min-h-64 bg-background-secondary py-5">
                <div className="flex items-end gap-2">
                  <AssistantAvatar config={previewConfig} className="size-7 rounded-full" />
                  <p className="max-w-[80%] rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3 text-sm leading-6 text-foreground">
                    {draft.welcomeMessage || "Olá! Como posso ajudar?"}
                  </p>
                </div>
                <div className="mt-4 flex justify-end">
                  <p
                    className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-3 text-sm"
                    style={{ backgroundColor: previewColor, color: getContrastText(previewColor) }}
                  >
                    Pode resumir esta aula?
                  </p>
                </div>
              </Card.Content>
              <Card.Footer className="flex justify-between gap-3">
                <Chip size="sm" color={draft.enabled ? "success" : "default"} variant="soft">
                  {draft.enabled ? "Ativo" : "Desativado"}
                </Chip>
                <Button onClick={save} isPending={isSaving}>
                  <Save className="size-4" aria-hidden="true" />
                  Salvar identidade
                </Button>
              </Card.Footer>
            </Card>
          </aside>
        </div>
      </Tabs.Panel>

      <Tabs.Panel id="knowledge" className="pt-6">
        <div className="space-y-6">
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2"><BrainCircuit className="size-5 text-accent" /> Modelo OpenRouter</Card.Title>
              <Card.Description>A chave continua exclusivamente no servidor; aqui é escolhido apenas o modelo permitido.</Card.Description>
            </Card.Header>
            <Card.Content className="grid gap-5 lg:grid-cols-[minmax(16rem,0.8fr)_1.2fr]">
              <Select selectedKey={draft.model} onSelectionChange={(key) => updateDraft("model", String(key))}>
                <Label>Modelo usado</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {models.map((model) => <ListBoxItem key={model.id} id={model.id}>{model.name} · {model.provider}</ListBoxItem>)}
                  </ListBox>
                </Select.Popover>
              </Select>
              {selectedModel && (
                <div className="rounded-xl border border-border bg-background-secondary p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-foreground">{selectedModel.name}</strong>
                    <Chip size="sm" variant="soft">{selectedModel.contextLength.toLocaleString("pt-BR")} tokens</Chip>
                    <Chip size="sm" variant="soft">Velocidade {selectedModel.speed.toLowerCase()}</Chip>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">{selectedModel.description}</p>
                </div>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2"><ShieldCheck className="size-5 text-accent" /> Prompt administrativo</Card.Title>
              <Card.Description>
                Define tom e formato. Guardrails fixos de fundamentação e proteção são inseridos acima deste texto e não podem ser removidos.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <TextField value={draft.systemPrompt} onChange={(value) => updateDraft("systemPrompt", value)}>
                <Label>Orientação do assistente</Label>
                <TextArea rows={8} maxLength={20_000} className="resize-y font-mono text-sm" />
                <p className="text-right text-xs text-muted">{draft.systemPrompt.length.toLocaleString("pt-BR")}/20.000</p>
              </TextField>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Base manual da plataforma</Card.Title>
              <Card.Description>
                Complementa artigos MDX publicados, catálogo de cursos e planos ativos. Não são capturados textos da página atual.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <TextField value={draft.platformKnowledge} onChange={(value) => updateDraft("platformKnowledge", value)}>
                <Label>Informações adicionais</Label>
                <TextArea rows={14} maxLength={120_000} className="resize-y" placeholder="Políticas, orientações de navegação, perguntas frequentes…" />
                <p className="text-right text-xs text-muted">{draft.platformKnowledge.length.toLocaleString("pt-BR")}/120.000</p>
              </TextField>
            </Card.Content>
            <Card.Footer className="justify-end">
              <Button onClick={save} isPending={isSaving}>
                <Save className="size-4" aria-hidden="true" />
                Salvar IA e conhecimento
              </Button>
            </Card.Footer>
          </Card>
        </div>
      </Tabs.Panel>

      <Tabs.Panel id="history" className="pt-6">
        <Card>
          <Card.Header className="space-y-5 border-b border-separator pb-5">
            <div>
              <Card.Title>Histórico auditável</Card.Title>
              <Card.Description>
                {history.length.toLocaleString("pt-BR")} conversa(s). O histórico permanece até exclusão administrativa.
              </Card.Description>
            </div>
            <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.8fr]">
              <SearchField value={search} onChange={setSearch} aria-label="Buscar por aluno ou título">
                <SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="Aluno, e-mail ou título…" /><SearchField.ClearButton /></SearchField.Group>
              </SearchField>
              <Select selectedKey={scopeFilter} onSelectionChange={(key) => setScopeFilter(String(key))} aria-label="Filtrar escopo">
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox>
                  <ListBoxItem id="all">Todos os escopos</ListBoxItem>
                  <ListBoxItem id="platform">Plataforma</ListBoxItem>
                  <ListBoxItem id="course">Cursos</ListBoxItem>
                </ListBox></Select.Popover>
              </Select>
              <Select selectedKey={courseFilter} onSelectionChange={(key) => setCourseFilter(String(key))} aria-label="Filtrar curso">
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox>
                  <ListBoxItem id="all">Todos os cursos</ListBoxItem>
                  {courses.map(([id, title]) => <ListBoxItem key={id} id={id}>{title}</ListBoxItem>)}
                </ListBox></Select.Popover>
              </Select>
              <label className="text-xs font-semibold text-muted">De
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground" />
              </label>
              <label className="text-xs font-semibold text-muted">Até
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground" />
              </label>
            </div>
          </Card.Header>

          <Card.Content className="grid min-h-[34rem] gap-0 p-0 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="max-h-[42rem] overflow-y-auto border-b border-separator lg:border-b-0 lg:border-r">
              {filteredHistory.length ? filteredHistory.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={cn(
                    "block w-full border-b border-separator px-5 py-4 text-left transition-colors hover:bg-surface-hover",
                    selectedConversation?.id === conversation.id && "bg-accent-soft",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-bold text-foreground">{conversation.title}</span>
                    <Chip size="sm" variant="soft">{conversation.scope === "course" ? "Curso" : "Plataforma"}</Chip>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">{conversation.studentName || conversation.studentEmail || "Aluno"}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted"><Clock3 className="size-3" /> {formatDate(conversation.updatedAt)}</p>
                </button>
              )) : (
                <div className="p-8 text-center text-sm text-muted"><Search className="mx-auto mb-3 size-6" />Nenhuma conversa corresponde aos filtros.</div>
              )}
            </div>

            {selectedConversation ? (
              <div className="flex min-w-0 flex-col">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-separator px-6 py-5">
                  <div>
                    <h3 className="font-display text-lg font-extrabold text-foreground">{selectedConversation.title}</h3>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="flex items-center gap-1"><UserRound className="size-3.5" /> {selectedConversation.studentName || selectedConversation.studentEmail || selectedConversation.userId}</span>
                      <span>{scopeLabel(selectedConversation)}</span>
                      <span>{selectedConversation.messages.length} mensagens</span>
                    </p>
                  </div>
                  <Button variant="danger-soft" onClick={() => setDeleteTarget(selectedConversation)}>
                    <Trash2 className="size-4" /> Excluir
                  </Button>
                </div>
                <div className="max-h-[36rem] space-y-4 overflow-y-auto bg-background-secondary px-6 py-6">
                  {selectedConversation.messages.map((message) => (
                    <div key={message.id} className={cn("flex", message.author === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[85%] rounded-2xl border px-4 py-3", message.author === "user" ? "border-accent/20 bg-accent text-accent-foreground" : "border-border bg-surface text-foreground")}>
                        <div className="mb-1 flex items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-wide opacity-70">
                          <span>{message.author === "user" ? "Aluno" : settings.displayName}</span>
                          <span>{formatDate(message.createdAt)}</span>
                        </div>
                        {message.author === "assistant" ? (
                          <AgentMarkdown text={message.content} />
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                        )}
                        {message.model && (
                          <div className="mt-3 border-t border-current/10 pt-2 text-[10px] opacity-65">
                            <p>
                              Modelo: {message.model}
                              {message.usage
                                ? ` · ${(message.usage.promptTokens + message.usage.completionTokens).toLocaleString("pt-BR")} tokens`
                                : ""}
                            </p>
                            {message.contextSources?.length ? (
                              <p className="mt-1">Fontes: {message.contextSources.map((source) => source.title).join("; ")}</p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {!selectedConversation.messages.length && <p className="text-center text-sm text-muted">Conversa sem mensagens.</p>}
                </div>
              </div>
            ) : (
              <div className="grid place-items-center p-10 text-center text-sm text-muted"><div><MessageSquare className="mx-auto mb-3 size-7" />Selecione uma conversa para ler a transcrição.</div></div>
            )}
          </Card.Content>
        </Card>
      </Tabs.Panel>

      <AlertDialog.Root isOpen={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="md">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger"><AlertTriangle className="size-5" /></AlertDialog.Icon>
                <AlertDialog.Heading>Excluir conversa?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                A transcrição inteira será removida permanentemente. Se o aluno escrever novamente nesse contexto, uma nova conversa será criada.
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="tertiary" onClick={() => setDeleteTarget(null)} isDisabled={isDeleting}>Cancelar</Button>
                <Button variant="danger" onClick={confirmDelete} isPending={isDeleting}><Trash2 className="size-4" /> Excluir conversa</Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog.Root>
    </Tabs.Root>
  );
}
