"use client";

import { useState, useEffect } from "react";
import { Button, Card, Input, TextField, Label } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "sonner";
import { Check, Plug } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveIntegration } from "@/app/actions/admin/platform";

export function PandaVideoIntegrationContent() {
  const [apiKey, setApiKey] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await createClient()
        .from("integrations")
        .select("enabled, secrets")
        .eq("slug", "pandavideo")
        .maybeSingle();

      if (data?.secrets && typeof data.secrets === "object" && "apiKey" in data.secrets) {
        setApiKey(String((data.secrets as { apiKey?: string }).apiKey ?? ""));
      }
      setIsConnected(!!data?.enabled);
      setIsLoading(false);
    })();
  }, []);

  const handleConnect = async () => {
    if (!apiKey) {
      toast.error("Preencha a API Key do PandaVideo.");
      return;
    }

    setIsConnecting(true);
    const result = await saveIntegration("pandavideo", {
      name: "PandaVideo",
      enabled: true,
      status: "connected",
      secrets: { apiKey },
    });
    setIsConnecting(false);

    if (result.success) {
      setIsConnected(true);
      toast.success("Autenticação com o PandaVideo concluída com sucesso!");
    } else {
      toast.error(result.message ?? "Não foi possível salvar a integração.");
    }
  };

  const handleDisconnect = async () => {
    const result = await saveIntegration("pandavideo", { enabled: false, status: "disconnected" });
    if (result.success) {
      setIsConnected(false);
      toast.success("Desconectado do PandaVideo.");
    } else {
      toast.error(result.message ?? "Não foi possível desconectar.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrações"
        title="Configurar PandaVideo"
        description="Conecte sua conta do PandaVideo para listar e hospedar os vídeos das suas aulas."
      />

      <div className="grid gap-6">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Plug className="size-5 text-accent" /> Autenticação via API Key
            </h2>
            <p className="text-sm text-muted mt-1">
              Para integrar com o PandaVideo, você precisa gerar uma API Key no painel do{" "}
              <a href="https://dashboard.pandavideo.com.br/" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                PandaVideo
              </a>. Ela é usada para listar os vídeos da sua biblioteca ao criar uma aula.
            </p>
          </div>

          {isLoading ? (
            <div className="h-32 animate-pulse rounded-lg bg-surface-secondary" />
          ) : isConnected ? (
            <div className="rounded-lg border border-success/20 bg-success-soft p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="size-12 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="size-6 text-success" />
              </div>
              <div>
                <h3 className="font-bold text-success-soft-foreground">Conta Conectada</h3>
                <p className="text-sm text-success-soft-foreground/80 mt-1">A API Key foi salva e a integração está ativa.</p>
              </div>
              <Button variant="outline" onPress={handleDisconnect} className="mt-2">
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4">
                <TextField value={apiKey} onChange={setApiKey}>
                  <Label>API Key</Label>
                  <Input type="password" placeholder="Insira sua API Key do PandaVideo" />
                </TextField>
              </div>

              <Button variant="primary" onPress={handleConnect} isDisabled={isConnecting} className="w-full sm:w-auto">
                {isConnecting ? "Validando Chave..." : "Conectar com o PandaVideo"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
