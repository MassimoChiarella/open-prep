import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import { createDrillSettings } from "@/features/drills/drillSettings";
import { validateDrillSettings } from "@/features/drills/sessionFactory";
import { generateQuestionsFromTemplates } from "@/features/questions/questionGenerator";
import { getEligibleQuestionTemplates } from "@/features/questions/templateSelection";
import { toQuestionPackQuestions } from "@/features/question-packs/questionPack";
import type { DrillSession, DrillSettings, Question, QuestionTemplate } from "@/lib/domain";
import { createSeededRandom } from "@/lib/random/seededRandom";
import type { QuestionPackRecord } from "@/lib/storage/appStorageTypes";

export interface CreatedQuestionPackPoolSession {
  questions: Question[];
  session: DrillSession;
  similarQuestionTemplates: QuestionTemplate[];
}

interface CreateQuestionPackPoolSessionOptions {
  includeBuiltIn: boolean;
  packs: readonly QuestionPackRecord[];
  requireInterviewMath?: boolean;
  seed: string | number;
  settings: Partial<DrillSettings>;
  startedAt?: string;
}

interface CustomTemplateSource {
  packId: string;
  prefix: string;
}

export function createQuestionPackPoolSession({
  includeBuiltIn,
  packs,
  requireInterviewMath = false,
  seed,
  settings: settingsInput,
  startedAt = new Date().toISOString()
}: CreateQuestionPackPoolSessionOptions): CreatedQuestionPackPoolSession {
  const settings = createDrillSettings(settingsInput);
  validateDrillSettings(settings);

  const numericPacks = packs
    .filter((pack) => pack.kind === "fixed_numeric" || pack.kind === "generated_template")
    .sort((left, right) => left.id.localeCompare(right.id) || left.packVersion.localeCompare(right.packVersion));
  const fixedQuestions = numericPacks.flatMap((pack) =>
    pack.kind === "fixed_numeric" ? toQuestionPackQuestions(pack) : []
  ).filter((question) => questionMatchesSettings(question, settings, requireInterviewMath));
  const { sources, templates: customTemplates } = namespacePackTemplates(numericPacks);
  const templates = [
    ...(includeBuiltIn ? starterQuestionTemplates : []),
    ...customTemplates
  ].filter((template) => !requireInterviewMath || template.caseStyle !== undefined);
  const eligibleTemplates = getEligibleQuestionTemplates(templates, settings);
  const poolSeed = buildPoolSeed(seed, includeBuiltIn, numericPacks);
  const generatedQuestions = eligibleTemplates.length === 0
    ? []
    : generateQuestionsFromTemplates(
        eligibleTemplates,
        settings,
        `${poolSeed}:generated`,
        true
      ).map((question) => addPackProvenance(question, sources));
  const candidates = deduplicateQuestions([...fixedQuestions, ...generatedQuestions]);

  if (candidates.length === 0) {
    throw new Error(
      includeBuiltIn
        ? "No built-in or selected question-pack content matches these drill settings."
        : "Selected packs only is active, but no selected pack contains questions matching these drill settings."
    );
  }

  const questions = createSeededRandom(`${poolSeed}:selection`)
    .shuffle(candidates)
    .slice(0, settings.questionCount);
  const sessionSettings: DrillSettings = {
    ...settings,
    questionPackId: undefined,
    questionCount: questions.length
  };

  return {
    questions,
    session: {
      id: buildSessionId(poolSeed, startedAt),
      questionIds: questions.map((question) => question.id),
      responses: [],
      settings: sessionSettings,
      startedAt
    },
    similarQuestionTemplates: templates
  };
}

function namespacePackTemplates(packs: readonly QuestionPackRecord[]): {
  sources: CustomTemplateSource[];
  templates: QuestionTemplate[];
} {
  const sources: CustomTemplateSource[] = [];
  const templates: QuestionTemplate[] = [];

  for (const pack of packs) {
    if (pack.kind !== "generated_template") continue;
    const prefix = `question-pack:${pack.id}:`;
    sources.push({ packId: pack.id, prefix });
    templates.push(...pack.templates.map((template) => ({
      ...template,
      id: `${prefix}${template.id}`
    })));
  }

  return { sources, templates };
}

function addPackProvenance(question: Question, sources: readonly CustomTemplateSource[]): Question {
  const source = sources.find((candidate) => question.id.startsWith(candidate.prefix));
  if (source === undefined) return question;

  return {
    ...question,
    metadata: {
      ...question.metadata,
      sourcePackId: source.packId,
      sourceQuestionId: question.id.slice(source.prefix.length),
      sourceType: "generated"
    }
  };
}

function questionMatchesSettings(
  question: Question,
  settings: DrillSettings,
  requireInterviewMath: boolean
): boolean {
  return (
    (!requireInterviewMath || question.metadata?.caseStyle !== undefined) &&
    question.difficulty === settings.difficulty &&
    settings.categories.includes(question.category) &&
    (settings.tags === undefined || settings.tags.some((tag) => question.tags.includes(tag)))
  );
}

function deduplicateQuestions(questions: readonly Question[]): Question[] {
  return [...new Map(questions.map((question) => [question.id, question])).values()];
}

function buildPoolSeed(
  seed: string | number,
  includeBuiltIn: boolean,
  packs: readonly QuestionPackRecord[]
): string {
  const packVersions = packs
    .map((pack) => `${pack.id}@${pack.packVersion}`)
    .sort()
    .join(",");

  return `${seed}:question-pool:${includeBuiltIn ? "with-built-in" : "selected-only"}:${packVersions}`;
}

function buildSessionId(seed: string, startedAt: string): string {
  const seedKey = createSeededRandom(seed).integer(0, 0x7fffffff).toString(36);
  const safeStartedAt = startedAt.replace(/[^A-Za-z0-9]/g, "");
  return `drill-pool-${seedKey}-${safeStartedAt}`;
}
