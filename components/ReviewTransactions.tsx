"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

type TransactionRow = {
  id: string;
  transaction_date: string;
  original_merchant_name: string;
  normalized_merchant_name: string | null;
  amount_base: number;
  currency_base: string;
  is_business: boolean;
  master_flag: boolean;
  is_reimbursement: boolean;
  category_id: string | null;
  notes: string | null;
};

type Category = {
  id: string;
  name: string;
};

export default function ReviewTransactions() {
  const { userId, accessToken } = useAuth();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [unclassified, setUnclassified] = useState(false);
  const [reimbursements, setReimbursements] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkBusiness, setBulkBusiness] = useState(false);
  const [bulkMaster, setBulkMaster] = useState(false);
  const [bulkReimbursement, setBulkReimbursement] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  const authHeaders = useMemo(
    (): Record<string, string> =>
      accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    [accessToken]
  );

  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams({
      userId,
      page: String(page),
      limit: "50",
    });
    if (search.trim()) params.append("search", search.trim());
    if (unclassified) params.append("unclassified", "true");
    if (reimbursements) params.append("reimbursements", "true");

    const fetchTransactions = fetch(`/api/transactions?${params.toString()}`, {
      headers: authHeaders,
    }).then((res) => res.json());

    const fetchCategories = fetch(
      `/api/categories?userId=${encodeURIComponent(userId)}`,
      { headers: authHeaders }
    ).then((res) => res.json());

    Promise.all([fetchTransactions, fetchCategories])
      .then(([txData, catData]) => {
        setTransactions(txData.transactions ?? []);
        setCategories(catData.categories ?? []);
      })
      .catch(() => setError("Erreur chargement données"));
  }, [userId, page, search, unclassified, reimbursements, authHeaders]);

  const handleUpdate = useCallback(
    async (row: TransactionRow, updates: Partial<TransactionRow>) => {
      if (!userId) return;
      const payload = { ...row, ...updates };
      await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          userId,
          transactionId: row.id,
          updates: payload,
        }),
      });
      setTransactions((prev) =>
        prev.map((item) => (item.id === row.id ? payload : item))
      );
    },
    [userId, authHeaders]
  );

  const handleBulkUpdate = useCallback(async () => {
    if (!userId?.trim() || selectedIds.length === 0) return;
    await fetch("/api/transactions/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        userId,
        ids: selectedIds,
        updates: {
          category_id: bulkCategory || null,
          is_business: bulkBusiness,
          master_flag: bulkMaster,
          is_reimbursement: bulkReimbursement,
        },
      }),
    });
    setTransactions((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id)
          ? {
              ...item,
              category_id: bulkCategory || null,
              is_business: bulkBusiness,
              master_flag: bulkMaster,
              is_reimbursement: bulkReimbursement,
            }
          : item
      )
    );
    setSelectedIds([]);
  }, [
    userId,
    selectedIds,
    bulkCategory,
    bulkBusiness,
    bulkMaster,
    bulkReimbursement,
    authHeaders,
  ]);

  return (
    <div className="card">
      <div className="review-toolbar">
        <div className="badge-row">
          <span className="pill">Sélection: {selectedIds.length}</span>
          <span className="pill">
            Filtre: {unclassified ? "Non classées" : reimbursements ? "Avances" : "Tous"}
          </span>
        </div>
        <label className="compact-toggle">
          <input
            type="checkbox"
            checked={compactMode}
            onChange={(event) => setCompactMode(event.target.checked)}
          />
          Mode compact
        </label>
      </div>
      <div className="grid">
        <div>
          <label>Recherche marchand</label>
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={unclassified}
              onChange={(event) => {
                setUnclassified(event.target.checked);
                setPage(1);
              }}
            />
            Non classées
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={reimbursements}
              onChange={(event) => {
                setReimbursements(event.target.checked);
                setPage(1);
              }}
            />
            Avances
          </label>
        </div>
        <div>
          <label>Pagination</label>
          <div className="export-actions">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Précédent
            </button>
            <button type="button" onClick={() => setPage((p) => p + 1)}>
              Suivant
            </button>
          </div>
        </div>
        <div>
          <label>Actions en masse</label>
          <select
            value={bulkCategory}
            onChange={(event) => setBulkCategory(event.target.value)}
          >
            <option value="">Catégorie</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <label>
            <input
              type="checkbox"
              checked={bulkBusiness}
              onChange={(event) => setBulkBusiness(event.target.checked)}
            />
            Pro
          </label>
          <label>
            <input
              type="checkbox"
              checked={bulkMaster}
              onChange={(event) => setBulkMaster(event.target.checked)}
            />
            Obligatoire
          </label>
          <label>
            <input
              type="checkbox"
              checked={bulkReimbursement}
              onChange={(event) => setBulkReimbursement(event.target.checked)}
            />
            Avance
          </label>
          <button type="button" onClick={handleBulkUpdate}>
            Appliquer
          </button>
        </div>
      </div>
      {!userId ? (
        <div className="meta">Connectez-vous pour valider les transactions.</div>
      ) : null}
      {error ? <div className="meta">Erreur: {error}</div> : null}
      <div className={`table ${compactMode ? "compact" : ""}`}>
        <div className="row header">
          <div>Sélection</div>
          <div>Date</div>
          <div>Marchand</div>
          <div>Normalisé</div>
          <div>Catégorie</div>
          <div>Flags</div>
          <div>Action</div>
        </div>
        {transactions.map((row) => (
          <div key={row.id} className="row">
            <div>
              <input
                type="checkbox"
                checked={selectedIds.includes(row.id)}
                onChange={(event) =>
                  setSelectedIds((prev) =>
                    event.target.checked
                      ? [...prev, row.id]
                      : prev.filter((id) => id !== row.id)
                  )
                }
              />
            </div>
            <div>{row.transaction_date}</div>
            <div>{row.original_merchant_name}</div>
            <div className="review-cell">
              <input
                type="text"
                value={row.normalized_merchant_name ?? ""}
                onChange={(event) =>
                  setTransactions((prev) =>
                    prev.map((item) =>
                      item.id === row.id
                        ? { ...item, normalized_merchant_name: event.target.value }
                        : item
                    )
                  )
                }
              />
            </div>
            <div>
              <select
                value={row.category_id ?? ""}
                onChange={(event) =>
                  handleUpdate(row, { category_id: event.target.value || null })
                }
              >
                <option value="">Non classé</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="badge-row">
              <button
                type="button"
                className={`pill ${row.is_business ? "success" : ""}`}
                onClick={() => handleUpdate(row, { is_business: !row.is_business })}
              >
                {row.is_business ? "Pro" : "Perso"}
              </button>
              <button
                type="button"
                className={`pill ${row.master_flag ? "warning" : ""}`}
                onClick={() => handleUpdate(row, { master_flag: !row.master_flag })}
              >
                {row.master_flag ? "Obligatoire" : "Variable"}
              </button>
              <button
                type="button"
                className={`pill ${row.is_reimbursement ? "warning" : ""}`}
                onClick={() =>
                  handleUpdate(row, { is_reimbursement: !row.is_reimbursement })
                }
              >
                {row.is_reimbursement ? "Avance" : "Standard"}
              </button>
            </div>
            <div>
              <button type="button" onClick={() => handleUpdate(row, {})}>
                Sauver
              </button>
              <input
                type="text"
                placeholder="Notes"
                value={row.notes ?? ""}
                onChange={(event) =>
                  setTransactions((prev) =>
                    prev.map((item) =>
                      item.id === row.id
                        ? { ...item, notes: event.target.value }
                        : item
                    )
                  )
                }
                onBlur={(event) =>
                  handleUpdate(row, { notes: event.target.value })
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
