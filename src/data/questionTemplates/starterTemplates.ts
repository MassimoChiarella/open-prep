import { businessMathTemplates, weightedAverageTemplates } from "@/data/questionTemplates/businessTemplates";
import { caseStyleQuestionTemplates } from "@/data/questionTemplates/caseStyleTemplates";
import { growthQuestionTemplates } from "@/data/questionTemplates/growthTemplates";
import { mixedOperationTemplates } from "@/data/questionTemplates/mixedOperationTemplates";
import type { QuestionTemplate } from "@/lib/domain";

const additionTemplates: QuestionTemplate[] = [
  {
    id: "addition_beginner_001",
    category: "arithmetic",
    tags: ["addition"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} + {b}?",
    variables: {
      a: { type: "integer", min: 20, max: 90, step: 5 },
      b: { type: "integer", min: 10, max: 80, step: 5 }
    },
    formula: { expression: "a + b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Add {a} and {b}.", "{a} + {b} = {answer}."]
    }
  },
  {
    id: "addition_beginner_002",
    category: "arithmetic",
    tags: ["addition"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} + {b}?",
    variables: {
      a: { type: "integer", values: [125, 150, 175, 225, 250] },
      b: { type: "integer", values: [25, 50, 75, 100, 125] }
    },
    formula: { expression: "a + b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Line up the hundreds and tens.", "{a} + {b} = {answer}."]
    }
  },
  {
    id: "addition_beginner_003",
    category: "arithmetic",
    tags: ["addition"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} + {b}?",
    variables: {
      a: { type: "integer", values: [340, 460, 580, 720, 890] },
      b: { type: "integer", values: [30, 40, 70, 80, 90] }
    },
    formula: { expression: "a + b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Add the smaller number to the larger base.", "{a} + {b} = {answer}."]
    }
  },
  {
    id: "addition_beginner_004",
    category: "arithmetic",
    tags: ["addition"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} + {b}?",
    variables: {
      a: { type: "integer", values: [48, 57, 66, 74, 83] },
      b: { type: "integer", values: [12, 23, 34, 45, 56] }
    },
    formula: { expression: "a + b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Combine tens, then ones.", "{a} + {b} = {answer}."]
    }
  },
  {
    id: "addition_beginner_005",
    category: "arithmetic",
    tags: ["addition"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} + {b}?",
    variables: {
      a: { type: "integer", values: [990, 1_250, 1_500, 1_750, 2_250] },
      b: { type: "integer", values: [110, 250, 375, 500, 750] }
    },
    formula: { expression: "a + b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Add in chunks if helpful.", "{a} + {b} = {answer}."]
    }
  }
];

const subtractionTemplates: QuestionTemplate[] = [
  {
    id: "subtraction_beginner_001",
    category: "arithmetic",
    tags: ["subtraction"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} - {b}?",
    variables: {
      a: { type: "integer", values: [90, 120, 150, 180, 210] },
      b: { type: "integer", values: [15, 30, 45, 60] }
    },
    formula: { expression: "a - b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Subtract {b} from {a}.", "{a} - {b} = {answer}."]
    }
  },
  {
    id: "subtraction_beginner_002",
    category: "arithmetic",
    tags: ["subtraction"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} - {b}?",
    variables: {
      a: { type: "integer", values: [300, 450, 600, 750, 900] },
      b: { type: "integer", values: [50, 75, 100, 125, 150] }
    },
    formula: { expression: "a - b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Subtract in hundreds and tens.", "{a} - {b} = {answer}."]
    }
  },
  {
    id: "subtraction_beginner_003",
    category: "arithmetic",
    tags: ["subtraction"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} - {b}?",
    variables: {
      a: { type: "integer", values: [1_000, 1_250, 1_500, 1_750, 2_000] },
      b: { type: "integer", values: [125, 250, 375, 500, 625] }
    },
    formula: { expression: "a - b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Break {b} into manageable chunks.", "{a} - {b} = {answer}."]
    }
  },
  {
    id: "subtraction_beginner_004",
    category: "arithmetic",
    tags: ["subtraction"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} - {b}?",
    variables: {
      a: { type: "integer", values: [87, 96, 114, 135, 153] },
      b: { type: "integer", values: [18, 27, 36, 45, 54] }
    },
    formula: { expression: "a - b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Subtract tens first, then adjust ones.", "{a} - {b} = {answer}."]
    }
  },
  {
    id: "subtraction_beginner_005",
    category: "arithmetic",
    tags: ["subtraction"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} - {b}?",
    variables: {
      a: { type: "integer", values: [520, 640, 780, 860, 940] },
      b: { type: "integer", values: [120, 180, 240, 300, 360] }
    },
    formula: { expression: "a - b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Subtract the larger chunk, then the remainder.", "{a} - {b} = {answer}."]
    }
  }
];

