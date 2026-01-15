"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import UploadForm from "./UploadForm";
import DashboardWidget from "./DashboardWidget";
import OnboardingTour from "./OnboardingTour";

const ConsolidationView = dynamic(() => import("./ConsolidationView"), {
  loading: () => <p className="meta">Chargement...</p>,
});
const ReimbursementsView = dynamic(() => import("./ReimbursementsView"), {
  loading: () => <p className="meta">Chargement...</p>,
});
const UsageWidget = dynamic(() => import("./UsageWidget"), {
  loading: () => <p className="meta">Chargement...</p>,
});

export default function HomeDashboard() {
  const [completed, setCompleted] = useState(false);
  const [consolidationOpen, setConsolidationOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);

  return (
    <>
      <OnboardingTour />
      <section className="hero">
        <div>
          <h1>Optim Financials</h1>
          <p className="lead">
            Importez, normalisez et pilotez vos dépenses en quelques étapes.
          </p>
        </div>
      </section>

      <section className="section">
        <h2>Par où commencer</h2>
        <div className="wizard">
          <div className="wizard-step active">
            <strong>1. Importer vos relevés</strong>
            <p className="meta">
              Ajoutez un ou plusieurs fichiers. Nous détectons la source et
              normalisons.
            </p>
            <UploadForm onCompleted={() => setCompleted(true)} />
          </div>
          <div className={`wizard-step ${completed ? "active" : ""}`}>
            <strong>2. Valider & corriger</strong>
            <p className="meta">
              Vérifiez les transactions puis appliquez vos règles.
            </p>
            <a className="cta" href="/review">
              Ouvrir la validation
            </a>
            {completed ? (
              <p className="meta">
                Import terminé. Vous pouvez valider les transactions.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Insights</h2>
        <DashboardWidget />
      </section>

      <section className="section">
        <details
          className="card"
          onToggle={(e) =>
            setConsolidationOpen((e.target as HTMLDetailsElement).open)
          }
        >
          <summary>Suivi & consolidation</summary>
          {consolidationOpen ? (
            <div className="grid two">
              <ConsolidationView />
              <ReimbursementsView />
            </div>
          ) : null}
        </details>
      </section>

      <section className="section">
        <details
          className="card"
          onToggle={(e) => setUsageOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary>Usage & monitoring</summary>
          {usageOpen ? <UsageWidget /> : null}
        </details>
      </section>
    </>
  );
}
