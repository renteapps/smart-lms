"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
  TextArea,
  toast,
} from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import {
  Plug,
  CreditCard,
  ChevronLeft,
  ShieldCheck,
  Trash2,
  Save,
  Plus,
  X,
  Search,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getPlanById } from "@/lib/data/plans";
import { listCoursesShallow } from "@/lib/data/courses";
import { savePlan, deletePlan } from "@/app/actions/admin/platform";

interface PlanFormState {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: string | number;
  frequency: "mensal" | "anual" | "vitalicio" | "personalizado" | "semanal" | "quinzenal" | "trimestral" | "semestral";
  accessTimeDays?: string | number;
  status: "ativo" | "inativo";
  isHighlighted: boolean;
  isB2B: boolean;
  seats?: string | number;
  features: string[];
  customFeatures: string[];
  courseAccessType: "all" | "specific";
  specificCourses: string[];
  aiDailyCredits: string | number;
  aiWeeklyCredits: string | number;
  aiMonthlyCredits: string | number;
  gateway?: "Eduzz" | "Hotmart" | "Kiwify" | "Stripe" | "Manual" | "";
  producerId?: string;
  productId?: string;
  offerId?: string;
  checkoutUrl?: string;
}

const defaultFeatures = [
  { id: "cursos", label: "Cursos e Aulas", description: "Acesso aos cursos e trilhas de aprendizagem." },
  { id: "agentes", label: "Agentes de IA", description: "Acesso aos tutores inteligentes e assistentes virtuais." },
  { id: "anotacoes", label: "Anotações", description: "Permite criar anotações pessoais sincronizadas durante as aulas." },
  { id: "comentarios", label: "Comentários", description: "Libera a leitura e interação na comunidade das aulas." },
  { id: "pilulas", label: "Pílulas de Conhecimento", description: "Acesso aos artigos, pílulas rápidas e blog." },
];

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ToggleSwitch({
  isSelected,
  onChange,
  label,
  description,
}: {
  isSelected: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <Switch isSelected={isSelected} onChange={onChange} className="w-full items-center justify-between gap-4">
      <Switch.Content className="flex-1 text-left">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {description && <span className="mt-0.5 block text-xs font-normal text-muted">{description}</span>}
      </Switch.Content>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch>
  );
}

