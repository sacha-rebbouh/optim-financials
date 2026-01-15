import { extname } from "path";
import { detectSource } from "./detectSource";
import type { IngestFileInput, IngestSummary, ParsedTransaction } from "./types";
import { parseCsv, parseXlsx } from "./parsers";
import { parseIsracardXlsx } from "./isracardXlsx";
import { parsePdf } from "./pdfParser";
import { enrichTransactions } from "./enrichTransactions";
import { getRules } from "../rules/repository";
import { persistTransactions } from "./persistTransactions";
import { parseEuropeanRows } from "./euParser";
import { parseFrenchRows } from "./frParser";

export async function ingestFile(
  input: IngestFileInput
): Promise<IngestSummary> {
  const source = detectSource(input.filename);

  const extension = extname(input.filename).toLowerCase();
  const fileType = toFileType(extension);
  const parsed =
    fileType === "csv"
      ? parseCsv(input.buffer)
      : fileType === "xlsx"
      ? parseXlsx(input.buffer)
      : { rows: [], sample: [] };
  let parsedTransactions: ParsedTransaction[] = [];
  let pdfSampleRows: string[][] = [];

  const warnings: string[] = [];

  if (fileType === "xlsx" && isHebrewSource(source.key)) {
    const parsedIsracard = parseIsracardXlsx(input.buffer);
    parsedTransactions = parsedIsracard.transactions;
    warnings.push(...parsedIsracard.warnings);
  }

  if (fileType !== "pdf" && parsedTransactions.length === 0) {
    const euResult = parseEuropeanRows(parsed.rows);
    parsedTransactions = euResult.transactions;
    warnings.push(...euResult.warnings);
  }

  if (fileType !== "pdf" && parsedTransactions.length === 0) {
    const frResult = parseFrenchRows(parsed.rows);
    parsedTransactions = frResult.transactions;
    warnings.push(...frResult.warnings);
  }

  if (fileType === "pdf") {
    const parsedPdf = await parsePdf(input.buffer, input.userId);
    parsedTransactions = parsedPdf.transactions;
    pdfSampleRows = parsedPdf.sample;
    warnings.push(...parsedPdf.warnings);
  }

  if (parsedTransactions.length > 0) {
    const rules = input.userId ? await getRules(input.userId) : [];
    const enriched = await enrichTransactions({
      transactions: parsedTransactions,
      rules,
      userId: input.userId,
    });
    parsedTransactions = enriched.transactions;
    warnings.push(...enriched.warnings);
  }

  let persistedTransactions = 0;
  let sourceId: string | null = null;
  if (input.userId && parsedTransactions.length > 0) {
    const persisted = await persistTransactions({
      userId: input.userId,
      sourceKey: source.key,
      filename: input.filename,
      transactions: parsedTransactions,
      attachmentId: input.attachmentId,
    });
    persistedTransactions = persisted.count;
    sourceId = persisted.sourceId;
  }

  const estimatedTransactions =
    parsedTransactions.length > 0
      ? parsedTransactions.length
      : parsed.rows.length > 0
      ? parsed.rows.length
      : estimateTransactions(input.buffer.length);

  if (estimatedTransactions === 0) {
    warnings.push(
      "Aucune transaction détectée. Vérifiez le format ou le type de fichier."
    );
  }

  if (fileType === "xlsx" && parsed.rows.length === 0) {
    warnings.push("Aucune ligne XLSX détectée (vérifiez le fichier).");
  }

  return {
    status: "pending_review",
    source: source.label,
    sourceKey: source.key,
    fileType,
    filename: input.filename,
    size: input.buffer.length,
    parsedTransactions: estimatedTransactions,
    pendingReview: estimatedTransactions,
    persistedTransactions: persistedTransactions || undefined,
    sourceId: sourceId ?? undefined,
    warnings,
    sampleRows: fileType === "pdf" ? pdfSampleRows : parsed.sample,
    sampleTransactions: parsedTransactions.slice(0, 10),
  };
}

function estimateTransactions(size: number) {
  if (size === 0) return 0;
  if (size < 50_000) return 25;
  if (size < 250_000) return 80;
  return 150;
}

function toFileType(extension: string): IngestSummary["fileType"] {
  switch (extension) {
    case ".csv":
      return "csv";
    case ".xlsx":
      return "xlsx";
    case ".pdf":
      return "pdf";
    default:
      return "unknown";
  }
}

function isHebrewSource(key: string) {
  return ["isracard", "max", "visa", "mizrahi"].includes(key);
}
