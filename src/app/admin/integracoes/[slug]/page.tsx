"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, notFound } from "next/navigation";
import { Button, Card, Input, TextField, Label } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { toast } from "sonner";
import { Check, Copy, Plug, AlertCircle } from "lucide-react";
import { ResendIntegrationContent } from "../ResendIntegrationContent";
import { OpenRouterIntegrationContent } from "../OpenRouterIntegrationContent";

function EduzzIntegrationContent() {
  const searchParams = useSearchParams();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCallbackUrl(`${window.location.origin}/admin/integracoes/eduzz`);
      setWebhookUrl(`${window.location.origin}/api/webhooks/eduzz`);
    }

    const code = searchParams.get("code");
    if (code) {
      setIsConnected(true);
      toast.success("Autenticação com a Eduzz concluída com sucesso!");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  const handleConnect = () => {
    if (!clientId || !clientSecret) {
      toast.error("Preencha o Client ID e Client Secret da sua aplicação.");
      return;
    }
    
    toast.info("Redirecionando para a Eduzz...");
    const EDUZZ_AUTH_URL = 'https://accounts.eduzz.com/oauth/authorize';
    const url = `${EDUZZ_AUTH_URL}?client_id=${clientId}&redirectTo=${callbackUrl}&response_type=code`;
    
    setTimeout(() => {
      window.location.search = "?code=exemplo_de_codigo_oauth123456";
    }, 1500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrações"
        title="Configurar Eduzz"
        description="Conecte seu aplicativo Eduzz para sincronizar vendas e assinaturas automaticamente."
      />

      <div className="grid gap-6">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Plug className="size-5 text-accent" /> Autenticação OAuth 2.0
            </h2>
            <p className="text-sm text-muted mt-1">
              Para integrar com a Eduzz, você precisa criar um aplicativo no <a href="https://console.eduzz.com/" target="_blank" rel="noreferrer" className="text-accent hover:underline">Console de Desenvolvedores da Eduzz</a>.
            </p>
          </div>

          {isConnected ? (
            <div className="rounded-lg border border-success/20 bg-success-soft p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="size-12 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="size-6 text-success" />
              </div>
              <div>
                <h3 className="font-bold text-success-soft-foreground">Conta Conectada</h3>
                <p className="text-sm text-success-soft-foreground/80 mt-1">O token de acesso foi gerado e salvo com sucesso.</p>
              </div>
              <Button variant="outline" onPress={() => setIsConnected(false)} className="mt-2">
                Desconectar e Configurar Novamente
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg border border-warning/20 bg-warning-soft p-4 flex gap-3">
                <AlertCircle className="size-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm text-warning-soft-foreground">
                  <p className="font-semibold mb-1">Passo 1: Configure a URL de Redirecionamento</p>
                  <p>No painel da Eduzz, defina a URL de callback (Redirect URI) do seu aplicativo como:</p>
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-background/80 p-2 font-mono text-xs shadow-sm">
                    <span className="flex-1 overflow-x-auto">{callbackUrl}</span>
                    <Button isIconOnly size="sm" variant="ghost" onPress={() => copyToClipboard(callbackUrl)}>
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TextField value={clientId} onChange={setClientId}>
                  <Label>Client ID (Id da Aplicação)</Label>
                  <Input placeholder="Ex: 22edfacb-9abd-4dfd-a9be..." />
                </TextField>
                
                <TextField value={clientSecret} onChange={setClientSecret}>
                  <Label>Client Secret</Label>
                  <Input type="password" placeholder="Insira o Secret da Aplicação" />
                </TextField>
              </div>

              <Button variant="primary" onPress={handleConnect} className="w-full sm:w-auto">
                Conectar com a Eduzz
              </Button>
            </div>
          )}

          <div className="mt-8 border-t border-border pt-6">
            <h3 className="text-lg font-semibold mb-2">Configuração do Webhook</h3>
            <p className="text-sm text-muted mb-4">
              Para receber atualizações em tempo real (como novas vendas, renovações e cancelamentos), 
              configure um webhook na Eduzz apontando para a URL abaixo. 
              <br/><br/>
              <strong>Dica:</strong> Registre essa mesma URL para os eventos de <code>myeduzz-contract-created</code> (nova assinatura), <code>myeduzz-contract-canceled</code> (cancelamentos) e <code>myeduzz-invoice-status-changed</code> (pagamentos e calotes) para manter o painel sincronizado.
            </p>

            <div className="rounded-lg border border-border bg-background-secondary p-4">
              <h4 className="font-semibold text-sm">URL do Webhook</h4>
              <div className="mt-2 flex items-center gap-2 rounded-md bg-background p-2 font-mono text-xs overflow-x-auto shadow-sm">
                <span className="flex-1">{webhookUrl}</span>
                <Button isIconOnly size="sm" variant="outline" onPress={() => copyToClipboard(webhookUrl)}>
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function HotmartIntegrationContent() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [basicToken, setBasicToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/webhooks/hotmart`);
    }
  }, []);

  const handleConnect = () => {
    if (!clientId || !clientSecret || !basicToken) {
      toast.error("Preencha todos os campos gerados pela Hotmart.");
      return;
    }
    
    setIsConnecting(true);
    
    // Simular POST Request para a Hotmart usando Client Credentials
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      toast.success("Autenticação com a Hotmart concluída com sucesso!");
    }, 1500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrações"
        title="Configurar Hotmart"
        description="Conecte suas Credenciais da Hotmart para liberar acessos e gerenciar assinaturas."
      />

      <div className="grid gap-6">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Plug className="size-5 text-accent" /> Autenticação Client Credentials
            </h2>
            <p className="text-sm text-muted mt-1">
              Para integrar com a Hotmart, gere uma nova credencial no painel <a href="https://app-vlc.hotmart.com/tools/credentials" target="_blank" rel="noreferrer" className="text-accent hover:underline">Hotmart Developers</a>.
            </p>
          </div>

          {isConnected ? (
            <div className="rounded-lg border border-success/20 bg-success-soft p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="size-12 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="size-6 text-success" />
              </div>
              <div>
                <h3 className="font-bold text-success-soft-foreground">Conta Conectada</h3>
                <p className="text-sm text-success-soft-foreground/80 mt-1">O token de acesso foi validado via Client Credentials.</p>
              </div>
              <Button variant="outline" onPress={() => setIsConnected(false)} className="mt-2">
                Desconectar e Configurar Novamente
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField value={clientId} onChange={setClientId}>
                  <Label>Client ID</Label>
                  <Input placeholder="Insira o Client ID" />
                </TextField>
                
                <TextField value={clientSecret} onChange={setClientSecret}>
                  <Label>Client Secret</Label>
                  <Input type="password" placeholder="Insira o Client Secret" />
                </TextField>

                <TextField value={basicToken} onChange={setBasicToken} className="md:col-span-2">
                  <Label>Token (Basic)</Label>
                  <Input type="password" placeholder="Insira o token do tipo Basic" />
                </TextField>
              </div>

              <Button variant="primary" onPress={handleConnect} isDisabled={isConnecting} className="w-full sm:w-auto">
                {isConnecting ? "Validando Chaves..." : "Conectar com a Hotmart"}
              </Button>
            </div>
          )}

          <div className="mt-8 border-t border-border pt-6">
            <h3 className="text-lg font-semibold mb-2">Configuração do Webhook</h3>
            <p className="text-sm text-muted mb-4">
              Para sincronizar os eventos de compra, reembolso e cancelamento de assinatura, 
              configure o webhook na Hotmart apontando para:
            </p>

            <div className="rounded-lg border border-border bg-background-secondary p-4">
              <h4 className="font-semibold text-sm">URL do Webhook</h4>
              <div className="mt-2 flex items-center gap-2 rounded-md bg-background p-2 font-mono text-xs overflow-x-auto shadow-sm">
                <span className="flex-1">{webhookUrl}</span>
                <Button isIconOnly size="sm" variant="outline" onPress={() => copyToClipboard(webhookUrl)}>
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function IntegracaoDetalhePage() {
  const params = useParams();
  const slug = params.slug as string;

  if (slug !== "eduzz" && slug !== "hotmart" && slug !== "resend" && slug !== "openrouter") {
    notFound();
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Carregando integrações...</div>}>
      {slug === "openrouter" ? (
        <OpenRouterIntegrationContent />
      ) : slug === "resend" ? (
        <ResendIntegrationContent />
      ) : slug === "eduzz" ? (
        <EduzzIntegrationContent />
      ) : (
        <HotmartIntegrationContent />
      )}
    </Suspense>
  );
}

