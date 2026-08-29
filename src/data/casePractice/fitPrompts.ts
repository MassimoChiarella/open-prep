import type { FitPracticePrompt } from "@/features/case-practice/fit/fitPractice";

export const fitPracticePrompts = [
  {
    id: "leadership-uncertainty",
    competency: "leadership",
    prompt: "Tell me about a time you led a team through uncertainty.",
    followUps: ["What made the situation uncertain?", "How did you keep others aligned?", "What would you repeat?"]
  },
  {
    id: "leadership-influence",
    competency: "leadership",
    prompt: "Describe a time you influenced a group without formal authority.",
    followUps: ["Where did you meet resistance?", "How did you adapt your approach?", "What changed because of you?"]
  },
  {
    id: "conflict-stakeholder",
    competency: "conflict",
    prompt: "Tell me about a disagreement with an important stakeholder.",
    followUps: ["What was each side trying to protect?", "How did you address the disagreement?", "How did the relationship change?"]
  },
  {
    id: "conflict-team",
    competency: "conflict",
    prompt: "Describe a time tension within a team threatened the work.",
    followUps: ["What did you observe first?", "What did you say or do?", "What did you learn about handling conflict?"]
  },
  {
    id: "failure-setback",
    competency: "failure",
    prompt: "Tell me about a meaningful setback that you caused or contributed to.",
    followUps: ["What did you own personally?", "How did you respond?", "What changed in your approach afterward?"]
  },
  {
    id: "failure-feedback",
    competency: "failure",
    prompt: "Describe a time difficult feedback exposed a weakness in your work.",
    followUps: ["Why was the feedback difficult to hear?", "What action did you take?", "How do you know you improved?"]
  },
  {
    id: "impact-improvement",
    competency: "impact",
    prompt: "Tell me about a change you made that produced measurable improvement.",
    followUps: ["How did you identify the opportunity?", "What obstacles did you overcome?", "How was the impact measured?"]
  },
  {
    id: "impact-expectations",
    competency: "impact",
    prompt: "Describe a time you delivered more impact than others expected.",
    followUps: ["What was originally expected?", "Which of your choices mattered most?", "What was the lasting result?"]
  }
] as const satisfies readonly FitPracticePrompt[];
