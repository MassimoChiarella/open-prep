import type { Metadata } from "next";

import { coreFormulas } from "@/data/formulaLibrary/coreFormulas";
import { FormulaLibraryView } from "@/features/formulas/FormulaLibraryView";

export const metadata: Metadata = {
  title: "Formula Library"
};

export default function FormulasPage() {
  return <FormulaLibraryView formulas={coreFormulas} />;
}
