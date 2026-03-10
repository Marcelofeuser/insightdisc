function escapeCsvCell(value) {
  const normalized = value == null ? '' : String(value);
  if (!/[",;\n\r]/.test(normalized)) {
    return normalized;
  }
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function buildCsv(rows = []) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  if (!normalizedRows.length) {
    return '\uFEFF';
  }

  const headers = Array.from(
    normalizedRows.reduce((accumulator, row) => {
      Object.keys(row || {}).forEach((key) => accumulator.add(key));
      return accumulator;
    }, new Set()),
  );

  const lines = [headers.map((header) => escapeCsvCell(header)).join(';')];

  normalizedRows.forEach((row) => {
    lines.push(
      headers.map((header) => escapeCsvCell(row?.[header] ?? '')).join(';'),
    );
  });

  return `\uFEFF${lines.join('\n')}`;
}
