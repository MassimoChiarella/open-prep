import type {
  BrainstormingIdea,
  BrainstormingPrompt,
  BrainstormingTheme
} from "@/features/case-practice/brainstorming/brainstormingScoring";
import type { FitPracticePrompt } from "@/features/case-practice/fit/fitPractice";
import type {
  ConceptKnowledgeCheck,
  ConceptKnowledgeCheckOption,
  ConceptLesson,
  ConceptLessonTopic,
  ConceptWorkedExample
} from "@/features/case-practice/lessons/conceptLessonScoring";
import type { FitCompetency } from "@/features/case-practice/practiceTypes";
import type {
  CaseQuestioningConcept,
  CaseQuestioningIntent,
  CaseQuestioningPrompt
} from "@/features/case-practice/questioning/questioningScoring";
import type { FullCaseSimulationSpec } from "@/features/case-practice/simulation/fullCaseTypes";
import type {
  CaseStructuringBranchOption,
  CaseStructuringHypothesis,
  CaseStructuringModelBranch,
  CaseStructuringPrompt
} from "@/features/case-practice/structuring/structuringScoring";
import {
  SYNTHESIS_DIMENSIONS,
  type SynthesisDimension,
  type SynthesisOption,
  type SynthesisPrompt,
  type SynthesisResponse
} from "@/features/case-practice/synthesis/synthesisScoring";
import { validateExhibitQuestionPackPayload } from "@/features/question-packs/questionPackExhibit";
import type { ExhibitDataset } from "@/features/exhibits/exhibitTypes";
import type { CasePracticeQuestionPackRecord } from "@/lib/storage/appStorageTypes";
import {
  booleanValue,
  boundedArray,
  enumValue,
  finiteNumber,
  hasOwn,
  idArray,
  idValue,
  integer,
  objectValue,
  readCollection,
  readQuestionPackEnvelope,
  rejectUnknown,
  text,
  textArray,
  trackDuplicateId,
  type UnknownRecord
} from "@/features/question-packs/questionPackValidation";

const maxItems = 100;
const maxFullCases = 25;
const collectionKeys = [
  "structuringPrompts",
  "brainstormingPrompts",
  "synthesisPrompts",
  "lessons",
  "fitPrompts",
  "questioningPrompts",
  "fullCases"
] as const;
const lessonTopics = [
  "brainstorming",
  "business_economics",
  "exhibit_reading",
  "issue_tree",
  "mental_math",
  "synthesis"
] as const satisfies readonly ConceptLessonTopic[];
const fitCompetencies = ["conflict", "failure", "impact", "leadership"] as const satisfies readonly FitCompetency[];

export type CasePracticeQuestionPackValidationResult =
  | { status: "valid"; pack: CasePracticeQuestionPackRecord }
  | { status: "invalid"; errors: string[] };

