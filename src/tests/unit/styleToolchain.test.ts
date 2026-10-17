import { describe, expect, it } from "vitest";
import postcss from "postcss";
import nested from "tailwindcss/nesting";
import tailwind from "tailwindcss";

describe("patched selector parser compatibility", () => {
  it("preserves nested functional selectors and escaped attribute values", async () => {
    const result = await postcss([nested()]).process(
      ".card { &:is(.selected, [data-active='yes']) > svg { color: red; } }",
      { from: undefined }
    );
    expect(result.css).toContain(".card:is(.selected, [data-active='yes']) > svg");
    expect(result.css).toContain("color: red");
  });

  it("builds responsive, interactive and arbitrary child utilities without dropping styles", async () => {
    const result = await postcss([tailwind({
      content: [{ raw: '<button class="px-4 md:px-8 hover:opacity-50 [&>svg]:block"></button>', extension: "html" }],
      corePlugins: { preflight: false }
    })]).process("@tailwind utilities; .button { @apply px-4 hover:opacity-50; }", { from: undefined });
    const selectors: string[] = [];
    const media: string[] = [];
    result.root.walkRules((rule) => { selectors.push(rule.selector); });
    result.root.walkAtRules("media", (rule) => { media.push(rule.params); });
    expect(selectors).toContain(".px-4");
    expect(selectors).toContain(".button:hover");
    expect(selectors.some((selector) => selector.replace(/\s+/g, "").endsWith(">svg"))).toBe(true);
    expect(media).toContain("(min-width: 768px)");
    expect(result.css).toContain("padding-left: 1rem");
    expect(result.css).toContain("opacity: 0.5");
  });
});