export default function EditPlanPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "novo";
  const isNew = rawId === "novo";

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [coursesList, setCoursesList] = useState<{ id: string; title: string; category?: string }[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [newCustomFeatureText, setNewCustomFeatureText] = useState("");
  const [creditValueBrl, setCreditValueBrl] = useState<number>(0.01);

  const [formData, setFormData] = useState<PlanFormState>({
    name: "",
    slug: "",
    description: "",
    price: "",
    frequency: "mensal",
    accessTimeDays: "",
    status: "ativo",
    isHighlighted: false,
    isB2B: false,
    seats: "",
    features: ["cursos", "agentes", "anotacoes", "comentarios", "pilulas"],
    customFeatures: [],
    courseAccessType: "all",
    specificCourses: [],
    aiDailyCredits: 25,
    aiWeeklyCredits: 100,
    aiMonthlyCredits: 400,
    gateway: "Eduzz",
    producerId: "",
    productId: "",
    offerId: "",
    checkoutUrl: "",
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const supabase = createClient();

      try {
        const courses = await listCoursesShallow(supabase, false);
        setCoursesList(courses.map((c) => ({ id: c.id, title: c.title, category: c.category })));
      } catch (e) {
        console.error("Erro ao carregar cursos:", e);
      }

      try {
        const { data: settings } = await supabase.from("ai_billing_settings").select("credit_value_brl").eq("id", 1).single();
        if (settings?.credit_value_brl) setCreditValueBrl(Number(settings.credit_value_brl));
      } catch (e) {
        console.error("Erro ao carregar configurações de IA:", e);
      }

      if (!isNew) {
        try {
          const plan = await getPlanById(supabase, rawId);
          if (plan) {
            const frequencyMap: Record<string, PlanFormState["frequency"]> = {
              monthly: "mensal",
              yearly: "anual",
              lifetime: "vitalicio",
              custom: "personalizado",
            };

            const builtInIds = new Set(defaultFeatures.map((f) => f.id));
            const builtInFeatures: string[] = [];
            const customFeats: string[] = [];

            (plan.features || []).forEach((feat) => {
              if (builtInIds.has(feat)) {
                builtInFeatures.push(feat);
              } else {
                customFeats.push(feat);
              }
            });

            setFormData({
              id: plan.id,
              name: plan.name || "",
              slug: plan.slug || slugify(plan.name || ""),
              description: plan.description || "",
              price: plan.price ?? 0,
              frequency: frequencyMap[plan.frequency] || "mensal",
              accessTimeDays: plan.accessTimeDays || "",
              status: plan.isActive ? "ativo" : "inativo",
              isHighlighted: plan.isHighlighted || false,
              isB2B: plan.isB2B || false,
              seats: plan.seats || "",
              features: builtInFeatures.length > 0 ? builtInFeatures : ["cursos", "agentes", "anotacoes", "comentarios", "pilulas"],
              customFeatures: customFeats,
              courseAccessType: plan.courseAccessType || (plan.specificCourses?.length ? "specific" : "all"),
              specificCourses: plan.specificCourses || [],
              aiDailyCredits: plan.aiDailyCredits ?? 25,
              aiWeeklyCredits: plan.aiWeeklyCredits ?? 100,
              aiMonthlyCredits: plan.aiMonthlyCredits ?? 400,
              gateway: (plan.gateway as PlanFormState["gateway"]) || (plan.gatewayProductId ? "Eduzz" : ""),
              producerId: plan.producerId || "",
              productId: plan.gatewayProductId || "",
              offerId: plan.offerId || "",
              checkoutUrl: plan.checkoutUrl || "",
            });
            setSlugTouched(true);
          } else {
            toast.danger("Plano não encontrado.");
            router.push("/admin/planos");
          }
        } catch (e) {
          console.error("Erro ao carregar plano:", e);
          toast.danger("Erro ao carregar plano.");
          router.push("/admin/planos");
        }
      }
      setLoading(false);
    }

    void loadData();
  }, [rawId, isNew, router]);

  const handleNameChange = (newName: string) => {
    setFormData((prev) => ({
      ...prev,
      name: newName,
      slug: slugTouched ? prev.slug : slugify(newName),
    }));
  };

  const toggleFeature = (featureId: string) => {
    setFormData((prev) => {
      const current = prev.features || [];
      if (current.includes(featureId)) {
        return { ...prev, features: current.filter((id) => id !== featureId) };
      } else {
        return { ...prev, features: [...current, featureId] };
      }
    });
  };

  const toggleCourse = (courseId: string) => {
    setFormData((prev) => {
      const current = prev.specificCourses || [];
      if (current.includes(courseId)) {
        return { ...prev, specificCourses: current.filter((id) => id !== courseId) };
      } else {
        return { ...prev, specificCourses: [...current, courseId] };
      }
    });
  };

  const addCustomFeature = () => {
    const text = newCustomFeatureText.trim();
    if (!text) return;
    if (formData.customFeatures.includes(text)) {
      toast.danger("Este recurso já foi adicionado.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      customFeatures: [...prev.customFeatures, text],
    }));
    setNewCustomFeatureText("");
  };

  const removeCustomFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customFeatures: prev.customFeatures.filter((_, i) => i !== index),
    }));
  };

  const filteredCourses = useMemo(() => {
    if (!courseSearch.trim()) return coursesList;
    const term = courseSearch.toLowerCase();
    return coursesList.filter((c) => c.title.toLowerCase().includes(term) || c.category?.toLowerCase().includes(term));
  }, [coursesList, courseSearch]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.name || !formData.name.trim()) {
      toast.danger("Informe o nome do plano.");
      return;
    }

    const priceNum = typeof formData.price === "string" ? parseFloat(formData.price.replace(",", ".")) : Number(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.danger("Informe um preço válido (ex: 99.90 ou 0 para gratuito).");
      return;
    }

    if (formData.frequency === "personalizado") {
      const days = Number(formData.accessTimeDays);
      if (!days || days <= 0) {
        toast.danger("Informe a quantidade de dias de acesso para o ciclo personalizado.");
        return;
      }
    }

    if (formData.isB2B && formData.seats) {
      const seatsNum = Number(formData.seats);
      if (isNaN(seatsNum) || seatsNum <= 0) {
        toast.danger("Informe uma quantidade válida de licenças/vagas para o plano corporativo.");
        return;
      }
    }

    if (formData.gateway && !formData.productId?.trim()) {
      toast.danger(`Informe o ID do Produto na plataforma ${formData.gateway} para sincronização.`);
      return;
    }

    setIsSaving(true);

    try {
      const allFeatures = [...(formData.features || []), ...(formData.customFeatures || [])];

      const payload = {
        id: isNew ? undefined : rawId,
        name: formData.name.trim(),
        slug: formData.slug?.trim() || slugify(formData.name),
        description: formData.description?.trim() || undefined,
        price: priceNum,
        frequency: (formData.frequency === "mensal"
          ? "monthly"
          : formData.frequency === "anual"
          ? "yearly"
          : formData.frequency === "vitalicio"
          ? "lifetime"
          : "custom") as "monthly" | "yearly" | "lifetime" | "custom",
        accessTimeDays: formData.frequency === "personalizado" ? Number(formData.accessTimeDays) : undefined,
        isActive: formData.status === "ativo",
        isHighlighted: formData.isHighlighted,
        isB2B: formData.isB2B,
        seats: formData.isB2B && formData.seats ? Number(formData.seats) : undefined,
        features: allFeatures,
        courseAccessType: formData.courseAccessType,
        specificCourses: formData.courseAccessType === "specific" ? formData.specificCourses : [],
        aiDailyCredits: Number(formData.aiDailyCredits),
        aiWeeklyCredits: Number(formData.aiWeeklyCredits),
        aiMonthlyCredits: Number(formData.aiMonthlyCredits),
        gateway: formData.gateway || undefined,
        productId: formData.productId?.trim() || undefined,
        gatewayProductId: formData.productId?.trim() || undefined,
        producerId: formData.producerId?.trim() || undefined,
        offerId: formData.offerId?.trim() || undefined,
        checkoutUrl: formData.checkoutUrl?.trim() || undefined,
      };

      const result = await savePlan(payload);

      if (result.success) {
        toast.success(isNew ? "Plano criado com sucesso!" : "Plano atualizado com sucesso!");
        router.push("/admin/planos");
        router.refresh();
      } else {
        toast.danger(result.message || "Erro ao salvar plano.");
      }
    } catch (err) {
      console.error("Erro ao salvar plano:", err);
      toast.danger("Erro inesperado ao salvar plano.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNew || !rawId) return;
    setIsDeleting(true);

    try {
      const result = await deletePlan(rawId);
      if (result.success) {
        toast.success("Plano excluído com sucesso!");
        setIsDeleteModalOpen(false);
        router.push("/admin/planos");
        router.refresh();
      } else {
        toast.danger(result.message || "Erro ao excluir plano.");
      }
    } catch (err) {
      console.error("Erro ao excluir plano:", err);
      toast.danger("Erro inesperado ao excluir plano.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 text-muted">
        <Loader2 className="size-8 animate-spin text-accent" />
        <p className="text-sm font-medium">Carregando configurações do plano...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Barra de Topo / Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            aria-label="Voltar para lista de planos"
            onPress={() => router.push("/admin/planos")}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <PageHeader
            eyebrow="Assinaturas & Planos"
            title={isNew ? "Criar Novo Plano" : `Editar: ${formData.name || "Plano"}`}
            description="Configure as permissões de conteúdo, regras de cobrança e integrações de pagamento."
          />
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <Button
              variant="outline"
              className="text-danger border-danger/30 hover:bg-danger-soft hover:text-danger-soft-foreground gap-2"
              onPress={() => setIsDeleteModalOpen(true)}
              isDisabled={isSaving || isDeleting}
            >
              <Trash2 className="size-4" /> Excluir
            </Button>
          )}

          <Button
            variant="outline"
            onPress={() => router.push("/admin/planos")}
            isDisabled={isSaving || isDeleting}
          >
            Cancelar
          </Button>

          <Button
            variant="primary"
            className="gap-2"
            onPress={() => handleSave()}
            isDisabled={isSaving || isDeleting}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isNew ? "Criar Plano" : "Salvar Alterações"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal: Informações Gerais & Recursos */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card 1: Informações Gerais */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
              <CreditCard className="size-5 text-accent" /> Informações Gerais
            </h2>

            <div className="space-y-4">
              <TextField
                value={formData.name}
                onChange={handleNameChange}
                isRequired
              >
                <Label>Nome do Plano *</Label>
                <Input placeholder="Ex: Acesso Premium Anual, Plano Pro, Formação Completa" />
              </TextField>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  value={formData.slug}
                  onChange={(val) => {
                    setSlugTouched(true);
                    setFormData((prev) => ({ ...prev, slug: slugify(val) }));
                  }}
                >
                  <Label>Slug (Identificador URL)</Label>
                  <Input placeholder="ex: acesso-premium-anual" />
                </TextField>

                <TextField
                  value={formData.price.toString()}
                  onChange={(val) => setFormData((prev) => ({ ...prev, price: val }))}
                  isRequired
                >
                  <Label>Preço (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 99.90 (0 para gratuito)"
                  />
                </TextField>
              </div>

              <TextField
                value={formData.description}
                onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
              >
                <Label>Descrição Curta (Opcional)</Label>
                <TextArea
                  rows={2}
                  placeholder="Breve resumo dos benefícios deste plano exibido na página de vendas."
                />
              </TextField>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <Select
                  selectedKey={formData.frequency}
                  onSelectionChange={(k) =>
                    setFormData((prev) => ({ ...prev, frequency: String(k) as PlanFormState["frequency"] }))
                  }
                >
                  <Label>Ciclo de Cobrança / Validade</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBoxItem id="mensal">Mensal (Renovação a cada mês)</ListBoxItem>
                      <ListBoxItem id="anual">Anual (Renovação anual)</ListBoxItem>
                      <ListBoxItem id="vitalicio">Vitalício (Acesso sem expiração)</ListBoxItem>
                      <ListBoxItem id="semanal">Semanal</ListBoxItem>
                      <ListBoxItem id="quinzenal">Quinzenal</ListBoxItem>
                      <ListBoxItem id="trimestral">Trimestral</ListBoxItem>
                      <ListBoxItem id="semestral">Semestral</ListBoxItem>
                      <ListBoxItem id="personalizado">Personalizado (em dias corridos)</ListBoxItem>
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Select
                  selectedKey={formData.status}
                  onSelectionChange={(k) =>
                    setFormData((prev) => ({ ...prev, status: String(k) as "ativo" | "inativo" }))
                  }
                >
                  <Label>Status do Plano</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBoxItem id="ativo">Ativo (Disponível para venda)</ListBoxItem>
                      <ListBoxItem id="inativo">Inativo (Oculto)</ListBoxItem>
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              {formData.frequency === "personalizado" && (
                <div className="rounded-lg border border-border bg-background-secondary p-4">
                  <TextField
                    value={formData.accessTimeDays?.toString() || ""}
                    onChange={(val) => setFormData((prev) => ({ ...prev, accessTimeDays: val }))}
                    isRequired
                  >
                    <Label>Duração do Acesso (em dias) *</Label>
                    <Input type="number" min="1" placeholder="Ex: 180" />
                    <p className="mt-1 text-xs text-muted">
                      O aluno terá acesso por essa quantidade exata de dias após a data da confirmação da matrícula.
                    </p>
                  </TextField>
                </div>
              )}

              {/* Destaque & B2B Switches */}
              <div className="grid gap-4 pt-4 sm:grid-cols-2 border-t border-border">
                <ToggleSwitch
                  isSelected={formData.isHighlighted}
                  onChange={(val) => setFormData((prev) => ({ ...prev, isHighlighted: val }))}
                  label="Destacar Plano"
                  description="Exibe selo 'Mais Popular' e realce visual na vitrine de planos."
                />

                <ToggleSwitch
                  isSelected={formData.isB2B}
                  onChange={(val) => setFormData((prev) => ({ ...prev, isB2B: val }))}
                  label="Plano Corporativo (B2B)"
                  description="Destinado a contratações por empresas e times."
                />
              </div>

              {formData.isB2B && (
                <div className="rounded-lg border border-border bg-background-secondary p-4">
                  <TextField
                    value={formData.seats?.toString() || ""}
                    onChange={(val) => setFormData((prev) => ({ ...prev, seats: val }))}
                  >
                    <Label>Quantidade de Vagas / Assentos Corporativos</Label>
                    <Input type="number" min="1" placeholder="Ex: 10" />
                    <p className="mt-1 text-xs text-muted">
                      Número máximo de membros que a empresa poderá convidar sob esta assinatura.
                    </p>
                  </TextField>
                </div>
              )}
            </div>
          </Card>

          {/* Card 2: Recursos & Permissões */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <ShieldCheck className="size-5 text-success" /> Recursos & Permissões
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Controle exatamente o que os alunos deste plano poderão acessar na plataforma.
                </p>
              </div>
            </div>

            <div className="space-y-4 divide-y divide-border">
              {defaultFeatures.map((feature, index) => {
                const isSelected = formData.features?.includes(feature.id) ?? false;

                return (
                  <div key={feature.id} className={index > 0 ? "pt-4" : ""}>
                    <ToggleSwitch
                      isSelected={isSelected}
                      onChange={() => toggleFeature(feature.id)}
                      label={feature.label}
                      description={feature.description}
                    />

                    {/* Configurações específicas para Cursos */}
                    {feature.id === "cursos" && isSelected && (
                      <div className="mt-4 rounded-xl border border-border/80 bg-background-secondary p-4 space-y-4">
                        <RadioGroup
                          value={formData.courseAccessType}
                          onChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              courseAccessType: value as "all" | "specific",
                            }))
                          }
                          orientation="horizontal"
                        >
                          <Label className="text-xs font-semibold uppercase text-muted tracking-wider">
                            Abrangência do Acesso a Cursos
                          </Label>
                          <div className="flex flex-wrap gap-4 mt-2">
                            <Radio value="all">
                              <Radio.Content className="gap-2">
                                <Radio.Control>
                                  <Radio.Indicator />
                                </Radio.Control>
                                Todos os Cursos da Plataforma
                              </Radio.Content>
                            </Radio>
                            <Radio value="specific">
                              <Radio.Content className="gap-2">
                                <Radio.Control>
                                  <Radio.Indicator />
                                </Radio.Control>
                                Cursos Específicos ({formData.specificCourses.length} selecionados)
                              </Radio.Content>
                            </Radio>
                          </div>
                        </RadioGroup>

                        {formData.courseAccessType === "specific" && (
                          <div className="space-y-3 pt-2 border-t border-border">
                            <div className="relative">
                              <Search className="absolute left-3 top-2.5 size-4 text-muted" />
                              <Input
                                value={courseSearch}
                                onChange={(e) => setCourseSearch(e.target.value)}
                                placeholder="Filtrar cursos por título..."
                                className="pl-9 text-sm"
                              />
                            </div>

                            <div className="max-h-56 overflow-y-auto space-y-2 rounded-lg border border-border bg-background p-2">
                              {filteredCourses.length === 0 ? (
                                <p className="p-3 text-center text-xs text-muted">
                                  {coursesList.length === 0 ? "Nenhum curso cadastrado." : "Nenhum curso encontrado com esse filtro."}
                                </p>
                              ) : (
                                filteredCourses.map((course) => {
                                  const isChecked = formData.specificCourses.includes(course.id);
                                  return (
                                    <div
                                      key={course.id}
                                      onClick={() => toggleCourse(course.id)}
                                      className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                                        isChecked ? "bg-accent-soft text-accent-soft-foreground font-medium" : "hover:bg-default-100"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <div
                                          className={`flex size-4 items-center justify-center rounded border ${
                                            isChecked ? "border-accent bg-accent text-accent-foreground" : "border-border"
                                          }`}
                                        >
                                          {isChecked && <Check className="size-3 stroke-[3]" />}
                                        </div>
                                        <span className="truncate">{course.title}</span>
                                        {course.category && (
                                          <span className="text-[10px] text-muted uppercase">({course.category})</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Configurações específicas para Agentes de IA */}
                    {feature.id === "agentes" && isSelected && (
                      <div className="mt-4 rounded-xl border border-border/80 bg-background-secondary p-4 space-y-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Franquia de créditos de IA</p>
                          <p className="mt-1 text-xs text-muted">Limites de segurança renovados automaticamente. Uso ilimitado não é permitido.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {([
                            ["aiDailyCredits", "Por dia"],
                            ["aiWeeklyCredits", "Por semana"],
                            ["aiMonthlyCredits", "Por mês"],
                          ] as const).map(([field, label]) => (
                            <TextField key={field} value={formData[field].toString()} onChange={(value) => setFormData((prev) => ({ ...prev, [field]: value }))}>
                              <Label className="text-xs font-semibold">{label}</Label>
                              <Input type="number" min="0" step="0.0001" />
                            </TextField>
                          ))}
                        </div>
                        {(() => {
                          const valueBrl = creditValueBrl || 0.01;
                          let estimate = 0;
                          let periodLabel = "por ciclo";
                          const mC = Number(formData.aiMonthlyCredits) || 0;
                          const wC = Number(formData.aiWeeklyCredits) || 0;
                          
                          switch(formData.frequency) {
                            case "semanal":
                              estimate = wC * valueBrl;
                              periodLabel = "por semana";
                              break;
                            case "quinzenal":
                              estimate = wC * 2 * valueBrl;
                              periodLabel = "por quinzena";
                              break;
                            case "mensal":
                              estimate = mC * valueBrl;
                              periodLabel = "por mês";
                              break;
                            case "trimestral":
                              estimate = mC * 3 * valueBrl;
                              periodLabel = "por trimestre";
                              break;
                            case "semestral":
                              estimate = mC * 6 * valueBrl;
                              periodLabel = "por semestre";
                              break;
                            case "anual":
                              estimate = mC * 12 * valueBrl;
                              periodLabel = "por ano";
                              break;
                            case "vitalicio":
                              estimate = mC * valueBrl;
                              periodLabel = "por mês (vitalício)";
                              break;
                            case "personalizado": {
                              const days = Number(formData.accessTimeDays) || 30;
                              estimate = mC * (days / 30) * valueBrl;
                              periodLabel = `a cada ${days} dias`;
                              break;
                            }
                          }
                          
                          return (
                            <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
                              <p className="text-sm font-semibold text-accent-foreground">Custo estimado ({new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valueBrl)} / crédito)</p>
                              <p className="text-xs text-muted mt-1">
                                Se o aluno usar todos os créditos, o custo de IA estimado para você será de{" "}
                                <strong className="text-foreground">
                                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(estimate)}
                                </strong>{" "}
                                {periodLabel}.
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Vantagens Customizadas para a Vitrine */}
            <div className="mt-6 pt-6 border-t border-border space-y-3">
              <Label className="text-sm font-semibold text-foreground">
                Vantagens & Benefícios Extras (Exibição)
              </Label>
              <p className="text-xs text-muted">
                Adicione itens adicionais para destacar nas tabelas de preços e checkout (ex: &quot;Acesso à Comunidade VIP no WhatsApp&quot;, &quot;Mentoria Mensal em Grupo&quot;).
              </p>

              <div className="flex gap-2">
                <Input
                  value={newCustomFeatureText}
                  onChange={(e) => setNewCustomFeatureText(e.target.value)}
                  placeholder="Ex: Grupo exclusivo de networking"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomFeature();
                    }
                  }}
                />
                <Button variant="outline" onPress={addCustomFeature} className="shrink-0 gap-1">
                  <Plus className="size-4" /> Adicionar
                </Button>
              </div>

              {formData.customFeatures.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {formData.customFeatures.map((feat, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 rounded-full bg-default-100 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      <Check className="size-3 text-success" />
                      {feat}
                      <button
                        type="button"
                        onClick={() => removeCustomFeature(index)}
                        className="ml-1 text-muted hover:text-danger focus:outline-none"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Coluna Lateral: Integração com Gateway de Pagamento */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
              <Plug className="size-5 text-warning" /> Gateway de Pagamento
            </h2>
            <p className="mb-6 text-xs text-muted">
              Vincule os códigos do seu produto para ativar o acesso do aluno automaticamente via Webhook assim que a compra for aprovada.
            </p>

            <div className="space-y-4">
              <Select
                selectedKey={formData.gateway || ""}
                onSelectionChange={(k) =>
                  setFormData((prev) => ({
                    ...prev,
                    gateway: (k ? String(k) : "") as PlanFormState["gateway"],
                  }))
                }
              >
                <Label>Plataforma de Pagamento</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBoxItem id="">Nenhuma (Venda Manual / Interna)</ListBoxItem>
                    <ListBoxItem id="Eduzz">Eduzz</ListBoxItem>
                    <ListBoxItem id="Hotmart">Hotmart</ListBoxItem>
                    <ListBoxItem id="Kiwify">Kiwify</ListBoxItem>
                    <ListBoxItem id="Stripe">Stripe</ListBoxItem>
                  </ListBox>
                </Select.Popover>
              </Select>

              {Boolean(formData.gateway) && (
                <>
                  <TextField
                    value={formData.productId || ""}
                    onChange={(val) => setFormData((prev) => ({ ...prev, productId: val }))}
                    isRequired
                  >
                    <Label>ID do Produto ({formData.gateway}) *</Label>
                    <Input placeholder="Ex: 123456" />
                    <p className="mt-1 text-xs text-muted">Código numérico ou identificador na plataforma.</p>
                  </TextField>

                  <TextField
                    value={formData.producerId || ""}
                    onChange={(val) => setFormData((prev) => ({ ...prev, producerId: val }))}
                  >
                    <Label>ID do Produtor (Opcional)</Label>
                    <Input placeholder="Ex: 37296411" />
                    <p className="mt-1 text-xs text-muted">Útil para validar webhooks de múltiplas contas de produtores.</p>
                  </TextField>

                  <TextField
                    value={formData.offerId || ""}
                    onChange={(val) => setFormData((prev) => ({ ...prev, offerId: val }))}
                  >
                    <Label>ID da Oferta / Variação (Opcional)</Label>
                    <Input placeholder="Ex: 7890" />
                    <p className="mt-1 text-xs text-muted">Apenas se usar múltiplas ofertas no mesmo produto.</p>
                  </TextField>

                  <TextField
                    value={formData.checkoutUrl || ""}
                    onChange={(val) => setFormData((prev) => ({ ...prev, checkoutUrl: val }))}
                  >
                    <Label>URL Direta de Checkout (Opcional)</Label>
                    <Input type="url" placeholder="https://sun.eduzz.com/..." />
                  </TextField>

                  {formData.checkoutUrl && (
                    <div className="pt-2">
                      <Link
                        href={formData.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                      >
                        <ExternalLink className="size-3.5" />
                        Testar link de checkout
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Card Resumo do Plano */}
          <Card className="p-6 bg-gradient-to-br from-background to-background-secondary border border-border">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
              Resumo do Plano
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-baseline border-b border-border pb-2">
                <span className="text-muted">Preço</span>
                <span className="text-lg font-bold text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    typeof formData.price === "string" ? parseFloat(formData.price.replace(",", ".")) || 0 : formData.price || 0
                  )}
                </span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted">Ciclo</span>
                <span className="font-medium capitalize text-foreground">{formData.frequency}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted">Status</span>
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                    formData.status === "ativo"
                      ? "bg-success-soft text-success-soft-foreground"
                      : "bg-default-100 text-default-600"
                  }`}
                >
                  {formData.status === "ativo" ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Gateway</span>
                <span className="font-medium text-foreground">
                  {formData.gateway ? formData.gateway : "Nenhum (Manual)"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </form>

      {/* Modal de Confirmação de Exclusão */}
      <Modal.Root isOpen={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading className="text-lg font-bold text-danger">
                  Excluir Plano de Assinatura
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-3 py-3 text-sm text-foreground">
                <p>
                  Tem certeza que deseja excluir o plano <strong>&quot;{formData.name}&quot;</strong>?
                </p>
                <p className="text-xs text-muted">
                  Esta ação é irreversível. As assinaturas existentes que estiverem associadas a este plano manterão seus registros no histórico.
                </p>
              </Modal.Body>
              <Modal.Footer className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onPress={() => setIsDeleteModalOpen(false)}
                  isDisabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="bg-danger hover:bg-danger/90 text-white gap-2"
                  onPress={handleDelete}
                  isDisabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  Confirmar Exclusão
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </div>
  );
}
