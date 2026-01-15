import * as XLSX from "xlsx";

type ParsedResult = {
  rows: string[][];
  sample: string[][];
};

export function parseCsv(buffer: Buffer): ParsedResult {
  const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { rows: [], sample: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((line) => parseDelimitedLine(line, delimiter));
  const cleaned = rows.filter((row) => !isEmptyRow(row));
  return { rows: cleaned, sample: cleaned.slice(0, 10) };
}

export function parseXlsx(buffer: Buffer): ParsedResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    return { rows: [], sample: [] };
  }
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });
  const normalized = rows.map((row) => row.map((cell) => String(cell ?? "")));
  const cleaned = normalized.filter((row) => !isEmptyRow(row));
  return { rows: cleaned, sample: cleaned.slice(0, 10) };
}

function detectDelimiter(line: string) {
  const delimiters = [",", ";", "\t", "|"] as const;
  const counts = delimiters.map((delimiter) => ({
    delimiter,
    count: line.split(delimiter).length - 1,
  }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].delimiter : ",";
}

function parseDelimitedLine(line: string, delimiter: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function isEmptyRow(row: string[]) {
  return row.every((cell) => cell.trim().length === 0);
}
