"use client";

import { useState } from "react";
import { Search, MessageSquare, Filter, AlertTriangle, UserX, Trash2, Send, Globe, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useNotifications } from "@/contexts/NotificationContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type CommentType = {
  id: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  lessonName: string;
  content: string;
  timeAgo: string;
  status: "Aguardando" | "Respondido";
};

const mockComments: CommentType[] = [
  {
    id: "1",
    studentName: "Carlos Mendes",
    studentEmail: "carlos@email.com",
    courseName: "Desenvolvimento Web Fullstack",
    lessonName: "Módulo 1 • Introdução ao React",
    content: "Estou com uma dúvida no uso do useEffect. Sempre que eu coloco o estado como dependência, ele entra em loop. Como posso resolver?",
    timeAgo: "Há 2 horas",
    status: "Aguardando"
  },
  {
    id: "2",
    studentName: "Ana Beatriz",
    studentEmail: "ana.beatriz@email.com",
    courseName: "Design System na Prática",
    lessonName: "Módulo 3 • Tokens de Cor",
    content: "Aula excelente! Consegui aplicar perfeitamente no meu projeto atual usando Tailwind.",
    timeAgo: "Ontem às 14:30",
    status: "Respondido"
  },
  {
    id: "3",
    studentName: "Lucas Oliveira",
    studentEmail: "lucas.oliveira@email.com",
    courseName: "Formação Node.js",
    lessonName: "Módulo 2 • Arquitetura REST",
    content: "Vocês vão disponibilizar o código fonte dessa aula? O link na descrição parece estar quebrado.",
    timeAgo: "Ontem às 10:15",
    status: "Aguardando"
  }
];

