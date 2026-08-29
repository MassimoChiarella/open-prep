import { describe, expect, it } from "vitest";

import { renderTemplateText } from "@/features/questions/templateRenderer";

describe("renderTemplateText", () => {
  it("renders named placeholders from values", () => {
    expect(renderTemplateText("{a} + {b} = {answer}", { a: 12, b: 8, answer: 20 })).toBe("12 + 8 = 20");
  });

  it("throws when a placeholder is missing", () => {
    expect(() => renderTemplateText("{a} + {missing}", { a: 12 })).toThrow('Missing template value "missing".');
  });
});
