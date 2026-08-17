"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Input, TextField, Label } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "sonner";
import { LinkIcon, Plug, CreditCard, ChevronLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getPlanById } from "@/lib/data/plans";
import { listCoursesShallow } from "@/lib/data/courses";

interface Plan {
  id: string;
  name: string;
  price: number;
  frequency: "semanal" | "quinzenal" | "mensal" | "trimestral" | "semestral" | "anual" | "vitalicio" | "personalizado";
  accessTimeDays?: number; // Usado se frequency === 'personalizado'
  features?: string[];
  aiTokensWeekly?: number;
  aiTokensUnlimited?: boolean;
  courseAccessType?: "all" | "specific";
  specificCourses?: string[];
  status: "ativo" | "inativo";
  gateway?: "Eduzz" | "Hotmart";
  producerId?: string;
  productId?: string;
  offerId?: string;
  checkoutUrl?: string;
}

const availableFeatures = [
  { id: "cursos", label: "Cursos e Aulas", description: "Acesso total à trilha de aprendizagem." },
  { id: "anotacoes", label: "Anotações", description: "Permite criar anotações pessoais durante as aulas." },
  { id: "comentarios", label: "Comentários", description: "Libera a leitura e interação na comunidade das aulas." },
  { id: "agentes", label: "Agentes de IA", description: "Acesso aos tutores virtuais da plataforma." },
  { id: "pilulas", label: "Pílulas de Conhecimento", description: "Acesso a conteúdos curtos e blog." },
];

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
    <div
      role="button"
      tabIndex={0}
      onClick={() => onChange(!isSelected)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!isSelected);
        }
      }}
      className="flex w-full items-center justify-between gap-4 cursor-pointer select-none text-left focus:outline-none"
    >
      <div className="flex-1">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {description && <span className="block text-xs text-muted mt-0.5">{description}</span>}
      </div>
      <div
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out ${
          isSelected ? "bg-accent" : "bg-neutral-300 dark:bg-neutral-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            isSelected ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </div>
  );
}

