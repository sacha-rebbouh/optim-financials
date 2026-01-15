import type { ParsedTransaction } from "./types";

type EuParseResult = {
  transactions: ParsedTransaction[];
  warnings: string[];
};

const HEADER_ALIASES = {
  date: ["date", "date opération", "date operation", "valeur"],
  merchant: ["libellé", "libelle", "description", "bénéficiaire", "beneficiaire"],
  amount: ["montant", "amount", "montant opération"],
  currency: ["devise", "currency"],
};

export function parseEuropeanRows(rows: string[][]): EuParseResult {
  if (rows.length === 0) {
    return { transactions: [], warnings: ["Fichier vide."] };
  }

  const headerIndex = findHeaderRow(rows);
  if (headerIndex === -1) {
    return {
      transactions: [],
      warnings: ["En-têtes non détectés pour format européen."],
    };
  }

  const headerRow = rows[headerIndex].map(normalize);
  const map = mapColumns(headerRow);
  const warnings: string[] = [];
  if (map.date === undefined || map.merchant === undefined || map.amount === undefined) {
    warnings.push("Colonnes essentielles manquantes (date, libellé, montant).");
  }

  const transactions: ParsedTransaction[] = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const dateValue = row[map.date ?? -1];
    const merchantValue = row[map.merchant ?? -1];
    const amountValue = row[map.amount ?? -1];
    if (!dateValue || !merchantValue || !amountValue) continue;

    const date = toDateString(dateValue);
    const amount = toAmount(amountValue);
    if (!date || amount === null) continue;
    const currency =
      map.currency !== undefined ? normalize(row[map.currency]) : "EUR";

    transactions.push({
      transactionDate: date,
      originalMerchantName: merchantValue.trim(),
      amountOriginal: amount,
      currencyOriginal: currency || "EUR",
    });
  }

  return { transactions, warnings };
}

function findHeaderRow(rows: string[][]) {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i].map(normalize).join(" ");
    if (row.includes("date") && (row.includes("libell") || row.includes("description"))) {
      return i;
    }
  }
  return -1;
}

function mapColumns(header: string[]) {
  const map: Record<string, number | undefined> = {};
  for (let i = 0; i < header.length; i += 1) {
    const value = header[i];
    if (!value) continue;
    if (matches(value, HEADER_ALIASES.date)) map.date = i;
    if (matches(value, HEADER_ALIASES.merchant)) map.merchant = i;
    if (matches(value, HEADER_ALIASES.amount)) map.amount = i;
    if (matches(value, HEADER_ALIASES.currency)) map.currency = i;
  }
  return map;
}

function matches(value: string, aliases: string[]) {
  return aliases.some((alias) => value.includes(alias));
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function toAmount(value: string): number | null {
  const text = value.replace(/\s/g, "");
  if (!text) return null;
  const normalized = text.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function toDateString(value: string) {
  const trimmed = value.trim();
  const dmyMatch = trimmed.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }
  const ymdMatch = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  }
  return null;
}
