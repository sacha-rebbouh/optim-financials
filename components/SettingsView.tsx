"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

type Settings = {
  llm_provider?: string;
  monthly_budget_usd?: number | null;
  hard_limit_enabled?: boolean;
  anthropic_api_key_present?: boolean;
  gemini_api_key_present?: boolean;
  openai_api_key_present?: boolean;
  base_currency?: string | null;
  ocr_provider?: string | null;
  paywall_enabled?: boolean;
  paywall_unlocked?: boolean;
  merchant_lookup_enabled?: boolean;
};

export default function SettingsView() {
  const [settings, setSettings] = useState<Settings>({});
  const [status, setStatus] = useState<string | null>(null);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);

  const { userId, accessToken } = useAuth();

  const authHeaders = useMemo(
    (): Record<string, string> =>
      accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    [accessToken]
  );

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/settings?userId=${encodeURIComponent(userId)}`, {
      headers: authHeaders,
    })
      .then((res) => res.json())
      .then((data) => setSettings(data.settings ?? {}))
      .catch(() => setSettings({}));
  }, [userId, authHeaders]);

  const handleSave = useCallback(async () => {
    if (!userId) return;
    setStatus("Sauvegarde...");
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        userId,
        settings: {
          llmProvider: settings.llm_provider ?? "anthropic",
          monthlyBudgetUsd: settings.monthly_budget_usd ?? null,
          hardLimitEnabled: settings.hard_limit_enabled ?? false,
          baseCurrency: settings.base_currency ?? "ILS",
          ocrProvider: settings.ocr_provider ?? "ocrspace",
          paywallEnabled: settings.paywall_enabled ?? false,
          paywallUnlocked: settings.paywall_unlocked ?? false,
          merchantLookupEnabled: settings.merchant_lookup_enabled ?? false,
          anthropicApiKey: anthropicKey.trim() || null,
          geminiApiKey: geminiKey.trim() || null,
          openaiApiKey: openaiKey.trim() || null,
        },
      }),
    });
    if (!res.ok) {
      setStatus("Erreur de sauvegarde");
      return;
    }
    setAnthropicKey("");
    setGeminiKey("");
    setOpenaiKey("");
    setStatus("Enregistré");
  }, [userId, settings, anthropicKey, geminiKey, openaiKey, authHeaders]);

  const handlePurge = useCallback(async () => {
    if (!userId) return;
    setPurgeStatus("Suppression...");
    const res = await fetch("/api/account/purge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ userId }),
    });
    setPurgeStatus(res.ok ? "Purge effectuée" : "Erreur purge");
  }, [userId, authHeaders]);

  return (
    <div className="card">
      {!userId ? (
        <div className="meta">Connectez-vous pour accéder aux paramètres.</div>
      ) : null}
      <label>Budget mensuel max (USD)</label>
      <input
        type="text"
        value={settings.monthly_budget_usd ?? ""}
        onChange={(event) =>
          setSettings((prev) => ({
            ...prev,
            monthly_budget_usd: Number(event.target.value || 0),
          }))
        }
      />
      <label>
        <input
          type="checkbox"
          checked={settings.hard_limit_enabled ?? false}
          onChange={(event) =>
            setSettings((prev) => ({
              ...prev,
              hard_limit_enabled: event.target.checked,
            }))
          }
        />
        Bloquer l&apos;usage si le budget est dépassé
      </label>
      <label>Devise de base</label>
      <select
        value={settings.base_currency ?? "ILS"}
        onChange={(event) =>
          setSettings((prev) => ({
            ...prev,
            base_currency: event.target.value,
          }))
        }
      >
        <option value="ILS">ILS</option>
        <option value="EUR">EUR</option>
        <option value="USD">USD</option>
        <option value="CHF">CHF</option>
      </select>
      <label>OCR Provider</label>
      <select
        value={settings.ocr_provider ?? "ocrspace"}
        onChange={(event) =>
          setSettings((prev) => ({
            ...prev,
            ocr_provider: event.target.value,
          }))
        }
      >
        <option value="ocrspace">OCR.space</option>
        <option value="google">Google Vision</option>
        <option value="local">Local only</option>
      </select>
      <label>
        <input
          type="checkbox"
          checked={settings.merchant_lookup_enabled ?? false}
          onChange={(event) =>
            setSettings((prev) => ({
              ...prev,
              merchant_lookup_enabled: event.target.checked,
            }))
          }
        />
        Activer l&apos;enrichissement web des marchands
      </label>
      <label>Provider LLM</label>
      <select
        value={settings.llm_provider ?? "anthropic"}
        onChange={(event) =>
          setSettings((prev) => ({
            ...prev,
            llm_provider: event.target.value,
          }))
        }
      >
        <option value="anthropic">Anthropic (Sonnet 4.5)</option>
        <option value="gemini">Gemini 2.5 Pro</option>
        <option value="openai">OpenAI (GPT)</option>
        <option value="local">Local (fallback)</option>
      </select>
      <label>Anthropic API Key</label>
      <input
        type="password"
        value={anthropicKey}
        placeholder={
          settings.anthropic_api_key_present ? "Clé enregistrée" : ""
        }
        onChange={(event) => setAnthropicKey(event.target.value)}
      />
      <label>Gemini API Key</label>
      <input
        type="password"
        value={geminiKey}
        placeholder={settings.gemini_api_key_present ? "Clé enregistrée" : ""}
        onChange={(event) => setGeminiKey(event.target.value)}
      />
      <label>OpenAI API Key</label>
      <input
        type="password"
        value={openaiKey}
        placeholder={settings.openai_api_key_present ? "Clé enregistrée" : ""}
        onChange={(event) => setOpenaiKey(event.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={settings.paywall_enabled ?? false}
          onChange={(event) =>
            setSettings((prev) => ({
              ...prev,
              paywall_enabled: event.target.checked,
            }))
          }
        />
        Activer le paywall insights
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.paywall_unlocked ?? false}
          onChange={(event) =>
            setSettings((prev) => ({
              ...prev,
              paywall_unlocked: event.target.checked,
            }))
          }
        />
        Déverrouiller les insights
      </label>
      <button type="button" onClick={handleSave}>
        Sauvegarder
      </button>
      {status ? <p className="meta">{status}</p> : null}
      <div className="card">
        <h3>Purge compte</h3>
        <p className="meta">
          Supprime toutes les transactions, règles, catégories et settings.
        </p>
        <button type="button" onClick={handlePurge}>
          Supprimer toutes mes données
        </button>
        {purgeStatus ? <p className="meta">{purgeStatus}</p> : null}
      </div>
    </div>
  );
}
