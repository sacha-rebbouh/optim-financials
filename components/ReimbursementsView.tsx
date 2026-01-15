"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

type Reimbursement = {
  id: string;
  transaction_date: string;
  normalized_merchant_name: string | null;
  amount_base: number;
  currency_base: string;
};

export default function ReimbursementsView() {
  const { userId, accessToken } = useAuth();
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useMemo(
    (): Record<string, string> =>
      accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    [accessToken]
  );

  useEffect(() => {
    if (!userId) {
      setReimbursements([]);
      return;
    }
    fetch(`/api/reimbursements?userId=${encodeURIComponent(userId)}`, {
      headers: authHeaders,
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((msg) => {
            throw new Error(msg || "Erreur remboursements");
          });
        }
        return res.json();
      })
      .then((data) => setReimbursements(data.reimbursements ?? []))
      .catch((err) => setError(err.message));
  }, [userId, authHeaders]);

  const handleToggle = useCallback(
    async (txId: string, nextValue: boolean) => {
      if (!userId) return;
      await fetch("/api/reimbursements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          userId,
          transactionId: txId,
          isReimbursement: nextValue,
        }),
      });
      setReimbursements((prev) =>
        nextValue ? prev : prev.filter((item) => item.id !== txId)
      );
    },
    [userId, authHeaders]
  );

  return (
    <div className="card">
      <h2>Remboursements en attente</h2>
      {!userId ? (
        <div className="meta">Connectez-vous pour gérer les avances.</div>
      ) : null}
      {error ? <div className="meta">Erreur: {error}</div> : null}
      <div className="table">
        <div className="row header">
          <div>Date</div>
          <div>Marchand</div>
          <div>Montant</div>
          <div>Action</div>
          <div></div>
        </div>
        {reimbursements.map((item) => (
          <div key={item.id} className="row">
            <div>{item.transaction_date}</div>
            <div>{item.normalized_merchant_name ?? "-"}</div>
            <div>
              {item.amount_base} {item.currency_base}
            </div>
            <div>
              <button type="button" onClick={() => handleToggle(item.id, false)}>
                Marquer remboursé
              </button>
            </div>
            <div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