const multiplicationTemplates: QuestionTemplate[] = [
  {
    id: "multiplication_beginner_001",
    category: "arithmetic",
    tags: ["multiplication"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} x {b}?",
    variables: {
      a: { type: "integer", values: [12, 15, 18, 20, 25] },
      b: { type: "integer", values: [3, 4, 5, 6, 8] }
    },
    formula: { expression: "a * b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Multiply {a} by {b}.", "{a} x {b} = {answer}."]
    }
  },
  {
    id: "multiplication_beginner_002",
    category: "arithmetic",
    tags: ["multiplication"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} x {b}?",
    variables: {
      a: { type: "integer", values: [30, 40, 50, 60, 70] },
      b: { type: "integer", values: [7, 8, 9, 11, 12] }
    },
    formula: { expression: "a * b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Multiply the non-zero digits, then append the zero.", "{a} x {b} = {answer}."]
    }
  },
  {
    id: "multiplication_beginner_003",
    category: "arithmetic",
    tags: ["multiplication"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} x {b}?",
    variables: {
      a: { type: "integer", values: [14, 16, 18, 22, 24] },
      b: { type: "integer", values: [5, 10, 15, 20, 25] }
    },
    formula: { expression: "a * b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Use friendly multiples of 5 when possible.", "{a} x {b} = {answer}."]
    }
  },
  {
    id: "multiplication_beginner_004",
    category: "arithmetic",
    tags: ["multiplication"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} x {b}?",
    variables: {
      a: { type: "integer", values: [21, 32, 43, 54, 65] },
      b: { type: "integer", values: [2, 3, 4, 5, 6] }
    },
    formula: { expression: "a * b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Break {a} into tens and ones.", "{a} x {b} = {answer}."]
    }
  },
  {
    id: "multiplication_beginner_005",
    category: "arithmetic",
    tags: ["multiplication"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} x {b}?",
    variables: {
      a: { type: "integer", values: [75, 80, 90, 125, 150] },
      b: { type: "integer", values: [2, 4, 6, 8, 10] }
    },
    formula: { expression: "a * b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Use doubling or tens to simplify.", "{a} x {b} = {answer}."]
    }
  },
  {
    id: "multiplication_beginner_006",
    category: "arithmetic",
    tags: ["multiplication"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} x {b}?",
    variables: {
      a: { type: "integer", values: [11, 12, 13, 14, 15] },
      b: { type: "integer", values: [11, 12, 13, 14, 15] }
    },
    formula: { expression: "a * b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Split one factor into 10 plus the remainder.", "{a} x {b} = {answer}."]
    }
  },
  {
    id: "multiplication_beginner_007",
    category: "arithmetic",
    tags: ["multiplication"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} x {b}?",
    variables: {
      a: { type: "integer", values: [200, 250, 300, 400, 500] },
      b: { type: "integer", values: [3, 4, 5, 6, 7] }
    },
    formula: { expression: "a * b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Multiply the leading value, then include the zeros.", "{a} x {b} = {answer}."]
    }
  },
  {
    id: "multiplication_beginner_008",
    category: "arithmetic",
    tags: ["multiplication"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} x {b}?",
    variables: {
      a: { type: "integer", values: [35, 45, 55, 65, 85] },
      b: { type: "integer", values: [9, 10, 11, 12, 20] }
    },
    formula: { expression: "a * b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Round or split one factor if helpful.", "{a} x {b} = {answer}."]
    }
  }
];

const divisionTemplates: QuestionTemplate[] = [
  {
    id: "division_beginner_001",
    category: "arithmetic",
    tags: ["division"],
    difficulty: ["beginner"],
    promptTemplate: "What is {dividend} / {divisor}?",
    variables: {
      dividend: { type: "integer", values: [120, 150, 180, 240, 360] },
      divisor: { type: "integer", values: [3, 5, 6, 10, 12] }
    },
    formula: { expression: "dividend / divisor" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Divide {dividend} by {divisor}.", "{dividend} / {divisor} = {answer}."]
    }
  },
  {
    id: "division_beginner_002",
    category: "arithmetic",
    tags: ["division"],
    difficulty: ["beginner"],
    promptTemplate: "What is {dividend} / {divisor}?",
    variables: {
      dividend: { type: "integer", values: [200, 300, 400, 600, 800] },
      divisor: { type: "integer", values: [2, 4, 5, 10, 20] }
    },
    formula: { expression: "dividend / divisor" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Cancel common zeros if useful.", "{dividend} / {divisor} = {answer}."]
    }
  },
  {
    id: "division_beginner_003",
    category: "arithmetic",
    tags: ["division"],
    difficulty: ["beginner"],
    promptTemplate: "What is {dividend} / {divisor}?",
    variables: {
      dividend: { type: "integer", values: [96, 144, 192, 288, 384] },
      divisor: { type: "integer", values: [4, 6, 8, 12, 16] }
    },
    formula: { expression: "dividend / divisor" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Use known multiples to divide.", "{dividend} / {divisor} = {answer}."]
    }
  },
  {
    id: "division_beginner_004",
    category: "arithmetic",
    tags: ["division"],
    difficulty: ["beginner"],
    promptTemplate: "What is {dividend} / {divisor}?",
    variables: {
      dividend: { type: "integer", values: [1_000, 1_500, 2_000, 2_500, 3_000] },
      divisor: { type: "integer", values: [10, 20, 25, 50, 100] }
    },
    formula: { expression: "dividend / divisor" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Simplify by removing matching factors of 10 when possible.", "{dividend} / {divisor} = {answer}."]
    }
  },
  {
    id: "division_beginner_005",
    category: "arithmetic",
    tags: ["division"],
    difficulty: ["beginner"],
    promptTemplate: "What is {dividend} / {divisor}?",
    variables: {
      dividend: { type: "integer", values: [75, 150, 225, 300, 450] },
      divisor: { type: "integer", values: [3, 5, 15, 25, 75] }
    },
    formula: { expression: "dividend / divisor" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Look for a familiar factor pair.", "{dividend} / {divisor} = {answer}."]
    }
  },
  {
    id: "division_beginner_006",
    category: "arithmetic",
    tags: ["division"],
    difficulty: ["beginner"],
    promptTemplate: "What is {dividend} / {divisor}?",
    variables: {
      dividend: { type: "integer", values: [84, 126, 168, 210, 252] },
      divisor: { type: "integer", values: [2, 3, 6, 7, 14] }
    },
    formula: { expression: "dividend / divisor" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Divide by the smaller factor first if helpful.", "{dividend} / {divisor} = {answer}."]
    }
  },
  {
    id: "division_beginner_007",
    category: "arithmetic",
    tags: ["division"],
    difficulty: ["beginner"],
    promptTemplate: "What is {dividend} / {divisor}?",
    variables: {
      dividend: { type: "integer", values: [360, 480, 600, 720, 840] },
      divisor: { type: "integer", values: [6, 8, 10, 12, 20] }
    },
    formula: { expression: "dividend / divisor" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Use multiples of {divisor} to work down from {dividend}.", "{dividend} / {divisor} = {answer}."]
    }
  },
  {
    id: "division_beginner_008",
    category: "arithmetic",
    tags: ["division"],
    difficulty: ["beginner"],
    promptTemplate: "What is {dividend} / {divisor}?",
    variables: {
      dividend: { type: "integer", values: [1_200, 1_800, 2_400, 3_600, 4_800] },
      divisor: { type: "integer", values: [12, 24, 30, 40, 60] }
    },
    formula: { expression: "dividend / divisor" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Scale both numbers down before dividing.", "{dividend} / {divisor} = {answer}."]
    }
  }
];

