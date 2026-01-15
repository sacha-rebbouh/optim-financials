"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useAuth } from "./AuthContext";

type DashboardData = {
  currentMonth: string;
  periodMonths: number;
  totalMonth: number;
  totalAll: number;
  businessMonth: number;
  personalMonth: number;
  reimbursementsMonth: number;
  installmentsRemaining: number;
  transactionCount: number;
  categoryBreakdown: { category: string; total: number }[];
  recurringMerchants: {
    merchant: string;
    months: number;
    total: number;
    count: number;
    category?: string;
  }[];
  subscriptions: { merchant: string; total: number }[];
  paywallEnabled?: boolean;
  paywallUnlocked?: boolean;
  monthlySeries: { month: string; total: number }[];
};

type Source = {
  id: string;
  provider: string;
  account_label: string | null;
};

const CATEGORY_COLORS = [
  "#FF7A59",
  "#FFD166",
  "#06D6A0",
  "#118AB2",
  "#8338EC",
  "#3A86FF",
  "#FB5607",
  "#FF006E",
];

export default function DashboardWidget() {
  const { userId, accessToken } = useAuth();
  const [periodMonths, setPeriodMonths] = useState(1);
  const [scope, setScope] = useState<"all" | "business" | "personal">("all");
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setSources([]);
      return;
    }
    fetch(`/api/sources?userId=${encodeURIComponent(userId)}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((res) => res.json())
      .then((payload) => setSources(payload.sources ?? []))
      .catch(() => setSources([]));
  }, [userId, accessToken]);

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }
    const params = new URLSearchParams({
      userId,
      periodMonths: String(periodMonths),
      scope,
    });
    if (sourceId) {
      params.append("sourceId", sourceId);
    }
    fetch(`/api/dashboard?${params.toString()}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((msg) => {
            throw new Error(msg || "Erreur dashboard");
          });
        }
        return res.json();
      })
      .then((payload) => setData(payload))
      .catch((err) => setError(err.message));
  }, [userId, periodMonths, scope, sourceId, accessToken]);

  const chartContainerStyle = useMemo(
    () => ({ width: "100%", height: 220 }),
    []
  );

  const authHeaders = useMemo(
    (): Record<string, string> =>
      accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    [accessToken]
  );

  const handleExport = useCallback(
    async (
      mode: "filtered" | "full" | "accounting" | "subscriptions" | "ifrs"
    ) => {
      if (!userId) return;
      const params = new URLSearchParams({
        userId,
        periodMonths: String(periodMonths),
        scope,
        mode,
      });
      if (sourceId) {
        params.append("sourceId", sourceId);
      }
      const res = await fetch(`/api/dashboard/export?${params.toString()}`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        setError("Export impossible");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `export-${mode}-${periodMonths}m.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    [userId, periodMonths, scope, sourceId, authHeaders]
  );

  return (
    <div className="card">
      <h2>Dashboard MVP</h2>
      <div className="grid">
        <div>
          <label>Période</label>
          <select
            value={periodMonths}
            onChange={(event) => setPeriodMonths(Number(event.target.value))}
          >
            <option value={1}>1 mois</option>
            <option value={3}>3 mois</option>
            <option value={6}>6 mois</option>
            <option value={12}>12 mois</option>
          </select>
        </div>
        <div>
          <label>Scope</label>
          <select
            value={scope}
            onChange={(event) =>
              setScope(event.target.value as "all" | "business" | "personal")
            }
          >
            <option value="all">Tout</option>
            <option value="business">Pro</option>
            <option value="personal">Perso</option>
          </select>
        </div>
        <div>
          <label>Source</label>
          <select
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
          >
            <option value="">Toutes</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.provider} {source.account_label ?? ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Export</label>
          <div className="export-actions">
            <button type="button" onClick={() => handleExport("filtered")}>
              CSV filtré
            </button>
            <button type="button" onClick={() => handleExport("full")}>
              CSV full
            </button>
            <button type="button" onClick={() => handleExport("accounting")}>
              CSV compta
            </button>
            <button type="button" onClick={() => handleExport("subscriptions")}>
              CSV abonnements
            </button>
            <button type="button" onClick={() => handleExport("ifrs")}>
              CSV IFRS
            </button>
          </div>
        </div>
      </div>
      {error ? <div className="meta">Erreur: {error}</div> : null}
      {!userId ? (
        <p className="meta">Connectez-vous pour voir vos insights.</p>
      ) : !data ? (
        <p className="meta">Chargement...</p>
      ) : (
        <>
          {data.paywallEnabled && !data.paywallUnlocked ? (
            <div className="card">
              <strong>Insights verrouillés</strong>
              <p className="meta">
                Paywall actif. Déverrouillez pour voir les détails.
              </p>
            </div>
          ) : null}
          <div className="grid">
            <div className="card">
              <strong>Mois courant</strong>
              <div className="meta">{data.currentMonth}</div>
            </div>
            <div className="card">
              <strong>Dépenses période</strong>
              <div className="meta">
                {data.totalMonth.toFixed(2)} / {data.periodMonths} mois
              </div>
            </div>
            <div className="card">
              <strong>Total historique</strong>
              <div className="meta">{data.totalAll.toFixed(2)}</div>
            </div>
            <div className="card">
              <strong>Pro (mois)</strong>
              <div className="meta">{data.businessMonth.toFixed(2)}</div>
            </div>
            <div className="card">
              <strong>Perso (mois)</strong>
              <div className="meta">{data.personalMonth.toFixed(2)}</div>
            </div>
            <div className="card">
              <strong>Remboursements</strong>
              <div className="meta">{data.reimbursementsMonth.toFixed(2)}</div>
            </div>
            <div className="card">
              <strong>Reste à payer</strong>
              <div className="meta">{data.installmentsRemaining.toFixed(2)}</div>
            </div>
            <div className="card">
              <strong>Transactions</strong>
              <div className="meta">{data.transactionCount}</div>
            </div>
            <div className="card">
              <strong>Répartition catégories</strong>
              <div style={chartContainerStyle}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      dataKey="total"
                      nameKey="category"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {data.categoryBreakdown.map((entry, index) => (
                        <Cell
                          key={entry.category}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <strong>Tendance 12 mois</strong>
              <div style={chartContainerStyle}>
                <ResponsiveContainer>
                  <LineChart data={data.monthlySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2f38" />
                    <XAxis dataKey="month" stroke="#c6ccd6" />
                    <YAxis stroke="#c6ccd6" />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#5b7cfa" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="table">
            <div className="row header">
              <div>Catégorie</div>
              <div>Total (mois)</div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            {data.categoryBreakdown.map((entry) => (
              <div key={entry.category} className="row">
                <div>{entry.category}</div>
                <div>{entry.total.toFixed(2)}</div>
                <div></div>
                <div></div>
                <div></div>
              </div>
            ))}
          </div>
          <div className="table">
            <div className="row header">
              <div>Marchand récurrent</div>
              <div>Mois</div>
              <div>Total</div>
              <div>Occurrences</div>
              <div>Catégorie</div>
            </div>
            {data.recurringMerchants.map((entry) => (
              <div key={entry.merchant} className="row">
                <div>{entry.merchant}</div>
                <div>{entry.months}</div>
                <div>{entry.total.toFixed(2)}</div>
                <div>{entry.count}</div>
                <div>{entry.category ?? "-"}</div>
              </div>
            ))}
          </div>
          <div className="table">
            <div className="row header">
              <div>Abonnements</div>
              <div>Total (mois)</div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            {data.subscriptions.map((entry) => (
              <div key={entry.merchant} className="row">
                <div>{entry.merchant}</div>
                <div>{entry.total.toFixed(2)}</div>
                <div></div>
                <div></div>
                <div></div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