export function validateCasePracticeQuestionPackPayload(
  payload: unknown,
  importedAt = new Date().toISOString()
): CasePracticeQuestionPackValidationResult {
  const errors: string[] = [];
  const envelope = readQuestionPackEnvelope(payload, "case_practice", collectionKeys, errors, [2, 3]);
  if (envelope === undefined) return { status: "invalid", errors };
  const { value, schemaVersion, id, packVersion, title, description, publisher, license } = envelope;

  if (!collectionKeys.some((key) => hasOwn(value, key))) {
    errors.push(`$ must define at least one case-practice collection: ${collectionKeys.join(", ")}.`);
  }

  const structuringPrompts = hasOwn(value, "structuringPrompts")
    ? readCollection(value.structuringPrompts, "$.structuringPrompts", maxItems, "structuring prompt", readStructuringPrompt, errors)
    : undefined;
  const brainstormingPrompts = hasOwn(value, "brainstormingPrompts")
    ? readCollection(value.brainstormingPrompts, "$.brainstormingPrompts", maxItems, "brainstorming prompt", readBrainstormingPrompt, errors)
    : undefined;
  const synthesisPrompts = hasOwn(value, "synthesisPrompts")
    ? readCollection(value.synthesisPrompts, "$.synthesisPrompts", maxItems, "synthesis prompt", readSynthesisPrompt, errors)
    : undefined;
  const lessons = hasOwn(value, "lessons")
    ? readCollection(value.lessons, "$.lessons", maxItems, "lesson", readLesson, errors)
    : undefined;
  const fitPrompts = hasOwn(value, "fitPrompts")
    ? readCollection(value.fitPrompts, "$.fitPrompts", maxItems, "fit prompt", readFitPrompt, errors)
    : undefined;
  if (schemaVersion === 2 && hasOwn(value, "questioningPrompts")) {
    errors.push("$.questioningPrompts requires schemaVersion 3.");
  }
  const questioningPrompts = hasOwn(value, "questioningPrompts")
    ? readCollection(value.questioningPrompts, "$.questioningPrompts", maxItems, "questioning prompt", readQuestioningPrompt, errors)
    : undefined;
  const fullCases = hasOwn(value, "fullCases")
    ? readCollection(
        value.fullCases,
        "$.fullCases",
        maxFullCases,
        "full case",
        (entry, path, itemErrors) => readFullCase(entry, path, itemErrors, schemaVersion ?? 2),
        errors
      )
    : undefined;

  if (errors.length > 0 || schemaVersion === undefined || id === undefined || packVersion === undefined || title === undefined) {
    return { status: "invalid", errors };
  }

  return {
    status: "valid",
    pack: {
      format: "math-drill-question-pack",
      schemaVersion,
      kind: "case_practice",
      id,
      packVersion,
      title,
      ...(description === undefined ? {} : { description }),
      ...(publisher === undefined ? {} : { publisher }),
      ...(license === undefined ? {} : { license }),
      ...(structuringPrompts === undefined ? {} : { structuringPrompts }),
      ...(brainstormingPrompts === undefined ? {} : { brainstormingPrompts }),
      ...(synthesisPrompts === undefined ? {} : { synthesisPrompts }),
      ...(lessons === undefined ? {} : { lessons }),
      ...(fitPrompts === undefined ? {} : { fitPrompts }),
      ...(questioningPrompts === undefined ? {} : { questioningPrompts }),
      ...(fullCases === undefined ? {} : { fullCases }),
      importedAt
    }
  };
}

function readQuestioningPrompt(value: unknown, path: string, errors: string[]): CaseQuestioningPrompt | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(
    item,
    ["id", "title", "industry", "situation", "objective", "language", "mode", "minimumQuestions", "maximumQuestions", "concepts", "intents"],
    path,
    errors
  );
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const title = text(item.title, `${path}.title`, 100, errors);
  const industry = text(item.industry, `${path}.industry`, 100, errors);
  const situation = text(item.situation, `${path}.situation`, 2_000, errors);
  const objective = text(item.objective, `${path}.objective`, 1_000, errors);
  const language = text(item.language, `${path}.language`, 35, errors);
  const mode = enumValue(item.mode, ["clarifying", "diagnostic"] as const, `${path}.mode`, errors);
  const minimumQuestions = integer(item.minimumQuestions, `${path}.minimumQuestions`, 1, 12, errors);
  const maximumQuestions = integer(item.maximumQuestions, `${path}.maximumQuestions`, 1, 12, errors);
  const concepts = readCollection(item.concepts, `${path}.concepts`, 50, "concept", readQuestioningConcept, errors);
  const intents = readCollection(item.intents, `${path}.intents`, 20, "intent", readQuestioningIntent, errors);

  if (language !== undefined) {
    try {
      Intl.getCanonicalLocales(language);
    } catch {
      errors.push(`${path}.language must be a valid language tag.`);
    }
  }
  if (minimumQuestions !== undefined && maximumQuestions !== undefined && maximumQuestions < minimumQuestions) {
    errors.push(`${path}.maximumQuestions must be at least minimumQuestions.`);
  }
  const conceptIds = new Set(concepts?.map((concept) => concept.id));
  const aliasOwners = new Map<string, string>();
  for (const concept of concepts ?? []) {
    for (const alias of concept.aliases) {
      const normalizedAlias = normalizeAlias(alias);
      const owner = aliasOwners.get(normalizedAlias);
      if (owner !== undefined && owner !== concept.id) {
        errors.push(`${path}.concepts alias "${alias}" is shared by concepts "${owner}" and "${concept.id}".`);
      } else {
        aliasOwners.set(normalizedAlias, concept.id);
      }
    }
  }
  for (const [index, intent] of (intents ?? []).entries()) {
    for (const conceptId of [...intent.requiredConceptGroups.flat(), ...(intent.supportingConceptIds ?? [])]) {
      if (!conceptIds.has(conceptId)) {
        errors.push(`${path}.intents[${index}] references unknown concept "${conceptId}".`);
      }
    }
    const requiredConceptIds = new Set(intent.requiredConceptGroups.flat());
    for (const conceptId of intent.supportingConceptIds ?? []) {
      if (!requiredConceptIds.has(conceptId)) {
        errors.push(
          `${path}.intents[${index}].supportingConceptIds must reference concepts used by requiredConceptGroups.`
        );
      }
    }
  }
  if (intents !== undefined && !intents.some((intent) => intent.priority)) {
    errors.push(`${path}.intents must mark at least one intent as a priority so optional ranking can be scored.`);
  }

  if (
    errors.length > before || id === undefined || title === undefined || industry === undefined ||
    situation === undefined || objective === undefined || language === undefined || mode === undefined ||
    minimumQuestions === undefined || maximumQuestions === undefined || concepts === undefined || intents === undefined
  ) return undefined;
  return { id, title, industry, situation, objective, language, mode, minimumQuestions, maximumQuestions, concepts, intents };
}

