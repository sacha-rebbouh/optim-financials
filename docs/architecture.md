# Optim Financials — Architecture (MVP → V2)

## Objectif

Créer une webapp responsive pour importer des relevés (CSV/XLSX/PDF), normaliser les transactions (hébreu inclus), catégoriser automatiquement avec un mode hybride (auto + review), et offrir un dashboard clair avec simulateur budgétaire.

## Stack recommandée

### Front-end

- **Next.js** (App Router) + **TypeScript**
- UI responsive (desktop + mobile)
- Pages principales :
  - Upload + validation post‑import
  - Dashboard (filtres + vues clés)
  - Règles & marchands
  - Budget simulator

### Back-end

- **API Routes Next.js** (ou service dédié si besoin)
- Pipeline d’import asynchrone (queue simple au départ)
- Service de normalisation + catégorisation

### Data & infra

- **Supabase Postgres** (RLS activé)
- **Supabase Storage** (fichiers bruts, suppression après parsing)
- **Vercel** pour le déploiement initial

## Pipeline d’import

1. **Upload** (CSV/XLSX/PDF) → Storage temporaire
2. **Détection source** (Isracard / Max / Visa / banques IL/FR/CH/EU)
3. **Parsing source‑spécifique** → schéma unifié
4. **Validation post‑import** (vue globale + erreurs)
5. **Normalisation marchands + catégorisation** (bulk + cache)
6. **Suppression automatique** du fichier brut

### Extraction PDF

- **Extraction locale d’abord** (gratuit)
- **Fallback OCR** si extraction insuffisante
  - déclenché uniquement par fichier à problème

## Normalisation & catégorisation (hybride)

### Logique hybride

- Si un marchand connu → règles auto
- Sinon → **LLM en bulk** sur la liste des marchands inconnus
- Enrichissement web **optionnel** seulement si confiance faible
- Tous les résultats sont **cachés** et réutilisés pour le futur

### Corrections utilisateur

Lorsqu’un utilisateur corrige un nom normalisé :

- Mise à jour rétroactive
- Règle future automatique (replace all)

## Schéma de données (high‑level)

### Tables clés

- `transactions`
  - `id`, `user_id`, `source_id`
  - `original_merchant_name`
  - `normalized_merchant_name`
  - `category_id`, `confidence_score`
  - `amount_original`, `currency_original`
  - `amount_base`, `currency_base`
  - `installment_total`, `installment_monthly`, `installment_remaining`
  - `is_business`, `master_flag`, `is_reimbursement`
- `merchants` (canonique)
- `merchant_aliases` (variantes + corrections)
- `categories` (personnalisables)
- `rules` (merchant → catégorie / tags)
- `fx_rates` (taux par date)
- `attachments` (références source)
- `reimbursements` (suivi des avances)

## Dashboard (MVP)

- Résumés mensuels
- Vue récurrents / abonnements
- Pro vs perso
- Remboursements en attente
- Installments (reste à payer)

## Budget simulator (V2)

- Revenus fixes + variables
- Dépenses récurrentes + manuelles
- Comparatif avant/après (savings mensuels/annuels)

## Ajustements clés (tech lead)

- **Parsing hébreu natif** pour les XLSX Isracard/Max/Visa (détection d’en-têtes, colonnes `סכום עסקה` / `סכום חיוב`, et notes `תשלום X מתוך Y` pour calculer le reste à payer).
- **Historique marchand** : stockage du nom original + nom normalisé éditable, avec effet rétroactif et futur.
- **Multi‑devise** : conserver la devise d’origine, convertir vers une devise de base via FX rates si nécessaire.
- **OCR** : optionnel et déclenché uniquement en cas d’extraction locale insuffisante.

## Sécurité & confidentialité

- RLS Supabase
- Chiffrement serveur + TLS
- Suppression automatique des fichiers bruts
- “Delete account / purge data” disponible

## Estimation coûts (directionnel)

### Extraction

- Local (PDF texte, XLSX, CSV) : **~0 €**
- OCR fallback : **payant uniquement si nécessaire**

### LLM

- **Bulk par marchands uniques**
- Cache pour réutilisation automatique

### Web lookup

- Optionnel, seulement pour marchands incertains

### FX rates

- API gratuite ou faible coût

## Phases

### MVP (Phase 1)

1. Import + parsing + validation
2. Normalisation + catégorisation hybride
3. Dashboard initial

### Phase 2

1. Pro/perso + remboursements
2. Budget simulator
3. Paywall insights détaillés