type HigherDifficulty = "intermediate" | "advanced" | "expert";

interface ArithmeticProgressionLevel {
  difficulty: HigherDifficulty;
  left: QuestionTemplate["variables"][string];
  right: QuestionTemplate["variables"][string];
  strategy: string;
}

function buildArithmeticProgression(
  tag: "addition" | "subtraction" | "multiplication" | "division",
  operator: "+" | "-" | "x" | "/",
  expression: string,
  levels: readonly ArithmeticProgressionLevel[]
): QuestionTemplate[] {
  return levels.map(({ difficulty, left, right, strategy }) => ({
    id: `${tag}_${difficulty}_001`,
    category: "arithmetic",
    tags: [tag],
    difficulty: [difficulty],
    promptTemplate: `What is {a} ${operator} {b}?`,
    variables: { a: left, b: right },
    formula: { expression },
    answerUnit: "none",
    explanationTemplate: {
      steps: [strategy, `{a} ${operator} {b} = {answer}.`]
    }
  }));
}

const progressiveArithmeticTemplates: QuestionTemplate[] = [
  ...buildArithmeticProgression("addition", "+", "a + b", [
    {
      difficulty: "intermediate",
      left: { type: "integer", values: [275, 385, 495, 685, 875] },
      right: { type: "integer", values: [125, 245, 365, 475, 595] },
      strategy: "Add hundreds first, then combine the remaining tens and ones."
    },
    {
      difficulty: "advanced",
      left: { type: "integer", values: [2_347, 3_568, 4_729, 6_845, 8_976] },
      right: { type: "integer", values: [1_685, 2_796, 3_847, 4_958] },
      strategy: "Round one addend, add, then reverse the rounding adjustment."
    },
    {
      difficulty: "expert",
      left: { type: "decimal", values: [12_475.5, 18_392.75, 24_867.25, 37_946.5] },
      right: { type: "decimal", values: [6_849.75, 9_537.5, 14_286.25, 18_754.5] },
      strategy: "Combine the whole-number and decimal parts separately, then reconcile any carrying."
    }
  ]),
  ...buildArithmeticProgression("subtraction", "-", "a - b", [
    {
      difficulty: "intermediate",
      left: { type: "integer", values: [750, 885, 1_025, 1_240, 1_575] },
      right: { type: "integer", values: [185, 275, 365, 495] },
      strategy: "Subtract a nearby round number, then add back the difference."
    },
    {
      difficulty: "advanced",
      left: { type: "integer", values: [7_341, 8_625, 10_248, 12_735, 15_482] },
      right: { type: "integer", values: [2_786, 3_947, 4_568, 5_926] },
      strategy: "Work left to right and track each borrowing adjustment."
    },
    {
      difficulty: "expert",
      left: { type: "decimal", values: [45_782.5, 58_341.75, 72_806.25, 91_475.5] },
      right: { type: "decimal", values: [18_967.75, 24_586.5, 31_749.25, 38_894.75] },
      strategy: "Subtract a rounded amount, then correct for both the whole-number and decimal differences."
    }
  ]),
  ...buildArithmeticProgression("multiplication", "x", "a * b", [
    {
      difficulty: "intermediate",
      left: { type: "integer", values: [24, 36, 48, 75, 84] },
      right: { type: "integer", values: [12, 15, 18, 25] },
      strategy: "Split one factor into tens and ones, then add the partial products."
    },
    {
      difficulty: "advanced",
      left: { type: "integer", values: [125, 175, 225, 275, 325] },
      right: { type: "integer", values: [24, 36, 48, 64] },
      strategy: "Use a nearby round factor and correct the resulting product."
    },
    {
      difficulty: "expert",
      left: { type: "decimal", values: [312.5, 437.5, 625, 875] },
      right: { type: "decimal", values: [12.8, 18.4, 24.6, 32.5] },
      strategy: "Rescale the decimals, multiply the resulting whole numbers, then restore the decimal places."
    }
  ]),
  ...buildArithmeticProgression("division", "/", "a / b", [
    {
      difficulty: "intermediate",
      left: { type: "integer", values: [900, 1_200, 1_500, 1_800, 2_100] },
      right: { type: "integer", values: [12, 15, 20, 25] },
      strategy: "Cancel common factors before dividing the remaining values."
    },
    {
      difficulty: "advanced",
      left: { type: "integer", values: [4_800, 6_720, 8_640, 10_560, 12_480] },
      right: { type: "integer", values: [16, 24, 32, 48] },
      strategy: "Break the divisor into factors and divide one factor at a time."
    },
    {
      difficulty: "expert",
      left: { type: "integer", values: [12_150, 18_900, 24_300, 31_050, 37_800] },
      right: { type: "integer", values: [18, 27, 45, 54] },
      strategy: "Reduce both values by a shared factor, then complete the smaller division."
    }
  ])
];

