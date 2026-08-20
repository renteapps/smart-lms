import { Palette, Monitor, Sun, Type, Image as ImageIcon } from "lucide-react";
import { Button, Card, Input, Label, TextArea, TextField } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { createClient } from "@/lib/supabase/server";
import { BrandingImages } from "./BrandingImages";

export default async function AparenciaPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "appearance")
    .maybeSingle();

  const appearance = (settings?.value as Record<string, unknown> | null) ?? {};
  const asUrl = (key: string) => (typeof appearance[key] === "string" ? (appearance[key] as string) : null);

  const branding = {
    logoUrl: asUrl("logoUrl"),
    faviconUrl: asUrl("faviconUrl"),
    ogImageUrl: asUrl("ogImageUrl"),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <PageHeader eyebrow="Plataforma" title="Aparência" description="Personalize a identidade visual e as configurações de marca da plataforma." />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Formulário Principal */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Type className="size-5 text-accent" aria-hidden="true" />
                Informações da Marca
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <TextField defaultValue="Smart LMS">
                <Label>Nome da plataforma</Label>
                <Input placeholder="Ex: Minha Academia" />
              </TextField>
              <TextField defaultValue="A melhor plataforma de ensino a distância. Aprenda no seu próprio ritmo com os melhores instrutores.">
                <Label>Slogan / descrição curta</Label>
                <TextArea rows={3} placeholder="Ex: Aprenda no seu próprio ritmo." className="resize-none" />
              </TextField>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Palette className="size-5 text-accent" aria-hidden="true" />
                Cores e tema
              </Card.Title>
            </Card.Header>
            <Card.Content className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-sm font-semibold text-foreground">Cor principal</Label>
                <div className="flex items-center gap-3">
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-accent shadow-elev-1">
                    <input type="color" defaultValue="#3157B7" className="absolute -left-2 -top-2 size-16 cursor-pointer opacity-0" />
                  </div>
                  <TextField defaultValue="#3157B7" className="flex-1">
                    <Input className="font-mono text-sm uppercase" />
                  </TextField>
                </div>
                <p className="mt-2 text-xs text-muted">Usada em botões principais, links e destaques.</p>
              </div>

              <div>
                <Label className="mb-3 block text-sm font-semibold text-foreground">Tema da experiência</Label>
                <div className="rounded-xl border border-border bg-background-secondary p-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-surface text-accent shadow-elev-1">
                      <Sun className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-foreground">Claro editorial</p>
                      <p className="text-xs text-muted">Tema principal desta versão</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <ImageIcon className="size-5 text-accent" aria-hidden="true" />
                Mídia e imagens
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <BrandingImages initial={branding} />
            </Card.Content>
          </Card>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="lg">
              Salvar alterações
            </Button>
          </div>
        </div>

        {/* Preview / Resumo */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 space-y-6">
            <Card>
              <Card.Header>
                <Card.Title>Preview de busca</Card.Title>
                <Card.Description>Como sua plataforma aparece no Google e nas redes sociais.</Card.Description>
              </Card.Header>
              <Card.Content className="space-y-6">
                {/* Google Preview */}
                <div className="space-y-1 rounded-lg border border-border bg-background-secondary p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                    <div className="flex size-6 items-center justify-center rounded-full border border-border bg-surface shadow-elev-1">
                      <div className="size-3 rounded-sm bg-accent" />
                    </div>
                    <span>
                      <span className="font-medium text-foreground">Smart LMS</span>
                      <br />
                      <span className="text-[10px]">https://smart-lms.com.br</span>
                    </span>
                  </div>
                  <h4 className="truncate pt-1 text-lg font-medium text-[#1a0dab] hover:underline dark:text-[#8ab4f8]">
                    Smart LMS - Plataforma EAD
                  </h4>
                  <p className="mt-1 line-clamp-2 text-sm text-[#4d5156] dark:text-[#bdc1c6]">
                    A melhor plataforma de ensino a distância. Aprenda no seu próprio ritmo com os melhores instrutores.
                  </p>
                </div>

                {/* Social Preview */}
                <div className="overflow-hidden rounded-lg border border-border shadow-elev-1">
                  <div className="relative flex h-36 w-full flex-col items-center justify-center border-b border-border bg-background-secondary text-muted">
                    <ImageIcon className="mb-2 size-10 opacity-40" aria-hidden="true" />
                    <span className="text-xs font-medium opacity-60">Preview da capa</span>
                  </div>
                  <div className="bg-surface p-3">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">smart-lms.com.br</p>
                    <h4 className="truncate text-sm font-semibold leading-tight text-foreground">Smart LMS - Plataforma EAD</h4>
                    <p className="mt-1 line-clamp-1 text-xs text-muted">A melhor plataforma de ensino a distância.</p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <div className="rounded-xl border border-accent/20 bg-accent-soft/50 p-5">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-accent-soft-foreground">
                <Monitor className="size-4" aria-hidden="true" /> Dica de UX
              </h4>
              <p className="text-sm text-foreground">
                Escolha uma cor primária com bom contraste. O sistema irá automaticamente adaptar os tons mais claros e escuros com base na sua escolha para garantir acessibilidade.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
