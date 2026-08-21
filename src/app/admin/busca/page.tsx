import Link from "next/link";
import { Search, User, BookOpen, Building2, ArrowRight } from "lucide-react";
import { Card, EmptyState } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { createClient } from "@/lib/supabase/server";

export default async function AdminBuscaUnificada({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = params.q || "";

  if (!q) {
    return (
      <div className="space-y-7">
        <PageHeader eyebrow="Plataforma" title="Busca" description="Encontre rapidamente pessoas, cursos e empresas." />
        <Card>
          <Card.Content>
            <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                <Search className="size-5 text-muted" aria-hidden="true" />
              </span>
              <p className="font-semibold text-foreground">Digite algo para buscar</p>
              <p className="text-sm text-muted">Use a barra superior para pesquisar em toda a plataforma.</p>
            </EmptyState>
          </Card.Content>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();

  // Busca em usuários
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .textSearch("search_vector", q, { type: 'websearch' })
    .limit(5);

  // Busca em cursos
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, category, short_description")
    .textSearch("search_vector", q, { type: 'websearch' })
    .limit(5);

  // Busca em empresas
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, cnpj")
    .textSearch("search_vector", q, { type: 'websearch' })
    .limit(5);

  const hasResults = (users?.length || 0) > 0 || (courses?.length || 0) > 0 || (companies?.length || 0) > 0;

  return (
    <div className="space-y-7">
      <PageHeader 
        eyebrow="Resultados da Busca" 
        title={`"${q}"`} 
        description="Resultados encontrados em toda a plataforma." 
      />

      {!hasResults ? (
        <Card>
          <Card.Content>
            <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                <Search className="size-5 text-muted" aria-hidden="true" />
              </span>
              <p className="font-semibold text-foreground">Nenhum resultado encontrado para "{q}"</p>
              <p className="text-sm text-muted">Tente usar outros termos mais genéricos.</p>
            </EmptyState>
          </Card.Content>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* Usuários */}
          {users && users.length > 0 && (
            <Card>
              <Card.Header>
                <div className="flex items-center gap-2 font-display font-semibold">
                  <User className="size-4 text-accent" /> Usuários
                </div>
              </Card.Header>
              <ul className="divide-y divide-separator">
                {users.map(user => (
                  <li key={user.id}>
                    <Link href={`/admin/users/${user.id}`} className="block p-4 hover:bg-surface transition-colors">
                      <p className="font-semibold text-sm text-foreground">{user.full_name || "Sem Nome"}</p>
                      <p className="text-xs text-muted mt-0.5">{user.email}</p>
                    </Link>
                  </li>
                ))}
              </ul>
              {users.length === 5 && (
                <Card.Footer className="bg-surface/50 border-t border-border">
                  <Link href={`/admin/users?q=${encodeURIComponent(q)}`} className="text-xs font-semibold text-accent flex items-center gap-1">
                    Ver todos os usuários <ArrowRight className="size-3" />
                  </Link>
                </Card.Footer>
              )}
            </Card>
          )}

          {/* Cursos */}
          {courses && courses.length > 0 && (
            <Card>
              <Card.Header>
                <div className="flex items-center gap-2 font-display font-semibold">
                  <BookOpen className="size-4 text-accent" /> Cursos
                </div>
              </Card.Header>
              <ul className="divide-y divide-separator">
                {courses.map(course => (
                  <li key={course.id}>
                    <Link href={`/admin/cursos/${course.id}`} className="block p-4 hover:bg-surface transition-colors">
                      <p className="font-semibold text-sm text-foreground">{course.title}</p>
                      <p className="text-xs text-muted mt-0.5">{course.category || "Sem categoria"}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Empresas */}
          {companies && companies.length > 0 && (
            <Card>
              <Card.Header>
                <div className="flex items-center gap-2 font-display font-semibold">
                  <Building2 className="size-4 text-accent" /> Empresas
                </div>
              </Card.Header>
              <ul className="divide-y divide-separator">
                {companies.map(company => (
                  <li key={company.id}>
                    <Link href={`/admin/business/empresa/${company.id}`} className="block p-4 hover:bg-surface transition-colors">
                      <p className="font-semibold text-sm text-foreground">{company.name}</p>
                      <p className="text-xs text-muted mt-0.5">{company.cnpj || "Sem CNPJ"}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
