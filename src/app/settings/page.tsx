import type { Metadata } from "next";

import { LocalSettingsView } from "@/features/settings/LocalSettingsView";

export const metadata: Metadata = {
  title: "Settings"
};

export default function SettingsPage() {
  return <LocalSettingsView />;
}
