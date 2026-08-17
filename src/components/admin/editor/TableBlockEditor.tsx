"use client";

import React, { useState } from 'react';
import { AlertDialog, Button, Card, Input, TextField } from '@heroui/react';
import { ContentBlock } from '@/types/course';
import { Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Plus } from 'lucide-react';

interface TableBlockEditorProps {
  block: ContentBlock;
  index: number;
  updateBlock: (index: number, newBlock: Partial<ContentBlock>) => void;
}

type PendingDeletion = { kind: 'row' | 'column'; index: number };

export default function TableBlockEditor({ block, index, updateBlock }: TableBlockEditorProps) {
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);

  const tableData: string[][] = block.metadata?.tableData || [
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
  ];

  const updateTableData = (newData: string[][]) => {
    updateBlock(index, { metadata: { ...block.metadata, tableData: newData } });
  };

  const addRow = () => {
    const newRow = new Array(tableData[0]?.length || 3).fill('');
    updateTableData([...tableData, newRow]);
  };

  const addColumn = () => {
    const newData = tableData.map(row => [...row, '']);
    updateTableData(newData);
  };

  const deleteRow = (rIndex: number) => {
    if (tableData.length <= 1) return;
    setPendingDeletion({ kind: 'row', index: rIndex });
  };

  const deleteColumn = (cIndex: number) => {
    if (tableData[0]?.length <= 1) return;
    setPendingDeletion({ kind: 'column', index: cIndex });
  };

  const confirmDeletion = () => {
    if (!pendingDeletion) return;
    if (pendingDeletion.kind === 'row') {
      updateTableData(tableData.filter((_, i) => i !== pendingDeletion.index));
    } else {
      updateTableData(tableData.map(row => row.filter((_, i) => i !== pendingDeletion.index)));
    }
    setPendingDeletion(null);
  };

  const moveRow = (rIndex: number, direction: 'up' | 'down') => {
    if (direction === 'up' && rIndex > 0) {
      const newData = [...tableData];
      [newData[rIndex - 1], newData[rIndex]] = [newData[rIndex], newData[rIndex - 1]];
      updateTableData(newData);
    } else if (direction === 'down' && rIndex < tableData.length - 1) {
      const newData = [...tableData];
      [newData[rIndex + 1], newData[rIndex]] = [newData[rIndex], newData[rIndex + 1]];
      updateTableData(newData);
    }
  };

  const moveColumn = (cIndex: number, direction: 'left' | 'right') => {
    if (direction === 'left' && cIndex > 0) {
      const newData = tableData.map(row => {
        const newRow = [...row];
        [newRow[cIndex - 1], newRow[cIndex]] = [newRow[cIndex], newRow[cIndex - 1]];
        return newRow;
      });
      updateTableData(newData);
    } else if (direction === 'right' && cIndex < tableData[0].length - 1) {
      const newData = tableData.map(row => {
        const newRow = [...row];
        [newRow[cIndex + 1], newRow[cIndex]] = [newRow[cIndex], newRow[cIndex + 1]];
        return newRow;
      });
      updateTableData(newData);
    }
  };

  return (
    <Card variant="secondary">
      <Card.Header className="flex flex-row flex-wrap items-center justify-between gap-3">
        <Card.Title className="text-sm text-accent">Bloco de Tabela</Card.Title>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addColumn}>
            <Plus className="size-3.5" aria-hidden="true" /> Coluna
          </Button>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="size-3.5" aria-hidden="true" /> Linha
          </Button>
        </div>
      </Card.Header>

      <Card.Content className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-10" />
              {tableData[0]?.map((_, cIndex) => (
                <th key={`col-ctrl-${cIndex}`} className="p-1">
                  <div className="flex justify-center gap-0.5">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Mover coluna ${cIndex + 1} para a esquerda`}
                      isDisabled={cIndex === 0}
                      onClick={() => moveColumn(cIndex, 'left')}
                    >
                      <ArrowLeft className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Excluir coluna ${cIndex + 1}`}
                      isDisabled={tableData[0].length <= 1}
                      onClick={() => deleteColumn(cIndex)}
                    >
                      <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Mover coluna ${cIndex + 1} para a direita`}
                      isDisabled={cIndex === tableData[0].length - 1}
                      onClick={() => moveColumn(cIndex, 'right')}
                    >
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rIndex) => (
              <tr key={rIndex}>
                <td className="w-10 p-1 align-middle">
                  <div className="flex flex-col items-center gap-0.5">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Mover linha ${rIndex + 1} para cima`}
                      isDisabled={rIndex === 0}
                      onClick={() => moveRow(rIndex, 'up')}
                    >
                      <ArrowUp className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Excluir linha ${rIndex + 1}`}
                      isDisabled={tableData.length <= 1}
                      onClick={() => deleteRow(rIndex)}
                    >
                      <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Mover linha ${rIndex + 1} para baixo`}
                      isDisabled={rIndex === tableData.length - 1}
                      onClick={() => moveRow(rIndex, 'down')}
                    >
                      <ArrowDown className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </td>

                {row.map((cell, cIndex) => (
                  <td key={cIndex} className="border border-border p-1">
                    <TextField
                      aria-label={
                        rIndex === 0
                          ? `Cabeçalho da coluna ${cIndex + 1}`
                          : `Linha ${rIndex}, coluna ${cIndex + 1}`
                      }
                      value={cell}
                      onChange={(value) => {
                        const newData = [...tableData];
                        newData[rIndex] = [...newData[rIndex]];
                        newData[rIndex][cIndex] = value;
                        updateTableData(newData);
                      }}
                    >
                      <Input
                        className={rIndex === 0 ? 'font-semibold' : ''}
                        placeholder={rIndex === 0 ? 'Cabeçalho' : 'Célula'}
                      />
                    </TextField>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card.Content>

      <AlertDialog.Root isOpen={pendingDeletion !== null} onOpenChange={(open) => !open && setPendingDeletion(null)}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>
                  {pendingDeletion?.kind === 'row' ? 'Apagar esta linha?' : 'Apagar esta coluna?'}
                </AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                O conteúdo {pendingDeletion?.kind === 'row' ? 'da linha' : 'da coluna'} será removido da tabela e não poderá ser recuperado.
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="tertiary" onClick={() => setPendingDeletion(null)}>Cancelar</Button>
                <Button variant="danger" onClick={confirmDeletion}>Apagar</Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog.Root>
    </Card>
  );
}
