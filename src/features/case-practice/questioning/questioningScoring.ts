export type CaseQuestioningMode = "clarifying" | "diagnostic";

export interface CaseQuestioningConcept {
  aliases: readonly string[];
  id: string;
  label: string;
}

export interface CaseQuestioningIntent {
  feedback: string;
  id: string;
  label: string;
  priority: boolean;
  referenceQuestions: readonly string[];
  requiredConceptGroups: readonly (readonly string[])[];
  supportingConceptIds?: readonly string[];
  weight: number;
}

export interface CaseQuestioningPrompt {
  concepts: readonly CaseQuestioningConcept[];
  id: string;
  industry: string;
  intents: readonly CaseQuestioningIntent[];
  language: string;
  maximumQuestions: number;
  minimumQuestions: number;
  mode: CaseQuestioningMode;
  objective: string;
  situation: string;
  title: string;
}

export interface CaseQuestioningQuestion {
  id: string;
  rank?: number;
  text: string;
}

export interface CaseQuestioningSubmission {
  includeRanking: boolean;
  questions: readonly CaseQuestioningQuestion[];
}

export interface CaseQuestioningScoreDimension {
  maxScore: number;
  score: number;
}

export interface CaseQuestioningMatch {
  conceptCoverage: number;
  duplicateOfQuestionId?: string;
  intentId?: string;
  intentLabel?: string;
  matchedConceptIds: readonly string[];
  questionId: string;
  referenceSimilarity: number;
  similarity: number;
  text: string;
  typoSimilarity: number;
}

export interface CaseQuestioningScore {
  coverage: CaseQuestioningScoreDimension & {
    matchedIntentIds: readonly string[];
    missedIntentIds: readonly string[];
  };
  distinctness: CaseQuestioningScoreDimension & {
    duplicateQuestionIds: readonly string[];
  };
  matches: readonly CaseQuestioningMatch[];
  maxScore: number;
  prioritization?: CaseQuestioningScoreDimension & {
    matchedPriorityIntentIds: readonly string[];
  };
  relevance: CaseQuestioningScoreDimension & {
    recognizedQuestionIds: readonly string[];
    unrecognizedQuestionIds: readonly string[];
  };
  totalScore: number;
}

export const questioningScoreWeights = {
  coverage: 40,
  distinctness: 10,
  prioritization: 15,
  relevance: 35
} as const;

export const questioningMatchThreshold = 0.58;
export const questioningDuplicateThreshold = 0.72;
const questioningSupportingConceptThreshold = 0.35;

const stopWords = new Set([
  "a", "about", "an", "and", "any", "are", "as", "at", "be", "been", "being", "by", "can",
  "could", "did", "do", "does", "for", "from", "has", "have", "how", "i", "in", "is", "it",
  "me", "of", "on", "or", "our", "please", "should", "tell", "that", "the", "their", "there",
  "these", "this", "those", "to", "was", "we", "were", "what", "when", "where", "which", "who",
  "why", "would", "you", "your", "d", "ll", "m", "re", "s", "t", "ve"
]);

interface NormalizedQuestion {
  contentTokens: readonly string[];
  normalized: string;
  tokenSet: ReadonlySet<string>;
}

interface IntentCandidate {
  conceptCoverage: number;
  intent: CaseQuestioningIntent;
  matchedConceptIds: readonly string[];
  referenceSimilarity: number;
  similarity: number;
  typoSimilarity: number;
}

