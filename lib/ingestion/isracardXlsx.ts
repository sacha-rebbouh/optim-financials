import * as XLSX from "xlsx";
import type { ParsedTransaction } from "./types";

type ParsedIsracard = {
  transactions: ParsedTransaction[];
  warnings: string[];
  rawSample: string[][];
};

const HEADER_KEYS = {
  date: ["תאריך"],
  merchant: ["שם בית עסק", "שם בית העסק"],
  amountTotal: ["סכום\nעסקה", "סכום עסקה"],
  amountCharge: ["סכום\nחיוב", "סכום חיוב"],
  transactionType: ["סוג\nעסקה", "סוג עסקה"],
  category: ["ענף"],
  notes: ["הערות"],
};

const INSTALLMENT_TYPE = "תשלומים";
const INSTALLMENT_NOTE_REGEX = /תשלום\s*(\d+)\s*מתוך\s*(\d+)/;

export function parseIsracardXlsx(buffer: Buffer): ParsedIsracard {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    return {
      transactions: [],
      warnings: ["Aucune feuille XLSX détectée."],
      rawSample: [],
    };
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });

  const headerIndex = findHeaderRow(rows);
  if (headerIndex === -1) {
    return {
      transactions: [],
      warnings: [
        "En-têtes non détectés (format non reconnu pour Isracard/Max).",
      ],
      rawSample: rows.slice(0, 10).map((row) => row.map(toText)),
    };
  }

  const headerRow = rows[headerIndex].map(toText);
  const columnMap = mapColumns(headerRow);
  const warnings: string[] = [];
  const transactions: ParsedTransaction[] = [];

  if (!columnMap.date || !columnMap.merchant || !columnMap.amountTotal) {
    warnings.push("Colonnes essentielles manquantes pour le parsing.");
  }

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] as unknown[];
    const dateValue = row[columnMap.date ?? -1];
    const merchantValue = row[columnMap.merchant ?? -1];

    if (!dateValue || !merchantValue) {
      continue;
    }

    const date = toDateString(dateValue);
    if (!date || isHeaderRepeat(merchantValue) || isFooterRow(merchantValue)) {
      continue;
    }

    const amountTotalValue = columnMap.amountTotal !== undefined
      ? row[columnMap.amountTotal]
      : "";
    const amountChargeValue = columnMap.amountCharge !== undefined
      ? row[columnMap.amountCharge]
      : "";
    const amountTotal = toAmount(amountTotalValue);
    const amountCharge = toAmount(amountChargeValue);
    const transactionType = toText(
      columnMap.transactionType !== undefined
        ? row[columnMap.transactionType]
        : ""
    );
    const notes = toText(
      columnMap.notes !== undefined ? row[columnMap.notes] : ""
    );
    const category = toText(
      columnMap.category !== undefined ? row[columnMap.category] : ""
    );

    const currencyOriginal = detectCurrency([amountTotalValue, amountChargeValue]);

    const parsed: ParsedTransaction = {
      transactionDate: date,
      originalMerchantName: toText(merchantValue),
      amountOriginal: amountTotal ?? amountCharge ?? 0,
      currencyOriginal,
      amountCharged: amountCharge ?? undefined,
      transactionType: transactionType || undefined,
      merchantCategoryHint: category || undefined,
      notes: notes || undefined,
    };

    if (transactionType.includes(INSTALLMENT_TYPE) || INSTALLMENT_NOTE_REGEX.test(notes)) {
      if (amountTotal !== null) {
        parsed.installmentTotal = amountTotal;
      }
      if (amountCharge !== null) {
        parsed.installmentMonthly = amountCharge;
      }

      const noteMatch = notes.match(INSTALLMENT_NOTE_REGEX);
      if (noteMatch && parsed.installmentTotal && parsed.installmentMonthly) {
        const currentPayment = Number(noteMatch[1]);
        if (!Number.isNaN(currentPayment)) {
          parsed.installmentRemaining =
            parsed.installmentTotal - parsed.installmentMonthly * currentPayment;
        }
      }
    }

    transactions.push(parsed);
  }

  return {
    transactions,
    warnings,
    rawSample: rows.slice(0, 10).map((row) => row.map(toText)),
  };
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;
    const text = row.map(toText).join(" ");
    if (text.includes("תאריך") && text.includes("שם בית עסק")) {
      return i;
    }
  }
  return -1;
}

function mapColumns(headerRow: string[]) {
  const map: Record<string, number | undefined> = {};
  for (let i = 0; i < headerRow.length; i += 1) {
    const value = headerRow[i];
    if (!value) continue;
    if (matches(value, HEADER_KEYS.date)) map.date = i;
    if (matches(value, HEADER_KEYS.merchant)) map.merchant = i;
    if (matches(value, HEADER_KEYS.amountTotal)) map.amountTotal = i;
    if (matches(value, HEADER_KEYS.amountCharge)) map.amountCharge = i;
    if (matches(value, HEADER_KEYS.transactionType)) map.transactionType = i;
    if (matches(value, HEADER_KEYS.category)) map.category = i;
    if (matches(value, HEADER_KEYS.notes)) map.notes = i;
  }
  return map;
}

function matches(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(candidate));
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function toAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const text = toText(value);
  if (!text) return null;
  const normalized = text.replace(/[^\d,.\-]/g, "");
  if (!normalized) return null;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  let numeric = normalized;
  if (hasComma && hasDot) {
    numeric = normalized.replace(/,/g, "");
  } else if (hasComma && !hasDot) {
    numeric = normalized.replace(/,/g, ".");
  }
  const parsed = Number(numeric);
  return Number.isNaN(parsed) ? null : parsed;
}

function toDateString(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return null;
    const utcDate = new Date(Date.UTC(date.y, date.m - 1, date.d));
    return utcDate.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const isoMatch = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
    const dmyMatch = trimmed.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return null;
}

function detectCurrency(values: unknown[]): string {
  const text = values.map(toText).join(" ");
  if (text.includes("₪")) return "ILS";
  if (text.includes("€")) return "EUR";
  if (text.includes("$")) return "USD";
  if (text.toUpperCase().includes("CHF")) return "CHF";
  return "ILS";
}

function isHeaderRepeat(value: unknown): boolean {
  const text = toText(value);
  return text.includes("שם בית עסק") || text.includes("תאריך");
}

function isFooterRow(value: unknown): boolean {
  const text = toText(value);
  return text.includes("את המידע") || text.includes("מידע");
}