const percentageTemplates: QuestionTemplate[] = [
  {
    id: "percentage_of_number_beginner_001",
    category: "percentages",
    tags: ["percentage_of_number"],
    difficulty: ["beginner"],
    promptTemplate: "What is {percentage}% of {base}?",
    variables: {
      percentage: { type: "percentage", values: [10, 15, 20, 25, 50] },
      base: { type: "integer", values: [80, 120, 160, 200, 240] }
    },
    formula: { expression: "percentage / 100 * base" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Convert {percentage}% to a decimal and multiply by {base}.", "{percentage}% of {base} = {answer}."],
      shortcut: "Break {percentage}% into familiar chunks when possible."
    }
  },
  {
    id: "percentage_of_number_beginner_002",
    category: "percentages",
    tags: ["percentage_of_number"],
    difficulty: ["beginner"],
    promptTemplate: "What is {percentage}% of {base}?",
    variables: {
      percentage: { type: "percentage", values: [5, 10, 20, 25, 40] },
      base: { type: "integer", values: [300, 400, 500, 800, 1_000] }
    },
    formula: { expression: "percentage / 100 * base" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Convert {percentage}% to a decimal.", "{percentage}% of {base} = {answer}."]
    }
  },
  {
    id: "percentage_of_number_beginner_003",
    category: "percentages",
    tags: ["percentage_of_number"],
    difficulty: ["beginner"],
    promptTemplate: "A price of {base} is discounted by {percentage}%. What is the discount amount?",
    variables: {
      percentage: { type: "percentage", values: [10, 15, 20, 25, 50] },
      base: { type: "integer", values: [120, 200, 240, 400, 600] }
    },
    formula: { expression: "percentage / 100 * base" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["A discount amount is the percent times the base price.", "{percentage}% of {base} = {answer}."]
    }
  },
  {
    id: "percentage_of_number_beginner_004",
    category: "percentages",
    tags: ["percentage_of_number"],
    difficulty: ["beginner"],
    promptTemplate: "A team completed {percentage}% of {base} tasks. How many tasks is that?",
    variables: {
      percentage: { type: "percentage", values: [20, 25, 40, 50, 75] },
      base: { type: "integer", values: [80, 120, 160, 200, 240] }
    },
    formula: { expression: "percentage / 100 * base" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Convert the percent to a multiplier.", "{percentage}% x {base} = {answer}."]
    }
  },
  {
    id: "percentage_of_number_beginner_005",
    category: "percentages",
    tags: ["percentage_of_number"],
    difficulty: ["beginner"],
    promptTemplate: "What is {percentage}% of {base}?",
    variables: {
      percentage: { type: "percentage", values: [12.5, 20, 40, 60, 75] },
      base: { type: "integer", values: [80, 160, 200, 400, 800] }
    },
    formula: { expression: "percentage / 100 * base" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Use {percentage} / 100 as the multiplier.", "{percentage}% of {base} = {answer}."]
    }
  },
  {
    id: "percentage_change_beginner_001",
    category: "percentages",
    tags: ["percentage_change"],
    difficulty: ["beginner"],
    promptTemplate: "What is the percent change from {oldValue} to {newValue}? Enter the percentage as a number or with %.",
    variables: {
      oldValue: { type: "integer", values: [100, 200, 400, 500] },
      newValue: { type: "integer", values: [120, 240, 480, 600] }
    },
    formula: { expression: "(newValue - oldValue) / oldValue" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: ["Subtract old from new, then divide by the old value.", "({newValue} - {oldValue}) / {oldValue} = {answer} as a decimal; enter the equivalent percentage."]
    }
  },
  {
    id: "percentage_change_beginner_002",
    category: "percentages",
    tags: ["percentage_change"],
    difficulty: ["beginner"],
    promptTemplate: "Revenue moves from {oldValue} to {newValue}. What is the percent increase? Enter the percentage as a number or with %.",
    variables: {
      oldValue: { type: "integer", values: [100, 200, 300] },
      newValue: { type: "integer", values: [400, 500, 600] }
    },
    formula: { expression: "(newValue - oldValue) / oldValue" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: ["Find the increase, then divide by the starting revenue.", "({newValue} - {oldValue}) / {oldValue} = {answer} as a decimal; enter the equivalent percentage."]
    }
  },
  {
    id: "percentage_change_beginner_003",
    category: "percentages",
    tags: ["percentage_change"],
    difficulty: ["beginner"],
    promptTemplate: "Cost drops from {oldValue} to {newValue}. What is the percent decrease? Enter the percentage as a number or with %.",
    variables: {
      oldValue: { type: "integer", values: [400, 800, 1_000] },
      newValue: { type: "integer", values: [100, 200, 400] }
    },
    formula: { expression: "(oldValue - newValue) / oldValue" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: ["Find the drop, then divide by the starting cost.", "({oldValue} - {newValue}) / {oldValue} = {answer} as a decimal; enter the equivalent percentage."]
    }
  },
  {
    id: "reverse_percentage_beginner_001",
    category: "percentages",
    tags: ["reverse_percentage"],
    difficulty: ["beginner"],
    promptTemplate: "After a {percentage}% increase, the value is {finalValue}. What was the original value?",
    variables: {
      percentage: { type: "percentage", values: [25, 100] },
      finalValue: { type: "integer", values: [200, 300, 400, 600] }
    },
    formula: { expression: "finalValue / (1 + percentage / 100)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Reverse the increase by dividing by 1 + {percentage}%.", "{finalValue} / (1 + {percentage}/100) = {answer}."]
    }
  },
  {
    id: "reverse_percentage_beginner_002",
    category: "percentages",
    tags: ["reverse_percentage"],
    difficulty: ["beginner"],
    promptTemplate: "After a {percentage}% decrease, the value is {finalValue}. What was the original value?",
    variables: {
      percentage: { type: "percentage", values: [20, 50] },
      finalValue: { type: "integer", values: [80, 100, 200, 400] }
    },
    formula: { expression: "finalValue / (1 - percentage / 100)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Reverse the decrease by dividing by 1 - {percentage}%.", "{finalValue} / (1 - {percentage}/100) = {answer}."]
    }
  },
  {
    id: "percentage_points_beginner_001",
    category: "percentages",
    tags: ["percentage_points"],
    difficulty: ["beginner"],
    promptTemplate: "A conversion rate moves from {oldRate}% to {newRate}%. How many percentage points did it change?",
    variables: {
      oldRate: { type: "percentage", values: [10, 15, 20, 25] },
      newRate: { type: "percentage", values: [30, 35, 40, 50] }
    },
    formula: { expression: "newRate - oldRate" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Percentage points are a direct subtraction of rates.", "{newRate}% - {oldRate}% = {answer} percentage points."]
    }
  },
  {
    id: "percentage_points_beginner_002",
    category: "percentages",
    tags: ["percentage_points"],
    difficulty: ["beginner"],
    promptTemplate: "A margin falls from {oldRate}% to {newRate}%. How many percentage points did it fall?",
    variables: {
      oldRate: { type: "percentage", values: [40, 50, 60, 70] },
      newRate: { type: "percentage", values: [10, 20, 30] }
    },
    formula: { expression: "oldRate - newRate" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Subtract the ending rate from the starting rate.", "{oldRate}% - {newRate}% = {answer} percentage points."]
    }
  }
];