export function scoreCaseQuestioning(
  prompt: CaseQuestioningPrompt,
  submission: CaseQuestioningSubmission
): CaseQuestioningScore {
  validatePrompt(prompt);
  const questions = submission.questions
    .map((question) => ({ ...question, text: question.text.trim() }))
    .filter((question) => question.text !== "");

  if (questions.length < prompt.minimumQuestions || questions.length > prompt.maximumQuestions) {
    throw new RangeError(
      `Submit ${prompt.minimumQuestions} to ${prompt.maximumQuestions} nonblank questions.`
    );
  }
  if (new Set(questions.map((question) => question.id)).size !== questions.length) {
    throw new Error("Question IDs must be unique.");
  }
  if (submission.includeRanking) validateRanks(questions);

  const normalized = questions.map((question) => normalizeQuestion(question.text, prompt.language));
  const matches = questions.map((question, index) =>
    matchQuestion(prompt, question, normalized[index])
  );
  const withDuplicates = markDuplicates(matches, normalized);
  const eligibleMatches = withDuplicates.filter(
    (match) => match.intentId !== undefined && match.duplicateOfQuestionId === undefined
  );
  const matchedIntentIds = prompt.intents
    .filter((intent) => eligibleMatches.some((match) => match.intentId === intent.id))
    .map((intent) => intent.id);
  const missedIntentIds = prompt.intents
    .filter((intent) => !matchedIntentIds.includes(intent.id))
    .map((intent) => intent.id);
  const totalIntentWeight = prompt.intents.reduce((sum, intent) => sum + intent.weight, 0);
  const matchedIntentWeight = prompt.intents
    .filter((intent) => matchedIntentIds.includes(intent.id))
    .reduce((sum, intent) => sum + intent.weight, 0);
  const recognizedQuestionIds = withDuplicates
    .filter((match) => match.intentId !== undefined)
    .map((match) => match.questionId);
  const unrecognizedQuestionIds = withDuplicates
    .filter((match) => match.intentId === undefined)
    .map((match) => match.questionId);
  const duplicateQuestionIds = withDuplicates
    .filter((match) => match.duplicateOfQuestionId !== undefined)
    .map((match) => match.questionId);
  const coverageScore = scaledScore(
    questioningScoreWeights.coverage,
    matchedIntentWeight,
    totalIntentWeight
  );
  const relevanceScore = scaledScore(
    questioningScoreWeights.relevance,
    recognizedQuestionIds.length,
    questions.length
  );
  const distinctnessScore = scaledScore(
    questioningScoreWeights.distinctness,
    questions.length - duplicateQuestionIds.length,
    questions.length
  );
  const prioritization = submission.includeRanking
    ? scorePrioritization(prompt, questions, withDuplicates)
    : undefined;
  const maxScore =
    questioningScoreWeights.coverage +
    questioningScoreWeights.relevance +
    questioningScoreWeights.distinctness +
    (prioritization?.maxScore ?? 0);
  const totalScore = coverageScore + relevanceScore + distinctnessScore + (prioritization?.score ?? 0);

  return {
    coverage: {
      maxScore: questioningScoreWeights.coverage,
      matchedIntentIds,
      missedIntentIds,
      score: coverageScore
    },
    distinctness: {
      duplicateQuestionIds,
      maxScore: questioningScoreWeights.distinctness,
      score: distinctnessScore
    },
    matches: withDuplicates,
    maxScore,
    ...(prioritization === undefined ? {} : { prioritization }),
    relevance: {
      maxScore: questioningScoreWeights.relevance,
      recognizedQuestionIds,
      score: relevanceScore,
      unrecognizedQuestionIds
    },
    totalScore
  };
}

function matchQuestion(
  prompt: CaseQuestioningPrompt,
  question: CaseQuestioningQuestion,
  normalized: NormalizedQuestion
): CaseQuestioningMatch {
  const matchedConceptIds = matchConcepts(prompt, normalized);
  const candidates = prompt.intents
    .map((intent) => scoreIntent(prompt, intent, normalized, matchedConceptIds))
    .filter((candidate): candidate is IntentCandidate => candidate !== undefined)
    .sort(
      (left, right) =>
        right.similarity - left.similarity ||
        prompt.intents.indexOf(left.intent) - prompt.intents.indexOf(right.intent)
    );
  const best = candidates[0];

  return {
    conceptCoverage: best?.conceptCoverage ?? 0,
    ...(best === undefined ? {} : { intentId: best.intent.id, intentLabel: best.intent.label }),
    matchedConceptIds,
    questionId: question.id,
    referenceSimilarity: best?.referenceSimilarity ?? 0,
    similarity: best?.similarity ?? 0,
    text: question.text,
    typoSimilarity: best?.typoSimilarity ?? 0
  };
}

