import { submitAnswer } from "@/features/drills/answerSubmission";
import { completeDrillSession } from "@/features/drills/sessionCompletion";
import { createDrillSession } from "@/features/drills/sessionFactory";

export function completedSession(seed: string, startedAt = "2026-06-02T00:00:00.000Z") {
  const created = createDrillSession({ seed, startedAt, settings: { questionCount: 1, tags: ["addition"] } });
  const questions = [{ ...created.questions[0], prompt: `${seed} prompt` }];
  const submitted = submitAnswer({
    question: questions[0], rawInput: String(questions[0].answer.value), session: created.session, timeTakenSeconds: 5
  });
  return {
    questions,
    session: completeDrillSession({
      endedAt: new Date(Date.parse(startedAt) + 10_000).toISOString(), questions, session: submitted.session
    })
  };
}