function readQuestioningConcept(value: unknown, path: string, errors: string[]): CaseQuestioningConcept | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "label", "aliases"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const label = text(item.label, `${path}.label`, 200, errors);
  const aliases = textArray(item.aliases, `${path}.aliases`, 1, 20, 100, errors);
  if (aliases !== undefined && new Set(aliases.map(normalizeAlias)).size !== aliases.length) {
    errors.push(`${path}.aliases must not contain duplicates.`);
  }
  return errors.length === before && id !== undefined && label !== undefined && aliases !== undefined
    ? { id, label, aliases }
    : undefined;
}

function readQuestioningIntent(value: unknown, path: string, errors: string[]): CaseQuestioningIntent | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "label", "feedback", "priority", "weight", "requiredConceptGroups", "supportingConceptIds", "referenceQuestions"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const label = text(item.label, `${path}.label`, 200, errors);
  const feedback = text(item.feedback, `${path}.feedback`, 1_000, errors);
  const priority = booleanValue(item.priority, `${path}.priority`, errors);
  const weight = finiteNumber(item.weight, `${path}.weight`, errors);
  const requiredConceptGroups = readConceptGroups(item.requiredConceptGroups, `${path}.requiredConceptGroups`, errors);
  const supportingConceptIds = hasOwn(item, "supportingConceptIds")
    ? idArray(item.supportingConceptIds, `${path}.supportingConceptIds`, 1, 20, errors)
    : undefined;
  const referenceQuestions = textArray(item.referenceQuestions, `${path}.referenceQuestions`, 1, 10, 1_000, errors);
  if (weight !== undefined && weight <= 0) errors.push(`${path}.weight must be greater than zero.`);
  if (
    errors.length > before || id === undefined || label === undefined || feedback === undefined ||
    priority === undefined || weight === undefined || requiredConceptGroups === undefined || referenceQuestions === undefined
  ) return undefined;
  return {
    id,
    label,
    feedback,
    priority,
    weight,
    requiredConceptGroups,
    ...(supportingConceptIds === undefined ? {} : { supportingConceptIds }),
    referenceQuestions
  };
}

function readConceptGroups(value: unknown, path: string, errors: string[]): string[][] | undefined {
  if (!boundedArray(value, path, 1, 10, errors)) return undefined;
  return value.flatMap((group, index) => {
    const parsed = idArray(group, `${path}[${index}]`, 1, 10, errors);
    return parsed === undefined ? [] : [parsed];
  });
}

