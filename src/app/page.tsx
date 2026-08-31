import type { Metadata } from "next";

import { DashboardProgressView } from "@/features/progress/ProgressViews";

export const metadata: Metadata = {
  title: {
    absolute: "Dashboard | Open Prep"
  }
};

export default function DashboardPage() {
  return <DashboardProgressView />;
}
