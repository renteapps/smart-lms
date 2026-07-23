"use client";

import { useState } from "react";
import { Palette, Upload, Monitor, Moon, Sun, Type, Image as ImageIcon } from "lucide-react";

export default function AparenciaPage() {
  const [theme, setTheme] = useState("system");
  
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-16">
      <header>
        <h1 className="text-3xl font-display font-black text-primary mb-2">Aparência</h1>
        <p className="text-text-soft">Personalize a identidade visual e as configurações de marca da sua plataforma.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário Principal */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Seção: Informações da Marca */}
          <section className="bg-surface-card rounded-2xl p-6 md:p-8 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
              <Type className="w-5 h-5 text-primary" />
              Informações da Marca
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Nome da Plataforma</label>
                <input 
                  type="text" 
                  defaultValue="Smart LMS"
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                  placeholder="Ex: Minha Academia"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1.5">Slogan / Descrição Curta</label>
                <textarea 
                  rows={3}
                  defaultValue="A melhor plataforma de ensino a distância. Aprenda no seu próprio ritmo com os melhores instrutores."
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink resize-none"
                  placeholder="Ex: Aprenda no seu próprio ritmo."
                />
              </div>
            </div>
          </section>

          {/* Seção: Identidade Visual (Cores) */}
          <section className="bg-surface-card rounded-2xl p-6 md:p-8 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
              <Palette className="w-5 h-5 text-primary" />
              Cores e Tema
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Cor Principal</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary border border-border shadow-inner flex-shrink-0 relative overflow-hidden group">
                     <input type="color" defaultValue="#1D4ED8" className="absolute -top-2 -left-2 w-16 h-16 opacity-0 cursor-pointer" />
                  </div>
                  <input 
                    type="text" 
                    defaultValue="#1D4ED8"
                    className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-ink font-mono text-sm uppercase transition-all"
                  />
                </div>
                <p className="text-xs text-text-mute mt-2">Usada em botões principais, links e destaques.</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-text mb-3">Modo Escuro Padrão</label>
                <div className="flex bg-canvas-soft p-1 rounded-lg border border-border">
                  <button 
                    onClick={() => setTheme("light")}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === 'light' ? 'bg-surface shadow-sm text-ink' : 'text-text-mute hover:text-text'}`}
                  >
                    <Sun className="w-4 h-4" /> Claro
                  </button>
                  <button 
                    onClick={() => setTheme("dark")}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-surface shadow-sm text-ink' : 'text-text-mute hover:text-text'}`}
                  >
                    <Moon className="w-4 h-4" /> Escuro
                  </button>
                  <button 
                    onClick={() => setTheme("system")}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === 'system' ? 'bg-surface shadow-sm text-ink' : 'text-text-mute hover:text-text'}`}
                  >
                    <Monitor className="w-4 h-4" /> Sistema
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Seção: Mídia e Imagens */}
          <section className="bg-surface-card rounded-2xl p-6 md:p-8 space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
              <ImageIcon className="w-5 h-5 text-primary" />
              Mídia e Imagens
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Logo */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text">Logo da Plataforma</label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-surface-hover hover:border-primary/50 transition-colors cursor-pointer group bg-canvas-soft">
                  <div className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-ink">Fazer upload da Logo</p>
                    <p className="text-xs text-text-mute">PNG, SVG ou JPG (max. 2MB)</p>
                  </div>
                </div>
              </div>

              {/* Favicon */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text">Favicon</label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-surface-hover hover:border-primary/50 transition-colors cursor-pointer group bg-canvas-soft">
                  <div className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-ink">Fazer upload do Favicon</p>
                    <p className="text-xs text-text-mute">Formato 1:1, de preferência .ico ou .png</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Imagem de Capa para Redes Sociais */}
            <div className="space-y-2 pt-4 border-t border-border">
              <label className="block text-sm font-semibold text-text">Capa de Redes Sociais (Open Graph)</label>
              <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-surface-hover hover:border-primary/50 transition-colors cursor-pointer group bg-canvas-soft">
                <div className="w-14 h-14 rounded-full bg-primary-pale flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-ink">Clique para buscar ou arraste uma imagem</p>
                  <p className="text-xs text-text-mute mt-1">Recomendado: 1200x630px para melhor visualização no WhatsApp, Facebook, LinkedIn...</p>
                </div>
              </div>
            </div>
          </section>

          {/* Botão de Salvar */}
          <div className="flex justify-end pt-2">
            <button className="bg-primary hover:bg-primary-active text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-transform hover:scale-[1.02] active:scale-95">
              Salvar Alterações
            </button>
          </div>
        </div>

        {/* Preview / Resumo */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 space-y-6">
            <div className="bg-surface-card rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="font-bold text-ink mb-1">Preview de Busca</h3>
              <p className="text-sm text-text-mute mb-4">Como sua plataforma aparece no Google e nas redes sociais.</p>
              
              {/* Google Preview */}
              <div className="bg-canvas-soft rounded-lg p-4 space-y-1 mb-6 border border-border">
                <div className="text-xs text-text-mute flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center shadow-sm">
                     <div className="w-3 h-3 bg-primary rounded-sm"></div>
                  </div>
                  <span>
                    <span className="text-ink font-medium">Smart LMS</span>
                    <br/>
                    <span className="text-[10px]">https://smart-lms.com.br</span>
                  </span>
                </div>
                <h4 className="text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer text-lg font-medium truncate pt-1">Smart LMS - Plataforma EAD</h4>
                <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2 mt-1">
                  A melhor plataforma de ensino a distância. Aprenda no seu próprio ritmo com os melhores instrutores.
                </p>
              </div>

              {/* Social Preview */}
              <div className="border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="w-full h-36 bg-canvas-soft flex flex-col items-center justify-center border-b border-border text-text-mute relative">
                  <ImageIcon className="w-10 h-10 opacity-40 mb-2" />
                  <span className="text-xs font-medium opacity-60">Preview da Capa</span>
                </div>
                <div className="p-3 bg-surface-card">
                  <p className="text-[10px] text-text-mute uppercase tracking-widest font-semibold mb-1">smart-lms.com.br</p>
                  <h4 className="font-semibold text-ink truncate text-sm leading-tight">Smart LMS - Plataforma EAD</h4>
                  <p className="text-xs text-text-soft line-clamp-1 mt-1">A melhor plataforma de ensino a distância.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-primary-pale/50 border border-primary/20 rounded-xl p-5">
              <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                 <Monitor className="w-4 h-4" /> Dica de UX
              </h4>
              <p className="text-sm text-body-text">
                Escolha uma cor primária com bom contraste. O sistema irá automaticamente adaptar os tons mais claros e escuros com base na sua escolha para garantir acessibilidade.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
