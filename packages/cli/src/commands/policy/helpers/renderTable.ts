/**
 * Renders rows as a simple fixed-width text table.
 *
 * @param headers - Column headers
 * @param rows - Table rows
 * @returns Formatted table string
 */
export function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => (row[index] ?? '').length)),
  );

  const formatRow = (cells: string[]): string =>
    cells.map((cell, index) => cell.padEnd(widths[index] ?? cell.length)).join('  ');

  const divider = widths.map((width) => '-'.repeat(width)).join('  ');
  return [formatRow(headers), divider, ...rows.map((row) => formatRow(row))].join('\n');
}
