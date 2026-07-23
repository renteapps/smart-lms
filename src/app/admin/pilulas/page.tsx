import Link from "next/link";
import { PlusCircle, Search, Edit3, Trash2, Lightbulb } from "lucide-react";

// Simulando dados das pílulas diárias
const mockPilulas = [
  { id: "1", title: "Escuta Ativa", challenge: "Hoje, tente praticar a escuta ativa em sua próxima reunião, esperando 2 segundos antes de responder.", status: "Ativa" },
  { id: "2", title: "Foco Total", challenge: "Trabalhe 25 minutos sem nenhuma interrupção, desligando todas as notificações do celular.", status: "Programada" },
  { id: "3", title: "Feedback Construtivo", challenge: "Elogie genuinamente um colega de trabalho por uma entrega recente.", status: "Rascunho" },
  { id: "4", title: "Pausa Consciente", challenge: "Faça uma pausa de 5 minutos longe das telas para respirar fundo.", status: "Programada" },
];

export default function AdminPilulasList() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-primary">Pílulas Diárias</h1>
          <p className="text-text-soft mt-1">Gerencie os desafios diários de micro-learning dos alunos.</p>
        </div>
        <button className="bg-primary text-on-primary px-6 py-3 rounded-full font-semibold hover:bg-primary-active transition-all flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5">
          <PlusCircle className="w-5 h-5" />
          <span>Nova Pílula</span>
        </button>
      </div>
      
      <div className="bg-surface-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-border/40">
        <div className="p-6 border-b border-border/40 flex gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-mute" />
            <input 
              type="text" 
              placeholder="Buscar pílulas..." 
              className="w-full bg-canvas-soft border-transparent rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-border/40 bg-surface-hover/50">
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider w-1/4">Título</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider w-1/2">Desafio</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider w-1/6">Status</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider text-right w-1/12">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mockPilulas.map((pilula) => (
                <tr 
                  key={pilula.id} 
                  className="border-b border-border/40 hover:bg-surface-hover transition-colors group"
                >
                  <td className="py-4 px-6 font-medium">
                    <div className="flex items-center gap-3 text-ink-deep font-semibold">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Lightbulb className="w-4 h-4" />
                      </div>
                      {pilula.title}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-text-soft text-sm italic">
                    "{pilula.challenge}"
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      pilula.status === 'Ativa' 
                        ? 'bg-positive/10 text-positive' 
                        : pilula.status === 'Programada'
                        ? 'bg-blue-500/10 text-blue-600'
                        : 'bg-warning/10 text-yellow-600'
                    }`}>
                      {pilula.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                      <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
