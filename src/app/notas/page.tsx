"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StickyNote, Trash2, ExternalLink, Search, FileText } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

interface Note {
  lessonId: string;
  lessonTitle: string;
  content: string;
  updatedAt: string;
}

export default function NotasPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedNotes = localStorage.getItem("smartlms_all_notes");
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error("Failed to parse notes", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const handleDelete = (lessonId: string) => {
    const newNotes = notes.filter((n) => n.lessonId !== lessonId);
    setNotes(newNotes);
    localStorage.setItem("smartlms_all_notes", JSON.stringify(newNotes));
    localStorage.removeItem(`smartlms_note_${lessonId}`);
  };

  const filteredNotes = notes.filter((note) => 
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.lessonTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavBar />
      
      <main className="flex-grow pt-24 pb-16 px-4 md:px-12 max-w-7xl mx-auto w-full mt-[60px]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium text-sm mb-4">
              <StickyNote className="w-4 h-4" />
              <span>Seu Bloco de Notas</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-text">
              Suas Anotações
            </h1>
            <p className="text-text-soft text-lg mt-4 max-w-2xl">
              Reveja os insights, resumos e pensamentos que você registrou durante as aulas.
            </p>
          </div>

          <div className="relative w-full md:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-soft" />
            <input
              type="text"
              placeholder="Buscar nas anotações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-[300px] pl-12 pr-4 py-3 bg-surface-card border border-border rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>

        {!isLoaded ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-surface-card animate-pulse rounded-2xl border border-border"></div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-surface-card border border-border rounded-3xl">
            <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-text-soft" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nenhuma anotação ainda</h2>
            <p className="text-text-soft max-w-md mx-auto mb-8">
              Você ainda não criou nenhuma anotação. Durante as aulas, use a aba "Anotações" para registrar seus pensamentos.
            </p>
            <Link 
              href="/cursos"
              className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
            >
              Começar a Estudar
            </Link>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-text-soft">Nenhuma anotação encontrada para "{searchQuery}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <div 
                key={note.lessonId}
                className="group flex flex-col bg-surface-card border border-border hover:border-emerald-500/50 rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-xs font-medium text-text-soft">
                      {new Date(note.updatedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </span>
                    <button 
                      onClick={() => handleDelete(note.lessonId)}
                      className="text-text-soft hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                      title="Excluir anotação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="font-bold text-lg mb-3 text-text line-clamp-2">
                    {note.lessonTitle}
                  </h3>
                  
                  <div className="relative flex-grow">
                    <p className="text-text-soft text-sm leading-relaxed line-clamp-6 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface-card to-transparent pointer-events-none" />
                  </div>
                </div>
                
                <div className="p-4 border-t border-border bg-surface/50">
                  <Link 
                    href={`/courses/c1/lessons/${note.lessonId}`} 
                    className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-surface-hover hover:bg-emerald-500 hover:text-white transition-colors text-sm font-medium"
                  >
                    <span>Ir para Aula</span>
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
