import { coreFormulas } from "@/data/formulaLibrary/coreFormulas";
import { FormulaLibraryView } from "@/features/formulas/FormulaLibraryView";

export default function FormulasPage() {
  return <FormulaLibraryView formulas={coreFormulas} />;
}
