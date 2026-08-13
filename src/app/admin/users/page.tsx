"use client";

import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import { Avatar, Card, EmptyState, Label, SearchField, Table, buttonVariants } from "@heroui/react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";

const users = [
  { id: "1", name: "João Silva", email: "joao@email.com", role: "Aluno", status: "Ativo", progress: "72%", lastSeen: "Hoje, 10:24" },
  { id: "2", name: "Maria Souza", email: "maria@email.com", role: "Aluno", status: "Ativo", progress: "48%", lastSeen: "Ontem, 18:10" },
  { id: "3", name: "Pedro Costa", email: "pedro@email.com", role: "Aluno", status: "Inativo", progress: "12%", lastSeen: "20 jul, 09:02" },
  { id: "4", name: "Ana Beatriz", email: "ana@email.com", role: "Instrutora", status: "Ativo", progress: "—", lastSeen: "Hoje, 08:41" },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

export default function AdminUsers() {
  const isEmpty = users.length === 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Pessoas"
        title="Usuários"
        description="Acompanhe acesso, papel e engajamento das pessoas na plataforma."
        actions={
          <Link href="/admin/users/novo" className={cn(buttonVariants({ variant: "primary" }), "gap-2")}>
            <Plus className="size-4" aria-hidden="true" /> Novo usuário
          </Link>
        }
      />

      <Card>
        <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchField className="w-full sm:max-w-md" aria-label="Buscar usuário">
            <Label className="sr-only">Buscar usuário</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Buscar por nome ou e-mail" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <p className="text-xs text-muted">
            <strong className="font-semibold text-foreground">1.248</strong> pessoas cadastradas
          </p>
        </Card.Header>

        <Card.Content className="px-0 pb-0">
          {isEmpty ? (
            <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                <UserRound className="size-5 text-muted" aria-hidden="true" />
              </span>
              <p className="font-semibold text-foreground">Nenhuma pessoa cadastrada</p>
              <p className="text-sm text-muted">Convide alguém para começar a acompanhar o engajamento.</p>
            </EmptyState>
          ) : (
            <>
              <div className="hidden md:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Usuários da plataforma">
                      <Table.Header>
                        <Table.Column isRowHeader>Pessoa</Table.Column>
                        <Table.Column>Papel</Table.Column>
                        <Table.Column>Progresso</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column>Último acesso</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {users.map((user) => (
                          <Table.Row key={user.id} id={user.id}>
                            <Table.Cell>
                              <Link href={`/admin/users/${user.id}`} className="group flex items-center gap-3">
                                <Avatar size="sm" color="accent">
                                  <Avatar.Fallback>{initials(user.name)}</Avatar.Fallback>
                                </Avatar>
                                <span className="block">
                                  <span className="block text-sm font-semibold text-foreground group-hover:text-accent">
                                    {user.name}
                                  </span>
                                  <span className="mt-0.5 block text-xs text-muted">{user.email}</span>
                                </span>
                              </Link>
                            </Table.Cell>
                            <Table.Cell>{user.role}</Table.Cell>
                            <Table.Cell className="font-semibold text-foreground">{user.progress}</Table.Cell>
                            <Table.Cell>
                              <StatusBadge tone={user.status === "Ativo" ? "positive" : "negative"}>{user.status}</StatusBadge>
                            </Table.Cell>
                            <Table.Cell className="text-muted">{user.lastSeen}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              <ul className="divide-y divide-separator md:hidden">
                {users.map((user) => (
                  <li key={user.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar size="sm" color="accent">
                        <Avatar.Fallback>{initials(user.name)}</Avatar.Fallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/users/${user.id}`} className="block font-semibold leading-5 text-foreground">
                          {user.name}
                        </Link>
                        <p className="mt-1 truncate text-xs text-muted">{user.email}</p>
                      </div>
                      <StatusBadge tone={user.status === "Ativo" ? "positive" : "negative"}>{user.status}</StatusBadge>
                    </div>

                    <dl className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-background-secondary p-3 text-center text-xs">
                      <div>
                        <dt className="text-muted">Papel</dt>
                        <dd className="mt-1 font-semibold text-foreground">{user.role}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Progresso</dt>
                        <dd className="mt-1 font-semibold text-foreground">{user.progress}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Acesso</dt>
                        <dd className="mt-1 truncate font-semibold text-foreground">{user.lastSeen.split(",")[0]}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex justify-end">
                      <Link href={`/admin/users/${user.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                        Gerenciar
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
