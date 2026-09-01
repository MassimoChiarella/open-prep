import type { Metadata } from "next";
import { Suspense } from "react";

import {
  ContentPacksHub,
  ContentPacksState
} from "@/features/question-packs/ContentPacksHub";

export const metadata: Metadata = {
  description: "Discover, create, import, and manage local consulting-practice content packs.",
  title: "Content Packs"
};

export default function ContentPacksPage() {
  return (
    <Suspense
      fallback={(
        <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
          <ContentPacksState kind="loading" />
        </main>
      )}
    >
      <ContentPacksHub />
    </Suspense>
  );
}
