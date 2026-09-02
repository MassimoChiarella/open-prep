import type { Metadata } from "next";

import { LocalSettingsView } from "@/features/settings/LocalSettingsView";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Settings"
};

export default function SettingsPage() {
  return <LocalSettingsView />;
}
