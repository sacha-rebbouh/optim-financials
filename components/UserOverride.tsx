"use client";

type UserOverrideProps = {
  userId: string;
  onChange: (value: string) => void;
  label?: string;
};

export default function UserOverride({
  userId,
  onChange,
  label = "Identifiant utilisateur",
}: UserOverrideProps) {
  return (
    <details className="advanced">
      <summary>Options avancees</summary>
      <label>{label}</label>
      <input
        type="text"
        placeholder="UUID Supabase"
        value={userId}
        onChange={(event) => onChange(event.target.value)}
      />
    </details>
  );
}