const progressivePercentageTemplates: QuestionTemplate[] = [
  {
    id: "percentage_of_number_intermediate_001",
    category: "percentages",
    tags: ["percentage_of_number"],
    difficulty: ["intermediate"],
    promptTemplate: "What is {percentage}% of {base}?",
    variables: {
      percentage: { type: "percentage", values: [7.5, 12.5, 17.5, 22.5, 35] },
      base: { type: "integer", values: [240, 480, 640, 960, 1_200] }
    },
    formula: { expression: "percentage / 100 * base" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Convert {percentage}% to a decimal multiplier.", "{percentage}% x {base} = {answer}."],
      shortcut: "Split the percentage into familiar 10%, 5%, and 2.5% pieces."
    }
  },
  {
    id: "percentage_of_number_advanced_001",
    category: "percentages",
    tags: ["percentage_of_number"],
    difficulty: ["advanced"],
    promptTemplate: "What is {innerPercentage}% of {outerPercentage}% of {base}?",
    variables: {
      innerPercentage: { type: "percentage", values: [15, 25, 35, 45] },
      outerPercentage: { type: "percentage", values: [40, 55, 65, 80] },
      base: { type: "integer", values: [2_000, 3_200, 4_800, 6_400] }
    },
    formula: { expression: "innerPercentage / 100 * outerPercentage / 100 * base" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "Find {outerPercentage}% of {base}, then take {innerPercentage}% of that result.",
        "{innerPercentage}% x {outerPercentage}% x {base} = {answer}."
      ],
      shortcut: "Multiply both percentage multipliers before applying them to the base."
    }
  },
  {
    id: "percentage_of_number_expert_001",
    category: "percentages",
    tags: ["percentage_of_number"],
    difficulty: ["expert"],
    promptTemplate:
      "A market of {base} units grows by {growth}%, and a segment captures {share}% of the new market. How many units does the segment capture?",
    variables: {
      base: { type: "integer", values: [8_400, 12_500, 18_750, 24_000] },
      growth: { type: "percentage", values: [6.5, 8.5, 12.5, 17.5] },
      share: { type: "percentage", values: [18.5, 27.5, 36.5, 42.5] }
    },
    formula: { expression: "base * (1 + growth / 100) * share / 100" },
    answerUnit: "units",
    explanationTemplate: {
      steps: [
        "Apply the growth multiplier to {base}, then apply the {share}% segment share.",
        "{base} x (1 + {growth}/100) x {share}/100 = {answer}."
      ],
      shortcut: "Combine the growth and share multipliers before multiplying by the market size."
    }
  },
  {
    id: "percentage_change_intermediate_001",
    category: "percentages",
    tags: ["percentage_change"],
    difficulty: ["intermediate"],
    promptTemplate: "What is the signed percent change from {oldValue} to {newValue}? Enter the percentage as a number or with %.",
    variables: {
      oldValue: { type: "integer", values: [240, 320, 480, 640, 800] },
      newValue: { type: "integer", values: [210, 275, 525, 710, 920] }
    },
    formula: { expression: "(newValue - oldValue) / oldValue" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: ["Divide the change by the starting value.", "({newValue} - {oldValue}) / {oldValue} = {answer} as a decimal; enter the equivalent percentage."],
      shortcut: "Keep the sign of new minus old to distinguish growth from decline."
    }
  },
  {
    id: "percentage_change_advanced_001",
    category: "percentages",
    tags: ["percentage_change"],
    difficulty: ["advanced"],
    promptTemplate:
      "A value rises by {increase}% and then falls by {decrease}%. What is the net percent change from the original value? Enter the percentage as a number or with %.",
    variables: {
      increase: { type: "percentage", values: [12, 18, 24, 35, 42] },
      decrease: { type: "percentage", values: [8, 15, 22, 28, 36] }
    },
    formula: { expression: "(1 + increase / 100) * (1 - decrease / 100) - 1" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: [
        "Multiply the increase and decrease factors, then compare the result with 1.",
        "(1 + {increase}/100) x (1 - {decrease}/100) - 1 = {answer} as a decimal; enter the equivalent percentage."
      ],
      shortcut: "Successive percentages compound; they do not cancel by direct subtraction."
    }
  },
  {
    id: "percentage_change_expert_001",
    category: "percentages",
    tags: ["percentage_change"],
    difficulty: ["expert"],
    promptTemplate:
      "Revenue rises {firstGrowth}%, falls {decline}%, then rises {secondGrowth}%. What is the total percent change from the starting revenue? Enter the percentage as a number or with %.",
    variables: {
      firstGrowth: { type: "percentage", values: [12.5, 18.5, 24.5, 31.5] },
      decline: { type: "percentage", values: [7.5, 13.5, 19.5, 26.5] },
      secondGrowth: { type: "percentage", values: [6.5, 11.5, 16.5, 22.5] }
    },
    formula: {
      expression: "(1 + firstGrowth / 100) * (1 - decline / 100) * (1 + secondGrowth / 100) - 1"
    },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: [
        "Multiply all three sequential change factors, then subtract the original factor of 1.",
        "(1 + {firstGrowth}/100) x (1 - {decline}/100) x (1 + {secondGrowth}/100) - 1 = {answer} as a decimal; enter the equivalent percentage."
      ],
      shortcut: "Track a starting index of 100 through each change."
    }
  },
  {
    id: "reverse_percentage_intermediate_001",
    category: "percentages",
    tags: ["reverse_percentage"],
    difficulty: ["intermediate"],
    promptTemplate: "After a {percentage}% increase, a value is {finalValue}. What was the original value?",
    variables: {
      percentage: { type: "percentage", values: [12, 15, 18, 24, 35] },
      finalValue: { type: "integer", values: [560, 720, 945, 1_120, 1_440] }
    },
    formula: { expression: "finalValue / (1 + percentage / 100)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Divide the final value by its increase factor.", "{finalValue} / (1 + {percentage}/100) = {answer}."],
      shortcut: "Reverse a percentage by dividing, not by subtracting the percentage from the final value."
    }
  },
  {
    id: "reverse_percentage_advanced_001",
    category: "percentages",
    tags: ["reverse_percentage"],
    difficulty: ["advanced"],
    promptTemplate:
      "After successive increases of {firstIncrease}% and {secondIncrease}%, a value is {finalValue}. What was the original value?",
    variables: {
      firstIncrease: { type: "percentage", values: [8, 12, 18, 25] },
      secondIncrease: { type: "percentage", values: [6, 10, 15, 22] },
      finalValue: { type: "integer", values: [1_200, 1_800, 2_400, 3_600] }
    },
    formula: { expression: "finalValue / ((1 + firstIncrease / 100) * (1 + secondIncrease / 100))" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "Combine both increase factors, then divide the final value by their product.",
        "{finalValue} / ((1 + {firstIncrease}/100) x (1 + {secondIncrease}/100)) = {answer}."
      ],
      shortcut: "Reverse the full compounded multiplier in one division."
    }
  },
  {
    id: "reverse_percentage_expert_001",
    category: "percentages",
    tags: ["reverse_percentage"],
    difficulty: ["expert"],
    promptTemplate:
      "A value rises by {increase}% and then falls by {decrease}%, ending at {finalValue}. What was the original value?",
    variables: {
      increase: { type: "percentage", values: [17.5, 24.5, 32.5, 41.5] },
      decrease: { type: "percentage", values: [8.5, 13.5, 19.5, 27.5] },
      finalValue: { type: "integer", values: [4_200, 6_750, 9_600, 12_500] }
    },
    formula: { expression: "finalValue / ((1 + increase / 100) * (1 - decrease / 100))" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "Build the combined increase-then-decrease multiplier and divide the ending value by it.",
        "{finalValue} / ((1 + {increase}/100) x (1 - {decrease}/100)) = {answer}."
      ],
      shortcut: "Keep the two factors separate until the final division to reduce rounding drift."
    }
  },
  {
    id: "percentage_points_intermediate_001",
    category: "percentages",
    tags: ["percentage_points"],
    difficulty: ["intermediate"],
    promptTemplate:
      "A rate moves from {oldRate}% to {newRate}%. What is the increase in percentage points?",
    variables: {
      oldRate: { type: "percentage", values: [12.5, 16.25, 19.5, 23.75, 27.5] },
      newRate: { type: "percentage", values: [31.25, 34.5, 38.75, 42.5, 47.25] }
    },
    formula: { expression: "newRate - oldRate" },
    answerUnit: "percentage_points",
    explanationTemplate: {
      steps: ["Subtract the starting rate directly from the ending rate.", "{newRate}% - {oldRate}% = {answer} percentage points."],
      shortcut: "Percentage-point change is direct subtraction, even when rates include decimals."
    }
  },
  {
    id: "percentage_points_advanced_001",
    category: "percentages",
    tags: ["percentage_points"],
    difficulty: ["advanced"],
    promptTemplate:
      "A rate of {oldRate}% improves by {relativeIncrease}% relative to its starting level. How many percentage points does it gain?",
    variables: {
      oldRate: { type: "percentage", values: [18, 24, 32, 45, 58] },
      relativeIncrease: { type: "percentage", values: [12.5, 18.75, 25, 37.5, 42.5] }
    },
    formula: { expression: "oldRate * relativeIncrease / 100" },
    answerUnit: "percentage_points",
    explanationTemplate: {
      steps: [
        "Apply the relative improvement to the starting rate.",
        "{oldRate} x {relativeIncrease}/100 = {answer} percentage points."
      ],
      shortcut: "A relative percent change must be converted into points using the original rate."
    }
  },
  {
    id: "percentage_points_expert_001",
    category: "percentages",
    tags: ["percentage_points"],
    difficulty: ["expert"],
    promptTemplate:
      "A rate starts at {oldRate}%, rises {increase}% relatively, then falls {decrease}% relatively. What is the signed net change in percentage points?",
    variables: {
      oldRate: { type: "percentage", values: [22.5, 31.5, 44.5, 57.5] },
      increase: { type: "percentage", values: [14.5, 21.5, 28.5, 36.5] },
      decrease: { type: "percentage", values: [9.5, 16.5, 23.5, 31.5] }
    },
    formula: { expression: "oldRate * (1 + increase / 100) * (1 - decrease / 100) - oldRate" },
    answerUnit: "percentage_points",
    explanationTemplate: {
      steps: [
        "Apply both relative changes to the starting rate, then subtract the original rate.",
        "{oldRate} x (1 + {increase}/100) x (1 - {decrease}/100) - {oldRate} = {answer} percentage points."
      ],
      shortcut: "Treat the rate as the base value and preserve the sign of the final difference."
    }
  }
];