export default function EditPlanPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [formData, setFormData] = useState<Partial<Plan>>({});
  const [loading, setLoading] = useState(true);
  const [coursesList, setCoursesList] = useState<{id: string, title: string}[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const supabase = createClient();
      
      // Load courses for the specific courses dropdown
      try {
        const courses = await listCoursesShallow(supabase, true);
        setCoursesList(courses.map(c => ({ id: c.id, title: c.title })));
      } catch (e) {
        console.error("Erro ao carregar cursos", e);
      }

      if (id !== "novo") {
        try {
          const plan = await getPlanById(supabase, id);
          if (plan) {
            const frequencyMap: Record<string, Plan["frequency"]> = {
              monthly: "mensal",
              yearly: "anual",
              lifetime: "vitalicio",
              custom: "personalizado",
            };
            setFormData({
              id: plan.id,
              name: plan.name,
              price: plan.price,
              frequency: frequencyMap[plan.frequency] || "mensal",
              features: plan.features,
              status: plan.isActive ? "ativo" : "inativo",
              gateway: "Eduzz", // Defaulting gateway mapping if any
              productId: plan.gatewayProductId,
            });
          } else {
            toast.error("Plano não encontrado.");
            router.push("/admin/planos");
          }
        } catch (e) {
          toast.error("Erro ao carregar plano.");
          router.push("/admin/planos");
        }
      }
      setLoading(false);
    }
    
    loadData();
  }, [id, router]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.price) {
      toast.error("Preencha os campos obrigatórios na aba Geral.");
      return;
    }

    if (formData.gateway && !formData.productId) {
      toast.error("Informe o ID do Produto para salvar a integração.");
      return;
    }

    // Simulate save
    console.log("Plano salvo:", formData);
    toast.success("Plano salvo com sucesso!");
    router.push("/admin/planos");
  };

  const toggleFeature = (featureId: string) => {
    setFormData(prev => {
      const currentFeatures = prev.features || [];
      if (currentFeatures.includes(featureId)) {
        return { ...prev, features: currentFeatures.filter(id => id !== featureId) };
      } else {
        return { ...prev, features: [...currentFeatures, featureId] };
      }
    });
  };

  const toggleCourse = (courseId: string) => {
    setFormData(prev => {
      const currentCourses = prev.specificCourses || [];
      if (currentCourses.includes(courseId)) {
        return { ...prev, specificCourses: currentCourses.filter(id => id !== courseId) };
      } else {
        return { ...prev, specificCourses: [...currentCourses, courseId] };
      }
    });
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" isIconOnly size="sm" onPress={() => router.push("/admin/planos")}>
            <ChevronLeft className="size-4" />
          </Button>
          <PageHeader
            eyebrow="Planos"
            title={id === "novo" ? "Novo Plano" : "Editar Plano"}
            description="Configure as regras de cobrança e o mapeamento com seu gateway de pagamento."
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onPress={() => router.push("/admin/planos")}>
            Cancelar
          </Button>
          <Button variant="primary" onPress={() => handleSave()}>
            Salvar Alterações
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal: Configurações Gerais */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CreditCard className="size-5 text-accent" /> Configurações Gerais
            </h2>
            <div className="space-y-4">
              <TextField value={formData.name || ""} onChange={(val) => setFormData({ ...formData, name: val })} isRequired>
                <Label>Nome do Plano *</Label>
                <Input placeholder="Ex: Acesso Premium" />
              </TextField>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField value={formData.price?.toString() || ""} onChange={(val) => setFormData({ ...formData, price: parseFloat(val) })} isRequired>
                  <Label>Preço (R$) *</Label>
                  <Input type="number" step="0.01" placeholder="Ex: 99.90" />
                </TextField>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Ciclo / Frequência</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={formData.frequency || "mensal"}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as Plan["frequency"] })}
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                    <option value="vitalicio">Vitalício</option>
                    <option value="personalizado">Personalizado (em dias)</option>
                  </select>
                </div>
              </div>

              {formData.frequency === "personalizado" && (
                <TextField value={formData.accessTimeDays?.toString() || ""} onChange={(val) => setFormData({ ...formData, accessTimeDays: parseInt(val) })}>
                  <Label>Tempo de Acesso (Dias)</Label>
                  <Input type="number" placeholder="Ex: 180" />
                  <p className="text-xs text-muted mt-1">Defina quantos dias de acesso o aluno terá após a compra.</p>
                </TextField>
              )}

              <div className="space-y-1 pt-2">
                <Label className="text-sm font-medium">Status do Plano</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  value={formData.status || "ativo"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as "ativo" | "inativo" })}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="size-5 text-success" /> Recursos & Permissões
            </h2>
            <p className="text-sm text-muted mb-6">
              Defina o que o aluno terá acesso ao assinar este plano.
            </p>

            <div className="space-y-4 divide-y divide-border">
              {availableFeatures.map((feature, index) => {
                const isSelected = formData.features?.includes(feature.id) ?? false;
                
                return (
                  <div key={feature.id} className={`py-4 ${index > 0 ? "border-t border-border" : "pt-0"}`}>
                    <ToggleSwitch
                      isSelected={isSelected}
                      onChange={() => toggleFeature(feature.id)}
                      label={feature.label}
                      description={feature.description}
                    />
                    
                    {/* Opções específicas para Cursos */}
                    {feature.id === "cursos" && isSelected && (
                      <div className="mt-4 rounded-lg bg-background-secondary p-4 space-y-4">
                        <Label className="text-xs font-semibold text-foreground">Abrangência de Acesso</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input 
                              type="radio" 
                              className="accent-accent"
                              name="courseAccessType" 
                              value="all" 
                              checked={formData.courseAccessType !== "specific"}
                              onChange={() => setFormData({ ...formData, courseAccessType: "all" })}
                            />
                            Todos os Cursos
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input 
                              type="radio" 
                              className="accent-accent"
                              name="courseAccessType" 
                              value="specific"
                              checked={formData.courseAccessType === "specific"}
                              onChange={() => setFormData({ ...formData, courseAccessType: "specific" })}
                            />
                            Cursos Específicos
                          </label>
                        </div>
                        
                        {formData.courseAccessType === "specific" && (
                          <div className="pt-2">
                            <p className="text-xs text-muted mb-3">Selecione os cursos que este plano irá desbloquear:</p>
                            <div className="space-y-3">
                              {coursesList.map(course => (
                                <ToggleSwitch
                                  key={course.id}
                                  isSelected={formData.specificCourses?.includes(course.id) || false}
                                  onChange={() => toggleCourse(course.id)}
                                  label={course.title}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Opções específicas para Agentes de IA */}
                    {feature.id === "agentes" && isSelected && (
                      <div className="mt-4 rounded-lg bg-background-secondary p-4 space-y-4">
                        <ToggleSwitch
                          isSelected={formData.aiTokensUnlimited ?? false}
                          onChange={() => setFormData({ ...formData, aiTokensUnlimited: !formData.aiTokensUnlimited })}
                          label="Tokens Ilimitados"
                          description="Permite uso livre dos tutores de IA sem restrição semanal de cota."
                        />

                        {!formData.aiTokensUnlimited && (
                          <div className="pt-2 border-t border-border/60">
                            <TextField 
                              value={formData.aiTokensWeekly?.toString() || ""} 
                              onChange={(val) => setFormData({ ...formData, aiTokensWeekly: parseInt(val) || 0 })}
                            >
                              <Label className="text-xs font-semibold">Limite de Tokens de IA (Por Semana)</Label>
                              <Input type="number" placeholder="Ex: 50000" />
                              <p className="text-xs text-muted mt-1">Defina a cota de uso de Inteligência Artificial liberada a cada semana para este plano.</p>
                            </TextField>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Coluna Lateral: Integração de Pagamento */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plug className="size-5 text-warning" /> Gateway
            </h2>
            <p className="text-sm text-muted mb-6">
              Mapeie os IDs para liberar o acesso automaticamente quando o webhook receber a notificação de venda.
            </p>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Plataforma</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  value={formData.gateway || ""}
                  onChange={(e) => setFormData({ ...formData, gateway: e.target.value as "Eduzz" | "Hotmart" | undefined })}
                >
                  <option value="">Nenhuma</option>
                  <option value="Eduzz">Eduzz</option>
                  <option value="Hotmart">Hotmart</option>
                </select>
              </div>

              {formData.gateway && (
                <>
                  <TextField value={formData.producerId || ""} onChange={(val) => setFormData({ ...formData, producerId: val })}>
                    <Label>ID do Produtor (Opcional)</Label>
                    <Input placeholder="Ex: 37296411" />
                    <p className="text-xs text-muted mt-1">Útil se você gerencia vendas de múltiplos produtores/contas.</p>
                  </TextField>

                  <TextField value={formData.productId || ""} onChange={(val) => setFormData({ ...formData, productId: val })}>
                    <Label>ID do Produto ({formData.gateway}) *</Label>
                    <Input placeholder="Ex: 123456" />
                  </TextField>

                  <TextField value={formData.offerId || ""} onChange={(val) => setFormData({ ...formData, offerId: val })}>
                    <Label>ID da Oferta (Opcional)</Label>
                    <Input placeholder="Ex: 7890" />
                    <p className="text-xs text-muted mt-1">Apenas se você trabalhar com múltiplas ofertas/preços no mesmo produto.</p>
                  </TextField>

                  <TextField value={formData.checkoutUrl || ""} onChange={(val) => setFormData({ ...formData, checkoutUrl: val })}>
                    <Label>URL de Checkout</Label>
                    <Input type="url" placeholder="https://..." />
                  </TextField>
                </>
              )}
            </div>

            {formData.checkoutUrl && (
              <div className="mt-6">
                <Link href={formData.checkoutUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-accent hover:underline">
                  <LinkIcon className="size-4" />
                  Testar link de checkout
                </Link>
              </div>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
}
