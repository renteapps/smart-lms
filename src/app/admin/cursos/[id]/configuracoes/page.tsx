"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Settings, Shield, Award, MessageSquare, Clock, CheckCircle2 } from "lucide-react";

export default function AdminCursoConfiguracoesPage() {
  const params = useParams();
  const id = params.id as string;

  // Estados do formulário
  const [config, setConfig] = useState({
    enableCertificates: true,
    dripContent: false,
    enableComments: true,
    requireSequentialProgress: true,
    expirationDays: "365",
    maxStudents: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleToggle = (field: keyof typeof config) => {
    setConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
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
          <h4 className="font-bold text-sm">Configurações salvas</h4>
          <p className="text-xs opacity-90">As preferências do curso foram atualizadas.</p>
        </div>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link href={`/admin/cursos/${id}`} className="inline-flex items-center gap-2 text-text-soft hover:text-primary transition-colors text-sm font-medium mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Curso
          </Link>
          <h1 className="text-3xl font-display font-black text-primary">Configurações</h1>
          <p className="text-text-soft mt-1">Regras de negócio, certificados e preferências do curso #{id}.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Progresso e Certificados */}
        <section className="bg-surface-card rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/40 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
            <Award className="w-5 h-5 text-primary" />
            Progresso e Certificados
          </h2>
          
          <div className="space-y-6">
            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 mt-0.5"
                style={{ backgroundColor: config.enableCertificates ? 'var(--color-primary)' : 'var(--color-border)' }}
                onClick={() => handleToggle('enableCertificates')}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.enableCertificates ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <div onClick={() => handleToggle('enableCertificates')}>
                <span className="block text-sm font-bold text-ink group-hover:text-primary transition-colors">Emitir Certificado Automático</span>
                <span className="block text-sm text-text-soft mt-1">Alunos recebem o certificado em PDF assim que concluem 100% das aulas.</span>
              </div>
            </label>

            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 mt-0.5"
                style={{ backgroundColor: config.requireSequentialProgress ? 'var(--color-primary)' : 'var(--color-border)' }}
                onClick={() => handleToggle('requireSequentialProgress')}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.requireSequentialProgress ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <div onClick={() => handleToggle('requireSequentialProgress')}>
                <span className="block text-sm font-bold text-ink group-hover:text-primary transition-colors">Progresso Sequencial Obrigatório</span>
                <span className="block text-sm text-text-soft mt-1">O aluno só pode assistir a próxima aula após concluir a anterior.</span>
              </div>
            </label>
          </div>
        </section>

        {/* Interação do Aluno */}
        <section className="bg-surface-card rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/40 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
            <MessageSquare className="w-5 h-5 text-primary" />
            Interação
          </h2>
          
          <div className="space-y-6">
            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 mt-0.5"
                style={{ backgroundColor: config.enableComments ? 'var(--color-primary)' : 'var(--color-border)' }}
                onClick={() => handleToggle('enableComments')}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.enableComments ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <div onClick={() => handleToggle('enableComments')}>
                <span className="block text-sm font-bold text-ink group-hover:text-primary transition-colors">Permitir Comentários</span>
                <span className="block text-sm text-text-soft mt-1">Habilita a área de dúvidas e discussões em cada aula.</span>
              </div>
            </label>

            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 mt-0.5"
                style={{ backgroundColor: config.dripContent ? 'var(--color-primary)' : 'var(--color-border)' }}
                onClick={() => handleToggle('dripContent')}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.dripContent ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <div onClick={() => handleToggle('dripContent')}>
                <span className="block text-sm font-bold text-ink group-hover:text-primary transition-colors">Conteúdo Gotejado (Drip Content)</span>
                <span className="block text-sm text-text-soft mt-1">Libera os módulos gradualmente após a compra, em vez de tudo de uma vez.</span>
              </div>
            </label>
          </div>
        </section>

        {/* Regras de Acesso */}
        <section className="bg-surface-card rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/40 space-y-6 md:col-span-2">
          <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
            <Shield className="w-5 h-5 text-primary" />
            Regras de Acesso
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-text mb-1.5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-mute" />
                Tempo de Acesso (Dias)
              </label>
              <input 
                type="number" 
                name="expirationDays"
                value={config.expirationDays}
                onChange={handleChange}
                className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                placeholder="Ex: 365"
              />
              <p className="text-xs text-text-mute mt-1.5">Deixe em branco ou '0' para acesso vitalício.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-text mb-1.5">Limite de Alunos</label>
              <input 
                type="number" 
                name="maxStudents"
                value={config.maxStudents}
                onChange={handleChange}
                className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                placeholder="Sem limite"
              />
              <p className="text-xs text-text-mute mt-1.5">Máximo de matriculados permitidos. Deixe em branco para ilimitado.</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