function normalizeAlias(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function readStructuringPrompt(value: unknown, path: string, errors: string[]): CaseStructuringPrompt | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "title", "industry", "situation", "objective", "hypotheses", "acceptedHypothesisId", "branchOptions", "maxBranches", "modelStructure"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const title = text(item.title, `${path}.title`, 100, errors);
  const industry = text(item.industry, `${path}.industry`, 100, errors);
  const situation = text(item.situation, `${path}.situation`, 2_000, errors);
  const objective = text(item.objective, `${path}.objective`, 1_000, errors);
  const hypotheses = readCollection(item.hypotheses, `${path}.hypotheses`, 10, "hypothesis", readHypothesis, errors, 2);
  const acceptedHypothesisId = idValue(item.acceptedHypothesisId, `${path}.acceptedHypothesisId`, errors);
  const branchOptions = readCollection(item.branchOptions, `${path}.branchOptions`, 12, "branch", readBranch, errors, 2);
  const maxBranches = integer(item.maxBranches, `${path}.maxBranches`, 1, 12, errors);
  const modelStructure = readModelStructure(item.modelStructure, `${path}.modelStructure`, errors);

  if (hypotheses !== undefined && acceptedHypothesisId !== undefined && !hypotheses.some((entry) => entry.id === acceptedHypothesisId)) {
    errors.push(`${path}.acceptedHypothesisId must reference a hypothesis ID.`);
  }
  if (branchOptions !== undefined && maxBranches !== undefined && maxBranches > branchOptions.length) {
    errors.push(`${path}.maxBranches must not exceed the number of branch options.`);
  }
  if (modelStructure !== undefined && maxBranches !== undefined && modelStructure.length > maxBranches) {
    errors.push(`${path}.modelStructure must not contain more branches than maxBranches.`);
  }
  if (branchOptions !== undefined && modelStructure !== undefined) {
    modelStructure.forEach((entry, index) => {
      if (!branchOptions.some((branch) => branch.id === entry.branchId)) {
        errors.push(`${path}.modelStructure[${index}].branchId must reference a branch option ID.`);
      }
    });
  }

  if (
    errors.length > before ||
    id === undefined ||
    title === undefined ||
    industry === undefined ||
    situation === undefined ||
    objective === undefined ||
    hypotheses === undefined ||
    acceptedHypothesisId === undefined ||
    branchOptions === undefined ||
    maxBranches === undefined ||
    modelStructure === undefined
  ) return undefined;
  return { id, title, industry, situation, objective, hypotheses, acceptedHypothesisId, branchOptions, maxBranches, modelStructure };
}

function readHypothesis(value: unknown, path: string, errors: string[]): CaseStructuringHypothesis | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "label", "rationale"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const label = text(item.label, `${path}.label`, 500, errors);
  const rationale = text(item.rationale, `${path}.rationale`, 1_000, errors);
  return errors.length === before && id !== undefined && label !== undefined && rationale !== undefined
    ? { id, label, rationale }
    : undefined;
}

function readBranch(value: unknown, path: string, errors: string[]): CaseStructuringBranchOption | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "label", "description"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const label = text(item.label, `${path}.label`, 200, errors);
  const description = text(item.description, `${path}.description`, 1_000, errors);
  return errors.length === before && id !== undefined && label !== undefined && description !== undefined
    ? { id, label, description }
    : undefined;
}

function readModelStructure(value: unknown, path: string, errors: string[]): CaseStructuringModelBranch[] | undefined {
  if (!boundedArray(value, path, 1, 12, errors)) return undefined;
  const branchIds = new Set<string>();
  return value.flatMap((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const item = objectValue(entry, itemPath, errors);
    if (item === undefined) return [];
    rejectUnknown(item, ["branchId", "title", "questions"], itemPath, errors);
    const before = errors.length;
    const branchId = idValue(item.branchId, `${itemPath}.branchId`, errors);
    const title = text(item.title, `${itemPath}.title`, 200, errors);
    const questions = textArray(item.questions, `${itemPath}.questions`, 1, 10, 1_000, errors);
    if (branchId !== undefined && branchIds.has(branchId)) errors.push(`${itemPath}.branchId duplicates model branch ID "${branchId}".`);
    else if (branchId !== undefined) branchIds.add(branchId);
    return errors.length === before && branchId !== undefined && title !== undefined && questions !== undefined
      ? [{ branchId, title, questions }]
      : [];
  });
}

