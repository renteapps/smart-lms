"use client";

import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import {
  ExternalLink,
  GripVertical,
  Link2,
  Plus,
  Save,
  Trash2,
  LoaderCircle,
} from "lucide-react";
import {
  Button,
  Card,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  Select,
  Switch,
  Tabs,
  TextField,
  toast,
} from "@heroui/react";
import { NAV_ICONS, NAV_ICON_LABELS } from "@/components/navigation/navIcons";
import { cn } from "@/lib/utils";
import {
  DEFAULT_NAVIGATION,
  NAV_FALLBACK_ICON,
  NAV_FOOTER_MAX_GROUPS,
  NAV_ICON_KEYS,
  NAV_PAGE_CATALOG,
  NAV_VISIBILITIES,
  NAV_VISIBILITY_LABELS,
  isExternalHref,
  type NavFooterGroup,
  type NavIconKey,
  type NavItem,
  type NavVisibility,
  type NavigationConfig,
} from "@/types/navigation";
import { saveNavigation } from "./actions";

type Placement = "before" | "after";

function newId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

/**
 * Tira o item da lista e reinsere antes ou depois do alvo — mesma mecânica de
 * `ModuleList`, mas aqui a ordem só existe como posição no array: não há campo
 * `order` para renumerar.
 */
function moveItem<T extends { id: string }>(
  items: T[],
  sourceId: string,
  targetId: string,
  placement: Placement,
): T[] {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  if (sourceIndex < 0 || sourceId === targetId) return items;

  const reordered = [...items];
  const [moved] = reordered.splice(sourceIndex, 1);
  const targetIndex = reordered.findIndex((item) => item.id === targetId);
  if (targetIndex < 0) return items;

  reordered.splice(targetIndex + (placement === "after" ? 1 : 0), 0, moved);
  return reordered;
}

// ---------------------------------------------------------------------------
// Campos reutilizados pelas duas abas
// ---------------------------------------------------------------------------

/**
 * Indexa o mapa direto, como `AssistantAvatar`: um componente vindo de chamada
 * de função é lido pelo compilador do React como criado durante o render.
 */
function NavGlyph({ icon, className }: { icon: NavIconKey; className?: string }) {
  const Glyph = NAV_ICONS[icon] ?? NAV_ICONS[NAV_FALLBACK_ICON];
  return <Glyph className={className} aria-hidden="true" />;
}

