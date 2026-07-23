import { Search, UserPlus } from "lucide-react";

export default function AdminUsers() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-display font-black text-primary">Gerenciar Usuários</h1>
        <button className="bg-primary text-on-primary px-6 py-3 rounded-full font-semibold hover:bg-primary-active transition-all flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5">
          <UserPlus className="w-5 h-5" />
          <span>Novo Usuário</span>
        </button>
      </div>
      
      <div className="bg-surface-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-border/40">
        <div className="p-6 border-b border-border/40 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <p className="text-text-soft">Lista de usuários cadastrados.</p>
          <div className="relative w-full md:w-64">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-mute" />
            <input 
              type="text" 
              placeholder="Buscar usuário..." 
              className="w-full bg-canvas-soft border-transparent rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-border/40 bg-surface-hover/50">
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider">Nome</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider">Email</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/40 hover:bg-surface-hover transition-colors group">
                <td className="py-4 px-6 font-medium text-ink-deep">João Silva</td>
                <td className="py-4 px-6 text-text-soft">joao@email.com</td>
                <td className="py-4 px-6">
                  <span className="px-3 py-1.5 bg-positive/10 text-positive rounded-full text-xs font-bold">Ativo</span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button className="text-sm font-medium text-primary hover:bg-primary/10 px-4 py-2 bg-primary/5 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all focus:opacity-100">
                    Editar
                  </button>
                </td>
              </tr>
              <tr className="border-b border-border/40 hover:bg-surface-hover transition-colors group">
                <td className="py-4 px-6 font-medium text-ink-deep">Maria Souza</td>
                <td className="py-4 px-6 text-text-soft">maria@email.com</td>
                <td className="py-4 px-6">
                  <span className="px-3 py-1.5 bg-positive/10 text-positive rounded-full text-xs font-bold">Ativo</span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button className="text-sm font-medium text-primary hover:bg-primary/10 px-4 py-2 bg-primary/5 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all focus:opacity-100">
                    Editar
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-surface-hover transition-colors group">
                <td className="py-4 px-6 font-medium text-ink-deep">Pedro Costa</td>
                <td className="py-4 px-6 text-text-soft">pedro@email.com</td>
                <td className="py-4 px-6">
                  <span className="px-3 py-1.5 bg-negative/10 text-negative rounded-full text-xs font-bold">Inativo</span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button className="text-sm font-medium text-primary hover:bg-primary/10 px-4 py-2 bg-primary/5 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all focus:opacity-100">
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
