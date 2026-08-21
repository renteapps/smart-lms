"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Palette, Monitor, Sun, Type, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button, Card, Input, Label, TextArea, TextField } from "@heroui/react";
import { BrandingImages } from "./BrandingImages";
import { saveAppearance } from "./actions";
import type { BrandingImages as BrandingImagesType } from "./actions";
import { BrandMark } from "@/components/BrandMark";
import { toast } from "@heroui/react";

type AppearanceClientProps = {
  initial: {
    platformName: string;
    slogan: string;
    primaryColor: string;
    theme: string;
  };
  branding: BrandingImagesType;
};

export function AppearanceClient({ initial, branding }: AppearanceClientProps) {
  const router = useRouter();
  const [platformName, setPlatformName] = useState(initial.platformName);
  const [slogan, setSlogan] = useState(initial.slogan);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [brandingState, setBrandingState] = useState<BrandingImagesType>(branding);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await saveAppearance({
      platformName: (formData.get("platformName") as string) || platformName,
      slogan: (formData.get("slogan") as string) || slogan,
      primaryColor: (formData.get("primaryColor") as string) || primaryColor,
      theme: "light",
      logoUrl: brandingState.logoUrl,
      faviconUrl: brandingState.faviconUrl,
      ogImageUrl: brandingState.ogImageUrl,
    });
    setLoading(false);
    if (result.error) {
      toast.danger("Erro ao salvar", { description: result.error });
    } else {
      toast.success("Aparência salva!", { description: "As configurações foram atualizadas em toda a plataforma." });
      router.refresh();
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Formulário Principal */}
      <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <Type className="size-5 text-accent" aria-hidden="true" />
              Informações da Marca
            </Card.Title>
          </Card.Header>
          <Card.Content className="space-y-4">
            <TextField>
              <Label>Nome da plataforma</Label>
              <Input 
                name="platformName"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                placeholder="Ex: Skill Academy" 
              />
            </TextField>
            <TextField>
              <Label>Slogan / descrição curta</Label>
              <TextArea 
                name="slogan"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                rows={3} 
                placeholder="Ex: Aprendizagem prática para transformar sua carreira." 
                className="resize-none" 
              />
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
                <div 
                  className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border shadow-elev-1"
                  style={{ backgroundColor: primaryColor }}
                >
                  <input 
                    type="color" 
                    name="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="absolute -left-2 -top-2 size-16 cursor-pointer opacity-0" 
                  />
                </div>
                <TextField className="flex-1">
                  <Input 
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="font-mono text-sm uppercase" 
                  />
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
            <BrandingImages initial={brandingState} onChange={setBrandingState} />
          </Card.Content>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="lg" isDisabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Salvar alterações
          </Button>
        </div>
      </form>

      {/* Preview / Resumo */}
      <div className="lg:col-span-1">
        <div className="sticky top-28 space-y-6">
          <Card>
            <Card.Header>
              <Card.Title>Preview da Marca</Card.Title>
              <Card.Description>Como o menu e o cabeçalho serão visualizados pelos alunos.</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 shadow-surface">
                <BrandMark 
                  platformName={platformName || "Smart LMS"}
                  logoUrl={brandingState.logoUrl}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 shadow-surface">
                <BrandMark 
                  href="/admin" 
                  compact 
                  subtitle="Workspace" 
                  platformName={platformName || "Smart LMS"}
                  logoUrl={brandingState.logoUrl}
                />
                <span className="text-xs font-semibold text-muted">Modo Compacto</span>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Preview de busca</Card.Title>
              <Card.Description>Como sua plataforma aparece no Google e nas redes sociais.</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-6">
              {/* Google Preview */}
              <div className="space-y-1 rounded-lg border border-border bg-background-secondary p-4">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                  <div className="flex size-6 items-center justify-center overflow-hidden rounded-full border border-border bg-surface shadow-elev-1">
                    {brandingState.faviconUrl ? (
                      <img src={brandingState.faviconUrl} alt="Favicon" className="size-full object-cover" />
                    ) : (
                      <div className="size-3 rounded-sm" style={{ backgroundColor: primaryColor }} />
                    )}
                  </div>
                  <span>
                    <span className="font-medium text-foreground">{platformName || "Smart LMS"}</span>
                    <br />
                    <span className="text-[10px]">https://plataforma.com.br</span>
                  </span>
                </div>
                <h4 className="truncate pt-1 text-lg font-medium text-[#1a0dab] hover:underline dark:text-[#8ab4f8]">
                  {platformName || "Smart LMS"} - Plataforma EAD
                </h4>
                <p className="mt-1 line-clamp-2 text-sm text-[#4d5156] dark:text-[#bdc1c6]">
                  {slogan || "A melhor plataforma de ensino a distância. Aprenda no seu próprio ritmo com os melhores instrutores."}
                </p>
              </div>

              {/* Social Preview */}
              <div className="overflow-hidden rounded-lg border border-border shadow-elev-1">
                <div className="relative flex h-36 w-full flex-col items-center justify-center border-b border-border bg-background-secondary text-muted overflow-hidden">
                  {brandingState.ogImageUrl ? (
                    <img src={brandingState.ogImageUrl} alt="Open Graph" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="mb-2 size-10 opacity-40" aria-hidden="true" />
                      <span className="text-xs font-medium opacity-60">Preview da capa</span>
                    </>
                  )}
                </div>
                <div className="bg-surface p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">plataforma.com.br</p>
                  <h4 className="truncate text-sm font-semibold leading-tight text-foreground">{platformName || "Smart LMS"} - Plataforma EAD</h4>
                  <p className="mt-1 line-clamp-1 text-xs text-muted">{slogan || "A melhor plataforma de ensino a distância."}</p>
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
  );
}