function IconSelect({ value, onChange }: { value: NavIconKey; onChange: (icon: NavIconKey) => void }) {
  return (
    <Select selectedKey={value} onSelectionChange={(key) => onChange(String(key) as NavIconKey)}>
      <Label>Ícone</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {NAV_ICON_KEYS.map((key) => (
            <ListBoxItem key={key} id={key} textValue={NAV_ICON_LABELS[key]}>
              <span className="flex items-center gap-2">
                <NavGlyph icon={key} className="size-4 shrink-0" />
                {NAV_ICON_LABELS[key]}
              </span>
            </ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function VisibilitySelect({
  value,
  onChange,
}: {
  value: NavVisibility;
  onChange: (visibility: NavVisibility) => void;
}) {
  return (
    <Select selectedKey={value} onSelectionChange={(key) => onChange(String(key) as NavVisibility)}>
      <Label>Quem vê</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {NAV_VISIBILITIES.map((key) => (
            <ListBoxItem key={key} id={key} textValue={NAV_VISIBILITY_LABELS[key]}>
              {NAV_VISIBILITY_LABELS[key]}
            </ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Linha de item
// ---------------------------------------------------------------------------

type RowProps = {
  item: NavItem;
  index: number;
  total: number;
  isDragging: boolean;
  dropHint: Placement | null;
  onChange: (patch: Partial<NavItem>) => void;
  onRemove: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onReorderKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

function NavItemRow({
  item,
  index,
  total,
  isDragging,
  dropHint,
  onChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onReorderKeyDown,
}: RowProps) {
  const isCustom = item.pageKey === null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-xl border border-border bg-surface p-3 transition-shadow",
        isDragging && "opacity-50",
        dropHint === "before" && "border-t-2 border-t-accent",
        dropHint === "after" && "border-b-2 border-b-accent",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={`Reordenar ${item.label} (posição ${index + 1} de ${total}). Use as setas para cima e para baixo.`}
          onKeyDown={onReorderKeyDown}
          className="mt-2 grid size-8 shrink-0 cursor-grab place-items-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <TextField value={item.label} onChange={(label) => onChange({ label })}>
                <Label>Nome exibido</Label>
                <Input placeholder="Ex.: Cursos" />
              </TextField>
            </div>

            <Switch
              isSelected={item.enabled}
              onChange={(enabled) => onChange({ enabled })}
              className="mb-2"
            >
              <Switch.Content className="gap-2">
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <span className="text-xs font-semibold text-muted">
                  {item.enabled ? "Visível" : "Oculto"}
                </span>
              </Switch.Content>
            </Switch>

            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={`Remover ${item.label}`}
              className="mb-1"
              onPress={onRemove}
            >
              <Trash2 className="size-4 text-danger" aria-hidden="true" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
            <IconSelect value={item.icon} onChange={(icon) => onChange({ icon })} />
            <VisibilitySelect value={item.visibility} onChange={(visibility) => onChange({ visibility })} />

            {isCustom ? (
              <TextField
                value={item.href}
                onChange={(href) => onChange({ href, external: isExternalHref(href) })}
              >
                <Label>Destino</Label>
                <Input placeholder="/pagina ou https://..." />
              </TextField>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Destino</span>
                <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-surface-secondary px-3 font-mono text-xs text-muted">
                  <NavGlyph icon={item.icon} className="size-4 shrink-0" />
                  <span className="truncate">{item.href}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lista ordenável
// ---------------------------------------------------------------------------

function NavItemList({
  surfaceId,
  items,
  emptyLabel,
  onItemsChange,
}: {
  surfaceId: string;
  items: NavItem[];
  emptyLabel: string;
  onItemsChange: (items: NavItem[]) => void;
}) {
  const dragRef = useRef<{ surfaceId: string; itemId: string } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ itemId: string; placement: Placement } | null>(null);

  const clearDrag = () => {
    dragRef.current = null;
    setDraggedId(null);
    setDropTarget(null);
  };

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <NavItemRow
          key={item.id}
          item={item}
          index={index}
          total={items.length}
          isDragging={draggedId === item.id}
          dropHint={dropTarget?.itemId === item.id ? dropTarget.placement : null}
          onChange={(patch) =>
            onItemsChange(items.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry)))
          }
          onRemove={() => onItemsChange(items.filter((entry) => entry.id !== item.id))}
          onDragStart={(event) => {
            dragRef.current = { surfaceId, itemId: item.id };
            setDraggedId(item.id);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", item.id);
          }}
          onDragOver={(event) => {
            const state = dragRef.current;
            if (!state || state.surfaceId !== surfaceId || state.itemId === item.id) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            const bounds = event.currentTarget.getBoundingClientRect();
            const placement: Placement =
              event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
            setDropTarget({ itemId: item.id, placement });
          }}
          onDrop={(event) => {
            event.preventDefault();
            const state = dragRef.current;
            if (state && dropTarget && state.surfaceId === surfaceId) {
              onItemsChange(moveItem(items, state.itemId, dropTarget.itemId, dropTarget.placement));
            }
            clearDrag();
          }}
          onDragEnd={clearDrag}
          onReorderKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            const targetIndex = index + (event.key === "ArrowUp" ? -1 : 1);
            if (targetIndex < 0 || targetIndex >= items.length) return;
            onItemsChange(
              moveItem(items, item.id, items[targetIndex].id, event.key === "ArrowUp" ? "before" : "after"),
            );
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de novo item
// ---------------------------------------------------------------------------

type AddTarget = { kind: "menu" } | { kind: "footer"; groupId: string };

function AddItemModal({
  target,
  usedHrefs,
  onClose,
  onAdd,
}: {
  target: AddTarget | null;
  usedHrefs: string[];
  onClose: () => void;
  onAdd: (item: NavItem) => void;
}) {
  const [mode, setMode] = useState<"page" | "custom">("page");
  const [pageKey, setPageKey] = useState<string>(NAV_PAGE_CATALOG[0].key);
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [icon, setIcon] = useState<NavIconKey>("link");
  const [visibility, setVisibility] = useState<NavVisibility>("all");

  const availablePages = useMemo(
    () => NAV_PAGE_CATALOG.filter((page) => !usedHrefs.includes(page.href)),
    [usedHrefs],
  );

  const reset = () => {
    setMode("page");
    setPageKey(NAV_PAGE_CATALOG[0].key);
    setLabel("");
    setHref("");
    setIcon("link");
    setVisibility("all");
  };

  /*
   * A escolha guardada pode ter saído da lista — a página já entrou no menu,
   * ou o modal reabriu para outra coluna. Cair na primeira disponível evita um
   * seletor em branco que mesmo assim adicionaria um item duplicado.
   */
  const selectedPage = availablePages.find((page) => page.key === pageKey) ?? availablePages[0];
  const canSave = mode === "page" ? Boolean(selectedPage) : Boolean(label.trim() && href.trim());

  const handleAdd = () => {
    if (mode === "page") {
      if (!selectedPage) return;
      onAdd({
        id: newId(selectedPage.key),
        pageKey: selectedPage.key,
        label: label.trim() || selectedPage.defaultLabel,
        href: selectedPage.href,
        icon: selectedPage.defaultIcon,
        external: false,
        visibility: selectedPage.defaultVisibility,
        enabled: true,
      });
    } else {
      const cleanHref = href.trim();
      onAdd({
        id: newId("link"),
        pageKey: null,
        label: label.trim(),
        href: cleanHref,
        icon,
        external: isExternalHref(cleanHref),
        visibility,
        enabled: true,
      });
    }
    reset();
    onClose();
  };

  return (
    <Modal.Root
      isOpen={target !== null}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>Adicionar item</Modal.Header>
            <Modal.Body className="space-y-4">
              <Select selectedKey={mode} onSelectionChange={(key) => setMode(String(key) as "page" | "custom")}>
                <Label>Tipo</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBoxItem id="page">Página da plataforma</ListBoxItem>
                    <ListBoxItem id="custom">Link avulso</ListBoxItem>
                  </ListBox>
                </Select.Popover>
              </Select>

              {mode === "page" ? (
                availablePages.length === 0 ? (
                  <p className="text-sm text-muted">
                    Todas as páginas do catálogo já estão nesta lista. Use um link avulso para outros destinos.
                  </p>
                ) : (
                  <>
                    <Select
                      selectedKey={selectedPage?.key ?? null}
                      onSelectionChange={(key) => setPageKey(String(key))}
                    >
                      <Label>Página</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {availablePages.map((page) => (
                            <ListBoxItem key={page.key} id={page.key} textValue={page.defaultLabel}>
                              <span className="flex flex-col">
                                <span>{page.defaultLabel}</span>
                                <span className="font-mono text-xs text-muted">{page.href}</span>
                              </span>
                            </ListBoxItem>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    {selectedPage?.hint && <p className="text-xs text-muted">{selectedPage.hint}</p>}
                  </>
                )
              ) : (
                <>
                  <TextField value={label} onChange={setLabel} isRequired>
                    <Label>Nome exibido</Label>
                    <Input placeholder="Ex.: Comunidade" />
                  </TextField>
                  <TextField value={href} onChange={setHref} isRequired>
                    <Label>Destino</Label>
                    <Input placeholder="/pagina ou https://..." />
                  </TextField>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <IconSelect value={icon} onChange={setIcon} />
                    <VisibilitySelect value={visibility} onChange={setVisibility} />
                  </div>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="tertiary"
                onPress={() => {
                  reset();
                  onClose();
                }}
              >
                Cancelar
              </Button>
              <Button variant="primary" isDisabled={!canSave} onPress={handleAdd}>
                Adicionar
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

// ---------------------------------------------------------------------------
// Pré-visualização
// ---------------------------------------------------------------------------

function NavigationPreview({ menu, groups }: { menu: NavItem[]; groups: NavFooterGroup[] }) {
  const visibleMenu = menu.filter((item) => item.enabled);

  return (
    <Card className="lg:sticky lg:top-6">
      <Card.Header>
        <Card.Title>Pré-visualização</Card.Title>
        <Card.Description className="mt-1">
          Itens desligados e restrições de acesso não aparecem aqui — o corte final acontece no site,
          conforme quem está logado.
        </Card.Description>
      </Card.Header>
      <Card.Content className="space-y-6">
        <div>
          <p className="eyebrow mb-3">Menu principal</p>
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface-secondary p-3">
            {visibleMenu.length === 0 && <span className="text-xs text-muted">Nenhum item visível.</span>}
            {visibleMenu.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted"
              >
                <NavGlyph icon={item.icon} className="size-3.5" />
                {item.label}
                {item.external && <ExternalLink className="size-3" aria-hidden="true" />}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="eyebrow mb-3">Rodapé</p>
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface-secondary p-3">
            {groups.map((group) => (
              <div key={group.id}>
                <p className="text-xs font-bold uppercase tracking-wide text-foreground">{group.title}</p>
                <ul className="mt-2 space-y-1">
                  {group.items
                    .filter((item) => item.enabled)
                    .map((item) => (
                      <li key={item.id} className="truncate text-xs text-muted">
                        {item.label}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

export function NavigationClient({ initial }: { initial: NavigationConfig }) {
  const [menu, setMenu] = useState<NavItem[]>(initial.menu);
  const [groups, setGroups] = useState<NavFooterGroup[]>(initial.footer.groups);
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [saving, setSaving] = useState(false);

  const usedHrefs = useMemo(() => {
    if (!addTarget) return [];
    if (addTarget.kind === "menu") return menu.map((item) => item.href);
    return groups.find((group) => group.id === addTarget.groupId)?.items.map((item) => item.href) ?? [];
  }, [addTarget, menu, groups]);

  const handleAdd = (item: NavItem) => {
    if (!addTarget) return;
    if (addTarget.kind === "menu") {
      setMenu((current) => [...current, item]);
      return;
    }
    setGroups((current) =>
      current.map((group) =>
        group.id === addTarget.groupId ? { ...group, items: [...group.items, item] } : group,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await saveNavigation({ menu, footer: { groups } });
    setSaving(false);

    if (result.success) {
      toast.success("Navegação salva!", { description: "O menu e o rodapé já refletem as mudanças." });
    } else {
      toast.danger("Erro ao salvar", { description: result.message || "Tente novamente." });
    }
  };

  const handleRestoreDefaults = () => {
    setMenu(DEFAULT_NAVIGATION.menu);
    setGroups(DEFAULT_NAVIGATION.footer.groups);
    toast.success("Padrão restaurado", { description: "Salve para aplicar no site." });
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Tabs.Root defaultSelectedKey="menu">
          <Tabs.List aria-label="Áreas de navegação" className="overflow-x-auto">
            <Tabs.Tab id="menu">Menu principal</Tabs.Tab>
            <Tabs.Tab id="footer">Rodapé</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel id="menu" className="space-y-4 pt-5">
            <Card>
              <Card.Header className="flex flex-row items-start justify-between gap-4">
                <div>
                  <Card.Title>Menu principal</Card.Title>
                  <Card.Description className="mt-1">
                    Aparece no topo em telas grandes e na gaveta lateral no celular. Busca, notificações e
                    o atalho de perfil continuam fixos.
                  </Card.Description>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 gap-2" onPress={() => setAddTarget({ kind: "menu" })}>
                  <Plus className="size-4" aria-hidden="true" />
                  Adicionar
                </Button>
              </Card.Header>
              <Card.Content>
                <NavItemList
                  surfaceId="menu"
                  items={menu}
                  emptyLabel="Nenhum item no menu. Adicione uma página da plataforma ou um link avulso."
                  onItemsChange={setMenu}
                />
              </Card.Content>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel id="footer" className="space-y-4 pt-5">
            {groups.map((group) => (
              <Card key={group.id}>
                <Card.Header className="flex flex-row items-end justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <TextField
                      value={group.title}
                      onChange={(title) =>
                        setGroups((current) =>
                          current.map((entry) => (entry.id === group.id ? { ...entry, title } : entry)),
                        )
                      }
                    >
                      <Label>Título da coluna</Label>
                      <Input placeholder="Ex.: Aprender" />
                    </TextField>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onPress={() => setAddTarget({ kind: "footer", groupId: group.id })}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Adicionar
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Remover coluna ${group.title}`}
                      onPress={() => setGroups((current) => current.filter((entry) => entry.id !== group.id))}
                    >
                      <Trash2 className="size-4 text-danger" aria-hidden="true" />
                    </Button>
                  </div>
                </Card.Header>
                <Card.Content>
                  <NavItemList
                    surfaceId={`footer:${group.id}`}
                    items={group.items}
                    emptyLabel="Coluna vazia. Adicione ao menos um link ou remova a coluna."
                    onItemsChange={(items) =>
                      setGroups((current) =>
                        current.map((entry) => (entry.id === group.id ? { ...entry, items } : entry)),
                      )
                    }
                  />
                </Card.Content>
              </Card>
            ))}

            <Button
              variant="outline"
              className="w-full gap-2"
              isDisabled={groups.length >= NAV_FOOTER_MAX_GROUPS}
              onPress={() =>
                setGroups((current) => [
                  ...current,
                  { id: newId("grupo"), title: "Nova coluna", items: [] },
                ])
              }
            >
              <Plus className="size-4" aria-hidden="true" />
              {groups.length >= NAV_FOOTER_MAX_GROUPS
                ? `Limite de ${NAV_FOOTER_MAX_GROUPS} colunas atingido`
                : "Adicionar coluna"}
            </Button>
          </Tabs.Panel>
        </Tabs.Root>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-separator pt-5">
          <Button variant="tertiary" className="gap-2" onPress={handleRestoreDefaults}>
            <Link2 className="size-4" aria-hidden="true" />
            Restaurar navegação padrão
          </Button>
          <Button variant="primary" className="gap-2" isDisabled={saving} onPress={handleSave}>
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {saving ? "Salvando..." : "Salvar navegação"}
          </Button>
        </div>
      </div>

      <div className="lg:col-span-1">
        <NavigationPreview menu={menu} groups={groups} />
      </div>

      <AddItemModal
        target={addTarget}
        usedHrefs={usedHrefs}
        onClose={() => setAddTarget(null)}
        onAdd={handleAdd}
      />
    </div>
  );
}
