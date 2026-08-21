"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Bot,
  Brain,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  Cpu,
  CreditCard,
  FileText,
  GraduationCap,
  History,
  Layers,
  Lock,
  MessageSquare,
  MessageSquarePlus,
  MessagesSquare,
  Paperclip,
  Play,
  Plus,
  Radio,
  Search,
  Share2,
  Shield,
  Sparkles,
  Star,
  Tag,
  Timer,
  Trash2,
  Unlock,
  UploadCloud,
  User,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import {
  Alert,
  Button,
  Card,
  Chip,
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  Select,
  Separator,
  Tabs,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import { AgentAvatar } from "@/components/agentes/AgentAvatar";
import { AgentScriptTester } from "@/components/admin/agentes/AgentScriptTester";
import { useAgentCatalog } from "@/contexts/AgentCatalogContext";
import { collectScriptWarnings } from "@/lib/agentDraft";
import {
  getAvailableCourses,
  getAvailablePlans,
  formatAgentAccessSummary,
  type OptionItem,
} from "@/lib/data/agentAccess";
import { createClient } from "@/lib/supabase/client";
import { getAgentConversations } from "@/lib/data/agents";
import { deleteAgentFile, fileExtensionLabel, formatFileSize, uploadAgentFile } from "@/lib/agentFileUpload";
import type {
  Agent,
  AgentAvatarKey,
  AgentCategory,
  AgentConversation,
  AgentFile,
  AgentStarter,
  AgentStatus,
} from "@/types/agente";
import { cn } from "@/lib/utils";

const CATEGORIES: AgentCategory[] = ["Comunicação", "Liderança", "Pessoas", "Carreira", "Estudo"];

const STATUS_OPTIONS: { value: AgentStatus; label: string; hint: string; tone: "positive" | "primary" | "warning" }[] = [
  { value: "Disponível", label: "Disponível", hint: "Visível e ativo no catálogo para todos os alunos", tone: "positive" },
  { value: "Beta", label: "Beta", hint: "Visível no catálogo, marcado como versão experimental", tone: "primary" },
  { value: "Em manutenção", label: "Em manutenção", hint: "Fora do ar temporariamente com mensagem explicativa", tone: "warning" },
];


const AI_MODELS = [
  {
    id: "google/gemini-2.0-flash-001",
    aliases: ["gemini-2-flash", "gemini-2.0-flash"],
    name: "Gemini 2.0 Flash",
    provider: "Google (OpenRouter)",
    badge: "Mais Rápido & Econômico",
    badgeTone: "success" as const,
    description: "Multimodal de altíssima velocidade com janela massiva de 1M de tokens. Ideal para alto volume e respostas instantâneas.",
    speed: "Muito alta",
    reasoning: "Excelente",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    aliases: ["claude-3-5-sonnet", "claude-3.5-sonnet"],
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic (OpenRouter)",
    badge: "Melhor Didática & Escrita",
    badgeTone: "accent" as const,
    description: "Referência absoluta em escrita humanizada, empatia pedagógica e estruturação de conhecimento socrático.",
    speed: "Alta",
    reasoning: "Excepcional",
  },
  {
    id: "openai/gpt-4o",
    aliases: ["gpt-4o"],
    name: "GPT-4o",
    provider: "OpenAI (OpenRouter)",
    badge: "Alta Precisão",
    badgeTone: "accent" as const,
    description: "Modelo multimodal insignia da OpenAI. Excelente para análises críticas, feedbacks profundos e lógica refinada.",
    speed: "Alta",
    reasoning: "Excelente",
  },
  {
    id: "openai/gpt-4o-mini",
    aliases: ["gpt-4o-mini"],
    name: "GPT-4o Mini",
    provider: "OpenAI (OpenRouter)",
    badge: "Ultra Rápido",
    badgeTone: "success" as const,
    description: "Excelente para respostas rápidas, diálogos leves e alto volume de alunos com baixo custo.",
    speed: "Muito alta",
    reasoning: "Boa",
  },
  {
    id: "deepseek/deepseek-r1",
    aliases: ["deepseek-r1"],
    name: "DeepSeek R1",
    provider: "DeepSeek (OpenRouter)",
    badge: "Raciocínio & Lógica",
    badgeTone: "warning" as const,
    description: "Raciocínio profundo de ponta com cadeia de pensamento detalhada para matemática, programação e raciocínio analítico.",
    speed: "Média",
    reasoning: "Excepcional",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    aliases: ["llama-3.3-70b", "llama-3-70b"],
    name: "Llama 3.3 70B",
    provider: "Meta (OpenRouter)",
    badge: "Open Source Elite",
    badgeTone: "default" as const,
    description: "Modelo insignia open-source da Meta com excelente adesão a instruções e tom conversacional natural.",
    speed: "Alta",
    reasoning: "Excelente",
  },
];

const PROMPT_TEMPLATES = [
  {
    title: "Mentora de Feedback Construtivo",
    description: "Metodologia não-violenta (Fato, Sentimento, Necessidade, Pedido)",
    prompt: `Você é a Mentora de Feedback do Smart LMS. Seu papel é capacitar o aluno a estruturar feedbacks construtivos, claros e não-violentos.

# Suas Regras de Ouro:
1. Sempre ajude o aluno a separar FATOS concretos de INTERPRETAÇÕES ou julgamentos.
2. Não entregue o feedback pronto de primeira; faça perguntas que o façam refletir sobre o objetivo da conversa.
3. Utilize o framework CNV: O que aconteceu (fato) -> O impacto gerado -> A necessidade não atendida -> Um pedido claro e negociável.
4. Mantenha um tom encorajador, profissional e empático.`,
  },
  {
    title: "Tutor Socrático & Didático",
    description: "Guia o aluno por perguntas reflexivas sem dar a resposta direta",
    prompt: `Você é um Tutor Pedagógico especializado no método socrático.

# Objetivo:
Fazer o aluno chegar às conclusões por conta própria por meio de perguntas reflexivas e exemplos práticos.

# Diretrizes:
1. NUNCA forneça a resposta ou solução final imediatamente.
2. Quando o aluno fizer uma pergunta, valide o ponto e devolva com uma pergunta que quebre o problema em etapas menores.
3. Se o aluno errar, aponte gentilmente a inconsistência lógica sem julgamento.
4. Celebre cada avanço e consolidação de conceito com entusiasmo profissional.`,
  },
  {
    title: "Simulador de Entrevista de Emprego",
    description: "Roleplay realista de recrutador exigente com feedback final",
    prompt: `Você é um Recrutador Sênior e Especialista em Talentos conduzindo uma entrevista técnica/comportamental.

# Dinâmica:
1. Faça uma pergunta por vez e aguarde a resposta do candidato.
2. Avalie clareza, objetividade (método STAR - Situação, Tarefa, Ação, Resultado) e postura profissional.
3. Conduza 3 a 5 rodadas de perguntas adaptadas à resposta anterior do aluno.
4. Ao final da simulação, apresente um relatório com: Pontos Fortes, Oportunidades de Melhoria e Nota de 0 a 10.`,
  },
  {
    title: "Conselheiro de Transição de Carreira",
    description: "Diagnóstico de habilidades, gaps e plano de ação estruturado",
    prompt: `Você é um Conselheiro de Carreira focado em desenvolvimento de liderança e transição profissional.

# Passo a Passo:
1. Compreenda o momento atual do profissional e seu objetivo de carreira em médio prazo.
2. Mapeie as competências já dominadas vs. competências necessárias (Skill Gap).
3. Sugira um plano de ação semanal realista, com métricas de sucesso e indicação de projetos práticos.
4. Estimule a mentalidade de aprendizado contínuo (lifelong learning).`,
  },
];


function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

type TabKey = "identidade" | "comportamento" | "experiencia" | "historico";

function TagEditor({
  values,
  onChange,
  placeholder,
  emptyHint,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  emptyHint: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (values.some((item) => item.toLocaleLowerCase("pt-BR") === value.toLocaleLowerCase("pt-BR"))) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <TextField value={draft} onChange={setDraft} fullWidth className="flex-1">
          <Label className="sr-only">{placeholder}</Label>
          <Input
            placeholder={placeholder}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              add();
            }}
          />
        </TextField>
        <Button type="button" variant="secondary" onClick={add} aria-label="Adicionar habilidade">
          <Plus className="size-4" aria-hidden="true" />
          Adicionar
        </Button>
      </div>

      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {values.map((value) => (
            <li key={value}>
              <Chip color="default" variant="soft" size="md" className="gap-1.5 py-1">
                <span>{value}</span>
                <button
                  type="button"
                  onClick={() => onChange(values.filter((item) => item !== value))}
                  aria-label={`Remover ${value}`}
                  className="rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground p-0.5"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </Chip>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs leading-relaxed text-muted">{emptyHint}</p>
      )}
    </div>
  );
}

