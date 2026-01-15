"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

type UsageEntry = {
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
};

export default function UsageWidget() {
  const { userId, accessToken } = useAuth();
  const [usage, setUsage] = useState<UsageEntry[]>([]);
  const [periodMonth, setPeriodMonth] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUsage([]);
      return;
    }
    fetch(`/api/usage?userId=${encodeURIComponent(userId)}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((msg) => {
            throw new Error(msg || "Erreur usage");
          });
        }
        return res.json();
      })
      .then((data) => {
        setUsage(data.usage ?? []);
        setPeriodMonth(data.periodMonth ?? "");
      })
      .catch((err) => setError(err.message));
  }, [userId, accessToken]);

  return (
    <div className="card">
      <h2>Usage API</h2>
      {!userId ? <div className="meta">Connectez-vous pour voir l&apos;usage.</div> : null}
      {error ? <div className="meta">Erreur: {error}</div> : null}
      <div className="meta">Période: {periodMonth || "-"}</div>
      <div className="table">
        <div className="row header">
          <div>Provider</div>
          <div>Input</div>
          <div>Output</div>
          <div>Coût USD</div>
          <div></div>
        </div>
        {usage.map((entry) => (
          <div key={entry.provider} className="row">
            <div>{entry.provider}</div>
            <div>{entry.input_tokens}</div>
            <div>{entry.output_tokens}</div>
            <div>{Number(entry.cost_usd).toFixed(4)}</div>
            <div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