function scoreIntent(
  prompt: CaseQuestioningPrompt,
  intent: CaseQuestioningIntent,
  question: NormalizedQuestion,
  matchedConceptIds: readonly string[]
): IntentCandidate | undefined {
  const matchedConceptSet = new Set(matchedConceptIds);
  const matchedGroups = intent.requiredConceptGroups.filter((group) =>
    group.some((conceptId) => matchedConceptSet.has(conceptId))
  ).length;
  const conceptCoverage = matchedGroups / intent.requiredConceptGroups.length;
  const referenceScores = intent.referenceQuestions.map((reference) => {
    const normalizedReference = normalizeQuestion(reference, prompt.language);
    const referenceConceptIds = matchConcepts(prompt, normalizedReference);
    return {
      lexical: featureJaccard(
        features(question, matchedConceptIds),
        features(normalizedReference, referenceConceptIds)
      ),
      typo: trigramDice(question.normalized, normalizedReference.normalized)
    };
  });
  const referenceSimilarity = Math.max(0, ...referenceScores.map((score) => score.lexical));
  const typoSimilarity = Math.max(0, ...referenceScores.map((score) => score.typo));
  const similarity = roundSimilarity(
    conceptCoverage * 0.7 + referenceSimilarity * 0.2 + typoSimilarity * 0.1
  );
  const hasSupportingConcept = (intent.supportingConceptIds ?? []).some((conceptId) =>
    matchedConceptSet.has(conceptId)
  );
  const isSupportedPartialMatch =
    hasSupportingConcept && similarity >= questioningSupportingConceptThreshold;

  if (
    matchedConceptIds.length === 0 ||
    conceptCoverage < 0.5 ||
    (similarity < questioningMatchThreshold && !isSupportedPartialMatch)
  ) {
    return undefined;
  }

  return {
    conceptCoverage,
    intent,
    matchedConceptIds,
    referenceSimilarity,
    similarity,
    typoSimilarity
  };
}

function matchConcepts(
  prompt: CaseQuestioningPrompt,
  question: NormalizedQuestion
): string[] {
  return prompt.concepts
    .filter((concept) =>
      concept.aliases.some((alias) => {
        const aliasTokens = normalizeQuestion(alias, prompt.language).contentTokens;
        return aliasTokens.length > 0 && aliasTokens.every((token) => hasSimilarToken(question.contentTokens, token));
      })
    )
    .map((concept) => concept.id);
}

function hasSimilarToken(questionTokens: readonly string[], expected: string): boolean {
  return questionTokens.some((token) => {
    if (token === expected) return true;
    if (token.length < 5 || expected.length < 5) return false;
    const allowedEdits = Math.max(1, Math.floor(Math.max(token.length, expected.length) / 5));
    return editDistance(token, expected, allowedEdits) <= allowedEdits || trigramDice(token, expected) >= 0.74;
  });
}

function markDuplicates(
  matches: readonly CaseQuestioningMatch[],
  normalized: readonly NormalizedQuestion[]
): CaseQuestioningMatch[] {
  return matches.map((match, index) => {
    const duplicateIndex = matches.findIndex((candidate, candidateIndex) => {
      if (candidateIndex >= index || candidate.intentId !== match.intentId || match.intentId === undefined) {
        return false;
      }
      if (normalized[candidateIndex].normalized === normalized[index].normalized) return true;
      const lexicalSimilarity = featureJaccard(
        features(normalized[candidateIndex], candidate.matchedConceptIds),
        features(normalized[index], match.matchedConceptIds)
      );
      const conceptSimilarity = featureJaccard(
        new Set(candidate.matchedConceptIds),
        new Set(match.matchedConceptIds)
      );
      return lexicalSimilarity >= questioningDuplicateThreshold || (
        conceptSimilarity === 1 &&
        trigramDice(normalized[candidateIndex].normalized, normalized[index].normalized) >= 0.45
      );
    });

    return duplicateIndex < 0
      ? match
      : { ...match, duplicateOfQuestionId: matches[duplicateIndex].questionId };
  });
}

function scorePrioritization(
  prompt: CaseQuestioningPrompt,
  questions: readonly CaseQuestioningQuestion[],
  matches: readonly CaseQuestioningMatch[]
): NonNullable<CaseQuestioningScore["prioritization"]> {
  const priorityIntentIds = new Set(prompt.intents.filter((intent) => intent.priority).map((intent) => intent.id));
  if (priorityIntentIds.size === 0) {
    throw new Error("Ranked submissions require at least one priority intent.");
  }
  const ranked = [...questions].sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0));
  const comparedCount = Math.min(priorityIntentIds.size, ranked.length);
  const topQuestionIds = new Set(ranked.slice(0, comparedCount).map((question) => question.id));
  const matchedPriorityIntentIds = [...new Set(
    matches
      .filter(
        (match) =>
          topQuestionIds.has(match.questionId) &&
          match.duplicateOfQuestionId === undefined &&
          match.intentId !== undefined &&
          priorityIntentIds.has(match.intentId)
      )
      .map((match) => match.intentId as string)
  )];

  return {
    matchedPriorityIntentIds,
    maxScore: questioningScoreWeights.prioritization,
    score: scaledScore(
      questioningScoreWeights.prioritization,
      matchedPriorityIntentIds.length,
      comparedCount
    )
  };
}

