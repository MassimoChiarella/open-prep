import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { I18nProvider } from "@/features/i18n/I18nProvider";
import { NotFoundView } from "@/features/offline/NotFoundView";

describe("NotFoundView", () => {
  it("explains the missing page and provides a dashboard recovery route", () => {
    render(
      <I18nProvider>
        <NotFoundView />
      </I18nProvider>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Dashboard" })).toHaveAttribute("href", "/");
  });
});
