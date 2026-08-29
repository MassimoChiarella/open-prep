export type TemplateRenderValues = Record<string, number | string>;

const placeholderPattern = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

export function renderTemplateText(templateText: string, values: TemplateRenderValues): string {
  return templateText.replace(placeholderPattern, (_match, key: string) => {
    const value = values[key];

    if (value === undefined) {
      throw new Error(`Missing template value "${key}".`);
    }

    return String(value);
  });
}