export default function AdminComentarios() {
  const [selectedComment, setSelectedComment] = useState<CommentType | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyVisibility, setReplyVisibility] = useState<"public" | "private">("public");
  const { addNotification } = useNotifications();

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedComment) return;

    addNotification({
      title: "Sua dúvida foi respondida!",
      message: `O professor respondeu seu comentário na aula: ${selectedComment.lessonName}.`,
      targetAudience: "user",
      targetId: selectedComment.studentEmail,
    });
    
    toast.success("Resposta enviada e aluno notificado!");
    setSelectedComment(null);
    setReplyText("");
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-primary flex items-center gap-3">
            <MessageSquare className="w-8 h-8" />
            Comentários
          </h1>
          <p className="text-text-soft mt-1">Gerencie e responda às dúvidas dos alunos em todos os cursos.</p>
        </div>
        <button className="bg-surface-hover text-text px-4 py-2 rounded-xl font-semibold hover:bg-surface-active transition-all flex items-center gap-2 border border-border/40">
          <Filter className="w-4 h-4" />
          <span>Filtrar</span>
        </button>
      </div>
      
      <div className="bg-surface-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-border/40">
        <div className="p-6 border-b border-border/40 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-on-primary">
              Todos
            </button>
            <button className="px-4 py-2 rounded-full text-sm font-semibold bg-surface hover:bg-surface-hover text-text-soft transition-colors border border-border/40">
              Aguardando Resposta
            </button>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-mute" />
            <input 
              type="text" 
              placeholder="Buscar comentário..." 
              className="w-full bg-canvas-soft border-transparent rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-border/40 bg-surface-hover/50">
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider w-[20%]">Aluno</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider w-[25%]">Curso / Aula</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider w-[35%]">Comentário</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider w-[10%]">Status</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider text-right w-[10%]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mockComments.map((comment) => (
                <tr 
                  key={comment.id} 
                  className="border-b border-border/40 hover:bg-surface-hover transition-colors group cursor-pointer"
                  onClick={() => setSelectedComment(comment)}
                >
                  <td className="py-4 px-6">
                    <div className="font-medium text-ink-deep">{comment.studentName}</div>
                    <div className="text-xs text-text-mute">{comment.studentEmail}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-ink-deep text-sm">{comment.courseName}</div>
                    <div className="text-xs text-text-soft">{comment.lessonName}</div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm text-text-soft line-clamp-2">
                      {comment.content}
                    </p>
                    <div className="text-xs text-text-mute mt-1">{comment.timeAgo}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                      comment.status === "Aguardando" 
                        ? "bg-warning/10 text-warning" 
                        : "bg-positive/10 text-positive"
                    }`}>
                      {comment.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      className="text-sm font-medium text-primary hover:bg-primary/10 px-4 py-2 bg-primary/5 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedComment(comment);
                      }}
                    >
                      {comment.status === "Aguardando" ? "Responder" : "Ver"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selectedComment} onOpenChange={(open) => !open && setSelectedComment(null)}>
        <DialogContent className="sm:max-w-[600px] bg-surface-card border-border/40 p-0 overflow-hidden rounded-2xl">
          {selectedComment && (
            <>
              <div className="p-6 border-b border-border/40 bg-surface-hover/30">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-display font-bold text-xl text-ink-deep mb-1">
                      {selectedComment.courseName}
                    </h3>
                    <p className="text-sm text-primary font-semibold">
                      {selectedComment.lessonName}
                    </p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap mt-1 ${
                      selectedComment.status === "Aguardando" 
                        ? "bg-warning/10 text-warning" 
                        : "bg-positive/10 text-positive"
                    }`}>
                      {selectedComment.status}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                    {selectedComment.studentName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-ink-deep">{selectedComment.studentName}</span>
                      <span className="text-xs text-text-mute">{selectedComment.timeAgo}</span>
                    </div>
                    <p className="text-text-soft text-sm mb-1">{selectedComment.studentEmail}</p>
                    <div className="bg-canvas p-4 rounded-xl mt-3 text-ink-deep border border-border/40 relative">
                      <div className="absolute top-0 left-4 -translate-y-full w-0 h-0 border-8 border-transparent border-b-canvas"></div>
                      <div className="absolute top-[-1px] left-4 -translate-y-full w-0 h-0 border-[9px] border-transparent border-b-border/40 -z-10"></div>
                      {selectedComment.content}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-2">
                    <button 
                      onClick={() => setReplyVisibility("public")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        replyVisibility === "public" 
                        ? "bg-primary text-on-primary shadow-sm" 
                        : "bg-surface text-text-soft hover:bg-surface-hover border border-border/40"
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      Visível para todos
                    </button>
                    <button 
                      onClick={() => setReplyVisibility("private")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        replyVisibility === "private" 
                        ? "bg-primary text-on-primary shadow-sm" 
                        : "bg-surface text-text-soft hover:bg-surface-hover border border-border/40"
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      Só para o aluno
                    </button>
                  </div>
                  
                  <textarea 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escreva sua resposta aqui..."
                    className="w-full bg-canvas-soft border border-border/60 rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-ink-deep placeholder:text-text-mute resize-none"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-border/40 bg-surface-hover/30 flex justify-between items-center">
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-2 text-text-soft hover:text-negative hover:bg-negative/10 rounded-lg transition-colors group" title="Excluir Comentário">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-surface-card border-border/40">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-ink-deep font-display font-black">Excluir Comentário?</AlertDialogTitle>
                        <AlertDialogDescription className="text-text-soft">
                          Tem certeza de que deseja excluir permanentemente este comentário? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-surface text-text hover:bg-surface-hover border-border/40">Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-negative text-on-negative hover:bg-negative/90" onClick={() => setSelectedComment(null)}>
                          Excluir Comentário
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-2 text-text-soft hover:text-negative hover:bg-negative/10 rounded-lg transition-colors" title="Bloquear Aluno">
                        <UserX className="w-5 h-5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-surface-card border-border/40">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-ink-deep font-display font-black">Bloquear Aluno?</AlertDialogTitle>
                        <AlertDialogDescription className="text-text-soft">
                          Tem certeza de que deseja bloquear este aluno de comentar? Ele não poderá mais enviar dúvidas nos cursos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-surface text-text hover:bg-surface-hover border-border/40">Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-negative text-on-negative hover:bg-negative/90">
                          Bloquear Aluno
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setSelectedComment(null)}
                    className="px-5 py-2.5 rounded-xl font-semibold text-text-soft hover:bg-surface transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSendReply}
                    className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-semibold hover:bg-primary-active transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar Resposta</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
