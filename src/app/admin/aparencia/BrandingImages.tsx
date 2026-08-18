"use client";

import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { Save } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { saveBrandingImages, type BrandingImages as BrandingImagesValue } from "./actions";

type BrandingImagesProps = {
  initial: BrandingImagesValue;
};

/**
 * Campos de imagem da identidade visual da plataforma.
 *
 * Vive separado do restante da página de aparência porque o upload é imediato —
 * a imagem já está no storage quando o admin confirma — e só o `Salvar` grava as
 * URLs em `app_settings.appearance`.
 */
export function BrandingImages({ initial }: BrandingImagesProps) {
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [faviconUrl, setFaviconUrl] = useState(initial.faviconUrl);
  const [ogImageUrl, setOgImageUrl] = useState(initial.ogImageUrl);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveBrandingImages({ logoUrl, faviconUrl, ogImageUrl });
    setIsSaving(false);

    if (result.success) {
      toast.success("Imagens salvas!", { description: result.message });
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
          onChange={setLogoUrl}
          folder="branding"
          aspect="free"
          description="PNG ou JPG com fundo transparente, até 5 MB."
        />

        <ImageUpload
          label="Favicon"
          value={faviconUrl}
          onChange={setFaviconUrl}
          folder="branding"
          aspect="square"
          description="Formato 1:1, no mínimo 256x256px."
        />
      </div>

      <div className="border-t border-border pt-6">
        <ImageUpload
          label="Capa de Redes Sociais (Open Graph)"
          value={ogImageUrl}
          onChange={setOgImageUrl}
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
