import type { Metadata } from "next";

import { DrillSettingsForm } from "@/features/drills/DrillSettingsForm";

export const metadata: Metadata = {
  title: "Drills"
};

export default function DrillsPage() {
  return <DrillSettingsForm />;
}
