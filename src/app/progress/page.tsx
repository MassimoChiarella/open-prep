import type { Metadata } from "next";

import { ProgressPageView } from "@/features/progress/ProgressViews";

export const metadata: Metadata = {
  title: "Progress"
};

export default function ProgressPage() {
  return <ProgressPageView />;
}