const fractionDecimalTemplates: QuestionTemplate[] = [
  {
    id: "fraction_conversion_beginner_001",
    category: "fractions_decimals_ratios",
    tags: ["fraction_conversion"],
    difficulty: ["beginner"],
    promptTemplate: "What decimal equals {numerator}/{denominator}?",
    variables: {
      numerator: { type: "integer", values: [1, 2, 3, 4, 5] },
      denominator: { type: "integer", values: [10, 20, 25, 50, 100] }
    },
    formula: { expression: "numerator / denominator" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Divide the numerator by the denominator.", "{numerator} / {denominator} = {answer}."]
    }
  },
  {
    id: "fraction_conversion_beginner_002",
    category: "fractions_decimals_ratios",
    tags: ["fraction_conversion"],
    difficulty: ["beginner"],
    promptTemplate: "What decimal equals {numerator}/{denominator}?",
    variables: {
      numerator: { type: "integer", values: [1, 2, 3, 4] },
      denominator: { type: "integer", values: [2, 4, 8, 16] }
    },
    formula: { expression: "numerator / denominator" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Use powers of two as friendly decimal fractions.", "{numerator} / {denominator} = {answer}."]
    }
  },
  {
    id: "fraction_conversion_beginner_003",
    category: "fractions_decimals_ratios",
    tags: ["fraction_conversion"],
    difficulty: ["beginner"],
    promptTemplate: "What percent value equals {numerator}/{denominator}? Enter the percentage as a number or with %.",
    variables: {
      numerator: { type: "integer", values: [1, 2, 3, 4, 5] },
      denominator: { type: "integer", values: [10, 20, 25, 50, 100] }
    },
    formula: { expression: "numerator / denominator" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: ["Convert the fraction to a decimal, then express it as a percentage.", "{numerator} / {denominator} = {answer} as a decimal; enter the equivalent percentage."]
    }
  },
  {
    id: "fraction_conversion_beginner_004",
    category: "fractions_decimals_ratios",
    tags: ["fraction_conversion"],
    difficulty: ["beginner"],
    promptTemplate: "What decimal equals {whole} + {numerator}/{denominator}?",
    variables: {
      whole: { type: "integer", values: [1, 2, 3] },
      numerator: { type: "integer", values: [1, 2, 3] },
      denominator: { type: "integer", values: [4, 10, 20] }
    },
    formula: { expression: "whole + numerator / denominator" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Convert the fraction part, then add the whole number.", "{whole} + {numerator}/{denominator} = {answer}."]
    }
  },
  {
    id: "fraction_conversion_beginner_005",
    category: "fractions_decimals_ratios",
    tags: ["fraction_conversion"],
    difficulty: ["beginner"],
    promptTemplate: "What is {decimalValue} as a percent value? Enter the percentage as a number or with %.",
    variables: {
      decimalValue: { type: "decimal", values: [0.1, 0.2, 0.25, 0.5, 0.75] }
    },
    formula: { expression: "decimalValue" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: ["Express the decimal as a percentage.", "{decimalValue} is {answer} as a decimal; enter the equivalent percentage."]
    }
  },
  {
    id: "fraction_conversion_beginner_006",
    category: "fractions_decimals_ratios",
    tags: ["fraction_conversion"],
    difficulty: ["beginner"],
    promptTemplate: "What decimal equals {percentValue}%?",
    variables: {
      percentValue: { type: "percentage", values: [10, 20, 25, 40, 50, 75] }
    },
    formula: { expression: "percentValue / 100" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Divide the percent value by 100.", "{percentValue} / 100 = {answer}."]
    }
  },
  {
    id: "ratio_conversion_beginner_001",
    category: "fractions_decimals_ratios",
    tags: ["ratio_conversion"],
    difficulty: ["beginner"],
    promptTemplate: "A mix has {part} out of {total} units. What decimal share is that?",
    variables: {
      part: { type: "integer", values: [1, 2, 4, 5] },
      total: { type: "integer", values: [10, 20, 40, 100] }
    },
    formula: { expression: "part / total" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["A share is part divided by total.", "{part} / {total} = {answer}."]
    }
  },
  {
    id: "ratio_conversion_beginner_002",
    category: "fractions_decimals_ratios",
    tags: ["ratio_conversion"],
    difficulty: ["beginner"],
    promptTemplate: "What percent value is {part} out of {total}? Enter the percentage as a number or with %.",
    variables: {
      part: { type: "integer", values: [1, 2, 4, 5] },
      total: { type: "integer", values: [10, 20, 40, 100] }
    },
    formula: { expression: "part / total" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: ["Divide part by total, then express the result as a percentage.", "{part} / {total} = {answer} as a decimal; enter the equivalent percentage."]
    }
  }
];

