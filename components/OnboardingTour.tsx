"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    title: "Importer vos relevés",
    body: "Ajoutez vos fichiers CSV/XLSX/PDF pour générer la base de transactions.",
  },
  {
    title: "Valider & corriger",
    body: "Passez par l'écran Validation pour corriger les catégories et flags.",
  },
  {
    title: "Optimiser",
    body: "Analysez les récurrents, remboursements et ajustez vos règles.",
  },
];

export default function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = window.localStorage.getItem("tourSeen");
    if (!seen) {
      setVisible(true);
    }
  }, []);

  const close = () => {
    window.localStorage.setItem("tourSeen", "true");
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className="tour-backdrop">
      <div className="tour-card">
        <div className="pill success">Guide rapide</div>
        <h3>{current.title}</h3>
        <p className="meta">{current.body}</p>
        <div className="export-actions">
          <button type="button" onClick={close}>
            Passer
          </button>
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)}>
              Précédent
            </button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)}>
              Suivant
            </button>
          ) : (
            <button type="button" onClick={close}>
              Terminer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
