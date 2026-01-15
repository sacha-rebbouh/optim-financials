import type { ParsedTransaction } from "./types";
import FormData from "form-data";
import { getUserSettings } from "../settings/repository";

type PdfParseResult = {
  rawLines: string[];
  rows: string[][];
  sample: string[][];
  transactions: ParsedTransaction[];
  warnings: string[];
};

const INSTALLMENT_NOTE_REGEX = /תשלום\s*(\d+)\s*מתוך\s*(\d+)/;

export async function parsePdf(
  buffer: Buffer,
  userId?: string
): Promise<PdfParseResult> {
  const warnings: string[] = [];
  let text = await extractPdfText(buffer);
  let normalizedText = text.replace(/\u00a0/g, " ").trim();

  if (!normalizedText) {
    const settings = userId ? await getUserSettings(userId) : {};
    if (settings.ocr_provider === "local") {
      return {
        rawLines: [],
        rows: [],
        sample: [],
        transactions: [],
        warnings: ["OCR désactivé par les paramètres."],
      };
    }
    const ocrText = await extractTextWithOcr(buffer, settings.ocr_provider);
    if (ocrText) {
      normalizedText = ocrText.replace(/\u00a0/g, " ").trim();
      warnings.push("Texte OCR utilisé pour le PDF.");
    }
  }

  if (!normalizedText) {
    return {
      rawLines: [],
      rows: [],
      sample: [],
      transactions: [],
      warnings: ["Texte PDF vide (OCR requis)."],
    };
  }

  const rawLines = normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rawLines.length < 5) {
    warnings.push("Texte PDF insuffisant, OCR recommandé.");
  }

  const rows = rawLines.map(splitLineToColumns);
  const transactions = extractTransactions(rawLines);

  if (!transactions.length) {
    warnings.push("Transactions non détectées dans le PDF (layout complexe).");
  }

  return {
    rawLines,
    rows,
    sample: rows.slice(0, 10),
    transactions,
    warnings,
  };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = await import("pdf-parse");
  const data = await pdfParse.default(buffer);
  return data.text ?? "";
}

async function extractTextWithOcr(buffer: Buffer, provider?: string | null) {
  if (provider === "google") {
    return extractTextWithGoogleVision(buffer);
  }
  return extractTextWithOcrSpace(buffer);
}

async function extractTextWithOcrSpace(buffer: Buffer) {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) return "";
  const formData = new FormData();
  formData.append("file", buffer, "document.pdf");
  formData.append("language", "heb");
  formData.append("isOverlayRequired", "false");

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: apiKey, ...formData.getHeaders() },
    body: formData as unknown as BodyInit,
  });
  if (!response.ok) return "";
  const data = await response.json();
  const parsedText = data?.ParsedResults?.[0]?.ParsedText ?? "";
  return parsedText;
}

async function extractTextWithGoogleVision(buffer: Buffer) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) return "";
  const base64 = buffer.toString("base64");
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      }),
    }
  );
  if (!response.ok) return "";
  const data = await response.json();
  const text =
    data?.responses?.[0]?.fullTextAnnotation?.text ??
    data?.responses?.[0]?.textAnnotations?.[0]?.description ??
    "";
  return text;
}

function splitLineToColumns(line: string): string[] {
  const parts = line.split(/\s{2,}/).filter(Boolean);
  return parts.length ? parts : [line];
}

function extractTransactions(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const date = extractDate(line);
    const amounts = extractAmounts(line);
    if (!date || !amounts.length) continue;

    const merchant = extractMerchant(line, date, amounts[0].raw);
    const currencyOriginal = detectCurrency(line);
    const amountOriginal = amounts[0].value;
    const amountCharged = amounts[1]?.value;

    const tx: ParsedTransaction = {
      transactionDate: date,
      originalMerchantName: merchant,
      amountOriginal,
      currencyOriginal,
      amountCharged,
    };

    const noteMatch = line.match(INSTALLMENT_NOTE_REGEX);
    if (noteMatch && amountCharged !== undefined) {
      const currentPayment = Number(noteMatch[1]);
      const totalPayments = Number(noteMatch[2]);
      if (!Number.isNaN(currentPayment) && !Number.isNaN(totalPayments)) {
        tx.installmentMonthly = amountCharged;
        if (amountOriginal) {
          tx.installmentTotal = amountOriginal;
          tx.installmentRemaining =
            amountOriginal - amountCharged * currentPayment;
        }
      }
    }

    transactions.push(tx);
  }

  return transactions;
}

function extractDate(line: string): string | null {
  const isoMatch = line.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  const dmyMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }
  return null;
}

function extractAmounts(line: string) {
  const matches = [...line.matchAll(/([+-]?\d[\d,]*\.?\d*)\s?(₪|€|USD|CHF|\$)?/g)]
    .map((match) => ({
      raw: match[0],
      value: toAmount(match[1]),
    }))
    .filter((item) => item.value !== null) as { raw: string; value: number }[];
  return matches;
}

function extractMerchant(line: string, date: string, amountRaw: string): string {
  const trimmed = line
    .replace(date, "")
    .replace(amountRaw, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return trimmed || "Marchand inconnu";
}

function toAmount(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function detectCurrency(text: string) {
  if (text.includes("₪")) return "ILS";
  if (text.includes("€")) return "EUR";
  if (text.includes("$")) return "USD";
  if (text.toUpperCase().includes("CHF")) return "CHF";
  return "ILS";
}
