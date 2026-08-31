import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Exhibit Practice"
};

export default function ExhibitsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
