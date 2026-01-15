import RulesView from "../../components/RulesView";
import CategoriesView from "../../components/CategoriesView";

export default function RulesPage() {
  return (
    <main>
      <h1>Règles & marchands</h1>
      <p>
        Créez des règles automatiques et corrigez les noms normalisés pour
        appliquer un replace-all immédiat.
      </p>
      <RulesView />
      <CategoriesView />
    </main>
  );
}