export default function AgentFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { agents, isLoaded, saveAgent } = useAgentCatalog();

  const isNew = id === "new";
  const agentToEdit = useMemo(() => {
    if (isNew) return null;
    return agents.find((a) => a.id === id || a.slug === id) || null;
  }, [id, agents, isNew]);

  const existingSlugs = useMemo(
    () => agents.map((agent) => ({ id: agent.id, slug: agent.slug })),
    [agents],
  );

  const [activeTab, setActiveTab] = useState<TabKey>("identidade");

  // Identidade & Vitrine
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<AgentCategory>("Comunicação");
  const [status, setStatus] = useState<AgentStatus>("Disponível");
  const [avatar, setAvatar] = useState<AgentAvatarKey>("padrao");
  const [themeColor, setThemeColor] = useState("");
  const [iconSvg, setIconSvg] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [unavailableNote, setUnavailableNote] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [avgMinutes, setAvgMinutes] = useState(7);
  const [skills, setSkills] = useState<string[]>([]);

  // Vínculos & Regras de Acesso
  const [availableCourses, setAvailableCourses] = useState<OptionItem[]>([]);
  const [availablePlans, setAvailablePlans] = useState<OptionItem[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [planSearchQuery, setPlanSearchQuery] = useState("");

  // Inteligência & IA
  const [systemPrompt, setSystemPrompt] = useState("");
  const [aiModel, setAiModel] = useState("google/gemini-2.0-flash-001");
  const [context, setContext] = useState("");
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Experiência & Gatilhos
  const [greeting, setGreeting] = useState("");
  const [starters, setStarters] = useState<AgentStarter[]>([]);

  // Histórico
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<AgentConversation | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadOptions() {
      try {
        const supabase = createClient();
        const [courses, plans] = await Promise.all([
          getAvailableCourses(supabase),
          getAvailablePlans(supabase),
        ]);
        if (active) {
          setAvailableCourses(courses);
          setAvailablePlans(plans);
        }
      } catch (err) {
        console.error("Erro ao carregar opções de cursos e planos:", err);
      }
    }
    loadOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!agentToEdit?.id) {
      setConversations([]);
      return;
    }
    let active = true;
    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const supabase = createClient();
        const data = await getAgentConversations(supabase, agentToEdit!.id);
        if (active) setConversations(data);
      } catch (err) {
        console.error("Erro ao carregar histórico de conversas:", err);
      } finally {
        if (active) setIsLoadingHistory(false);
      }
    }
    loadHistory();
    return () => {
      active = false;
    };
  }, [agentToEdit?.id]);

  useEffect(() => {
    if (!isLoaded) return;

    if (agentToEdit) {
      setName(agentToEdit.name);
      setRole(agentToEdit.role);
      setSlug(agentToEdit.slug);
      setSlugTouched(true);
      setDescription(agentToEdit.description);
      setCategory(agentToEdit.category);
      setStatus(agentToEdit.status);
      setAvatar(agentToEdit.avatar);
      setThemeColor(agentToEdit.themeColor ?? "");
      setIconSvg(agentToEdit.iconSvg ?? "");
      setPhotoUrl(agentToEdit.photoUrl ?? "");
      setUnavailableNote(agentToEdit.unavailableNote ?? "");
      setCreatedBy(agentToEdit.createdBy);
      setCourseTitle(agentToEdit.courseTitle);
      setAvgMinutes(agentToEdit.avgMinutes);
      setSkills(agentToEdit.skills);

      const initialCourseIds =
        agentToEdit.courseIds && agentToEdit.courseIds.length > 0
          ? agentToEdit.courseIds
          : agentToEdit.courseId
            ? [agentToEdit.courseId]
            : [];
      setSelectedCourseIds(initialCourseIds);
      setSelectedPlanIds(agentToEdit.planIds || []);

      setSystemPrompt(agentToEdit.systemPrompt ?? "");
      setAiModel(agentToEdit.aiModel ?? "google/gemini-2.0-flash-001");
      setContext(agentToEdit.context ?? "");
      setFiles(agentToEdit.files ?? []);

      setGreeting(agentToEdit.greeting);
      setStarters(agentToEdit.starters);
    } else if (!isNew && isLoaded) {
      toast.danger("Agente não encontrado.");
      router.push("/admin/agentes");
    }
  }, [agentToEdit, isLoaded, isNew, router]);

  const effectiveSlug = slugTouched ? slugify(slug) : slugify(name);

  const mappedCourseTitles = useMemo(() => {
    return selectedCourseIds.map((cId) => {
      const found = availableCourses.find((c) => c.id === cId);
      return found?.name || cId;
    });
  }, [selectedCourseIds, availableCourses]);

  const mappedPlanNames = useMemo(() => {
    return selectedPlanIds.map((pId) => {
      const found = availablePlans.find((p) => p.id === pId);
      return found?.name || pId;
    });
  }, [selectedPlanIds, availablePlans]);

  const primaryCourseTitle = mappedCourseTitles.length > 0
    ? mappedCourseTitles[0]
    : courseTitle.trim() || "Acesso Geral";

  const draftAgent: Agent = useMemo(
    () => ({
      id: agentToEdit?.id ?? "rascunho",
      slug: effectiveSlug,
      name: name.trim() || "Novo Agente",
      role: role.trim() || "Mentoria e Suporte com IA",
      description: description.trim() || "Descreva como este agente apoia os alunos na jornada de aprendizado.",
      category,
      status,
      avatar,
      themeColor: themeColor.trim() || undefined,
      iconSvg: iconSvg.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
      createdBy: createdBy.trim() || "Equipe Pedagógica",
      courseTitle: primaryCourseTitle,
      courseId: selectedCourseIds[0] || undefined,
      courseIds: selectedCourseIds,
      courseTitles: mappedCourseTitles,
      planIds: selectedPlanIds,
      planNames: mappedPlanNames,
      skills,
      conversationsCount: agentToEdit?.conversationsCount ?? 0,
      rating: agentToEdit?.rating ?? 0,
      avgMinutes: Number(avgMinutes) || 5,

      systemPrompt: systemPrompt.trim(),
      aiModel,
      context: context.trim(),
      files,

      greeting: greeting.trim() || "Olá! Como posso te ajudar hoje?",
      starters,
      replies: agentToEdit?.replies ?? [],
      fallbacks: agentToEdit?.fallbacks ?? [],
      unavailableNote: status === "Em manutenção" ? unavailableNote.trim() : undefined,
    }),
    [
      agentToEdit,
      effectiveSlug,
      name,
      role,
      description,
      category,
      status,
      avatar,
      themeColor,
      iconSvg,
      photoUrl,
      createdBy,
      primaryCourseTitle,
      selectedCourseIds,
      mappedCourseTitles,
      selectedPlanIds,
      mappedPlanNames,
      skills,
      avgMinutes,
      systemPrompt,
      aiModel,
      context,
      files,
      greeting,
      starters,
      unavailableNote,
    ],
  );

  const filteredCoursesList = useMemo(() => {
    const q = courseSearchQuery.toLowerCase().trim();
    if (!q) return availableCourses;
    return availableCourses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)),
    );
  }, [availableCourses, courseSearchQuery]);

  const filteredPlansList = useMemo(() => {
    const q = planSearchQuery.toLowerCase().trim();
    if (!q) return availablePlans;
    return availablePlans.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q)) ||
        (p.badge && p.badge.toLowerCase().includes(q)),
    );
  }, [availablePlans, planSearchQuery]);

  const scriptWarnings = useMemo(() => collectScriptWarnings(draftAgent), [draftAgent]);

  const fail = (tab: TabKey, message: string) => {
    setActiveTab(tab);
    toast.danger(message);
    return false;
  };

  const validate = () => {
    if (!name.trim()) return fail("identidade", "Dê um nome ao agente (ex.: Bea).");
    if (!role.trim()) return fail("identidade", "Descreva a função do agente (ex.: Mentora de Feedback).");
    if (!description.trim()) return fail("identidade", "Escreva a descrição pública do card.");
    if (!createdBy.trim()) return fail("identidade", "Informe o criador ou professor responsável.");
    if (!effectiveSlug) return fail("identidade", "O endereço público (slug) não pode ficar vazio.");
    if (existingSlugs.some((item) => item.slug === effectiveSlug && item.id !== agentToEdit?.id)) {
      return fail("identidade", `Já existe um agente com o endereço /agentes/${effectiveSlug}.`);
    }
    if (status === "Em manutenção" && !unavailableNote.trim()) {
      return fail("identidade", "Explique ao aluno o motivo da manutenção e previsão de volta.");
    }
    if (!systemPrompt.trim()) {
      return fail("comportamento", "Preencha as Instruções e Regras (System Prompt) para a IA operar.");
    }
    if (!greeting.trim()) return fail("experiencia", "Defina a saudação de abertura da conversa.");
    if (starters.some((item) => !item.label.trim() || !item.message.trim())) {
      return fail("experiencia", "Preencha ou remova as sugestões de partida incompletas.");
    }
    return true;
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate() || isSaving) return;

    setIsSaving(true);
    try {
      const isUpdating = !isNew && Boolean(agentToEdit?.id);
      const res = await saveAgent({
        ...draftAgent,
        id: isUpdating ? agentToEdit?.id : undefined,
        starters: starters.map((item) => ({ ...item, label: item.label.trim(), message: item.message.trim() })),
      });

      if (res.success) {
        router.push("/admin/agentes");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const applyPromptTemplate = (tpl: (typeof PROMPT_TEMPLATES)[0]) => {
    setSystemPrompt(tpl.prompt);
    toast.success(`Template "${tpl.title}" aplicado!`);
  };

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;

    setIsUploadingFiles(true);
    const supabase = createClient();
    const uploaded: AgentFile[] = [];
    const errors: string[] = [];

    for (const file of selected) {
      try {
        uploaded.push(await uploadAgentFile(supabase, file));
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `Falha ao enviar "${file.name}".`);
      }
    }

    if (uploaded.length > 0) {
      setFiles((current) => [...current, ...uploaded]);
      toast.success(
        uploaded.length === 1 ? "Arquivo enviado com sucesso!" : `${uploaded.length} arquivos enviados com sucesso!`,
      );
    }
    errors.forEach((message) => toast.danger(message));
    setIsUploadingFiles(false);
  };

  const handleRemoveFile = (file: AgentFile) => {
    setFiles((current) => current.filter((f) => f.id !== file.id));
    void deleteAgentFile(createClient(), file);
  };

  const handleCopyTranscript = () => {
    if (!selectedConversation) return;
    const text = selectedConversation.messages
      .map((m) => `[${m.author === "student" ? "ALUNO" : "AGENTE"}]: ${m.text}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    toast.success("Transcrição copiada para a área de transferência!");
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const currentStatusTone = STATUS_OPTIONS.find((s) => s.value === status)?.tone ?? "positive";

  if (!isLoaded) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* ---------------- Breadcrumb & Context Header ---------------- */}
      <div className="flex flex-col gap-4 border-b border-border pb-6">
        <nav aria-label="Navegação hierárquica" className="flex items-center gap-2 text-xs font-medium text-muted">
          <Link href="/admin/agentes" className="transition-colors hover:text-foreground">
            Admin
          </Link>
          <span>/</span>
          <Link href="/admin/agentes" className="transition-colors hover:text-foreground">
            Agentes de IA
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">{name.trim() || (isNew ? "Novo Agente" : "Editar")}</span>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <AgentAvatar 
              avatar={avatar} 
              themeColor={themeColor}
              iconSvg={iconSvg}
              photoUrl={photoUrl}
              size="lg" 
              isMuted={status === "Em manutenção"} 
            />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {name.trim() || (isNew ? "Novo Agente de IA" : agentToEdit?.name)}
                </h1>
                <StatusBadge tone={currentStatusTone}>{status}</StatusBadge>
                {aiModel && (
                  <Chip color="default" variant="soft" size="sm" className="hidden sm:inline-flex">
                    <Brain className="mr-1 size-3 text-accent" />
                    {AI_MODELS.find((m) => m.id === aiModel)?.name || aiModel}
                  </Chip>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">
                {role.trim() || "Defina a identidade, as instruções de IA e os gatilhos da conversa."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="secondary" onClick={() => router.push("/admin/agentes")}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar
            </Button>
            {!isNew && (
              <>
                <Link
                  href={`/admin/agentes/historico/${agentToEdit?.id || id}`}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover hover:border-accent/40"
                >
                  <History className="size-3.5 text-accent" aria-hidden="true" />
                  Ver Histórico ({draftAgent.conversationsCount})
                </Link>

                <Link
                  href={`/agentes/${effectiveSlug}`}
                  target="_blank"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover hover:border-accent/40"
                >
                  <Share2 className="size-3.5" aria-hidden="true" />
                  Página do Aluno
                </Link>
              </>
            )}
            <Button variant="primary" onClick={handleSubmit} isDisabled={isSaving}>
              <Sparkles className="size-4" aria-hidden="true" />
              {isSaving ? "Salvando..." : agentToEdit ? "Salvar alterações" : "Publicar agente"}
            </Button>
          </div>
        </div>
      </div>

      {/* ---------------- Main Tabs Container ---------------- */}
      <form onSubmit={handleSubmit}>
        <Card className="border-border shadow-surface">
          <Tabs.Root
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(String(key) as TabKey)}
            className="flex flex-col"
          >
            <div className="border-b border-border bg-background-secondary/40 px-6 pt-3">
              <Tabs.List aria-label="Seções de configuração do agente" className="gap-2">
                <Tabs.Tab id="identidade" className="gap-2 font-medium">
                  <User className="size-4" aria-hidden="true" />
                  <span>Identidade & Vitrine</span>
                </Tabs.Tab>

                <Tabs.Tab id="comportamento" className="gap-2 font-medium">
                  <Cpu className="size-4" aria-hidden="true" />
                  <span>Inteligência & IA</span>
                  {systemPrompt.trim() && (
                    <span className="size-2 rounded-full bg-accent" aria-label="Prompt configurado" />
                  )}
                </Tabs.Tab>

                <Tabs.Tab id="experiencia" className="gap-2 font-medium">
                  <MessageSquarePlus className="size-4" aria-hidden="true" />
                  <span>Conversa & Gatilhos</span>
                  {starters.length > 0 && (
                    <span className="ml-1 text-xs font-semibold text-muted" data-numeric>
                      {starters.length}
                    </span>
                  )}
                </Tabs.Tab>

                <Tabs.Tab id="historico" className="gap-2 font-medium">
                  <History className="size-4" aria-hidden="true" />
                  <span>Histórico & Métricas</span>
                  {conversations.length > 0 && (
                    <span className="ml-1 text-xs font-semibold text-muted" data-numeric>
                      {conversations.length}
                    </span>
                  )}
                </Tabs.Tab>
              </Tabs.List>
            </div>

            <div className="p-6 sm:p-8">
              {/* ========================================================================= */}
              {/* TAB 1: IDENTIDADE & VITRINE */}
              {/* ========================================================================= */}
              <Tabs.Panel id="identidade">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                  {/* Formulário de Identidade */}
                  <div className="space-y-8 lg:col-span-7">
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">Apresentação do Agente</h2>
                      <p className="text-xs text-muted">Informações públicas exibidas nos cards da área do estudante.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <TextField value={name} onChange={setName} isRequired fullWidth>
                        <Label>Nome do Agente</Label>
                        <Input placeholder="Ex.: Bea" />
                        <Description>Nome humano e memorável. Como o aluno o chamará.</Description>
                      </TextField>

                      <TextField value={role} onChange={setRole} isRequired fullWidth>
                        <Label>Função / Especialidade</Label>
                        <Input placeholder="Ex.: Mentora de Feedback" />
                        <Description>Subtítulo descritivo exibido no card.</Description>
                      </TextField>
                    </div>

                    <TextField value={description} onChange={setDescription} isRequired fullWidth>
                      <Label>Descrição Pública</Label>
                      <TextArea
                        rows={3}
                        placeholder="Ex.: Ajuda você a estruturar conversas difíceis e feedbacks construtivos sem ruídos ou bloqueios."
                      />
                      <Description>
                        Foque no benefício prático e no problema que o agente resolve para o aluno.
                      </Description>
                    </TextField>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Select
                        selectedKey={category}
                        onSelectionChange={(key) => setCategory(String(key) as AgentCategory)}
                      >
                        <Label>Categoria de Conhecimento</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {CATEGORIES.map((item) => (
                              <ListBoxItem key={item} id={item}>
                                {item}
                              </ListBoxItem>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>

                      <Select
                        selectedKey={status}
                        onSelectionChange={(key) => setStatus(String(key) as AgentStatus)}
                      >
                        <Label>Status de Publicação</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {STATUS_OPTIONS.map((item) => (
                              <ListBoxItem key={item.value} id={item.value}>
                                <div className="py-0.5">
                                  <p className="font-semibold text-foreground">{item.label}</p>
                                  <p className="text-xs text-muted">{item.hint}</p>
                                </div>
                              </ListBoxItem>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>

                    {status === "Em manutenção" && (
                      <div className="rounded-xl border border-warning/30 bg-warning-soft p-4">
                        <TextField value={unavailableNote} onChange={setUnavailableNote} isRequired fullWidth>
                          <Label className="text-warning-soft-foreground font-semibold">
                            Mensagem de Indisponibilidade para o Aluno
                          </Label>
                          <TextArea
                            rows={2}
                            placeholder="Ex.: Em atualização pela equipe pedagógica. Volta ao ar nesta quinta-feira."
                          />
                          <Description className="text-warning-soft-foreground/80">
                            Explique claramente o motivo e forneça uma previsão de retorno.
                          </Description>
                        </TextField>
                      </div>
                    )}

                    <Separator />

                    {/* Vínculo Pedagógico & Regras de Acesso */}
                    <div className="space-y-5">
                      <div>
                        <h2 className="font-display text-lg font-bold text-foreground">
                          Vínculo Pedagógico & Regras de Acesso
                        </h2>
                        <p className="text-xs text-muted">
                          Defina o autor responsável e vincule o agente a um ou mais cursos e/ou planos de assinatura.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField value={createdBy} onChange={setCreatedBy} isRequired fullWidth>
                          <Label>Publicado por (Professor / Autor)</Label>
                          <Input placeholder="Ex.: Camila Duarte" />
                          <Description>Autor responsável pelas diretrizes da IA.</Description>
                        </TextField>

                        <TextField
                          value={String(avgMinutes)}
                          onChange={(value) => setAvgMinutes(parseInt(value, 10) || 1)}
                          fullWidth
                        >
                          <Label>Duração Típica da Conversa (minutos)</Label>
                          <Input type="number" min={1} max={60} inputMode="numeric" />
                          <Description>Média de tempo que o aluno investe.</Description>
                        </TextField>
                      </div>

                      {/* Resumo de Acesso Dinâmico */}
                      <div
                        className={cn(
                          "flex items-start gap-3.5 rounded-2xl border p-4 transition-colors",
                          selectedCourseIds.length > 0 || selectedPlanIds.length > 0
                            ? "border-accent/40 bg-accent-soft/30 text-foreground"
                            : "border-border bg-background-secondary text-foreground",
                        )}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                          {selectedCourseIds.length > 0 || selectedPlanIds.length > 0 ? (
                            <Lock className="size-4.5" />
                          ) : (
                            <Unlock className="size-4.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-foreground">Regra de Disponibilidade & Acesso</h4>
                            <Chip
                              size="sm"
                              variant="soft"
                              color={selectedCourseIds.length > 0 || selectedPlanIds.length > 0 ? "accent" : "default"}
                            >
                              {selectedCourseIds.length > 0 || selectedPlanIds.length > 0
                                ? "Acesso Condicional"
                                : "Acesso Global"}
                            </Chip>
                          </div>
                          <p className="mt-1 text-xs font-medium text-foreground">
                            {formatAgentAccessSummary(draftAgent)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted leading-relaxed">
                            {selectedCourseIds.length === 0 && selectedPlanIds.length === 0
                              ? "Como nenhum curso ou plano foi vinculado, este agente estará acessível a todos os alunos cadastrados."
                              : "O aluno terá acesso se estiver matriculado em QUALQUER um dos cursos vinculados OU for assinante de QUALQUER um dos planos vinculados."}
                          </p>
                        </div>
                      </div>

                      {/* Seleção de Cursos Vinculados */}
                      <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="size-5 text-accent" />
                            <div>
                              <h3 className="text-sm font-bold text-foreground">
                                Cursos Vinculados ({selectedCourseIds.length})
                              </h3>
                              <p className="text-xs text-muted">
                                Vincule este assistente aos cursos onde ele faz parte da trilha pedagógica.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onPress={() => {
                                if (selectedCourseIds.length === availableCourses.length) {
                                  setSelectedCourseIds([]);
                                } else {
                                  setSelectedCourseIds(availableCourses.map((c) => c.id));
                                }
                              }}
                            >
                              {selectedCourseIds.length === availableCourses.length
                                ? "Desmarcar Todos"
                                : "Selecionar Todos"}
                            </Button>
                            {selectedCourseIds.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-danger"
                                onPress={() => setSelectedCourseIds([])}
                              >
                                Limpar
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Chips de cursos selecionados */}
                        {selectedCourseIds.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-background-secondary border border-border/60">
                            {selectedCourseIds.map((cId) => {
                              const course = availableCourses.find((c) => c.id === cId);
                              return (
                                <span
                                  key={cId}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-soft-foreground"
                                >
                                  <BookOpen className="size-3" />
                                  <span className="truncate max-w-[220px]">{course?.name || cId}</span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCourseIds((prev) => prev.filter((id) => id !== cId))}
                                    className="hover:text-danger p-0.5 rounded transition-colors"
                                    aria-label={`Remover curso ${course?.name || cId}`}
                                  >
                                    <X className="size-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Busca rápida de cursos */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                          <input
                            type="text"
                            placeholder="Buscar cursos por título ou categoria..."
                            value={courseSearchQuery}
                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                            className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>

                        {/* Lista de cursos selecionáveis */}
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {filteredCoursesList.length === 0 ? (
                            <p className="text-xs text-muted py-3 text-center">Nenhum curso encontrado com esse termo.</p>
                          ) : (
                            filteredCoursesList.map((course) => {
                              const isSelected = selectedCourseIds.includes(course.id);
                              return (
                                <div
                                  key={course.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    setSelectedCourseIds((prev) =>
                                      isSelected ? prev.filter((id) => id !== course.id) : [...prev, course.id],
                                    );
                                  }}
                                  className={cn(
                                    "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none",
                                    isSelected
                                      ? "border-accent bg-accent-soft/40"
                                      : "border-border/60 bg-background/50 hover:bg-background-secondary hover:border-border",
                                  )}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span
                                      className={cn(
                                        "flex size-4.5 shrink-0 items-center justify-center rounded border transition-colors",
                                        isSelected
                                          ? "border-accent bg-accent text-accent-foreground"
                                          : "border-border bg-background",
                                      )}
                                    >
                                      {isSelected && <Check className="size-3" />}
                                    </span>
                                    <div className="min-w-0">
                                      <p
                                        className={cn(
                                          "text-xs font-semibold truncate",
                                          isSelected ? "text-foreground font-bold" : "text-foreground",
                                        )}
                                      >
                                        {course.name}
                                      </p>
                                      {course.category && (
                                        <p className="text-[10px] text-muted">
                                          {course.category} {course.subtitle ? `· ${course.subtitle}` : ""}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Chip size="sm" variant="soft" color="accent" className="text-[10px] shrink-0">
                                      Vinculado
                                    </Chip>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Seleção de Planos de Assinatura Vinculados */}
                      <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="size-5 text-accent" />
                            <div>
                              <h3 className="text-sm font-bold text-foreground">
                                Planos de Assinatura ({selectedPlanIds.length})
                              </h3>
                              <p className="text-xs text-muted">
                                Vincule este agente a planos de assinatura que garantem acesso direto.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onPress={() => {
                                if (selectedPlanIds.length === availablePlans.length) {
                                  setSelectedPlanIds([]);
                                } else {
                                  setSelectedPlanIds(availablePlans.map((p) => p.id));
                                }
                              }}
                            >
                              {selectedPlanIds.length === availablePlans.length
                                ? "Desmarcar Todos"
                                : "Selecionar Todos"}
                            </Button>
                            {selectedPlanIds.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-danger"
                                onPress={() => setSelectedPlanIds([])}
                              >
                                Limpar
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Chips de planos selecionados */}
                        {selectedPlanIds.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-background-secondary border border-border/60">
                            {selectedPlanIds.map((pId) => {
                              const plan = availablePlans.find((p) => p.id === pId);
                              return (
                                <span
                                  key={pId}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-soft-foreground"
                                >
                                  <CreditCard className="size-3" />
                                  <span className="truncate">{plan?.name || pId}</span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPlanIds((prev) => prev.filter((id) => id !== pId))}
                                    className="hover:text-danger p-0.5 rounded transition-colors"
                                    aria-label={`Remover plano ${plan?.name || pId}`}
                                  >
                                    <X className="size-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Lista de planos com checkboxes */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {filteredPlansList.map((plan) => {
                            const isSelected = selectedPlanIds.includes(plan.id);
                            return (
                              <div
                                key={plan.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                  setSelectedPlanIds((prev) =>
                                    isSelected ? prev.filter((id) => id !== plan.id) : [...prev, plan.id],
                                  );
                                }}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
                                  isSelected
                                    ? "border-accent bg-accent-soft/40"
                                    : "border-border/60 bg-background/50 hover:bg-background-secondary hover:border-border",
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span
                                    className={cn(
                                      "flex size-4.5 shrink-0 items-center justify-center rounded border transition-colors",
                                      isSelected
                                        ? "border-accent bg-accent text-accent-foreground"
                                        : "border-border bg-background",
                                    )}
                                  >
                                    {isSelected && <Check className="size-3" />}
                                  </span>
                                  <div className="min-w-0">
                                    <p
                                      className={cn(
                                        "text-xs font-bold truncate",
                                        isSelected ? "text-accent-soft-foreground" : "text-foreground",
                                      )}
                                    >
                                      {plan.name}
                                    </p>
                                    {plan.subtitle && (
                                      <p className="text-[10px] text-muted">
                                        {plan.subtitle} {plan.badge ? `(${plan.badge})` : ""}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {isSelected && (
                                  <Chip size="sm" variant="soft" color="accent" className="text-[10px] shrink-0">
                                    Incluso
                                  </Chip>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <TextField
                          value={slugTouched ? slug : effectiveSlug}
                          onChange={(value) => {
                            setSlugTouched(true);
                            setSlug(value);
                          }}
                          fullWidth
                        >
                          <Label>Slug / Endereço na Web</Label>
                          <Input placeholder="mentora-feedback" />
                          <Description className="truncate">
                            /agentes/{effectiveSlug || "slug-do-agente"}
                          </Description>
                        </TextField>
                      </div>

                      <div>
                        <Label className="mb-1 block font-semibold text-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Tag className="size-4 text-muted" aria-hidden="true" />
                            Habilidades do Agente (Tags de Destaque)
                          </span>
                        </Label>
                        <p className="mb-3 text-xs text-muted">
                          3 a 5 ações concretas. Aparecem como chips no card do aluno.
                        </p>
                        <TagEditor
                          values={skills}
                          onChange={setSkills}
                          placeholder="Ex.: Estruturar conversa difícil"
                          emptyHint="Nenhuma habilidade adicionada ainda. Digite e pressione Enter."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Coluna Lateral: Seletor de Avatar + Live Card Preview */}
                  <div className="space-y-6 lg:col-span-5">
                    {/* Identidade Visual */}
                    <Card className="border-border bg-background-secondary/50">
                      <Card.Header>
                        <Card.Title className="text-base font-bold">Identidade Visual</Card.Title>
                        <Card.Description>Personalize a foto, a cor de destaque e o ícone do agente</Card.Description>
                      </Card.Header>
                      <Card.Content>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <TextField value={themeColor} onChange={setThemeColor} fullWidth>
                              <Label>Cor de Destaque (Hex)</Label>
                              <div className="flex gap-2 items-center">
                                <input 
                                  type="color" 
                                  value={themeColor || "#3B82F6"} 
                                  onChange={(e) => setThemeColor(e.target.value)} 
                                  className="w-9 h-9 rounded-lg cursor-pointer border border-border p-0.5 bg-background shrink-0"
                                />
                                <Input placeholder="#3B82F6" />
                              </div>
                              <Description>Cor de fundo e destaque visual do agente.</Description>
                            </TextField>

                            <div>
                              <Label className="mb-2 block text-sm font-medium">Foto do Agente</Label>
                              <input
                                type="file"
                                ref={photoInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  
                                  setIsUploadingPhoto(true);
                                  try {
                                    const { uploadImageToStorage } = await import("@/lib/imageOptimization");
                                    const supabase = createClient();
                                    const { publicUrl } = await uploadImageToStorage(supabase, {
                                      file,
                                      folder: "branding",
                                    });
                                    setPhotoUrl(publicUrl);
                                    setIconSvg(""); // Remove SVG se a foto for adicionada
                                    toast.success("Foto do agente enviada com sucesso.");
                                  } catch (error: any) {
                                    toast.danger(error.message || "Erro ao fazer upload da foto");
                                  } finally {
                                    setIsUploadingPhoto(false);
                                    if (photoInputRef.current) photoInputRef.current.value = "";
                                  }
                                }}
                              />
                              <div className="flex items-center gap-2 pt-1">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  isDisabled={isUploadingPhoto} 
                                  onPress={() => photoInputRef.current?.click()}
                                >
                                  <UploadCloud className="size-4 mr-2" />
                                  {isUploadingPhoto ? "Enviando..." : (photoUrl ? "Trocar Foto" : "Subir Foto")}
                                </Button>
                                {photoUrl && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-danger" 
                                    onPress={() => setPhotoUrl("")}
                                  >
                                    Remover
                                  </Button>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted">Formatos JPG, PNG ou WebP.</p>
                            </div>
                          </div>

                          <TextField value={iconSvg} onChange={(val) => {
                            setIconSvg(val);
                            if (val) setPhotoUrl(""); // Remove foto se adicionar SVG
                          }} fullWidth>
                            <Label>Ícone SVG Customizado</Label>
                            <TextArea rows={3} placeholder="<svg viewBox='0 0 24 24'>...</svg>" />
                            <Description>Cole o código SVG de um ícone personalizado (usado caso não tenha foto).</Description>
                          </TextField>
                        </div>
                      </Card.Content>
                    </Card>

                    {/* Live Card Preview */}
                    <Card className="sticky top-6 border-border bg-surface shadow-md">
                      <Card.Header className="pb-2">
                        <div className="flex items-center justify-between">
                          <span className="eyebrow">Prévia ao Vivo</span>
                          <Chip color="default" variant="soft" size="sm">
                            Card do Aluno
                          </Chip>
                        </div>
                      </Card.Header>
                      <Card.Content className="space-y-4">
                        <div className="rounded-2xl border border-border bg-background-secondary p-4 transition-all">
                          <div className="flex items-start gap-3.5">
                            <AgentAvatar 
                              avatar={avatar} 
                              themeColor={themeColor}
                              iconSvg={iconSvg}
                              photoUrl={photoUrl}
                              size="md" 
                              isMuted={status === "Em manutenção"} 
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-display text-base font-bold text-foreground">
                                  {name.trim() || "Nome do Agente"}
                                </h4>
                                <StatusBadge tone={currentStatusTone}>{status}</StatusBadge>
                              </div>
                              <p className="text-xs font-semibold text-muted">
                                {role.trim() || "Função / Especialidade"}
                              </p>
                            </div>
                          </div>

                          <p className="mt-3 text-xs leading-relaxed text-foreground line-clamp-3">
                            {description.trim() || "A descrição pública aparecerá aqui, orientando o aluno sobre quando e por que interagir com este agente."}
                          </p>

                          {skills.length > 0 && (
                            <ul className="mt-3 flex flex-wrap gap-1.5">
                              {skills.map((skill) => (
                                <li key={skill}>
                                  <Chip color="default" variant="soft" size="sm" className="text-[10px] py-0 px-2">
                                    {skill}
                                  </Chip>
                                </li>
                              ))}
                            </ul>
                          )}

                          <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-[11px] text-muted">
                            <div className="flex items-center gap-1">
                              <Star className="size-3 text-warning fill-warning" aria-hidden="true" />
                              <dd data-numeric className="font-semibold text-foreground">
                                {draftAgent.rating.toFixed(1)}
                              </dd>
                            </div>
                            <div className="flex items-center gap-1">
                              <Timer className="size-3 text-muted" aria-hidden="true" />
                              <dd data-numeric>{avgMinutes} min</dd>
                            </div>
                            <div className="flex items-center gap-1 truncate">
                              <dt className="text-muted">Cursos:</dt>
                              <dd className="font-semibold text-accent truncate max-w-[140px]">
                                {selectedCourseIds.length > 0
                                  ? selectedCourseIds.length === 1
                                    ? mappedCourseTitles[0]
                                    : `${mappedCourseTitles[0]} (+${selectedCourseIds.length - 1})`
                                  : "Acesso Geral"}
                              </dd>
                            </div>
                            {selectedPlanIds.length > 0 && (
                              <div className="flex items-center gap-1 truncate">
                                <dt className="text-muted">Planos:</dt>
                                <dd className="font-semibold text-accent truncate max-w-[140px]">
                                  {selectedPlanIds.length === 1
                                    ? mappedPlanNames[0]
                                    : `${mappedPlanNames[0]} (+${selectedPlanIds.length - 1})`}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                        <p className="text-center text-[11px] text-muted">
                          É exatamente assim que o card será renderizado na vitrine pública.
                        </p>
                      </Card.Content>
                    </Card>
                  </div>
                </div>
              </Tabs.Panel>

              {/* ========================================================================= */}
              {/* TAB 2: INTELIGÊNCIA & IA */}
              {/* ========================================================================= */}
              <Tabs.Panel id="comportamento">
                <div className="space-y-8">
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">Cérebro do Agente (LLM)</h2>
                    <p className="text-xs text-muted">
                      Configure o motor generativo, a persona, as regras de conduta e o material de apoio.
                    </p>
                  </div>

                  {/* Banner OpenRouter */}
                  <div className="rounded-2xl border border-accent/20 bg-accent-soft/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                        <Sparkles className="size-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Motor de IA Unificado via OpenRouter</h4>
                        <p className="text-[11px] text-muted">
                          Os agentes processam prompts e conversas em tempo real usando os modelos conectados.
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/admin/integracoes/openrouter"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover transition shrink-0"
                    >
                      <Cpu className="size-3.5 text-accent" />
                      Gerenciar Chaves & Modelos
                    </Link>
                  </div>

                  {/* Seletor Visual de Modelo */}
                  <div>
                    <Label className="mb-3 block font-semibold text-foreground">Modelo de Linguagem (LLM)</Label>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {AI_MODELS.map((model) => {
                        const isSelected =
                          aiModel === model.id ||
                          (Array.isArray(model.aliases) && model.aliases.includes(aiModel));
                        return (
                          <div
                            key={model.id}
                            onClick={() => setAiModel(model.id)}
                            className={cn(
                              "cursor-pointer rounded-2xl border p-4.5 transition-all flex flex-col justify-between",
                              isSelected
                                ? "border-accent bg-accent-soft/40 shadow-sm ring-2 ring-accent"
                                : "border-border bg-surface hover:border-accent/40 hover:bg-surface-hover",
                            )}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                                    {model.provider}
                                  </span>
                                  <h4 className="font-display text-base font-bold text-foreground">{model.name}</h4>
                                </div>
                                <Chip color={model.badgeTone} variant="soft" size="sm" className="text-[10px]">
                                  {model.badge}
                                </Chip>
                              </div>
                              <p className="mt-2.5 text-xs leading-relaxed text-muted">{model.description}</p>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted">
                              <span>Velocidade: <strong className="text-foreground">{model.speed}</strong></span>
                              <span>Raciocínio: <strong className="text-foreground">{model.reasoning}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Templates Rápidos de Prompt */}
                  <Card className="border-border bg-background-secondary/40">
                    <Card.Header>
                      <div className="flex items-center gap-2">
                        <Wand2 className="size-4 text-accent" aria-hidden="true" />
                        <Card.Title className="text-sm font-bold">Biblioteca de Templates de Prompt</Card.Title>
                      </div>
                      <Card.Description>
                        Clique em um modelo pedagógico para pré-carregar as instruções prontas no editor abaixo:
                      </Card.Description>
                    </Card.Header>
                    <Card.Content>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {PROMPT_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl.title}
                            type="button"
                            onClick={() => applyPromptTemplate(tpl)}
                            className="rounded-xl border border-border bg-surface p-3.5 text-left transition-all hover:border-accent hover:shadow-sm group"
                          >
                            <p className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">
                              {tpl.title}
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-muted">{tpl.description}</p>
                          </button>
                        ))}
                      </div>
                    </Card.Content>
                  </Card>

                  {/* Prompt do Sistema (Instruções e Regras) */}
                  <TextField value={systemPrompt} onChange={setSystemPrompt} isRequired fullWidth>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="font-semibold text-foreground">Instruções do Sistema (System Prompt)</Label>
                      <span className="text-xs text-muted" data-numeric>
                        {systemPrompt.length} caracteres
                      </span>
                    </div>
                    <TextArea
                      rows={10}
                      className="font-mono text-xs leading-relaxed"
                      placeholder="Você é a Bea, Mentora de Feedback do Smart LMS...
Descreva aqui o tom, a persona, as regras estritas e os passos que o agente deve seguir."
                    />
                    <Description>
                      Dica: Use seções estruturadas como <code># Persona</code>, <code># Regras de Conduta</code> e <code># O que NUNCA fazer</code>.
                    </Description>
                  </TextField>

                  <Separator />

                  {/* Base de Conhecimento: Contexto & Ementa */}
                  <div className="space-y-4">
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">Base de Conhecimento Adicional</h2>
                      <p className="text-xs text-muted">
                        Injete conteúdos específicos, resumos de aulas, ementas e documentos de suporte para a IA usar como fonte da verdade.
                      </p>
                    </div>

                    <TextField value={context} onChange={setContext} fullWidth>
                      <Label>Contexto Textual / Ementa do Curso</Label>
                      <TextArea
                        rows={5}
                        placeholder="Ex.: Ementa da Aula 3: Métodos de escuta ativa.
Regra de ouro do curso: Nunca interromper o interlocutor nos primeiros 90 segundos."
                      />
                      <Description>
                        Informações e dados cruciais que a IA deve consultar para contextualizar as respostas.
                      </Description>
                    </TextField>

                    {/* Dropzone de Arquivos */}
                    <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-6 text-center transition-colors hover:border-accent/50">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
                        <UploadCloud className="size-6" />
                      </div>
                      <h4 className="mt-3 text-sm font-bold text-foreground">Documentos de Apoio</h4>
                      <p className="mt-1 text-xs text-muted max-w-md mx-auto">
                        Anexe PDFs, cartilhas e manuais (PDF, DOC, DOCX ou TXT até 10MB) para consulta da equipe. A IA
                        ainda não lê o conteúdo destes arquivos automaticamente — cole os trechos relevantes no
                        campo de Contexto Textual acima para que ela os use nas respostas.
                      </p>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        multiple
                        hidden
                        onChange={handleFilesSelected}
                      />

                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          isDisabled={isUploadingFiles}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Plus className="size-4 mr-1.5" />
                          {isUploadingFiles ? "Enviando..." : "Selecionar Arquivos"}
                        </Button>
                      </div>

                      {files.length > 0 && (
                        <div className="mt-6 border-t border-border pt-4">
                          <p className="text-left text-xs font-semibold text-foreground mb-2">Arquivos Anexados ({files.length}):</p>
                          <ul className="space-y-2">
                            {files.map((file) => (
                              <li
                                key={file.id}
                                className="flex items-center justify-between rounded-xl border border-border bg-background-secondary p-3 text-left text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <FileText className="size-4 text-accent shrink-0" />
                                  <span className="font-medium text-foreground truncate">{file.name}</span>
                                  <Chip color="default" variant="soft" size="sm" className="text-[10px] shrink-0">
                                    {fileExtensionLabel(file.name)}
                                    {formatFileSize(file.sizeBytes) ? ` • ${formatFileSize(file.sizeBytes)}` : ""}
                                  </Chip>
                                </div>
                                <Button
                                  isIconOnly
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Remover arquivo"
                                  onClick={() => handleRemoveFile(file)}
                                >
                                  <Trash2 className="size-3.5 text-muted hover:text-danger" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Tabs.Panel>

              {/* ========================================================================= */}
              {/* TAB 3: CONVERSA & GATILHOS */}
              {/* ========================================================================= */}
              <Tabs.Panel id="experiencia">
                <div className="space-y-8">
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">Gatilhos & Experiência de Conversa</h2>
                    <p className="text-xs text-muted">
                      Defina como a conversa começa e quais opções iniciais facilitam a interação do estudante.
                    </p>
                  </div>

                  {/* Saudação de Abertura */}
                  <div className="space-y-4">
                    <TextField value={greeting} onChange={setGreeting} isRequired fullWidth>
                      <Label>Mensagem de Abertura (Saudação)</Label>
                      <TextArea
                        rows={3}
                        placeholder="Ex.: Olá! Sou a Bea, sua mentora de feedback. Me conta: o que aconteceu e como posso te ajudar hoje?"
                      />
                      <Description>Primeira mensagem que o agente envia ao abrir a tela de chat.</Description>
                    </TextField>

                    {/* Preview do Balão da Saudação */}
                    {greeting.trim() && (
                      <div className="rounded-2xl border border-border bg-background-secondary/50 p-4">
                        <span className="eyebrow mb-2 block">Prévia da Mensagem no Chat</span>
                        <div className="flex items-start gap-3">
                          <AgentAvatar 
                            avatar={avatar} 
                            themeColor={themeColor}
                            iconSvg={iconSvg}
                            photoUrl={photoUrl}
                            size="sm" 
                          />
                          <div className="max-w-lg rounded-2xl rounded-tl-sm bg-surface border border-border px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm whitespace-pre-line">
                            {greeting}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Sugestões de Partida (Starters) */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-bold text-foreground">
                          Sugestões de Partida (Conversation Starters)
                        </h3>
                        <p className="text-xs text-muted">
                          Botões de clique rápido para tirar o aluno do bloqueio inicial. Recomendamos de 3 a 4 opções.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setStarters([...starters, { id: newId("st"), label: "", message: "" }])
                        }
                      >
                        <Plus className="size-4 mr-1.5" />
                        Nova Sugestão
                      </Button>
                    </div>

                    {starters.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-background-secondary/20">
                        <Sparkles className="mx-auto size-8 text-muted/50 mb-2" />
                        <p className="text-sm font-semibold text-foreground">Nenhum botão de partida configurado</p>
                        <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                          Adicione botões com dúvidas comuns para que os alunos possam iniciar o diálogo com apenas um clique.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {starters.map((starter, index) => (
                          <Card key={starter.id} className="border-border bg-surface shadow-sm">
                            <Card.Header className="pb-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-accent">Gatilho {index + 1}</span>
                                <Button
                                  type="button"
                                  isIconOnly
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Remover sugestão ${index + 1}`}
                                  onClick={() => setStarters(starters.filter((item) => item.id !== starter.id))}
                                >
                                  <Trash2 className="size-3.5 text-muted hover:text-danger" />
                                </Button>
                              </div>
                            </Card.Header>
                            <Card.Content className="space-y-3 pt-0">
                              <TextField
                                value={starter.label}
                                onChange={(value) =>
                                  setStarters(
                                    starters.map((item) =>
                                      item.id === starter.id ? { ...item, label: value } : item,
                                    ),
                                  )
                                }
                                fullWidth
                              >
                                <Label className="text-xs font-semibold">Texto do Botão</Label>
                                <Input placeholder="Ex.: Preciso dar um feedback difícil" />
                              </TextField>

                              <TextField
                                value={starter.message}
                                onChange={(value) =>
                                  setStarters(
                                    starters.map((item) =>
                                      item.id === starter.id ? { ...item, message: value } : item,
                                    ),
                                  )
                                }
                                fullWidth
                              >
                                <Label className="text-xs font-semibold">Mensagem Realmente Enviada ao Chat</Label>
                                <TextArea
                                  rows={2}
                                  placeholder="Ex.: Preciso dar um feedback para um colega que atrasa as entregas e não sei como abordar."
                                />
                              </TextField>
                            </Card.Content>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Sandbox de Teste em Tempo Real */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">Sandbox de Validação</h3>
                      <p className="text-xs text-muted">Teste a resposta imediata do agente antes de publicar.</p>
                    </div>

                    <AgentScriptTester agent={draftAgent} />
                  </div>
                </div>
              </Tabs.Panel>

              {/* ========================================================================= */}
              {/* TAB 4: HISTÓRICO & MÉTRICAS */}
              {/* ========================================================================= */}
              <Tabs.Panel id="historico">
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">Métricas & Histórico de Interações</h2>
                      <p className="text-xs text-muted">
                        Analise os diálogos reais dos estudantes para diagnosticar pontos de atrito e calibrar as Instruções do Sistema.
                      </p>
                    </div>

                    {!isNew && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => router.push(`/admin/agentes/historico/${agentToEdit?.id || id}`)}
                      >
                        <History className="size-4 mr-1.5" />
                        Abrir Central de Histórico Completa
                      </Button>
                    )}
                  </div>

                  {!isNew && (
                    <Card className="border-accent/40 bg-accent-soft/30 p-5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Sparkles className="size-4 text-accent" />
                            <h4 className="text-sm font-bold text-foreground">Central Dedicada para Alto Volume</h4>
                          </div>
                          <p className="mt-1 text-xs text-muted max-w-xl">
                            Audite milhares de conversas por mês com filtros avançados por sentimento, telemetria de tokens, notas dos alunos e diagnóstico pedagógico em tela cheia.
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => router.push(`/admin/agentes/historico/${agentToEdit?.id || id}`)}
                        >
                          Acessar Histórico Completo
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* Métricas Rápidas */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="border-border bg-surface shadow-sm">
                      <Card.Content className="p-5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted tracking-wider">Total de Conversas</p>
                          <p className="mt-2 font-display text-3xl font-bold text-foreground" data-numeric>
                            {draftAgent.conversationsCount}
                          </p>
                          <p className="mt-1 text-[11px] text-muted">
                            {isNew ? "Agente ainda não publicado" : "Desde a criação do agente"}
                          </p>
                        </div>
                        <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
                          <MessagesSquare className="size-6" />
                        </span>
                      </Card.Content>
                    </Card>

                    <Card className="border-border bg-surface shadow-sm">
                      <Card.Content className="p-5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted tracking-wider">Avaliação Média</p>
                          <p className="mt-2 font-display text-3xl font-bold text-foreground" data-numeric>
                            {draftAgent.rating > 0 ? `${draftAgent.rating.toFixed(1)} / 5.0` : "—"}
                          </p>
                          <p className="mt-1 text-[11px] text-muted">
                            {(() => {
                              const ratedCount = conversations.filter((c) => typeof c.rating === "number").length;
                              return ratedCount > 0 ? `Baseado em ${ratedCount} avaliações` : "Nenhuma avaliação ainda";
                            })()}
                          </p>
                        </div>
                        <span className="grid size-12 place-items-center rounded-2xl bg-warning-soft text-warning-soft-foreground">
                          <Star className="size-6 fill-warning" />
                        </span>
                      </Card.Content>
                    </Card>

                    <Card className="border-border bg-surface shadow-sm">
                      <Card.Content className="p-5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted tracking-wider">Duração Média</p>
                          <p className="mt-2 font-display text-3xl font-bold text-foreground" data-numeric>
                            {draftAgent.avgMinutes} min
                          </p>
                          <p className="mt-1 text-[11px] text-muted">Estimativa configurada para este agente</p>
                        </div>
                        <span className="grid size-12 place-items-center rounded-2xl bg-success-soft text-success-soft-foreground">
                          <Timer className="size-6" />
                        </span>
                      </Card.Content>
                    </Card>
                  </div>

                  {/* Lista de Conversas Registradas */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-bold text-foreground">Sessões Recentes</h3>
                      {conversations.length > 0 && (
                        <Chip color="default" variant="soft" size="sm">
                          {conversations.length} conversas salvas
                        </Chip>
                      )}
                    </div>

                    {isNew ? (
                      <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-background-secondary/20">
                        <History className="mx-auto size-8 text-muted/50 mb-2" />
                        <p className="text-sm font-semibold text-foreground">Publique o agente para começar a coletar histórico</p>
                        <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                          As conversas reais dos alunos aparecem aqui assim que o agente estiver salvo e em uso.
                        </p>
                      </div>
                    ) : isLoadingHistory ? (
                      <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted">
                        Carregando conversas…
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-background-secondary/20">
                        <History className="mx-auto size-8 text-muted/50 mb-2" />
                        <p className="text-sm font-semibold text-foreground">Nenhuma conversa registrada ainda</p>
                        <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                          Assim que um aluno conversar com este agente, as sessões aparecem aqui.
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {conversations.slice(0, 5).map((conv) => (
                          <li
                            key={conv.id}
                            onClick={() => setSelectedConversation(conv)}
                            className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4.5 transition-all hover:border-accent hover:shadow-md sm:flex-row sm:items-center sm:justify-between cursor-pointer"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2.5">
                                <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                                  {conv.title}
                                </h4>
                                {conv.status && (
                                  <Chip
                                    color={conv.status === "resolvida" ? "success" : conv.status === "atencao" ? "danger" : "accent"}
                                    variant="soft"
                                    size="sm"
                                    className="text-[10px]"
                                  >
                                    {conv.status === "resolvida"
                                      ? "Resolvida"
                                      : conv.status === "em_andamento"
                                        ? "Em andamento"
                                        : conv.status === "atencao"
                                          ? "Atenção"
                                          : "Dúvida de conteúdo"}
                                  </Chip>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted">
                                <span>
                                  {new Date(conv.createdAt).toLocaleString("pt-BR", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </span>
                                <span>•</span>
                                <span data-numeric>{conv.messageCount ?? conv.messages.length} mensagens trocadas</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="secondary" onClick={() => setSelectedConversation(conv)}>
                                <MessageSquare className="size-3.5 mr-1.5" />
                                Ler Transcrição
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </Tabs.Panel>
            </div>

            {/* Footer com Ações */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-background-secondary/30 p-6">
              <div className="text-xs text-muted">
                {activeTab === "identidade" && "Campos com asterisco são obrigatórios."}
                {activeTab === "comportamento" && "O Prompt do Sistema dita todas as respostas do agente."}
                {activeTab === "experiencia" && "As sugestões de partida aumentam o engajamento do aluno em 40%."}
                {activeTab === "historico" && "Use os diálogos para refinar continuamente as instruções de IA."}
              </div>

              <div className="flex items-center gap-3">
                <Button variant="tertiary" type="button" onClick={() => router.push("/admin/agentes")}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" isDisabled={isSaving}>
                  <Sparkles className="size-4" aria-hidden="true" />
                  {isSaving ? "Salvando..." : agentToEdit ? "Salvar alterações" : "Publicar agente"}
                </Button>
              </div>
            </div>
          </Tabs.Root>
        </Card>
      </form>

      {/* ========================================================================= */}
      {/* MODAL DE TRANSCRIÇÃO DA CONVERSA */}
      {/* ========================================================================= */}
      <Modal.Root
        isOpen={!!selectedConversation}
        onOpenChange={(open) => {
          if (!open) setSelectedConversation(null);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="lg" scroll="inside">
            <Modal.Dialog className="max-w-2xl sm:w-[42rem]">
              <Modal.Header>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
                      <MessageSquare className="size-5" aria-hidden="true" />
                    </Modal.Icon>
                    <div>
                      <Modal.Heading className="font-display text-lg font-bold">
                        {selectedConversation?.title}
                      </Modal.Heading>
                      <p className="text-xs text-muted">
                        Registrada em{" "}
                        {selectedConversation &&
                          new Date(selectedConversation.createdAt).toLocaleString("pt-BR", {
                            dateStyle: "full",
                            timeStyle: "short",
                          })}
                      </p>
                    </div>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="space-y-4 py-4">
                <div className="space-y-4 rounded-2xl border border-border bg-background-secondary p-4 max-h-[55vh] overflow-y-auto">
                  {selectedConversation?.messages.map((msg) => {
                    const isStudent = msg.author === "student";
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex items-start gap-2.5", isStudent ? "justify-end" : "justify-start")}
                      >
                        {!isStudent && (
                          <AgentAvatar 
                            avatar={avatar} 
                            themeColor={themeColor}
                            iconSvg={iconSvg}
                            photoUrl={photoUrl}
                            size="sm" 
                          />
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed",
                            isStudent
                              ? "bg-accent text-accent-foreground rounded-br-sm shadow-sm"
                              : "bg-surface border border-border text-foreground rounded-bl-sm shadow-xs",
                          )}
                        >
                          <div className="text-[10px] font-bold opacity-75 mb-1 uppercase tracking-wider">
                            {isStudent ? "Aluno" : name.trim() || "Agente"}
                          </div>
                          <p className="whitespace-pre-line">{msg.text}</p>
                        </div>
                        {isStudent && (
                          <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground text-xs font-bold shrink-0">
                            AL
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Modal.Body>

              <Modal.Footer className="justify-between">
                <Button variant="secondary" size="sm" onClick={handleCopyTranscript}>
                  {copiedTranscript ? (
                    <>
                      <Check className="size-4 text-success mr-1.5" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="size-4 mr-1.5" />
                      Copiar Transcrição
                    </>
                  )}
                </Button>

                <Button variant="tertiary" onClick={() => setSelectedConversation(null)}>
                  Fechar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </div>
  );
}
