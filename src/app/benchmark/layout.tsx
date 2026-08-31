import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Benchmark"
};

export default function BenchmarkLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
