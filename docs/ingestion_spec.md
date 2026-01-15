# Ingestion Spec (MVP)

## Objectif

Normaliser les relevés (CSV/XLSX/PDF) de plusieurs fournisseurs vers un format transactionnel unique, puis lancer la catégorisation hybride.

## Étapes

1. **Upload** → stockage temporaire.
2. **Source detection** (Isracard, Max, Visa, banques IL/FR/CH/EU).
3. **Parsing source‑spécifique**.
4. **Mapping** vers le schéma unifié.
5. **Validation post‑import** (écran global).
6. **Enrichissement / catégorisation** (bulk + cache).
7. **Suppression fichier brut**.

## PDF (texte extractible)

- Extraction locale via `pdf-parse`
- Si texte insuffisant → marquer le fichier comme **OCR requis**
- Parsing best-effort via lignes + détection de dates et montants

## Champs unifiés (transactions)

### Champs requis

- `transaction_date` (date)
- `original_merchant_name` (texte brut)
- `amount_original` (montant dans la devise d’origine)
- `currency_original` (ILS, EUR, USD, CHF, etc.)

### Champs facultatifs

- `normalized_merchant_name` (issu du cache/règle/LLM)
- `category_id` (catégorie)
- `installment_total` (montant total si paiement échelonné)
- `installment_monthly` (montant prélevé ce mois‑ci)
- `installment_remaining` (reste à payer)
- `is_business` (pro vs perso)
- `master_flag` (dépense obligatoire récurrente)
- `is_reimbursement` (avance à rembourser)
- `notes` (commentaires)

## Détection des paiements échelonnés

Quand un relevé fournit :

- un **montant total**,
- un **montant prélevé ce mois‑ci**,
  le parser doit calculer `installment_remaining` si possible.

### Règle Isracard/Max (hébreu)

- `סכום עסקה` → `installment_total` + `amount_original`
- `סכום חיוב` → `installment_monthly` + `amount_charged`
- `הערות` peut contenir `תשלום X מתוך Y` → calcul du reste

## Validation post‑import

L’écran de validation doit :

- afficher les totaux par fichier
- signaler les anomalies (montant vide, date invalide)
- proposer l’application des règles existantes

## Cache marchand

Un marchand n’est enrichi qu’une seule fois :

- mapping `original_name` → `normalized_name`
- catégorie + flags
- réutilisé pour les importations futures

## Bulk LLM (catégorisation)

- extraire les marchands uniques
- appliquer règles locales si disponibles
- appeler le LLM en bulk uniquement pour les marchands inconnus
- écrire le résultat dans le cache marchand

## Lookup web (optionnel)

- activé si `MERCHANT_LOOKUP_API_URL` + `MERCHANT_LOOKUP_API_KEY`
- utilisé pour les marchands à faible confiance

## OCR

- `ocr_provider` configurable (OCR.space ou local only)
- OCR déclenché uniquement si extraction locale échoue
- Option Google Vision via `GOOGLE_VISION_API_KEY`

### Provider

- Par défaut: Gemini (si `GEMINI_API_KEY` est configuré)
- Sinon fallback local sans appel réseau

### Anthropic (Sonnet 4.5)

- Configurer `ANTHROPIC_API_KEY`
- Optionnel: `LLM_PROVIDER=anthropic`

### OpenAI

- Configurer `OPENAI_API_KEY`
- Optionnel: `LLM_PROVIDER=openai`

### FX rates

- Conversion vers `base_currency` (paramètre utilisateur)
- Stockage en `fx_rates` avec fallback si API indisponible
