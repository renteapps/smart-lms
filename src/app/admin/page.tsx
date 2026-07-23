import { Users, PlayCircle, Clock } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-3xl font-display font-black mb-8 text-primary">Visão Geral</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-card p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all duration-500">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-text-soft font-semibold text-lg">Total de Usuários</h3>
          </div>
          <p className="text-4xl font-black text-ink-deep">1,248</p>
        </div>
        <div className="bg-surface-card p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all duration-500 delay-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-positive/10 text-positive rounded-xl">
              <PlayCircle className="w-6 h-6" />
            </div>
            <h3 className="text-text-soft font-semibold text-lg">Cursos Ativos</h3>
          </div>
          <p className="text-4xl font-black text-ink-deep">24</p>
        </div>
        <div className="bg-surface-card p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all duration-500 delay-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-accent-cyan/20 text-blue-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-text-soft font-semibold text-lg">Horas Assistidas</h3>
          </div>
          <p className="text-4xl font-black text-ink-deep">12.5k</p>
        </div>
      </div>
    </div>
  );
}
