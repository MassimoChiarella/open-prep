import type { FullCaseDraftRecord } from "@/features/case-practice/practiceTypes";
import type { FullCaseSimulationSpec } from "@/features/case-practice/simulation/fullCaseTypes";
import { SYNTHESIS_DIMENSIONS } from "@/features/case-practice/synthesis/synthesisScoring";
import { isLocale } from "@/features/i18n/i18n";

export function fullCaseDraftId(simulationId: string): string {
  return `full-case-draft:${simulationId}`;
}

export async function fullCaseContentKey(simulation: FullCaseSimulationSpec): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(simulation));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Backups can contain private drafts. Validate their bounded shape before they
// enter storage; resuming also validates every selection against current content.
export function isFullCaseDraftRecord(value: unknown): value is FullCaseDraftRecord {
  if (!record(value)) return false;
  return value.kind === "full_case_draft" && text(value.simulationId, 200) &&
    value.id === fullCaseDraftId(value.simulationId) && typeof value.contentKey === "string" && /^[a-f0-9]{64}$/.test(value.contentKey) &&
    date(value.updatedAt) && date(value.startedAt) && (value.completedAt === undefined || date(value.completedAt)) &&
    text(value.locale, 30) && isLocale(value.locale) && Number.isInteger(value.stage) && Number(value.stage) >= 0 && Number(value.stage) < 5 &&
    typeof value.includeQuestionRanking === "boolean" && typeof value.hypothesisId === "string" && value.hypothesisId.length <= 200 &&
    strings(value.branchIds) && strings(value.ideaIds) && strings(value.priorityIdeaIds) &&
    typeof value.calculationInput === "string" && value.calculationInput.length <= 10_000 &&
    Array.isArray(value.questions) && value.questions.length <= 100 &&
    value.questions.every((question) => record(question) && text(question.id, 200) && typeof question.text === "string" && question.text.length <= 10_000) &&
    new Set(value.questions.map((question) => question.id)).size === value.questions.length &&
    record(value.synthesis) && Object.entries(value.synthesis).every(([key, option]) =>
      SYNTHESIS_DIMENSIONS.includes(key as typeof SYNTHESIS_DIMENSIONS[number]) && text(option, 200));
}

export function canResumeFullCaseDraft(value: unknown, simulation: FullCaseSimulationSpec, contentKey: string): value is FullCaseDraftRecord {
  if (!isFullCaseDraftRecord(value) || value.simulationId !== simulation.id || value.contentKey !== contentKey) return false;
  const prompt = simulation.questioning;
  return value.stage < (prompt === undefined ? 4 : 5) &&
    (prompt === undefined ? value.questions.length === 0 : value.questions.length >= prompt.minimumQuestions && value.questions.length <= prompt.maximumQuestions) &&
    (value.hypothesisId === "" || simulation.structure.hypotheses.some((item) => item.id === value.hypothesisId)) &&
    value.branchIds.length <= simulation.structure.maxBranches &&
    value.branchIds.every((id) => simulation.structure.branchOptions.some((item) => item.id === id)) &&
    value.ideaIds.length <= simulation.brainstorming.selectionLimit &&
    value.ideaIds.every((id) => simulation.brainstorming.themes.some((theme) => theme.ideas.some((item) => item.id === id))) &&
    value.priorityIdeaIds.length <= simulation.brainstorming.priorityLimit && value.priorityIdeaIds.every((id) => value.ideaIds.includes(id)) &&
    SYNTHESIS_DIMENSIONS.every((dimension) => value.synthesis[dimension] === undefined ||
      simulation.synthesis.options[dimension].some((option) => option.id === value.synthesis[dimension]));
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}
function date(value: unknown): value is string {
  return text(value, 40) && Number.isFinite(Date.parse(value));
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 100 && value.every((item) => text(item, 200)) && new Set(value).size === value.length;
}