function readBrainstormingPrompt(value: unknown, path: string, errors: string[]): BrainstormingPrompt | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "title", "context", "question", "selectionLimit", "priorityLimit", "priorityIdeaIds", "themes"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const title = text(item.title, `${path}.title`, 100, errors);
  const context = text(item.context, `${path}.context`, 2_000, errors);
  const question = text(item.question, `${path}.question`, 1_000, errors);
  const selectionLimit = integer(item.selectionLimit, `${path}.selectionLimit`, 1, 30, errors);
  const priorityLimit = integer(item.priorityLimit, `${path}.priorityLimit`, 1, 10, errors);
  const priorityIdeaIds = idArray(item.priorityIdeaIds, `${path}.priorityIdeaIds`, 1, 10, errors);
  const ideaIds = new Set<string>();
  const themes = readThemes(item.themes, `${path}.themes`, ideaIds, errors);
  const ideas = themes?.flatMap((theme) => theme.ideas);
  const relevantIdeas = ideas?.filter((idea) => idea.relevant) ?? [];

  if (selectionLimit !== undefined && ideas !== undefined && selectionLimit > ideas.length) {
    errors.push(`${path}.selectionLimit must not exceed the number of ideas.`);
  }
  if (selectionLimit !== undefined && selectionLimit !== relevantIdeas.length) {
    errors.push(`${path}.selectionLimit must equal the number of relevant ideas so a full score is possible.`);
  }
  if (priorityLimit !== undefined && selectionLimit !== undefined && priorityLimit > selectionLimit) {
    errors.push(`${path}.priorityLimit must not exceed selectionLimit.`);
  }
  if (priorityIdeaIds !== undefined && priorityLimit !== undefined && priorityIdeaIds.length !== priorityLimit) {
    errors.push(`${path}.priorityIdeaIds must contain exactly priorityLimit IDs.`);
  }
  priorityIdeaIds?.forEach((priorityId, index) => {
    const idea = ideas?.find((candidate) => candidate.id === priorityId);
    if (idea === undefined) errors.push(`${path}.priorityIdeaIds[${index}] must reference an idea ID.`);
    else if (!idea.relevant) errors.push(`${path}.priorityIdeaIds[${index}] must reference a relevant idea.`);
  });

  if (
    errors.length > before ||
    id === undefined ||
    title === undefined ||
    context === undefined ||
    question === undefined ||
    selectionLimit === undefined ||
    priorityLimit === undefined ||
    priorityIdeaIds === undefined ||
    themes === undefined
  ) return undefined;
  return { id, title, context, question, selectionLimit, priorityLimit, priorityIdeaIds, themes };
}

function readThemes(value: unknown, path: string, ideaIds: Set<string>, errors: string[]): BrainstormingTheme[] | undefined {
  if (!boundedArray(value, path, 2, 6, errors)) return undefined;
  const themeIds = new Set<string>();
  return value.flatMap((entry, index) => {
    const itemPath = `${path}[${index}]`;
    trackDuplicateId(entry, `${itemPath}.id`, "theme", themeIds, errors);
    const item = objectValue(entry, itemPath, errors);
    if (item === undefined) return [];
    rejectUnknown(item, ["id", "label", "ideas"], itemPath, errors);
    const before = errors.length;
    const id = idValue(item.id, `${itemPath}.id`, errors);
    const label = text(item.label, `${itemPath}.label`, 200, errors);
    const ideas = readIdeas(item.ideas, `${itemPath}.ideas`, ideaIds, errors);
    return errors.length === before && id !== undefined && label !== undefined && ideas !== undefined
      ? [{ id, label, ideas }]
      : [];
  });
}

function readIdeas(value: unknown, path: string, ids: Set<string>, errors: string[]): BrainstormingIdea[] | undefined {
  if (!boundedArray(value, path, 2, 10, errors)) return undefined;
  return value.flatMap((entry, index) => {
    const itemPath = `${path}[${index}]`;
    trackDuplicateId(entry, `${itemPath}.id`, "idea", ids, errors);
    const item = objectValue(entry, itemPath, errors);
    if (item === undefined) return [];
    rejectUnknown(item, ["id", "label", "relevant"], itemPath, errors);
    const before = errors.length;
    const id = idValue(item.id, `${itemPath}.id`, errors);
    const label = text(item.label, `${itemPath}.label`, 500, errors);
    const relevant = booleanValue(item.relevant, `${itemPath}.relevant`, errors);
    return errors.length === before && id !== undefined && label !== undefined && relevant !== undefined
      ? [{ id, label, relevant }]
      : [];
  });
}

