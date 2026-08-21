"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, toast } from "@heroui/react";
import { Save } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { saveBrandingImages, type BrandingImages as BrandingImagesValue } from "./actions";

type BrandingImagesProps = {
  initial: BrandingImagesValue;
  onChange?: (images: BrandingImagesValue) => void;
};

/**
 * Campos de imagem da identidade visual da plataforma.
 *
 * Vive integrado à página de aparência: o upload sobe o arquivo para o storage
 * e atualiza o estado em tempo real.
 */
export function BrandingImages({ initial, onChange }: BrandingImagesProps) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [faviconUrl, setFaviconUrl] = useState(initial.faviconUrl);
  const [ogImageUrl, setOgImageUrl] = useState(initial.ogImageUrl);
  const [isSaving, setIsSaving] = useState(false);

  const handleLogoChange = (url: string | null) => {
    setLogoUrl(url);
    onChange?.({ logoUrl: url, faviconUrl, ogImageUrl });
  };

  const handleFaviconChange = (url: string | null) => {
    setFaviconUrl(url);
    onChange?.({ logoUrl, faviconUrl: url, ogImageUrl });
  };

  const handleOgImageChange = (url: string | null) => {
    setOgImageUrl(url);
    onChange?.({ logoUrl, faviconUrl, ogImageUrl: url });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveBrandingImages({ logoUrl, faviconUrl, ogImageUrl });
    setIsSaving(false);

    if (result.success) {
      toast.success("Imagens salvas!", { description: result.message });
      router.refresh();
    } else {
      toast.danger("Erro ao salvar", { description: result.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ImageUpload
          label="Logo da Plataforma"
          value={logoUrl}
          onChange={handleLogoChange}
          folder="branding"
          aspect="free"
          description="PNG, SVG ou JPG com fundo transparente, até 5 MB."
        />

        <ImageUpload
          label="Favicon"
          value={faviconUrl}
          onChange={handleFaviconChange}
          folder="branding"
          aspect="square"
          description="Formato 1:1 (PNG, ICO ou SVG), no mínimo 256x256px."
        />
      </div>

      <div className="border-t border-border pt-6">
        <ImageUpload
          label="Capa de Redes Sociais (Open Graph)"
          value={ogImageUrl}
          onChange={handleOgImageChange}
          folder="branding"
          aspect="wide"
          description="Recomendado: 1200x630px para WhatsApp, Facebook e LinkedIn."
        />
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" type="button" onPress={() => void handleSave()} isDisabled={isSaving}>
          <Save className="size-4" aria-hidden="true" />
          {isSaving ? "Salvando…" : "Salvar imagens"}
        </Button>
      </div>
    </div>
  );
}
