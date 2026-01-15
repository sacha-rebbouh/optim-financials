# Changes Log

## 2026-01-15 - React Performance Refactoring

### Fichiers modifies

**next.config.js**
- Ajout `optimizePackageImports: ['recharts']` pour optimiser les imports de recharts

**components/DashboardWidget.tsx**
- Dynamic imports pour tous les composants recharts (PieChart, LineChart, etc.) - reduction bundle ~350kb
- Ajout `useCallback` sur `handleExport`
- Ajout `useMemo` pour `chartContainerStyle` et `authHeaders`

**components/ReviewTransactions.tsx**
- CRITICAL: Fix waterfall - `Promise.all()` pour fetches transactions + categories en parallele
- Ajout `useCallback` sur `handleUpdate` et `handleBulkUpdate`
- Ajout `useMemo` pour `authHeaders`

**components/RulesView.tsx**
- Ajout `useCallback` sur `handleCreateRule`, `handleDeleteRule`, `handleNormalize`
- Ajout `useMemo` pour `authHeaders`

**components/HomeDashboard.tsx**
- Dynamic imports pour ConsolidationView, ReimbursementsView, UsageWidget
- Conditional rendering: composants rendus seulement quand `<details>` est ouvert
- Reduction du temps de chargement initial

**components/BudgetSimulator.tsx**
- Ajout `useCallback` sur `handleAdd` et `handleRemove`

**components/ReimbursementsView.tsx**
- Ajout `useCallback` sur `handleToggle`
- Ajout `useMemo` pour `authHeaders`

**components/ConsolidationView.tsx**
- Ajout `useCallback` sur `handleCleanup` (extrait du onClick inline)
- Ajout `useMemo` pour `authHeaders`

**components/SettingsView.tsx**
- Ajout `useCallback` sur `handleSave` et `handlePurge`
- Ajout `useMemo` pour `authHeaders`

### Regles appliquees (React Best Practices)

1. **CRITICAL - Bundle Size**: Dynamic imports pour recharts + optimizePackageImports
2. **CRITICAL - Waterfalls**: Promise.all() pour requetes independantes
3. **HIGH - Re-renders**: useCallback sur tous les handlers passes en props
4. **MEDIUM - Re-renders**: useMemo pour objets/headers recreees a chaque render
5. **MEDIUM - Conditional rendering**: Lazy loading des composants dans `<details>`

## 2026-01-15 - TypeScript Fixes (Build passing)

### Fichiers modifies

**app/api/upload/route.ts**
- Fix type narrowing pour FormDataEntryValue -> File avec type predicate

**components/*.tsx (tous)**
- Fix type authHeaders: `(): Record<string, string> =>` pour compatibilite HeadersInit

**components/ReviewTransactions.tsx**
- Fix userId possibly null avec optional chaining

**components/UploadForm.tsx**
- Fix userId possibly null avec guard clause

**lib/types/pdf-parse.d.ts** (nouveau)
- Declaration de type pour module pdf-parse

**lib/ingestion/pdfParser.ts**
- Fix FormData body type avec cast `as unknown as BodyInit`

**lib/settings/repository.ts**
- Ajout propriete `merchant_lookup_enabled` au type UserSettings

**lib/ingestion/isracardXlsx.ts & parsers.ts**
- Fix import xlsx: `import * as XLSX from "xlsx"` (namespace import)

### Resultat
- 0 erreurs TypeScript
- Build: SUCCESS
- Lint: SUCCESS

---

### Prochaines etapes potentielles

- Ajouter React.memo sur les composants de liste (TransactionRow, RuleRow)
- Extraire les row components en composants separes pour meilleure memoization
- Considerer SWR/React Query pour la gestion du cache et deduplication des requetes
