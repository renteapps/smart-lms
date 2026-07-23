import React from 'react';
import { ContentBlock } from '@/lib/mockData';
import { Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Plus } from 'lucide-react';

interface TableBlockEditorProps {
  block: ContentBlock;
  index: number;
  updateBlock: (index: number, newBlock: Partial<ContentBlock>) => void;
}

export default function TableBlockEditor({ block, index, updateBlock }: TableBlockEditorProps) {
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
    if (window.confirm('Tem certeza que deseja apagar esta linha?')) {
      const newData = tableData.filter((_, i) => i !== rIndex);
      updateTableData(newData);
    }
  };

  const deleteColumn = (cIndex: number) => {
    if (tableData[0]?.length <= 1) return;
    if (window.confirm('Tem certeza que deseja apagar esta coluna?')) {
      const newData = tableData.map(row => row.filter((_, i) => i !== cIndex));
      updateTableData(newData);
    }
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
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3 overflow-x-auto">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-primary mb-1">Bloco de Tabela</div>
        <div className="flex gap-2">
          <button type="button" onClick={addColumn} className="flex items-center gap-1 text-xs text-text-soft hover:text-primary transition-colors border border-border px-2 py-1 rounded">
            <Plus className="w-3 h-3" /> Coluna
          </button>
          <button type="button" onClick={addRow} className="flex items-center gap-1 text-xs text-text-soft hover:text-primary transition-colors border border-border px-2 py-1 rounded">
            <Plus className="w-3 h-3" /> Linha
          </button>
        </div>
      </div>
      <div className="relative pt-6 pl-6">
        {/* Column Controls */}
        <div className="absolute top-0 left-6 right-0 flex">
          {tableData[0]?.map((_, cIndex) => (
            <div key={`col-ctrl-${cIndex}`} className="flex-1 flex justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => moveColumn(cIndex, 'left')} disabled={cIndex === 0} className="p-1 text-text-soft hover:text-primary disabled:opacity-30"><ArrowLeft className="w-3 h-3" /></button>
              <button type="button" onClick={() => deleteColumn(cIndex)} className="p-1 text-error/70 hover:text-error"><Trash2 className="w-3 h-3" /></button>
              <button type="button" onClick={() => moveColumn(cIndex, 'right')} disabled={cIndex === tableData[0].length - 1} className="p-1 text-text-soft hover:text-primary disabled:opacity-30"><ArrowRight className="w-3 h-3" /></button>
            </div>
          ))}
        </div>

        <table className="w-full border-collapse">
          <tbody>
            {tableData.map((row, rIndex) => (
              <tr key={rIndex} className="group/row relative">
                {/* Row Controls */}
                <td className="absolute -left-6 top-0 bottom-0 flex flex-col justify-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity w-6">
                  <button type="button" onClick={() => moveRow(rIndex, 'up')} disabled={rIndex === 0} className="text-text-soft hover:text-primary disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                  <button type="button" onClick={() => deleteRow(rIndex)} className="text-error/70 hover:text-error"><Trash2 className="w-3 h-3" /></button>
                  <button type="button" onClick={() => moveRow(rIndex, 'down')} disabled={rIndex === tableData.length - 1} className="text-text-soft hover:text-primary disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                </td>

                {row.map((cell, cIndex) => (
                  <td key={cIndex} className="border border-border p-0 relative group/cell">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => {
                        const newData = [...tableData];
                        newData[rIndex] = [...newData[rIndex]];
                        newData[rIndex][cIndex] = e.target.value;
                        updateTableData(newData);
                      }}
                      className={`w-full bg-transparent px-3 py-2 text-sm focus:outline-none focus:bg-surface-hover transition-colors ${rIndex === 0 ? 'font-semibold text-text' : 'text-text-soft'}`}
                      placeholder={rIndex === 0 ? "Cabeçalho" : "Célula"}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
