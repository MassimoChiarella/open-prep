import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "@/components/PageHeader";

const headerCopy = {
  description: "Choose one focused practice session.",
  eyebrow: "Practice Home",
  title: "Dashboard"
};

describe("PageHeader", () => {
  it("keeps the eyebrow, heading, and description without a decorative page number", () => {
    render(<PageHeader {...headerCopy} />);

    expect(screen.getByText(headerCopy.eyebrow).parentElement).toHaveTextContent(/^Practice Home$/);
    expect(screen.getByRole("heading", { level: 1, name: headerCopy.title })).toBeInTheDocument();
    expect(screen.getByText(headerCopy.description)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it.each([
    { mode: "client", documentNavigation: false },
    { mode: "document", documentNavigation: true }
  ])("preserves the accessible action name and destination for $mode navigation", ({ documentNavigation }) => {
    render(
      <PageHeader
        {...headerCopy}
        action={{ documentNavigation, href: "/drills", label: "Start Drill" }}
      />
    );

    expect(screen.getByRole("link", { name: "Start Drill" })).toHaveAttribute("href", "/drills");
  });
});
