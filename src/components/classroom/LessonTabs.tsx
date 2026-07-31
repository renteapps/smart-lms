"use client";

import { useState, useEffect } from "react";
import { FileText, Download, MessageSquare, Send, StickyNote, Save, Check } from "lucide-react";
import { Lesson } from "@/lib/mockData";
import BlockViewer from "./BlockViewer";

interface LessonTabsProps {
  lesson: Lesson;
}

type StoredNote = {
  lessonId: string;
  lessonTitle: string;
  content: string;
  updatedAt: string;
};

export default function LessonTabs({ lesson }: LessonTabsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "materials" | "comments" | "notes">("overview");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setNote(localStorage.getItem(`smartlms_note_${lesson.id}`) || "");
    });
    return () => cancelAnimationFrame(frame);
  }, [lesson.id]);

  const handleSaveNote = () => {
    setIsSaving(true);
    // Add generic lesson info so the notas page can display context
    const noteData = {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      content: note,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`smartlms_note_${lesson.id}`, note); // old raw note
    
    // Also update an array of all notes for the /notas page
    try {
      const allNotesStr = localStorage.getItem('smartlms_all_notes') || '[]';
      const parsed: unknown = JSON.parse(allNotesStr);
      const allNotes: StoredNote[] = Array.isArray(parsed) ? parsed as StoredNote[] : [];
      const existingNoteIndex = allNotes.findIndex((storedNote) => storedNote.lessonId === lesson.id);
      
      if (existingNoteIndex >= 0) {
        allNotes[existingNoteIndex] = noteData;
      } else {
        allNotes.push(noteData);
      }
      
      localStorage.setItem('smartlms_all_notes', JSON.stringify(allNotes));
    } catch (e) {
      console.error('Failed to save notes list', e);
    }

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 500);
  };

  return (
    <div className="mt-8 overflow-hidden rounded-[10px] border border-border bg-surface shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 hide-scrollbar sm:px-5">
        <button
          onClick={() => setActiveTab("overview")}
          className={`min-h-14 shrink-0 border-b-2 px-3 text-sm font-bold ${
            activeTab === "overview" ? "border-primary text-primary-active" : "border-transparent text-text-soft hover:text-ink"
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab("materials")}
          className={`min-h-14 shrink-0 border-b-2 px-3 text-sm font-bold ${
            activeTab === "materials" ? "border-primary text-primary-active" : "border-transparent text-text-soft hover:text-ink"
          }`}
        >
          Materiais
        </button>
        <button
          onClick={() => setActiveTab("comments")}
          className={`min-h-14 shrink-0 border-b-2 px-3 text-sm font-bold ${
            activeTab === "comments" ? "border-primary text-primary-active" : "border-transparent text-text-soft hover:text-ink"
          }`}
        >
          Comentários
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex min-h-14 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold ${
            activeTab === "notes" ? "border-primary text-primary-active" : "border-transparent text-text-soft hover:text-ink"
          }`}
        >
          <StickyNote className="w-4 h-4" />
          Anotações
        </button>
      </div>

      <div className="p-5 sm:p-7">
        {activeTab === "overview" && (
          <div className="max-w-none">
            <h3 className="text-xl font-bold mb-4">Sobre esta aula</h3>
            {lesson.blocks && lesson.blocks.length > 0 ? (
              <BlockViewer blocks={lesson.blocks} />
            ) : (
              <p className="text-text-soft leading-relaxed">
                {lesson.content || "Nenhuma descrição fornecida para esta aula."}
              </p>
            )}
          </div>
        )}

        {activeTab === "materials" && (
          <div>
            <h3 className="text-xl font-bold mb-4">Materiais Complementares</h3>
            {lesson.attachments && lesson.attachments.length > 0 ? (
              <ul className="space-y-3">
                {lesson.attachments.map((attachment, idx) => (
                  <li key={idx}>
                    <a
                      href={attachment.url}
                      className="flex min-h-16 items-center justify-between rounded-[13px] border border-border bg-canvas-soft p-4 hover:border-primary/40 hover:bg-primary-pale/30 group"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-text-soft group-hover:text-primary transition-colors" />
                        <span className="font-medium text-sm">{attachment.name}</span>
                      </div>
                      <Download className="w-5 h-5 text-text-soft group-hover:text-primary transition-colors" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-text-soft">Nenhum material anexado a esta aula.</p>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div>
            <h3 className="text-xl font-bold mb-4">Comentários e Dúvidas</h3>
            
            <div className="flex gap-4 mb-8">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary">Você</span>
              </div>
              <div className="flex-1 relative">
                <textarea 
                  placeholder="Adicione um comentário..."
                  className="min-h-[110px] w-full resize-none rounded-[13px] border border-border bg-canvas-soft p-4 pr-12 text-sm focus:border-primary focus:bg-surface focus:outline-none"
                ></textarea>
                <button aria-label="Enviar comentário" className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-[11px] bg-primary text-on-primary hover:bg-primary-active">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Mock comment */}
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-text-soft">AB</span>
                </div>
                <div className="flex-1">
                  <div className="rounded-[13px] border border-border bg-canvas-soft p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">Ana Beatriz</span>
                      <span className="text-xs text-text-soft">Há 2 horas</span>
                    </div>
                    <p className="text-sm text-text-soft">
                      Excelente aula! Consegui entender perfeitamente o conceito explicado.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-2 ml-2">
                    <button className="text-xs font-semibold text-text-soft hover:text-text transition-colors">Responder</button>
                    <button className="flex items-center gap-1 text-xs text-text-soft hover:text-text transition-colors">
                      <MessageSquare className="w-3 h-3" />
                      0 respostas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Suas Anotações</h3>
                <p className="text-sm text-text-soft mt-1">
                  Espaço minimalista para seus pensamentos. Suas anotações são salvas localmente.
                </p>
              </div>
              <button
                onClick={handleSaveNote}
                disabled={isSaving}
                className={`flex min-h-11 items-center gap-2 rounded-[11px] px-4 text-sm font-bold ${
                  saveSuccess 
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                    : "bg-primary text-on-primary hover:bg-primary-active"
                }`}
              >
                {isSaving ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? "Salvando..." : saveSuccess ? "Salvo!" : "Salvar Anotação"}
              </button>
            </div>
            
            <div className="relative group">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Escreva seus maiores insights sobre a aula aqui..."
                className="min-h-[300px] w-full resize-y rounded-[14px] border border-border bg-canvas-soft p-6 leading-7 text-text focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
