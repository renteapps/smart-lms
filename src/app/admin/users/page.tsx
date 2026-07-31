import Link from "next/link";
import { MoreHorizontal, Plus, Search, UserRound } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";

const users = [
  { id: "1", name: "João Silva", email: "joao@email.com", role: "Aluno", status: "Ativo", progress: "72%", lastSeen: "Hoje, 10:24" },
  { id: "2", name: "Maria Souza", email: "maria@email.com", role: "Aluno", status: "Ativo", progress: "48%", lastSeen: "Ontem, 18:10" },
  { id: "3", name: "Pedro Costa", email: "pedro@email.com", role: "Aluno", status: "Inativo", progress: "12%", lastSeen: "20 jul, 09:02" },
  { id: "4", name: "Ana Beatriz", email: "ana@email.com", role: "Instrutora", status: "Ativo", progress: "—", lastSeen: "Hoje, 08:41" },
];

export default function AdminUsers() {
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Pessoas" title="Usuários" description="Acompanhe acesso, papel e engajamento das pessoas na plataforma." actions={<button className="inline-flex min-h-11 items-center gap-2 rounded-[11px] bg-primary px-4 text-sm font-bold text-on-primary shadow-sm hover:bg-primary-active"><Plus className="h-4 w-4" /> Novo usuário</button>} />

      <section className="editorial-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <label className="relative block w-full sm:max-w-md"><span className="sr-only">Buscar usuário</span><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-mute" /><input placeholder="Buscar por nome ou e-mail" className="h-11 w-full rounded-[11px] border border-border bg-canvas-soft pl-10 pr-4 text-sm focus:border-primary focus:bg-surface focus:outline-none" /></label>
          <p className="text-xs font-semibold text-text-mute"><strong className="text-ink">1.248</strong> pessoas cadastradas</p>
        </div>

        <div className="hidden md:block">
          <table className="w-full text-left">
            <thead><tr className="bg-canvas-soft/75 text-[11px] font-bold uppercase tracking-[0.09em] text-text-mute"><th className="px-5 py-3.5">Pessoa</th><th className="px-5 py-3.5">Papel</th><th className="px-5 py-3.5">Progresso</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Último acesso</th><th className="w-16 px-5 py-3.5"><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>{users.map((user) => <tr key={user.id} className="border-t border-border/70 hover:bg-primary-pale/20"><td className="px-5 py-4"><Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 group"><span className="grid h-9 w-9 place-items-center rounded-[11px] bg-canvas-soft font-display text-xs font-extrabold text-primary-active group-hover:bg-primary-pale">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><p className="text-sm font-bold text-ink group-hover:text-primary-active">{user.name}</p><p className="mt-0.5 text-xs text-text-mute">{user.email}</p></div></Link></td><td className="px-5 py-4 text-sm text-text-soft">{user.role}</td><td className="px-5 py-4 text-sm font-bold text-ink">{user.progress}</td><td className="px-5 py-4"><StatusBadge tone={user.status === "Ativo" ? "positive" : "negative"}>{user.status}</StatusBadge></td><td className="px-5 py-4 text-xs font-medium text-text-mute">{user.lastSeen}</td><td className="px-5 py-4"><Link href={`/admin/users/${user.id}`} aria-label={`Gerenciar ${user.name}`} className="grid h-10 w-10 place-items-center rounded-[10px] text-text-mute hover:bg-surface-hover hover:text-ink"><MoreHorizontal className="h-5 w-5" /></Link></td></tr>)}</tbody>
          </table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {users.map((user) => <article key={user.id} className="p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-canvas-soft text-primary"><UserRound className="h-4 w-4" /></span><div className="min-w-0 flex-1"><Link href={`/admin/users/${user.id}`} className="font-bold leading-5 text-ink hover:text-primary-active block">{user.name}</Link><p className="truncate text-xs text-text-mute mt-1">{user.email}</p></div><StatusBadge tone={user.status === "Ativo" ? "positive" : "negative"}>{user.status}</StatusBadge></div><div className="mt-4 grid grid-cols-3 gap-3 rounded-[11px] bg-canvas-soft p-3 text-center text-xs"><div><p className="text-text-mute">Papel</p><strong className="mt-1 block text-ink">{user.role}</strong></div><div><p className="text-text-mute">Progresso</p><strong className="mt-1 block text-ink">{user.progress}</strong></div><div><p className="text-text-mute">Acesso</p><strong className="mt-1 block truncate text-ink">{user.lastSeen.split(",")[0]}</strong></div></div><div className="mt-4 flex items-center justify-end"><Link href={`/admin/users/${user.id}`} className="min-h-10 rounded-[10px] bg-primary-pale px-3 py-2 text-sm font-bold text-primary-active">Gerenciar</Link></div></article>)}
        </div>
      </section>
    </div>
  );
}
