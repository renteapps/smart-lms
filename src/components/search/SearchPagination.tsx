"use client";

import { Pagination } from "@heroui/react";

/**
 * Paginação numerada em vez de "carregar mais".
 *
 * A URL já carrega `page`, então cada página é endereçável, o botão "voltar"
 * do navegador anda de página em página e a memória do cliente não cresce sem
 * limite — coisas que a lista infinita entrega mal.
 */
export function SearchPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalCount);

  return (
    <Pagination className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <Pagination.Summary className="text-sm text-muted">
        <span data-numeric>
          {first}–{last}
        </span>{" "}
        de <span data-numeric>{totalCount}</span>
      </Pagination.Summary>

      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            isDisabled={page <= 1}
            onPress={() => onPageChange(page - 1)}
            aria-label="Página anterior"
          >
            <Pagination.PreviousIcon />
            <span className="hidden sm:inline">Anterior</span>
          </Pagination.Previous>
        </Pagination.Item>

        {buildPageList(page, totalPages).map((entry, index) =>
          entry === "gap" ? (
            <Pagination.Item key={`gap-${index}`}>
              <Pagination.Ellipsis />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={entry}>
              <Pagination.Link
                isActive={entry === page}
                onPress={() => onPageChange(entry)}
                aria-label={`Página ${entry}`}
                aria-current={entry === page ? "page" : undefined}
              >
                {entry}
              </Pagination.Link>
            </Pagination.Item>
          ),
        )}

        <Pagination.Item>
          <Pagination.Next
            isDisabled={page >= totalPages}
            onPress={() => onPageChange(page + 1)}
            aria-label="Próxima página"
          >
            <span className="hidden sm:inline">Próxima</span>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}

/** Primeira, última, e uma janela em volta da atual — o resto vira reticências. */
export function buildPageList(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);
  if (current <= 3) pages.add(2).add(3).add(4);
  if (current >= total - 2) pages.add(total - 1).add(total - 2).add(total - 3);

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  const output: Array<number | "gap"> = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) output.push("gap");
    output.push(page);
    previous = page;
  }

  return output;
}
