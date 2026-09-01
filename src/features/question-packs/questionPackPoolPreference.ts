export const questionPackPoolPreferenceStorageKey = "open_prep_question_pack_pool" as const;

export type QuestionPackPoolMode =
  | "built_in_only"
  | "built_in_and_selected"
  | "selected_only";

export interface QuestionPackPoolPreference {
  mode: QuestionPackPoolMode;
  selectedPackIds: string[];
}

interface QuestionPackPoolIdentity {
  id: string;
  importedAt: string;
  packVersion: string;
}

export const defaultQuestionPackPoolPreference: QuestionPackPoolPreference = {
  mode: "built_in_only",
  selectedPackIds: []
};

const questionPackPoolModes = [
  "built_in_only",
  "built_in_and_selected",
  "selected_only"
] as const satisfies readonly QuestionPackPoolMode[];
const questionPackIdPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const maxSelectedQuestionPacks = 200;

type PreferenceReader = Pick<Storage, "getItem">;
type PreferenceWriter = Pick<Storage, "getItem" | "setItem">;

export function parseQuestionPackPoolPreference(serialized: string | null): QuestionPackPoolPreference {
  if (serialized === null) return cloneDefaultPreference();

  try {
    return normalizeQuestionPackPoolPreference(JSON.parse(serialized));
  } catch {
    return cloneDefaultPreference();
  }
}

export function serializeQuestionPackPoolPreference(preference: QuestionPackPoolPreference): string {
  return JSON.stringify(normalizeQuestionPackPoolPreference(preference));
}

export function buildQuestionPackPoolDraftScope(
  preference: QuestionPackPoolPreference,
  installedPacks: readonly QuestionPackPoolIdentity[]
): string {
  const installedById = new Map(installedPacks.map((pack) => [pack.id, pack]));

  return JSON.stringify({
    mode: preference.mode,
    selectedPacks: [...preference.selectedPackIds]
      .sort()
      .map((id) => {
        const pack = installedById.get(id);
        return pack === undefined
          ? [id, null]
          : [id, pack.packVersion, pack.importedAt];
      })
  });
}

export function readQuestionPackPoolPreference(
  storage?: PreferenceReader
): QuestionPackPoolPreference {
  try {
    const preferenceStorage = storage ?? globalThis.localStorage;
    return parseQuestionPackPoolPreference(preferenceStorage.getItem(questionPackPoolPreferenceStorageKey));
  } catch {
    return cloneDefaultPreference();
  }
}

export function writeQuestionPackPoolPreference(
  preference: QuestionPackPoolPreference,
  storage?: Pick<Storage, "setItem">
): void {
  const preferenceStorage = storage ?? globalThis.localStorage;
  preferenceStorage.setItem(
    questionPackPoolPreferenceStorageKey,
    serializeQuestionPackPoolPreference(preference)
  );
}

export function removeQuestionPackFromPoolPreference(
  packId: string,
  storage?: PreferenceWriter
): QuestionPackPoolPreference {
  const preference = readQuestionPackPoolPreference(storage);
  const nextPreference = {
    ...preference,
    selectedPackIds: preference.selectedPackIds.filter((selectedPackId) => selectedPackId !== packId)
  };

  writeQuestionPackPoolPreference(nextPreference, storage);
  return nextPreference;
}

function normalizeQuestionPackPoolPreference(value: unknown): QuestionPackPoolPreference {
  if (!isRecord(value) || !questionPackPoolModes.includes(value.mode as QuestionPackPoolMode)) {
    return cloneDefaultPreference();
  }
  if (!Array.isArray(value.selectedPackIds)) return cloneDefaultPreference();

  const selectedPackIds: string[] = [];
  const seen = new Set<string>();

  for (const candidate of value.selectedPackIds) {
    if (typeof candidate !== "string" || !questionPackIdPattern.test(candidate)) {
      return cloneDefaultPreference();
    }
    if (!seen.has(candidate)) {
      seen.add(candidate);
      selectedPackIds.push(candidate);
      if (selectedPackIds.length === maxSelectedQuestionPacks) break;
    }
  }

  return {
    mode: value.mode as QuestionPackPoolMode,
    selectedPackIds
  };
}

function cloneDefaultPreference(): QuestionPackPoolPreference {
  return {
    mode: defaultQuestionPackPoolPreference.mode,
    selectedPackIds: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
