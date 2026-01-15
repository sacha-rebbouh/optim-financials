"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

type Summary = {
  total: number;
  unique: number;
  duplicates: number;
};

export default function ConsolidationView() {
  const { userId, accessToken } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cleanupStatus, setCleanupStatus] = useState<string | null>(null);

  const authHeaders = useMemo(
    (): Record<string, string> =>
      accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    [accessToken]
  );

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/consolidate?userId=${encodeURIComponent(userId)}`, {
      headers: authHeaders,
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((msg) => {
            throw new Error(msg || "Erreur consolidation");
          });
        }
        return res.json();
      })
      .then((data) => setSummary(data))
      .catch((err) => setError(err.message));
  }, [userId, authHeaders]);

  const handleCleanup = useCallback(async () => {
    if (!userId) return;
    setCleanupStatus("Suppression...");
    const res = await fetch("/api/consolidate/cleanup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      setCleanupStatus("Erreur nettoyage");
      return;
    }
    const payload = await res.json();
    setCleanupStatus(`Supprimés: ${payload.deleted}`);
  }, [userId, authHeaders]);

  return (
    <div className="card">
      <h2>Consolidation</h2>
      {!userId ? (
        <div className="meta">Connectez-vous pour consolider.</div>
      ) : null}
      {error ? <div className="meta">Erreur: {error}</div> : null}
      {!summary ? (
        <p className="meta">Analyse en cours...</p>
      ) : (
        <div className="grid">
          <div className="card">
            <strong>Transactions</strong>
            <div className="meta">{summary.total}</div>
          </div>
          <div className="card">
            <strong>Uniques</strong>
            <div className="meta">{summary.unique}</div>
          </div>
          <div className="card">
            <strong>Doublons</strong>
            <div className="meta">{summary.duplicates}</div>
          </div>
          <div className="card">
            <strong>Nettoyage</strong>
            <button type="button" onClick={handleCleanup}>
              Supprimer les doublons
            </button>
            {cleanupStatus ? <div className="meta">{cleanupStatus}</div> : null}
          </div>
        </div>
      )}
    </div>
  );
}
