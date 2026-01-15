"use client";

import { useState } from "react";
import ValidationPanel from "./ValidationPanel";
import { useAuth } from "./AuthContext";

type UploadResult = {
  status: string;
  source: string;
  sourceKey: string;
  fileType: "csv" | "xlsx" | "pdf" | "unknown";
  filename: string;
  size: number;
  parsedTransactions: number;
  pendingReview: number;
  persistedTransactions?: number;
  sourceId?: string;
  warnings: string[];
  sampleRows: string[][];
  sampleTransactions: {
    transactionDate: string;
    originalMerchantName: string;
    amountOriginal: number;
    currencyOriginal: string;
    amountCharged?: number;
    transactionType?: string;
    installmentRemaining?: number;
  }[];
};

type UploadFormProps = {
  onCompleted?: () => void;
};

export default function UploadForm({ onCompleted }: UploadFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const { userId, accessToken } = useAuth();
  const [results, setResults] = useState<UploadResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchSummary, setBatchSummary] = useState<{
    files: number;
    parsed: number;
    persisted: number;
  } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!files.length) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setBatchSummary(null);

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      if (userId && userId.trim().length > 0) {
        formData.append("userId", userId.trim());
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Upload failed");
      }

      const data = (await response.json()) as
        | { results?: UploadResult[] }
        | UploadResult;
      const normalized: UploadResult[] = Array.isArray(
        (data as { results?: UploadResult[] }).results
      )
        ? (data as { results: UploadResult[] }).results ?? []
        : [data as UploadResult];
      setResults(normalized);
      onCompleted?.();
      setBatchSummary({
        files: normalized.length,
        parsed: normalized.reduce(
          (sum, item) => sum + item.parsedTransactions,
          0
        ),
        persisted: normalized.reduce(
          (sum, item) => sum + (item.persistedTransactions ?? 0),
          0
        ),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label>Importer un relevé</label>
        <input
          type="file"
          accept=".csv,.xlsx,.pdf"
          multiple
          onChange={(event) =>
            setFiles(event.target.files ? Array.from(event.target.files) : [])
          }
        />
        <button type="submit" disabled={!files.length || loading}>
          {loading ? "Analyse en cours..." : "Lancer l&apos;import"}
        </button>
      </form>

      {error ? <div className="card">Erreur: {error}</div> : null}

      {batchSummary ? (
        <div className="card">
          <h2>Résumé batch</h2>
          <div className="grid">
            <div>
              <strong>Fichiers</strong>
              <div className="meta">{batchSummary.files}</div>
            </div>
            <div>
              <strong>Transactions</strong>
              <div className="meta">{batchSummary.parsed}</div>
            </div>
            <div>
              <strong>Stockées</strong>
              <div className="meta">{batchSummary.persisted}</div>
            </div>
          </div>
        </div>
      ) : null}
      {results.map((result) => (
        <div className="card" key={result.filename}>
          <h2>Résumé de l&apos;import</h2>
          <div className="grid">
            <div>
              <strong>Fichier</strong>
              <div className="meta">{result.filename}</div>
            </div>
            <div>
              <strong>Source détectée</strong>
              <div className="meta">{result.source}</div>
            </div>
            <div>
              <strong>Type de fichier</strong>
              <div className="meta">{result.fileType}</div>
            </div>
            <div>
              <strong>Transactions estimées</strong>
              <div className="meta">{result.parsedTransactions}</div>
            </div>
            <div>
              <strong>À valider</strong>
              <div className="meta">{result.pendingReview}</div>
            </div>
            {result.persistedTransactions ? (
              <div>
                <strong>Stockées</strong>
                <div className="meta">{result.persistedTransactions}</div>
              </div>
            ) : null}
            {result.sourceId ? (
              <div>
                <strong>Source ID</strong>
                <div className="meta">{result.sourceId}</div>
              </div>
            ) : null}
          </div>
          {result.warnings.length ? (
            <>
              <h3>Alertes</h3>
              <ul>
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </>
          ) : null}
          {result.sampleRows.length ? (
            <>
              <h3>Extrait ({result.fileType.toUpperCase()})</h3>
              <div className="meta">
                {result.sampleRows.map((row, index) => (
                  <div key={`${row.join("-")}-${index}`}>{row.join(" | ")}</div>
                ))}
              </div>
            </>
          ) : null}
          <ValidationPanel
            pendingReview={result.pendingReview}
            transactions={result.sampleTransactions}
          />
        </div>
      ))}
    </>
  );
}