function normalizeQuestion(value: string, language: string): NormalizedQuestion {
  const normalized = value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase(language)
    .replace(/[’']/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  const tokens = normalized === "" ? [] : normalized.split(" ");
  const contentTokens = tokens.filter((token) => !stopWords.has(token));
  return { contentTokens, normalized: contentTokens.join(" "), tokenSet: new Set(contentTokens) };
}

function features(
  question: NormalizedQuestion,
  conceptIds: readonly string[]
): ReadonlySet<string> {
  return new Set([...question.tokenSet, ...conceptIds.map((id) => `concept:${id}`)]);
}

function featureJaccard(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  if (left.size === 0 && right.size === 0) return 1;
  const intersection = [...left].filter((value) => right.has(value)).length;
  return intersection / (left.size + right.size - intersection);
}

function trigramDice(left: string, right: string): number {
  if (left === right) return left === "" ? 0 : 1;
  const leftTrigrams = trigrams(left);
  const rightTrigrams = trigrams(right);
  if (leftTrigrams.size === 0 || rightTrigrams.size === 0) return 0;
  const intersection = [...leftTrigrams].filter((value) => rightTrigrams.has(value)).length;
  return (2 * intersection) / (leftTrigrams.size + rightTrigrams.size);
}

function trigrams(value: string): Set<string> {
  const padded = `  ${value}  `;
  const result = new Set<string>();
  for (let index = 0; index <= padded.length - 3; index += 1) {
    result.add(padded.slice(index, index + 3));
  }
  return result;
}

function editDistance(left: string, right: string, limit: number): number {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMinimum = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const value = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
      current.push(value);
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > limit) return limit + 1;
    previous = current;
  }

  return previous[right.length];
}

function validatePrompt(prompt: CaseQuestioningPrompt): void {
  if (prompt.intents.length === 0 || prompt.concepts.length === 0) {
    throw new Error("A questioning prompt must define concepts and intents.");
  }
  if (prompt.minimumQuestions < 1 || prompt.maximumQuestions < prompt.minimumQuestions) {
    throw new Error("Question-count limits are invalid.");
  }
  const conceptIds = new Set(prompt.concepts.map((concept) => concept.id));
  if (conceptIds.size !== prompt.concepts.length) throw new Error("Concept IDs must be unique.");
  if (prompt.concepts.some((concept) => concept.aliases.length === 0)) {
    throw new Error("Every questioning concept must define at least one alias.");
  }
  if (new Set(prompt.intents.map((intent) => intent.id)).size !== prompt.intents.length) {
    throw new Error("Intent IDs must be unique.");
  }
  for (const intent of prompt.intents) {
    if (intent.weight <= 0 || intent.requiredConceptGroups.length === 0 || intent.referenceQuestions.length === 0) {
      throw new Error(`Questioning intent "${intent.id}" is incomplete.`);
    }
    for (const conceptId of [...intent.requiredConceptGroups.flat(), ...(intent.supportingConceptIds ?? [])]) {
      if (!conceptIds.has(conceptId)) {
        throw new Error(`Questioning intent "${intent.id}" references unknown concept "${conceptId}".`);
      }
    }
    const requiredConceptIds = new Set(intent.requiredConceptGroups.flat());
    if ((intent.supportingConceptIds ?? []).some((conceptId) => !requiredConceptIds.has(conceptId))) {
      throw new Error(`Questioning intent "${intent.id}" has a supporting concept outside its required groups.`);
    }
  }
}

function validateRanks(questions: readonly CaseQuestioningQuestion[]): void {
  const ranks = questions.map((question) => question.rank);
  if (
    ranks.some((rank) => rank === undefined || !Number.isInteger(rank) || rank < 1 || rank > questions.length) ||
    new Set(ranks).size !== questions.length
  ) {
    throw new RangeError("Ranked submissions must assign each question one unique rank.");
  }
}

function scaledScore(maxScore: number, earned: number, possible: number): number {
  return possible <= 0
    ? 0
    : Math.round(maxScore * Math.min(1, Math.max(0, earned / possible)));
}

function roundSimilarity(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