function readSynthesisPrompt(value: unknown, path: string, errors: string[]): SynthesisPrompt | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "title", "client", "situation", "decision", "facts", "options", "correctResponse", "modelClose"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const title = text(item.title, `${path}.title`, 100, errors);
  const client = text(item.client, `${path}.client`, 100, errors);
  const situation = text(item.situation, `${path}.situation`, 2_000, errors);
  const decision = text(item.decision, `${path}.decision`, 1_000, errors);
  const facts = textArray(item.facts, `${path}.facts`, 1, 20, 1_000, errors);
  const options = readSynthesisOptions(item.options, `${path}.options`, errors);
  const correctResponse = readSynthesisResponse(item.correctResponse, options, `${path}.correctResponse`, errors);
  const modelClose = text(item.modelClose, `${path}.modelClose`, 2_000, errors);
  if (
    errors.length > before ||
    id === undefined ||
    title === undefined ||
    client === undefined ||
    situation === undefined ||
    decision === undefined ||
    facts === undefined ||
    options === undefined ||
    correctResponse === undefined ||
    modelClose === undefined
  ) return undefined;
  return { id, title, client, situation, decision, facts, options, correctResponse, modelClose };
}

function readSynthesisOptions(
  value: unknown,
  path: string,
  errors: string[]
): Record<SynthesisDimension, SynthesisOption[]> | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, SYNTHESIS_DIMENSIONS, path, errors);
  const before = errors.length;
  const result = {} as Record<SynthesisDimension, SynthesisOption[]>;
  for (const dimension of SYNTHESIS_DIMENSIONS) {
    const options = readCollection(item[dimension], `${path}.${dimension}`, 10, "option", readOption, errors, 2);
    if (options !== undefined) result[dimension] = options;
  }
  return errors.length === before ? result : undefined;
}

function readSynthesisResponse(
  value: unknown,
  options: Record<SynthesisDimension, SynthesisOption[]> | undefined,
  path: string,
  errors: string[]
): SynthesisResponse | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, SYNTHESIS_DIMENSIONS, path, errors);
  const before = errors.length;
  const result = {} as SynthesisResponse;
  for (const dimension of SYNTHESIS_DIMENSIONS) {
    const id = idValue(item[dimension], `${path}.${dimension}`, errors);
    if (id !== undefined && options !== undefined && !options[dimension].some((option) => option.id === id)) {
      errors.push(`${path}.${dimension} must reference an option ID.`);
    }
    if (id !== undefined) result[dimension] = id;
  }
  return errors.length === before ? result : undefined;
}

function readOption(value: unknown, path: string, errors: string[]): SynthesisOption | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "label"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const label = text(item.label, `${path}.label`, 1_000, errors);
  return errors.length === before && id !== undefined && label !== undefined ? { id, label } : undefined;
}

function readLesson(value: unknown, path: string, errors: string[]): ConceptLesson | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "topic", "title", "objective", "principles", "workedExample", "knowledgeCheck"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const topic = enumValue(item.topic, lessonTopics, `${path}.topic`, errors);
  const title = text(item.title, `${path}.title`, 100, errors);
  const objective = text(item.objective, `${path}.objective`, 1_000, errors);
  const principles = textArray(item.principles, `${path}.principles`, 1, 10, 1_000, errors);
  const workedExample = readWorkedExample(item.workedExample, `${path}.workedExample`, errors);
  const knowledgeCheck = readKnowledgeCheck(item.knowledgeCheck, `${path}.knowledgeCheck`, errors);
  if (
    errors.length > before ||
    id === undefined ||
    topic === undefined ||
    title === undefined ||
    objective === undefined ||
    principles === undefined ||
    workedExample === undefined ||
    knowledgeCheck === undefined
  ) return undefined;
  return { id, topic, title, objective, principles, workedExample, knowledgeCheck };
}

function readWorkedExample(value: unknown, path: string, errors: string[]): ConceptWorkedExample | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["prompt", "steps", "answer"], path, errors);
  const before = errors.length;
  const prompt = text(item.prompt, `${path}.prompt`, 2_000, errors);
  const steps = textArray(item.steps, `${path}.steps`, 1, 10, 1_000, errors);
  const answer = text(item.answer, `${path}.answer`, 2_000, errors);
  return errors.length === before && prompt !== undefined && steps !== undefined && answer !== undefined
    ? { prompt, steps, answer }
    : undefined;
}

function readKnowledgeCheck(value: unknown, path: string, errors: string[]): ConceptKnowledgeCheck | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["prompt", "options", "correctOptionId", "explanation"], path, errors);
  const before = errors.length;
  const prompt = text(item.prompt, `${path}.prompt`, 2_000, errors);
  const options = readCollection(item.options, `${path}.options`, 10, "option", readKnowledgeOption, errors, 2);
  const correctOptionId = idValue(item.correctOptionId, `${path}.correctOptionId`, errors);
  const explanation = text(item.explanation, `${path}.explanation`, 2_000, errors);
  if (options !== undefined && correctOptionId !== undefined && !options.some((option) => option.id === correctOptionId)) {
    errors.push(`${path}.correctOptionId must reference an option ID.`);
  }
  return errors.length === before && prompt !== undefined && options !== undefined && correctOptionId !== undefined && explanation !== undefined
    ? { prompt, options, correctOptionId, explanation }
    : undefined;
}

