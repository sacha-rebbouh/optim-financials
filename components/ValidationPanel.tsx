"use client";

type PreviewTransaction = {
  transactionDate: string;
  originalMerchantName: string;
  amountOriginal: number;
  currencyOriginal: string;
  amountCharged?: number;
  transactionType?: string;
  installmentRemaining?: number;
};

type ValidationPanelProps = {
  pendingReview: number;
  transactions: PreviewTransaction[];
};

export default function ValidationPanel({
  pendingReview,
  transactions,
}: ValidationPanelProps) {
  if (!transactions.length) {
    return (
      <div className="card">
        <h2>Validation post-import</h2>
        <p className="meta">
          Aucune transaction normalisee detectee pour la validation.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Validation post-import</h2>
      <p className="meta">
        {pendingReview} transactions a valider. Cet ecran est un apercu avant
        categorisation.
      </p>
      <div className="table">
        <div className="row header">
          <div>Date</div>
          <div>Marchand</div>
          <div>Montant</div>
          <div>Preleve</div>
          <div>Reste</div>
          <div>Type</div>
        </div>
        {transactions.map((tx) => (
          <div
            className="row"
            key={`${tx.transactionDate}-${tx.originalMerchantName}`}
          >
            <div>{tx.transactionDate}</div>
            <div>{tx.originalMerchantName}</div>
            <div>
              {tx.amountOriginal} {tx.currencyOriginal}
            </div>
            <div>{tx.amountCharged ?? "-"}</div>
            <div>{tx.installmentRemaining ?? "-"}</div>
            <div>{tx.transactionType ?? "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
