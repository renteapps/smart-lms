import Link from "next/link";
import { LayoutDashboard, BookOpen, Users, Home, Palette, Menu, Lightbulb, MessageSquare, Bell } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const navLinks = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/cursos", icon: BookOpen, label: "Cursos" },
  { href: "/admin/users", icon: Users, label: "Usuários" },
  { href: "/admin/pilulas", icon: Lightbulb, label: "Pílulas" },
  { href: "/admin/comentarios", icon: MessageSquare, label: "Comentários" },
  { href: "/admin/notificacoes", icon: Bell, label: "Notificações" },
  { href: "/admin/home", icon: Home, label: "Home Page" },
  { href: "/admin/aparencia", icon: Palette, label: "Aparência" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-theme min-h-screen flex flex-col md:flex-row bg-bg text-text font-sans">
      
      {/* Mobile Header with Hamburger Menu */}
      <header className="md:hidden flex items-center justify-between p-4 bg-surface-card border-b border-border shadow-sm">
        <h2 className="text-xl font-display font-black text-primary">Painel Admin</h2>
        <Sheet>
          <SheetTrigger render={<button className="p-2 -mr-2 text-text hover:bg-surface-hover rounded-lg transition-colors" />}>
            <Menu className="w-6 h-6" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] bg-surface-card border-r border-border p-6 pt-12">
            <SheetTitle className="text-xl font-display font-black text-primary mb-8 text-left">Painel Admin</SheetTitle>
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors font-semibold text-text">
                    <Icon className="w-5 h-5 text-text-mute" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-surface-card border-r border-border p-6 flex-col gap-6 pt-12 hidden md:flex min-h-screen shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <h2 className="text-xl font-display font-black text-primary">Painel Admin</h2>
        
        <nav className="flex flex-col gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors font-semibold text-text">
                <Icon className="w-5 h-5 text-text-mute" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pt-8 md:pt-12 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
