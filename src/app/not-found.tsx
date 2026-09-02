import type { Metadata } from "next";

import { NotFoundView } from "@/features/offline/NotFoundView";

export const metadata: Metadata = {
  alternates: { canonical: null },
  robots: { index: false, follow: true },
  title: "Page Not Found"
};

export default function NotFound() {
  return <NotFoundView />;
}
