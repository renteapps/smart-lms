"use client";

import type { ReactNode } from "react";
import { Table } from "@heroui/react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  /** Marca a coluna como cabeçalho da linha (uma por tabela, em geral a primeira). */
  isRowHeader?: boolean;
  className?: string;
  cell: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  /** Nome acessível da tabela (obrigatório). */
  label: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Renderizado abaixo do breakpoint `md`, no lugar da tabela. */
  mobileItem?: (row: T) => ReactNode;
};

/**
 * Tabela padrão do admin: HeroUI `Table` com rolagem horizontal, cabeçalhos em
 * sentence case e, opcionalmente, lista de cartões no mobile.
 */
export function DataTable<T>({ label, columns, rows, rowKey, mobileItem }: DataTableProps<T>) {
  return (
    <>
      <div className={mobileItem ? "hidden md:block" : undefined}>
        <Table.Root>
          <Table.ScrollContainer>
            <Table.Content aria-label={label}>
              <Table.Header>
                {columns.map((column, index) => (
                  <Table.Column key={column.key} isRowHeader={column.isRowHeader ?? index === 0}>
                    {column.header}
                  </Table.Column>
                ))}
              </Table.Header>
              <Table.Body>
                {rows.map((row) => (
                  <Table.Row key={rowKey(row)} id={rowKey(row)}>
                    {columns.map((column) => (
                      <Table.Cell key={column.key} className={column.className}>
                        {column.cell(row)}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table.Root>
      </div>
      {mobileItem && (
        <ul className="divide-y divide-separator md:hidden">
          {rows.map((row) => (
            <li key={rowKey(row)} className="p-4">
              {mobileItem(row)}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
