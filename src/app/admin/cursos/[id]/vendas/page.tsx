"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, CheckCircle2, ShoppingBag, Link as LinkIcon, Clock, Tag, Plus, Trash2 } from "lucide-react";

type Integracao = {
  id: string;
  plataforma: string;
  produtoId: string;
  codigoOferta: string;
  tempoAcesso: string;
};

export default function AdminCursoVendasPage() {
  const params = useParams();
  const id = params.id as string;

  // Lista de integrações
  const [integracoes, setIntegracoes] = useState<Integracao[]>([
    {
      id: Date.now().toString(),
      plataforma: "eduzz",
      produtoId: "",
      codigoOferta: "",
      tempoAcesso: "365"
    }
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (index: number, field: keyof Integracao, value: string) => {
    const novasIntegracoes = [...integracoes];
    novasIntegracoes[index] = { ...novasIntegracoes[index], [field]: value };
    setIntegracoes(novasIntegracoes);
  };

  const addIntegracao = () => {
    setIntegracoes([
      ...integracoes,
      {
        id: Date.now().toString() + Math.random().toString(),
        plataforma: "hotmart",
        produtoId: "",
        codigoOferta: "",
        tempoAcesso: "365"
      }
    ]);
  };

  const removeIntegracao = (idToRemove: string) => {
    setIntegracoes(integracoes.filter(int => int.id !== idToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setShowSuccess(false);
    
    // Simular requisição ao servidor
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsSaving(false);
    setShowSuccess(true);
    
    // Esconder mensagem de sucesso após 3 segundos
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-16 relative">
      
      {/* Toast de Sucesso */}
      <div className={`fixed top-8 right-8 bg-positive/10 border border-positive/20 text-positive px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 transition-all duration-300 z-50 ${showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <CheckCircle2 className="w-6 h-6" />
        <div>
          <h4 className="font-bold text-sm">Integrações salvas</h4>
          <p className="text-xs opacity-90">As configurações de vendas foram atualizadas.</p>
        </div>
      </div>

      <header className="sticky top-[76px] z-10 -mx-3 flex flex-col gap-4 rounded-[10px] border border-border bg-bg/95 p-4 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div>
          <Link href={`/admin/cursos/${id}`} className="inline-flex items-center gap-2 text-text-soft hover:text-primary transition-colors text-sm font-medium mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Curso
          </Link>
          <h1 className="text-3xl font-display font-black text-primary">Vendas e Integrações</h1>
          <p className="text-text-soft mt-1">Conecte este curso a produtos em plataformas externas.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link 
            href={`/admin/cursos/${id}`}
            className="flex-1 md:flex-none text-center bg-canvas-soft hover:bg-surface-hover text-ink px-6 py-3 rounded-lg font-semibold border border-border transition-all"
          >
            Voltar
          </Link>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 md:flex-none bg-primary hover:bg-primary-active disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
          >
            {isSaving ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Aviso de Planos */}
        <div className="bg-info-soft border border-info/20 rounded-xl p-5 flex items-start gap-3">
          <div className="text-info mt-0.5">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-info-foreground text-sm">Nota sobre Planos de Assinatura</h4>
            <p className="text-info-foreground/80 text-sm mt-1">
              Se um aluno adquirir este curso através de um <strong>Plano de Assinatura</strong>, o tempo de acesso será determinado pela vigência do plano, ignorando o "Tempo de Acesso" configurado abaixo.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
            <LinkIcon className="w-5 h-5 text-primary" />
            Conexões com Plataformas
          </h2>
          <button 
            onClick={addIntegracao}
            className="text-sm font-semibold text-primary hover:text-primary-active flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Integração
          </button>
        </div>

        {integracoes.length === 0 && (
          <div className="bg-surface-card rounded-2xl p-10 text-center border border-border/40 border-dashed">
            <p className="text-text-soft">Nenhuma integração configurada no momento.</p>
            <button 
              onClick={addIntegracao}
              className="mt-4 text-sm font-semibold text-primary hover:text-primary-active inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar a Primeira Integração
            </button>
          </div>
        )}

        {/* Lista de Integrações */}
        {integracoes.map((config, index) => (
          <section key={config.id} className="bg-surface-card rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/40 space-y-8 relative group">
            
            <button 
              onClick={() => removeIntegracao(config.id)}
              className="absolute top-6 right-6 text-text-mute hover:text-negative transition-colors p-2 rounded-lg hover:bg-negative/10"
              title="Remover Integração"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-12">
              <div>
                <label className="block text-sm font-bold text-text mb-1.5">Plataforma</label>
                <select 
                  value={config.plataforma}
                  onChange={(e) => handleChange(index, "plataforma", e.target.value)}
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink appearance-none"
                >
                  <option value="eduzz">Eduzz</option>
                  <option value="hotmart">Hotmart</option>
                  <option value="kiwify">Kiwify</option>
                  <option value="nenhuma">Nenhuma (Venda Interna)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-text mb-1.5">ID do Produto</label>
                <input 
                  type="text" 
                  value={config.produtoId}
                  onChange={(e) => handleChange(index, "produtoId", e.target.value)}
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  placeholder="Ex: 1234567"
                />
                <p className="text-xs text-text-mute mt-1.5">O código identificador do produto na plataforma escolhida.</p>
              </div>
            </div>

            <hr className="border-border/60" />

            <div className="flex items-center gap-2 text-ink pt-2">
              <Tag className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">Regras da Oferta</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-text mb-1.5">Código de Oferta (Opcional)</label>
                <input 
                  type="text" 
                  value={config.codigoOferta}
                  onChange={(e) => handleChange(index, "codigoOferta", e.target.value)}
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  placeholder="Ex: OFERTA_VIP_2026"
                />
                <p className="text-xs text-text-mute mt-1.5">Útil caso você tenha múltiplos checkouts com regras diferentes.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-text mb-1.5 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-mute" />
                  Tempo de Acesso (Dias)
                </label>
                <input 
                  type="number" 
                  value={config.tempoAcesso}
                  onChange={(e) => handleChange(index, "tempoAcesso", e.target.value)}
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  placeholder="Ex: 365"
                />
                <p className="text-xs text-text-mute mt-1.5">Tempo que o aluno terá acesso após a compra desta oferta.</p>
              </div>
            </div>
          </section>
        ))}

      </div>
    </div>
  );
}
