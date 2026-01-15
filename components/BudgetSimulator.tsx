"use client";

import { useCallback, useMemo, useState } from "react";

type Frequency = "monthly" | "weekly";

type LineItem = {
  id: string;
  label: string;
  amount: number;
  frequency: Frequency;
};

export default function BudgetSimulator() {
  const [income, setIncome] = useState<LineItem[]>([]);
  const [expenses, setExpenses] = useState<LineItem[]>([]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [mode, setMode] = useState<"income" | "expense">("expense");

  const totals = useMemo(() => {
    const incomeMonthly = income.reduce(
      (sum, item) => sum + normalizeMonthly(item.amount, item.frequency),
      0
    );
    const expenseMonthly = expenses.reduce(
      (sum, item) => sum + normalizeMonthly(item.amount, item.frequency),
      0
    );
    return {
      incomeMonthly,
      expenseMonthly,
      netMonthly: incomeMonthly - expenseMonthly,
      netAnnual: (incomeMonthly - expenseMonthly) * 12,
    };
  }, [income, expenses]);

  const handleAdd = useCallback(() => {
    const value = Number(amount);
    if (!label.trim() || Number.isNaN(value)) return;
    const item = {
      id: `${Date.now()}-${Math.random()}`,
      label: label.trim(),
      amount: value,
      frequency,
    };
    if (mode === "income") {
      setIncome((prev) => [item, ...prev]);
    } else {
      setExpenses((prev) => [item, ...prev]);
    }
    setLabel("");
    setAmount("");
  }, [amount, label, frequency, mode]);

  const handleRemove = useCallback(
    (id: string, target: "income" | "expense") => {
      if (target === "income") {
        setIncome((prev) => prev.filter((item) => item.id !== id));
        return;
      }
      setExpenses((prev) => prev.filter((item) => item.id !== id));
    },
    []
  );

  return (
    <div className="card">
      <div className="grid">
        <div>
          <label>Type</label>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as "income" | "expense")}
          >
            <option value="income">Revenu</option>
            <option value="expense">Dépense</option>
          </select>
        </div>
        <div>
          <label>Label</label>
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>
        <div>
          <label>Montant</label>
          <input
            type="text"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div>
          <label>Fréquence</label>
          <select
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as Frequency)}
          >
            <option value="monthly">Mensuel</option>
            <option value="weekly">Hebdo</option>
          </select>
        </div>
        <div>
          <button type="button" onClick={handleAdd}>
            Ajouter
          </button>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <strong>Revenus mensuels</strong>
          <div className="meta">{totals.incomeMonthly.toFixed(2)}</div>
        </div>
        <div className="card">
          <strong>Dépenses mensuelles</strong>
          <div className="meta">{totals.expenseMonthly.toFixed(2)}</div>
        </div>
        <div className="card">
          <strong>Solde mensuel</strong>
          <div className="meta">{totals.netMonthly.toFixed(2)}</div>
        </div>
        <div className="card">
          <strong>Solde annuel</strong>
          <div className="meta">{totals.netAnnual.toFixed(2)}</div>
        </div>
      </div>

      <div className="table">
        <div className="row header">
          <div>Type</div>
          <div>Label</div>
          <div>Montant</div>
          <div>Fréquence</div>
          <div>Action</div>
        </div>
        {income.map((item) => (
          <div key={item.id} className="row">
            <div>Revenu</div>
            <div>{item.label}</div>
            <div>{item.amount}</div>
            <div>{item.frequency}</div>
            <div>
              <button type="button" onClick={() => handleRemove(item.id, "income")}>
                Supprimer
              </button>
            </div>
          </div>
        ))}
        {expenses.map((item) => (
          <div key={item.id} className="row">
            <div>Dépense</div>
            <div>{item.label}</div>
            <div>{item.amount}</div>
            <div>{item.frequency}</div>
            <div>
              <button type="button" onClick={() => handleRemove(item.id, "expense")}>
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function normalizeMonthly(amount: number, frequency: Frequency) {
  if (frequency === "weekly") return amount * 4.345;
  return amount;
}
