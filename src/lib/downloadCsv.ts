/**
 * Escapa uma célula de CSV.
 *
 * Texto que começa com `= + - @` (ou tab/CR) vira fórmula no Excel/Sheets —
 * nome de aluno ou título de conversa como `=HYPERLINK(...)` executava ao
 * abrir o relatório. O apóstrofo força a célula a ser texto. Números (tipo
 * `number`) passam intactos, então valores negativos continuam numéricos.
 */
export function escapeCsvCell(value: unknown, separator = ";"): string {
  if (value == null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  const needsQuotes = text.includes('"') || text.includes(separator) || /[\n\r]/.test(text);
  return needsQuotes ? `"${text.replaceAll('"', '""')}"` : text;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: unknown[][],
) {
  const content = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(";"))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
