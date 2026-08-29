import type { QuestionTemplate } from "@/lib/domain";

export const growthQuestionTemplates: QuestionTemplate[] = [
  {
    id: "compound_growth_beginner_001",
    category: "growth_compounding",
    tags: ["compound_growth"],
    difficulty: ["beginner"],
    promptTemplate:
      "A service starts with {startingUsers} users and grows {growthRate}% per year for {years} years. How many users will it have?",
    variables: {
      startingUsers: { type: "integer", values: [640, 1_280, 2_560, 5_120, 10_240] },
      growthRate: { type: "percentage", values: [12.5, 25, 50] },
      years: { type: "integer", values: [2] }
    },
    formula: { expression: "startingUsers * (1 + growthRate / 100) ^ years" },
    answerUnit: "users",
    explanationTemplate: {
      steps: [
        "Use final users = starting users x (1 + growth rate) ^ years.",
        "Substitute {startingUsers} x (1 + {growthRate}/100) ^ {years}.",
        "The service will have {answer} users."
      ],
      shortcut: "Convert {growthRate}% to a growth factor, square it, then multiply by {startingUsers}."
    }
  },
  {
    id: "compound_growth_intermediate_001",
    category: "growth_compounding",
    tags: ["compound_growth", "revenue"],
    difficulty: ["intermediate"],
    promptTemplate:
      "Annual revenue is {startingRevenue} million and compounds at {growthRate}% for {years} years. What is revenue after year {years}, in millions?",
    variables: {
      startingRevenue: { type: "currency", values: [64, 128, 256, 512, 1_024] },
      growthRate: { type: "percentage", values: [12.5, 25, 50] },
      years: { type: "integer", values: [3] }
    },
    formula: { expression: "startingRevenue * (1 + growthRate / 100) ^ years" },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Use final revenue = starting revenue x (1 + growth rate) ^ years.",
        "Substitute {startingRevenue} x (1 + {growthRate}/100) ^ {years}.",
        "Revenue after year {years} is {answer} million."
      ],
      shortcut: "Calculate the {growthRate}% growth factor once, raise it to {years}, then apply it to revenue."
    }
  },
  {
    id: "compound_growth_advanced_001",
    category: "growth_compounding",
    tags: ["compound_growth", "revenue"],
    difficulty: ["advanced"],
    promptTemplate:
      "Revenue is {startingRevenue} million. It grows {firstRate}% in year one and {secondRate}% in year two. What is revenue after year two, in millions?",
    variables: {
      startingRevenue: { type: "currency", values: [64, 128, 256, 512] },
      firstRate: { type: "percentage", values: [12.5, 25, 50] },
      secondRate: { type: "percentage", values: [12.5, 25, 50] }
    },
    formula: { expression: "startingRevenue * (1 + firstRate / 100) * (1 + secondRate / 100)" },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Apply each year's growth factor to the result from the prior year.",
        "Substitute {startingRevenue} x (1 + {firstRate}/100) x (1 + {secondRate}/100).",
        "Revenue after year two is {answer} million."
      ],
      shortcut: "Do not add the two rates; multiply the two annual growth factors."
    }
  },
  {
    id: "compound_growth_expert_001",
    category: "growth_compounding",
    tags: ["compound_growth", "margin", "profit"],
    difficulty: ["expert"],
    promptTemplate:
      "Revenue is {startingRevenue} million and compounds at {growthRate}% for {years} years. At a {margin}% operating margin, what is projected operating profit in millions?",
    variables: {
      startingRevenue: { type: "currency", values: [256, 512, 1_024, 2_048] },
      growthRate: { type: "percentage", values: [25, 50] },
      years: { type: "integer", values: [4] },
      margin: { type: "percentage", values: [25, 50, 75] }
    },
    formula: { expression: "startingRevenue * (1 + growthRate / 100) ^ years * margin / 100" },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "First compound revenue, then apply the operating margin to the projected revenue.",
        "Substitute {startingRevenue} x (1 + {growthRate}/100) ^ {years} x {margin}/100.",
        "Projected operating profit is {answer} million."
      ],
      shortcut: "Keep the growth factor and margin as separate multipliers so the setup stays auditable."
    }
  },
  {
    id: "cagr_beginner_001",
    category: "growth_compounding",
    tags: ["cagr"],
    difficulty: ["beginner"],
    promptTemplate:
      "A customer base grows from {startingValue} to {endingValue} over {years} years. What is the CAGR? Enter the percentage value.",
    variables: {
      startingValue: { type: "integer", values: [256] },
      endingValue: {
        type: "integer",
        values: [289, 324, 361, 400, 441, 484, 529, 576, 625, 676, 729, 784]
      },
      years: { type: "integer", values: [2] }
    },
    formula: { expression: "(endingValue / startingValue) ^ (1 / years) - 1" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: [
        "Use CAGR = (ending value / starting value) ^ (1 / years) - 1.",
        "Substitute ({endingValue} / {startingValue}) ^ (1 / {years}) - 1.",
        "The CAGR is {answer} as a decimal; enter the equivalent percentage."
      ],
      shortcut: "The endpoints are same-order perfect powers, so compare their roots before finding the percent change."
    }
  },
  {
    id: "cagr_intermediate_001",
    category: "growth_compounding",
    tags: ["cagr"],
    difficulty: ["intermediate"],
    promptTemplate:
      "Annual orders increase from {startingValue} to {endingValue} over {years} years. What is the CAGR? Enter the percentage value.",
    variables: {
      startingValue: { type: "integer", values: [4_096] },
      endingValue: {
        type: "integer",
        values: [4_913, 5_832, 6_859, 8_000, 9_261, 10_648, 12_167, 13_824, 15_625, 17_576, 19_683, 21_952]
      },
      years: { type: "integer", values: [3] }
    },
    formula: { expression: "(endingValue / startingValue) ^ (1 / years) - 1" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: [
        "Use CAGR = (ending value / starting value) ^ (1 / years) - 1.",
        "Substitute ({endingValue} / {startingValue}) ^ (1 / {years}) - 1.",
        "The CAGR is {answer} as a decimal; enter the equivalent percentage."
      ],
      shortcut: "Take the ratio's {years}-year root, then subtract 1 and convert to a percentage."
    }
  },
  {
    id: "cagr_advanced_001",
    category: "growth_compounding",
    tags: ["cagr"],
    difficulty: ["advanced"],
    promptTemplate:
      "An indexed sales measure rises from {startingValue} to {endingValue} over {years} years. What is the CAGR? Enter the percentage value.",
    variables: {
      startingValue: { type: "integer", values: [65_536] },
      endingValue: {
        type: "integer",
        values: [83_521, 104_976, 130_321, 160_000, 194_481, 234_256, 279_841, 331_776, 390_625, 456_976, 531_441, 614_656]
      },
      years: { type: "integer", values: [4] }
    },
    formula: { expression: "(endingValue / startingValue) ^ (1 / years) - 1" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: [
        "Use CAGR = (ending value / starting value) ^ (1 / years) - 1.",
        "Substitute ({endingValue} / {startingValue}) ^ (1 / {years}) - 1.",
        "The CAGR is {answer} as a decimal; enter the equivalent percentage."
      ],
      shortcut: "Recognize the fourth-power endpoints, compare their roots, and convert that factor to growth."
    }
  },
  {
    id: "cagr_expert_001",
    category: "growth_compounding",
    tags: ["cagr"],
    difficulty: ["expert"],
    promptTemplate:
      "Platform transactions grow from {startingValue} to {endingValue} over {years} years. What is the CAGR? Enter the percentage value.",
    variables: {
      startingValue: { type: "integer", values: [1_048_576] },
      endingValue: {
        type: "integer",
        values: [
          1_419_857,
          1_889_568,
          2_476_099,
          3_200_000,
          4_084_101,
          5_153_632,
          6_436_343,
          7_962_624,
          9_765_625,
          11_881_376,
          14_348_907,
          17_210_368
        ]
      },
      years: { type: "integer", values: [5] }
    },
    formula: { expression: "(endingValue / startingValue) ^ (1 / years) - 1" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: [
        "Use CAGR = (ending value / starting value) ^ (1 / years) - 1.",
        "Substitute ({endingValue} / {startingValue}) ^ (1 / {years}) - 1.",
        "The CAGR is {answer} as a decimal; enter the equivalent percentage."
      ],
      shortcut: "Recognize the fifth-power endpoints, compare their roots, and convert that factor to growth."
    }
  },
  {
    id: "rule_of_72_beginner_001",
    category: "growth_compounding",
    tags: ["rule_of_72"],
    difficulty: ["beginner"],
    promptTemplate:
      "Using the Rule of 72, approximately how many years will an investment take to double at {annualRate}% annual growth?",
    variables: {
      annualRate: { type: "percentage", values: [3, 4, 6, 8, 9, 12, 16, 18, 24, 36, 48, 72] }
    },
    formula: { expression: "72 / annualRate" },
    answerUnit: "years",
    explanationTemplate: {
      steps: [
        "The Rule of 72 estimates doubling time as 72 divided by the annual growth rate.",
        "Substitute 72 / {annualRate}.",
        "The estimated doubling time is {answer} years."
      ],
      shortcut: "Find the factor paired with {annualRate} in 72's multiplication table."
    }
  },
  {
    id: "rule_of_72_intermediate_001",
    category: "growth_compounding",
    tags: ["rule_of_72"],
    difficulty: ["intermediate"],
    promptTemplate:
      "Using the Rule of 72, what annual growth rate is needed to double in approximately {targetYears} years? Enter the percentage value.",
    variables: {
      targetYears: { type: "integer", values: [3, 4, 6, 8, 9, 12, 16, 18, 24, 36, 48, 72] }
    },
    formula: { expression: "72 / targetYears / 100" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: [
        "Rearrange the Rule of 72: annual rate = 72 / doubling time.",
        "Substitute 72 / {targetYears}.",
        "The required annual growth rate is {answer} as a decimal; enter the equivalent percentage."
      ],
      shortcut: "Find the factor paired with {targetYears} in 72's multiplication table."
    }
  },
  {
    id: "rule_of_72_advanced_001",
    category: "growth_compounding",
    tags: ["rule_of_72"],
    difficulty: ["advanced"],
    promptTemplate:
      "Using the Rule of 72, approximately how many years will an investment growing at {annualRate}% take to quadruple?",
    variables: {
      annualRate: { type: "percentage", values: [3, 4, 6, 8, 9, 12, 16, 18, 24, 36, 48, 72] }
    },
    formula: { expression: "2 * 72 / annualRate" },
    answerUnit: "years",
    explanationTemplate: {
      steps: [
        "Quadrupling requires two doublings, each estimated with the Rule of 72.",
        "Substitute 2 x 72 / {annualRate}.",
        "The estimated time to quadruple is {answer} years."
      ],
      shortcut: "Calculate one doubling period, then double that time."
    }
  },
  {
    id: "rule_of_72_expert_001",
    category: "growth_compounding",
    tags: ["rule_of_72"],
    difficulty: ["expert"],
    promptTemplate:
      "Using the Rule of 72, approximately how many years sooner will an investment at {fastRate}% double than one at {slowRate}%?",
    variables: {
      slowRate: { type: "percentage", values: [6] },
      fastRate: { type: "percentage", values: [7.2, 8, 9, 10, 12, 16, 18, 24, 36, 48, 72] }
    },
    formula: { expression: "72 / slowRate - 72 / fastRate" },
    answerUnit: "years",
    explanationTemplate: {
      steps: [
        "Estimate each doubling time separately, then subtract the faster investment's time.",
        "Substitute 72 / {slowRate} - 72 / {fastRate}.",
        "The faster investment doubles approximately {answer} years sooner."
      ],
      shortcut: "The {slowRate}% investment takes 12 years; compare that directly with 72 / {fastRate}."
    }
  },
  {
    id: "rule_of_72_expert_002",
    category: "growth_compounding",
    tags: ["rule_of_72"],
    difficulty: ["expert"],
    promptTemplate:
      "Using the Rule of 72, what annual growth rate is needed to quadruple in approximately {targetYears} years? Enter the percentage value.",
    variables: {
      targetYears: { type: "integer", values: [3, 4, 6, 8, 9, 12, 16, 18, 24, 36, 48, 72] }
    },
    formula: { expression: "2 * 72 / targetYears / 100" },
    answerUnit: "percentage",
    explanationTemplate: {
      steps: [
        "Quadrupling requires two doublings, so total time is 2 x 72 / annual rate.",
        "Rearrange and substitute 2 x 72 / {targetYears}.",
        "The required annual growth rate is {answer} as a decimal; enter the equivalent percentage."
      ],
      shortcut: "Allocate half the total time to each doubling, then divide 72 by that period."
    }
  }
];
