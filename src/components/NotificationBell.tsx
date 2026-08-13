"use client";

import { useState } from "react";
import { Bell, BellOff, Check, Trash2 } from "lucide-react";
import { Badge, Button, Chip, EmptyState, Popover, Separator } from "@heroui/react";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  return (
    <Popover.Root isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger
        aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : "Notificações"}
        className="press icon-lift grid size-11 shrink-0 place-items-center rounded-xl text-muted transition-colors duration-[var(--duration-sm)] hover:bg-surface-hover hover:text-foreground"
      >
        <Badge.Anchor>
          <Bell className="size-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge color="danger" size="sm" variant="primary" placement="top-right">
              <Badge.Label>{unreadCount > 9 ? "9+" : unreadCount}</Badge.Label>
            </Badge>
          )}
        </Badge.Anchor>
      </Popover.Trigger>

      <Popover.Content placement="bottom end" className="w-[min(23rem,calc(100vw-2rem))]">
        <Popover.Dialog className="flex max-h-[min(32rem,70vh)] flex-col p-0" aria-label="Notificações">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Popover.Heading className="font-display text-base font-extrabold tracking-tight text-foreground">
                Notificações
              </Popover.Heading>
              {unreadCount > 0 && (
                <Chip color="accent" variant="soft" size="sm">
                  <span data-numeric>{unreadCount}</span> nova{unreadCount > 1 ? "s" : ""}
                </Chip>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="size-3.5" aria-hidden="true" />
                Marcar lidas
              </Button>
            )}
          </div>

          <Separator />

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <EmptyState className="gap-3 px-6 py-12 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-default text-muted">
                  <BellOff className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-base font-bold text-foreground">Tudo em dia</p>
                  <p className="mt-1 text-sm text-muted">Nenhuma notificação no momento.</p>
                </div>
              </EmptyState>
            ) : (
              <ul className="flex flex-col">
                {notifications.map((notification) => {
                  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  });

                  const body = (
                    <>
                      <h4 className="text-sm font-bold text-foreground">{notification.title}</h4>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{notification.message}</p>
                      <p className="mt-2 text-xs text-muted">{timeAgo}</p>
                    </>
                  );

                  return (
                    <li
                      key={notification.id}
                      className={cn(
                        "group relative border-b border-separator transition-colors last:border-b-0 hover:bg-surface-hover",
                        !notification.read && "bg-accent-soft/45",
                      )}
                    >
                      {/*
                       * Só a notificação não lida vira botão: transformar a
                       * lida também em botão daria ao teclado uma parada que
                       * não faz nada. O excluir é irmão, não filho — assim não
                       * existe botão dentro de botão nem propagação para conter.
                       */}
                      {notification.read ? (
                        <div className="py-3 pl-6 pr-12">{body}</div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          aria-label={`Marcar como lida: ${notification.title}`}
                          className="block w-full py-3 pl-6 pr-12 text-left"
                        >
                          <span
                            aria-hidden="true"
                            className="absolute left-2.5 top-4 size-1.5 rounded-full bg-accent"
                          />
                          {body}
                        </button>
                      )}

                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        aria-label={`Excluir notificação ${notification.title}`}
                        className="absolute right-2 top-2.5 text-danger opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover.Root>
  );
}
