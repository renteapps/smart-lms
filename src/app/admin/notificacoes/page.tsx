"use client";

import { useState } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { Send, Bell } from "lucide-react";
import { toast } from "sonner";

export default function AdminNotificacoes() {
  const { addNotification, notifications, deleteNotification } = useNotifications();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "course" | "user">("all");
  const [targetId, setTargetId] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !message) {
      toast.error("Preencha o título e a mensagem.");
      return;
    }

    if (targetAudience !== "all" && !targetId) {
      toast.error("Informe o ID do curso ou usuário alvo.");
      return;
    }

    addNotification({
      title,
      message,
      targetAudience,
      targetId: targetAudience !== "all" ? targetId : undefined,
    });

    toast.success("Notificação enviada com sucesso!");
    setTitle("");
    setMessage("");
    setTargetId("");
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-display font-black text-primary flex items-center gap-3">
          <Bell className="w-8 h-8" />
          Notificações
        </h1>
        <p className="text-text-mute mt-2 text-lg">
          Envie avisos, alertas ou mensagens para seus alunos.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-surface-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-text mb-6">Nova Notificação</h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Novo módulo liberado!"
                className="w-full bg-surface-hover border border-border rounded-lg px-4 py-2 text-text placeholder:text-text-mute focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-1">Mensagem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Detalhes da notificação..."
                rows={4}
                className="w-full bg-surface-hover border border-border rounded-lg px-4 py-2 text-text placeholder:text-text-mute focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-1">Público Alvo</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as "all" | "course" | "user")}
                className="w-full bg-surface-hover border border-border rounded-lg px-4 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              >
                <option value="all">Todos os alunos</option>
                <option value="course">Alunos de um curso específico</option>
                <option value="user">Usuário específico</option>
              </select>
            </div>

            {targetAudience !== "all" && (
              <div>
                <label className="block text-sm font-semibold text-text mb-1">
                  {targetAudience === "course" ? "ID do Curso" : "Email do Usuário / ID"}
                </label>
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder={targetAudience === "course" ? "Ex: course_123" : "Ex: aluno@email.com"}
                  className="w-full bg-surface-hover border border-border rounded-lg px-4 py-2 text-text placeholder:text-text-mute focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mt-6"
            >
              <Send className="w-5 h-5" /> Enviar Notificação
            </button>
          </form>
        </div>

        {/* History */}
        <div className="bg-surface-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
          <h2 className="text-xl font-bold text-text mb-6">Histórico de Envios</h2>
          
          <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 space-y-4">
            {notifications.length === 0 ? (
              <p className="text-text-mute text-center mt-10">Nenhuma notificação enviada ainda.</p>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="bg-surface-hover border border-border/50 rounded-lg p-4 relative group">
                  <h4 className="font-bold text-text">{notification.title}</h4>
                  <p className="text-sm text-text-mute mt-1 line-clamp-2">{notification.message}</p>
                  <div className="flex gap-2 mt-3 text-xs">
                    <span className="bg-secondary text-text px-2 py-1 rounded-md font-medium">
                      Alvo: {notification.targetAudience === 'all' ? 'Todos' : notification.targetAudience === 'course' ? 'Curso' : 'Usuário'}
                      {notification.targetId ? ` (${notification.targetId})` : ''}
                    </span>
                    <span className="bg-surface-card text-text-mute px-2 py-1 rounded-md border border-border/50">
                      Lida por: {notification.read ? "1" : "0"} alunos (mock)
                    </span>
                  </div>

                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="absolute top-4 right-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm hover:underline"
                  >
                    Excluir
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
