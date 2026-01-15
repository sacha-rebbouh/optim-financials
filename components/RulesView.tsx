"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

type Rule = {
  id: string;
  rule_type: string;
  match_value: string;
  category_id?: string | null;
  is_business?: boolean | null;
  master_flag?: boolean | null;
  is_reimbursement?: boolean | null;
};

const RULE_TYPES = [
  { value: "merchant_exact", label: "Marchand exact" },
  { value: "merchant_contains", label: "Marchand contient" },
  { value: "normalized_exact", label: "Nom normalisé exact" },
  { value: "category_hint", label: "Indice de catégorie" },
  { value: "note_contains", label: "Note contient" },
];

export default function RulesView() {
  const { userId, accessToken } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchValue, setMatchValue] = useState("");
  const [ruleType, setRuleType] = useState(RULE_TYPES[0].value);
  const [categoryId, setCategoryId] = useState("");
  const [isBusiness, setIsBusiness] = useState(false);
  const [masterFlag, setMasterFlag] = useState(false);
  const [isReimbursement, setIsReimbursement] = useState(false);
  const [originalName, setOriginalName] = useState("");
  const [normalizedName, setNormalizedName] = useState("");

  const authHeaders = useMemo(
    (): Record<string, string> =>
      accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    [accessToken]
  );

  useEffect(() => {
    if (!userId) {
      setRules([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/rules?userId=${encodeURIComponent(userId)}`, {
      headers: authHeaders,
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((msg) => {
            throw new Error(msg || "Erreur chargement règles");
          });
        }
        return res.json();
      })
      .then((data) => setRules(data.rules ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId, authHeaders]);

  const handleCreateRule = useCallback(async () => {
    if (!userId || !matchValue.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          userId,
          rule: {
            ruleType,
            matchValue,
            categoryId: categoryId.trim() || undefined,
            isBusiness,
            masterFlag,
            isReimbursement,
          },
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Erreur création règle");
      }
      const data = await res.json();
      setRules((prev) => [data.rule, ...prev]);
      setMatchValue("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    userId,
    matchValue,
    ruleType,
    categoryId,
    isBusiness,
    masterFlag,
    isReimbursement,
    authHeaders,
  ]);

  const handleDeleteRule = useCallback(
    async (ruleId: string) => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/rules?userId=${encodeURIComponent(
            userId
          )}&ruleId=${encodeURIComponent(ruleId)}`,
          {
            method: "DELETE",
            headers: authHeaders,
          }
        );
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || "Erreur suppression règle");
        }
        setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [userId, authHeaders]
  );

  const handleNormalize = useCallback(async () => {
    if (!userId || !originalName.trim() || !normalizedName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/merchants/normalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          userId,
          originalName,
          normalizedName,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Erreur normalisation");
      }
      setOriginalName("");
      setNormalizedName("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId, originalName, normalizedName, authHeaders]);

  return (
    <div className="card">
      {!userId ? (
        <div className="meta">Connectez-vous pour gérer les règles.</div>
      ) : null}

      <h2>Créer une règle</h2>
      <div className="grid">
        <div>
          <label>Type</label>
          <select
            value={ruleType}
            onChange={(event) => setRuleType(event.target.value)}
          >
            {RULE_TYPES.map((rule) => (
              <option key={rule.value} value={rule.value}>
                {rule.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Match value</label>
          <input
            type="text"
            value={matchValue}
            onChange={(event) => setMatchValue(event.target.value)}
          />
        </div>
        <div>
          <label>Category ID (optionnel)</label>
          <input
            type="text"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          />
        </div>
        <div className="toggle">
          <label>
            <input
              type="checkbox"
              checked={isBusiness}
              onChange={(event) => setIsBusiness(event.target.checked)}
            />
            Dépense pro
          </label>
          <label>
            <input
              type="checkbox"
              checked={masterFlag}
              onChange={(event) => setMasterFlag(event.target.checked)}
            />
            Dépense obligatoire
          </label>
          <label>
            <input
              type="checkbox"
              checked={isReimbursement}
              onChange={(event) => setIsReimbursement(event.target.checked)}
            />
            Avance/remboursement
          </label>
        </div>
      </div>
      <button type="button" onClick={handleCreateRule} disabled={loading}>
        Créer la règle
      </button>

      <h2>Normaliser un marchand</h2>
      <div className="grid">
        <div>
          <label>Nom original</label>
          <input
            type="text"
            value={originalName}
            onChange={(event) => setOriginalName(event.target.value)}
          />
        </div>
        <div>
          <label>Nom normalisé</label>
          <input
            type="text"
            value={normalizedName}
            onChange={(event) => setNormalizedName(event.target.value)}
          />
        </div>
      </div>
      <button type="button" onClick={handleNormalize} disabled={loading}>
        Appliquer replace-all
      </button>

      {error ? <div className="card">Erreur: {error}</div> : null}
      {loading ? <p className="meta">Chargement...</p> : null}

      <h2>Règles existantes</h2>
      <div className="table">
        <div className="row header">
          <div>Type</div>
          <div>Match</div>
          <div>Catégorie</div>
          <div>Flags</div>
          <div>Action</div>
        </div>
        {rules.map((rule) => (
          <div key={rule.id} className="row">
            <div>{rule.rule_type}</div>
            <div>{rule.match_value}</div>
            <div>{rule.category_id ?? "-"}</div>
            <div>
              {rule.is_business ? "Pro " : ""}
              {rule.master_flag ? "Obligatoire " : ""}
              {rule.is_reimbursement ? "Avance" : ""}
            </div>
            <div>
              <button
                type="button"
                onClick={() => handleDeleteRule(rule.id)}
                disabled={loading}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
