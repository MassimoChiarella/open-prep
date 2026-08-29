import type { QuestionTemplate } from "@/lib/domain";

export const mixedOperationTemplates: QuestionTemplate[] = [
  {
    id: "mixed_operations_beginner_001",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["beginner"],
    promptTemplate: "What is ({a} + {b}) x {c}?",
    variables: {
      a: { type: "integer", values: [20, 30, 40, 50, 60] },
      b: { type: "integer", values: [10, 20, 30, 40] },
      c: { type: "integer", values: [2, 3, 4, 5] }
    },
    formula: { expression: "(a + b) * c" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Add inside the parentheses first.", "({a} + {b}) x {c} = {answer}."]
    }
  },
  {
    id: "mixed_operations_beginner_002",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} x {b} + {c}?",
    variables: {
      a: { type: "integer", values: [8, 10, 12, 15, 20] },
      b: { type: "integer", values: [3, 4, 5, 6] },
      c: { type: "integer", values: [10, 20, 30, 50] }
    },
    formula: { expression: "a * b + c" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Multiply first, then add.", "{a} x {b} + {c} = {answer}."]
    }
  },
  {
    id: "mixed_operations_beginner_003",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["beginner"],
    promptTemplate: "What is ({a} - {b}) / {divisor}?",
    variables: {
      a: { type: "integer", values: [180, 240, 300, 360] },
      b: { type: "integer", values: [60, 120] },
      divisor: { type: "integer", values: [3, 6, 10, 12] }
    },
    formula: { expression: "(a - b) / divisor" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Subtract inside the parentheses first.", "({a} - {b}) / {divisor} = {answer}."]
    }
  },
  {
    id: "mixed_operations_beginner_004",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} + {b} x {c}?",
    variables: {
      a: { type: "integer", values: [25, 50, 75, 100] },
      b: { type: "integer", values: [10, 20, 30, 40] },
      c: { type: "integer", values: [2, 3, 4, 5] }
    },
    formula: { expression: "a + b * c" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Multiply before adding.", "{a} + {b} x {c} = {answer}."]
    }
  },
  {
    id: "mixed_operations_beginner_005",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["beginner"],
    promptTemplate: "What is ({a} + {b}) / {divisor}?",
    variables: {
      a: { type: "integer", values: [120, 180, 240, 300] },
      b: { type: "integer", values: [60, 120, 180] },
      divisor: { type: "integer", values: [3, 6, 10, 12] }
    },
    formula: { expression: "(a + b) / divisor" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Add inside the parentheses, then divide.", "({a} + {b}) / {divisor} = {answer}."]
    }
  },
  {
    id: "mixed_operations_beginner_006",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} x ({b} - {c})?",
    variables: {
      a: { type: "integer", values: [2, 3, 4, 5, 6] },
      b: { type: "integer", values: [20, 30, 40, 50] },
      c: { type: "integer", values: [5, 10, 15] }
    },
    formula: { expression: "a * (b - c)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Subtract inside the parentheses, then multiply.", "{a} x ({b} - {c}) = {answer}."]
    }
  },
  {
    id: "mixed_operations_beginner_007",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} - {b} x {c}?",
    variables: {
      a: { type: "integer", values: [200, 300, 400, 500] },
      b: { type: "integer", values: [10, 20, 30] },
      c: { type: "integer", values: [2, 3, 4] }
    },
    formula: { expression: "a - b * c" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Multiply before subtracting.", "{a} - {b} x {c} = {answer}."]
    }
  },
  {
    id: "mixed_operations_beginner_008",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} / {divisor} + {b}?",
    variables: {
      a: { type: "integer", values: [120, 240, 360, 480] },
      divisor: { type: "integer", values: [4, 6, 8, 12] },
      b: { type: "integer", values: [10, 20, 30, 40] }
    },
    formula: { expression: "a / divisor + b" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Divide first, then add.", "{a} / {divisor} + {b} = {answer}."]
    }
  },
  {
    id: "mixed_operations_beginner_009",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} x ({b} / {divisor}) + {c}?",
    variables: {
      a: { type: "integer", values: [5, 10, 15, 20] },
      b: { type: "integer", values: [12, 24, 36] },
      divisor: { type: "integer", values: [3, 4, 6, 12] },
      c: { type: "integer", values: [20, 30, 50, 80] }
    },
    formula: { expression: "a * (b / divisor) + c" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Divide inside the parentheses first, then multiply and add.", "{a} x ({b} / {divisor}) + {c} = {answer}."]
    }
  },
  {
    id: "mixed_operations_beginner_010",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} - ({b} + {c}) / {divisor}?",
    variables: {
      a: { type: "integer", values: [200, 300, 400, 500] },
      b: { type: "integer", values: [60, 120, 180] },
      c: { type: "integer", values: [60, 120] },
      divisor: { type: "integer", values: [3, 6, 12] }
    },
    formula: { expression: "a - (b + c) / divisor" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Add inside the parentheses, divide, then subtract.", "{a} - ({b} + {c}) / {divisor} = {answer}."]
    }
  },
  {
    id: "mixed_operations_beginner_011",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["beginner"],
    promptTemplate: "What is ({a} + {b}) x ({c} - {d})?",
    variables: {
      a: { type: "integer", values: [20, 30, 40, 50] },
      b: { type: "integer", values: [10, 20, 30] },
      c: { type: "integer", values: [12, 15, 20] },
      d: { type: "integer", values: [2, 5, 10] }
    },
    formula: { expression: "(a + b) * (c - d)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Resolve both parentheses before multiplying.", "({a} + {b}) x ({c} - {d}) = {answer}."]
    }
  },
  {
    id: "mixed_operations_beginner_012",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["beginner"],
    promptTemplate: "What is {a} / {divisorA} + {b} / {divisorB}?",
    variables: {
      a: { type: "integer", values: [120, 240, 360] },
      divisorA: { type: "integer", values: [6, 12, 24] },
      b: { type: "integer", values: [80, 160, 320] },
      divisorB: { type: "integer", values: [4, 8, 16] }
    },
    formula: { expression: "a / divisorA + b / divisorB" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Complete each division, then add the results.", "{a} / {divisorA} + {b} / {divisorB} = {answer}."]
    }
  },
  {
    id: "mixed_operations_intermediate_001",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["intermediate"],
    promptTemplate: "What is ({a} + {b}) x {c} - {d}?",
    variables: {
      a: { type: "integer", values: [125, 175, 225, 275, 325] },
      b: { type: "integer", values: [35, 65, 85, 115] },
      c: { type: "integer", values: [6, 8, 12, 15] },
      d: { type: "integer", values: [125, 250, 375, 500] }
    },
    formula: { expression: "(a + b) * c - d" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "Add inside the parentheses, multiply that result by {c}, then subtract {d}.",
        "({a} + {b}) x {c} - {d} = {answer}."
      ],
      shortcut: "Keep the parenthetical subtotal intact before applying the remaining operations."
    }
  },
  {
    id: "mixed_operations_advanced_001",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["advanced"],
    promptTemplate: "What is {a} x ({b} - {c}) / {divisor} + {d}?",
    variables: {
      a: { type: "integer", values: [48, 72, 96, 125] },
      b: { type: "integer", values: [385, 475, 625, 840] },
      c: { type: "integer", values: [85, 115, 175, 240] },
      divisor: { type: "integer", values: [8, 12, 16, 24] },
      d: { type: "integer", values: [275, 450, 625, 875] }
    },
    formula: { expression: "a * (b - c) / divisor + d" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "Resolve the subtraction, multiply, divide, and then add the final adjustment.",
        "{a} x ({b} - {c}) / {divisor} + {d} = {answer}."
      ],
      shortcut: "Reduce {a} against {divisor} before multiplying when they share a factor."
    }
  },
  {
    id: "mixed_operations_expert_001",
    category: "arithmetic",
    tags: ["mixed_operations"],
    difficulty: ["expert"],
    promptTemplate: "What is (({a} + {b}) x ({c} - {d})) / {divisor} + {e}?",
    variables: {
      a: { type: "decimal", values: [245.5, 375.25, 625.5, 875.75] },
      b: { type: "decimal", values: [84.5, 124.75, 174.5, 224.25] },
      c: { type: "integer", values: [72, 96, 125, 144] },
      d: { type: "integer", values: [18, 24, 35, 48] },
      divisor: { type: "integer", values: [9, 12, 18, 24] },
      e: { type: "decimal", values: [425.5, 675.25, 925.75, 1_250.5] }
    },
    formula: { expression: "((a + b) * (c - d)) / divisor + e" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "Resolve both inner parentheses, reduce before multiplying where possible, divide, then add {e}.",
        "(({a} + {b}) x ({c} - {d})) / {divisor} + {e} = {answer}."
      ],
      shortcut: "Preserve exact intermediate values and postpone decimal rounding until the end."
    }
  }
];
