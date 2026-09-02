import type { Metadata } from "next";

import { ProgressPageView } from "@/features/progress/ProgressViews";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Progress"
};

export default function ProgressPage() {
  return <ProgressPageView />;
}