function readKnowledgeOption(value: unknown, path: string, errors: string[]): ConceptKnowledgeCheckOption | undefined {
  return readOption(value, path, errors);
}

function readFitPrompt(value: unknown, path: string, errors: string[]): FitPracticePrompt | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "competency", "prompt", "followUps"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const competency = enumValue(item.competency, fitCompetencies, `${path}.competency`, errors);
  const prompt = text(item.prompt, `${path}.prompt`, 2_000, errors);
  const followUps = textArray(item.followUps, `${path}.followUps`, 1, 10, 1_000, errors);
  return errors.length === before && id !== undefined && competency !== undefined && prompt !== undefined && followUps !== undefined
    ? { id, competency, prompt, followUps }
    : undefined;
}

function readFullCase(
  value: unknown,
  path: string,
  errors: string[],
  schemaVersion: 2 | 3
): FullCaseSimulationSpec | undefined {
  const item = objectValue(value, path, errors);
  if (item === undefined) return undefined;
  rejectUnknown(item, ["id", "client", "title", "situation", "calculationQuestionId", "questioning", "structure", "exhibit", "brainstorming", "synthesis"], path, errors);
  const before = errors.length;
  const id = idValue(item.id, `${path}.id`, errors);
  const client = text(item.client, `${path}.client`, 100, errors);
  const title = text(item.title, `${path}.title`, 100, errors);
  const situation = text(item.situation, `${path}.situation`, 2_000, errors);
  const calculationQuestionId = idValue(item.calculationQuestionId, `${path}.calculationQuestionId`, errors);
  if (schemaVersion === 2 && hasOwn(item, "questioning")) {
    errors.push(`${path}.questioning requires schemaVersion 3.`);
  }
  if (schemaVersion === 3 && !hasOwn(item, "questioning")) {
    errors.push(`${path}.questioning is required in a schemaVersion 3 full case.`);
  }
  const questioning = hasOwn(item, "questioning")
    ? readQuestioningPrompt(item.questioning, `${path}.questioning`, errors)
    : undefined;
  const structure = readStructuringPrompt(item.structure, `${path}.structure`, errors);
  const exhibit = readExhibit(item.exhibit, `${path}.exhibit`, errors);
  const brainstorming = readBrainstormingPrompt(item.brainstorming, `${path}.brainstorming`, errors);
  const synthesis = readSynthesisPrompt(item.synthesis, `${path}.synthesis`, errors);
  const calculationQuestion = exhibit?.questions.find((question) => question.id === calculationQuestionId);
  if (calculationQuestionId !== undefined && calculationQuestion === undefined) {
    errors.push(`${path}.calculationQuestionId must reference an exhibit question ID.`);
  } else if (calculationQuestion?.responseType === "multiple_choice") {
    errors.push(`${path}.calculationQuestionId must reference a numeric exhibit question.`);
  }
  if (
    errors.length > before ||
    id === undefined ||
    client === undefined ||
    title === undefined ||
    situation === undefined ||
    calculationQuestionId === undefined ||
    structure === undefined ||
    exhibit === undefined ||
    brainstorming === undefined ||
    synthesis === undefined
  ) return undefined;
  return {
    id,
    client,
    title,
    situation,
    calculationQuestionId,
    ...(questioning === undefined ? {} : { questioning }),
    structure,
    exhibit,
    brainstorming,
    synthesis
  };
}

function readExhibit(value: unknown, path: string, errors: string[]): ExhibitDataset | undefined {
  const result = validateExhibitQuestionPackPayload({
    format: "math-drill-question-pack",
    schemaVersion: 2,
    kind: "exhibit",
    id: "case-exhibit-validation",
    packVersion: "1",
    title: "Case exhibit validation",
    datasets: [value]
  });
  if (result.status === "invalid") {
    errors.push(...result.errors.map((error) => error.replace(/^\$\.datasets\[0\]/, path)));
    return undefined;
  }
  return result.pack.datasets[0];
}