const progressiveFractionRatioTemplates: QuestionTemplate[] = [
  {
    id: "fraction_conversion_beginner_007",
    category: "fractions_decimals_ratios",
    tags: ["fraction_conversion"],
    difficulty: ["beginner"],
    promptTemplate: "What decimal equals {numerator}/3?",
    variables: {
      numerator: { type: "integer", values: [1, 2] }
    },
    formula: { expression: "numerator / 3" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Divide {numerator} by 3 and keep the repeating decimal pattern.", "{numerator} / 3 = {answer}."],
      shortcut: "One third is 0.333 repeating; two thirds is twice that value."
    }
  },
  {
    id: "fraction_conversion_beginner_008",
    category: "fractions_decimals_ratios",
    tags: ["fraction_conversion"],
    difficulty: ["beginner"],
    promptTemplate: "What decimal equals {numerator}/6?",
    variables: {
      numerator: { type: "integer", values: [1, 5] }
    },
    formula: { expression: "numerator / 6" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Divide {numerator} by 6 and keep the repeating decimal pattern.", "{numerator} / 6 = {answer}."],
      shortcut: "One sixth is half of one third; five sixths is one minus one sixth."
    }
  },
  {
    id: "fraction_conversion_intermediate_001",
    category: "fractions_decimals_ratios",
    tags: ["fraction_conversion"],
    difficulty: ["intermediate"],
    promptTemplate: "What decimal equals {numerator}/{denominator}?",
    variables: {
      numerator: { type: "integer", values: [1, 2, 4] },
      denominator: { type: "integer", values: [3, 6, 9, 12] }
    },
    formula: { expression: "numerator / denominator" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Reduce the fraction when possible, then divide.", "{numerator} / {denominator} = {answer}."],
      shortcut: "Use the thirds and sixths anchors before scaling to ninths or twelfths."
    }
  },
  {
    id: "fraction_conversion_advanced_001",
    category: "fractions_decimals_ratios",
    tags: ["fraction_conversion"],
    difficulty: ["advanced"],
    promptTemplate: "What decimal equals {whole} + {numerator}/{denominator}?",
    variables: {
      whole: { type: "integer", values: [2, 4, 7, 9] },
      numerator: { type: "integer", values: [1, 2, 5] },
      denominator: { type: "integer", values: [3, 6, 12] }
    },
    formula: { expression: "whole + numerator / denominator" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Convert the fractional part using a thirds or sixths anchor, then add the whole number.", "{whole} + {numerator}/{denominator} = {answer}."],
      shortcut: "Keep the repeating fractional part separate until the final addition."
    }
  },
  {
    id: "fraction_conversion_expert_001",
    category: "fractions_decimals_ratios",
    tags: ["fraction_conversion"],
    difficulty: ["expert"],
    promptTemplate: "What is ({firstNumerator}/{firstDenominator}) / ({secondNumerator}/{secondDenominator})?",
    variables: {
      firstNumerator: { type: "integer", values: [5, 7, 11, 13] },
      firstDenominator: { type: "integer", values: [6, 9, 12, 15] },
      secondNumerator: { type: "integer", values: [2, 4, 5] },
      secondDenominator: { type: "integer", values: [3, 6, 8] }
    },
    formula: { expression: "(firstNumerator / firstDenominator) / (secondNumerator / secondDenominator)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "Multiply the first fraction by the reciprocal of the second, then simplify.",
        "({firstNumerator}/{firstDenominator}) / ({secondNumerator}/{secondDenominator}) = {answer}."
      ],
      shortcut: "Cancel common factors before multiplying across."
    }
  },
  {
    id: "ratio_simplification_beginner_001",
    category: "fractions_decimals_ratios",
    tags: ["ratio_conversion"],
    difficulty: ["beginner"],
    promptTemplate:
      "Simplify the ratio (2 x {factor}):(3 x {factor}). What is the sum of the two simplified terms?",
    variables: {
      factor: { type: "integer", values: [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20] }
    },
    formula: { expression: "2 + 3" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Divide both terms by the common factor {factor} to get 2:3.", "2 + 3 = {answer}."],
      shortcut: "A common multiplier cancels from every term in a ratio."
    }
  },
  {
    id: "ratio_simplification_intermediate_001",
    category: "fractions_decimals_ratios",
    tags: ["ratio_conversion"],
    difficulty: ["intermediate"],
    promptTemplate:
      "Simplify the ratio (3 x {factor}):(5 x {factor}). What is the sum of the two simplified terms?",
    variables: {
      factor: { type: "integer", values: [4, 6, 8, 9, 12, 14, 15, 18, 21, 24, 27, 30] }
    },
    formula: { expression: "3 + 5" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Divide both terms by their common factor {factor} to get 3:5.", "3 + 5 = {answer}."],
      shortcut: "Remove the shared multiplier before doing anything with the ratio."
    }
  },
  {
    id: "ratio_simplification_advanced_001",
    category: "fractions_decimals_ratios",
    tags: ["ratio_conversion"],
    difficulty: ["advanced"],
    promptTemplate:
      "Simplify the ratio (12 x {factor}):(18 x {factor}). What is the sum of the two fully simplified terms?",
    variables: {
      factor: { type: "integer", values: [5, 7, 8, 11, 13, 16, 19, 22, 25, 28, 32, 36] }
    },
    formula: { expression: "2 + 3" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Cancel {factor}, then reduce 12:18 by 6 to get 2:3.", "2 + 3 = {answer}."],
      shortcut: "Cancel visible common factors first, then check the remaining ratio for another common factor."
    }
  },
  {
    id: "ratio_simplification_expert_001",
    category: "fractions_decimals_ratios",
    tags: ["ratio_conversion"],
    difficulty: ["expert"],
    promptTemplate:
      "Simplify the three-part ratio (6 x {factor}):(9 x {factor}):(15 x {factor}). What is the sum of the fully simplified terms?",
    variables: {
      factor: { type: "integer", values: [7, 11, 13, 17, 19, 23, 26, 29, 31, 34, 38, 42] }
    },
    formula: { expression: "2 + 3 + 5" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Cancel {factor}, then divide 6:9:15 by 3 to get 2:3:5.", "2 + 3 + 5 = {answer}."],
      shortcut: "For a multi-part ratio, divide every term by the same greatest common factor."
    }
  }
];

export const starterQuestionTemplates: QuestionTemplate[] = [
  ...additionTemplates,
  ...subtractionTemplates,
  ...multiplicationTemplates,
  ...divisionTemplates,
  ...progressiveArithmeticTemplates,
  ...mixedOperationTemplates,
  ...percentageTemplates,
  ...progressivePercentageTemplates,
  ...fractionDecimalTemplates,
  ...progressiveFractionRatioTemplates,
  ...growthQuestionTemplates,
  ...businessMathTemplates,
  ...weightedAverageTemplates,
  ...caseStyleQuestionTemplates
];
