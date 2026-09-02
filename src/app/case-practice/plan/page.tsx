import type { Metadata } from "next";

import { PrepPlanView } from "@/features/case-practice/plan/PrepPlanView";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function PrepPlanPage() {
  return <PrepPlanView />;
}
