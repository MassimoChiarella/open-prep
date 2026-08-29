import { mergeCatalogs } from "@/features/i18n/i18n";
import { benchmarkMessages } from "@/features/i18n/messages/benchmarks";
import { casePracticeMessages } from "@/features/i18n/messages/casePractice";
import { coreMessages } from "@/features/i18n/messages/core";
import { drillMessages } from "@/features/i18n/messages/drills";
import { exhibitMessages } from "@/features/i18n/messages/exhibits";
import { formulaMessages } from "@/features/i18n/messages/formulas";
import { marketSizingMessages } from "@/features/i18n/messages/marketSizing";
import { progressMessages } from "@/features/i18n/messages/progress";
import { questionPackMessages } from "@/features/i18n/messages/questionPacks";
import { questioningMessages } from "@/features/i18n/messages/questioning";
import { releaseGateGlobalMessages } from "@/features/i18n/messages/releaseGateGlobal";
import { releaseGateLatinMessages } from "@/features/i18n/messages/releaseGateLatin";
import { settingsMessages } from "@/features/i18n/messages/settings";

export const appMessages = mergeCatalogs(
  coreMessages,
  drillMessages,
  benchmarkMessages,
  exhibitMessages,
  marketSizingMessages,
  casePracticeMessages,
  formulaMessages,
  progressMessages,
  settingsMessages,
  questionPackMessages,
  questioningMessages,
  releaseGateGlobalMessages,
  releaseGateLatinMessages
);
