import type { CaseStyleQuestionTemplate, InterviewMathSpec } from "@/lib/domain";

function interviewMath(
  correctEquation: string,
  incorrectSetup: string,
  incorrectFormula: string,
  correctInterpretation: string,
  incorrectInterpretationOne: string,
  incorrectInterpretationTwo: string
): InterviewMathSpec {
  return {
    expectedUnit: "m",
    equationOptions: [
      { id: "equation-correct", label: correctEquation, formulaCorrect: true, setupCorrect: true },
      { id: "equation-setup", label: incorrectSetup, formulaCorrect: true, setupCorrect: false },
      { id: "equation-formula", label: incorrectFormula, formulaCorrect: false, setupCorrect: false }
    ],
    interpretationOptions: [
      { id: "interpretation-correct", label: correctInterpretation, isCorrect: true },
      { id: "interpretation-one", label: incorrectInterpretationOne, isCorrect: false },
      { id: "interpretation-two", label: incorrectInterpretationTwo, isCorrect: false }
    ]
  };
}

export const caseStyleQuestionTemplates: CaseStyleQuestionTemplate[] = [
  {
    id: "case_market_share_profit_intermediate_001",
    category: "case_math",
    tags: ["market_share", "revenue", "margin"],
    difficulty: ["intermediate"],
    caseStyle: {
      calculationStepCount: 2,
      industry: "consumer_goods",
      interviewMath: interviewMath(
        "${marketSizeMillions}M x ({marketShare} / 100) x ({operatingMargin} / 100)",
        "${marketSizeMillions}M x {marketShare} x {operatingMargin}",
        "${marketSizeMillions}M x ({marketShare} + {operatingMargin}) / 100",
        "Operating profit rises when either market share or operating margin rises, all else equal.",
        "The result is total market profit before applying the company's share.",
        "Operating profit is independent of the operating margin."
      )
    },
    promptTemplate:
      "A consumer market is worth ${marketSizeMillions}M. A company holds {marketShare}% share and earns a {operatingMargin}% operating margin. What is operating profit? Enter $M.",
    variables: {
      marketSizeMillions: { type: "currency", values: [240, 320, 480, 600, 800] },
      marketShare: { type: "percentage", values: [10, 15, 20, 25] },
      operatingMargin: { type: "percentage", values: [10, 15, 20, 25] }
    },
    formula: { expression: "marketSizeMillions * marketShare / 100 * operatingMargin / 100" },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Company revenue equals market size x market share; operating profit equals company revenue x margin.",
        "Calculate 1: Company revenue is ${marketSizeMillions}M x {marketShare}%.",
        "Calculate 2: ${marketSizeMillions}M x {marketShare}% x {operatingMargin}% = ${answer}M.",
        "Interpret: At the stated share and margin, annual operating profit is ${answer}M."
      ]
    }
  },
  {
    id: "case_saas_gross_profit_intermediate_001",
    category: "case_math",
    tags: ["revenue", "margin", "unit_conversion"],
    difficulty: ["intermediate"],
    caseStyle: {
      calculationStepCount: 2,
      industry: "saas",
      interviewMath: interviewMath(
        "{customersThousands}K x ${monthlyArpu} x 12 x ({grossMargin} / 100) / 1,000",
        "{customersThousands}K x ${monthlyArpu} x 12 x ({grossMargin} / 100)",
        "{customersThousands}K x ${monthlyArpu} / 12 x (1 - {grossMargin} / 100)",
        "Annual gross profit scales with customers, monthly ARPU, and gross margin.",
        "The result is monthly revenue before gross margin.",
        "A higher gross margin lowers annual gross profit."
      )
    },
    promptTemplate:
      "A SaaS company has {customersThousands}K customers paying ${monthlyArpu} per month at a {grossMargin}% gross margin. What is annual gross profit? Enter $M.",
    variables: {
      customersThousands: { type: "integer", values: [20, 40, 50, 80, 100] },
      monthlyArpu: { type: "currency", values: [20, 25, 40, 50] },
      grossMargin: { type: "percentage", values: [60, 70, 75, 80] }
    },
    formula: { expression: "customersThousands * monthlyArpu * 12 * grossMargin / 100 / 1000" },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Annual revenue equals customers x monthly ARPU x 12; gross profit equals revenue x gross margin.",
        "Calculate 1: Annual revenue is {customersThousands}K x ${monthlyArpu} x 12, converted from $K to $M.",
        "Calculate 2: Apply the {grossMargin}% gross margin to get ${answer}M.",
        "Interpret: The current customer base produces ${answer}M of annual gross profit."
      ]
    }
  },
  {
    id: "case_factory_contribution_intermediate_001",
    category: "case_math",
    tags: ["capacity_utilization", "contribution_margin", "unit_conversion"],
    difficulty: ["intermediate"],
    caseStyle: {
      calculationStepCount: 2,
      industry: "manufacturing",
      interviewMath: interviewMath(
        "{dailyCapacityThousands}K x {operatingDays} x ({utilization} / 100) x ${contributionPerUnit} / 1,000",
        "{dailyCapacityThousands}K x {operatingDays} x {utilization} x ${contributionPerUnit} / 1,000",
        "{dailyCapacityThousands}K x {operatingDays} x ({utilization} / 100) / ${contributionPerUnit}",
        "The result is annual contribution at the stated plant utilization.",
        "The result is revenue at full capacity before utilization.",
        "Higher utilization lowers annual contribution."
      )
    },
    promptTemplate:
      "A plant can make {dailyCapacityThousands}K units per day, runs {operatingDays} days at {utilization}% utilization, and earns ${contributionPerUnit} contribution per unit. What is annual contribution? Enter $M.",
    variables: {
      dailyCapacityThousands: { type: "integer", values: [4, 5, 8, 10] },
      operatingDays: { type: "integer", values: [240, 250, 300] },
      utilization: { type: "percentage", values: [60, 75, 80, 90] },
      contributionPerUnit: { type: "currency", values: [5, 8, 10, 12] }
    },
    formula: {
      expression: "dailyCapacityThousands * operatingDays * utilization / 100 * contributionPerUnit / 1000"
    },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Annual output equals daily capacity x operating days x utilization; contribution equals output x contribution per unit.",
        "Calculate 1: Annual output is {dailyCapacityThousands}K x {operatingDays} x {utilization}%.",
        "Calculate 2: Multiply output by ${contributionPerUnit} per unit and convert $K to $M to get ${answer}M.",
        "Interpret: The plant generates ${answer}M of annual contribution at the stated utilization."
      ]
    }
  },
  {
    id: "case_growth_share_revenue_intermediate_001",
    category: "case_math",
    tags: ["simple_growth", "market_share", "revenue"],
    difficulty: ["intermediate"],
    caseStyle: {
      calculationStepCount: 2,
      industry: "telecom",
      interviewMath: interviewMath(
        "${currentMarketMillions}M x (1 + {growthRate} / 100) x ({marketShare} / 100)",
        "${currentMarketMillions}M x (1 + {growthRate}) x {marketShare}",
        "${currentMarketMillions}M x ({growthRate} + {marketShare}) / 100",
        "The result is the company's share of the larger next-year market.",
        "The result is total next-year market size before applying company share.",
        "Faster market growth lowers company revenue at an unchanged share."
      )
    },
    promptTemplate:
      "A ${currentMarketMillions}M market grows {growthRate}% next year. A company expects {marketShare}% share. What is next-year company revenue? Enter $M.",
    variables: {
      currentMarketMillions: { type: "currency", values: [200, 250, 400, 500, 800] },
      growthRate: { type: "percentage", values: [10, 15, 20, 25] },
      marketShare: { type: "percentage", values: [10, 15, 20, 25] }
    },
    formula: { expression: "currentMarketMillions * (1 + growthRate / 100) * marketShare / 100" },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Grow the market first, then apply the company's expected market share.",
        "Calculate 1: Next-year market size is ${currentMarketMillions}M x (1 + {growthRate}%).",
        "Calculate 2: Apply {marketShare}% share to get ${answer}M of company revenue.",
        "Interpret: The share assumption implies ${answer}M of next-year revenue."
      ]
    }
  },
  {
    id: "case_store_network_revenue_intermediate_001",
    category: "case_math",
    tags: ["revenue", "unit_conversion"],
    difficulty: ["intermediate"],
    caseStyle: {
      calculationStepCount: 2,
      industry: "retail",
      interviewMath: interviewMath(
        "{stores} x {customersPerDay} x {operatingDays} x ${averageBasket} / 1,000,000",
        "{stores} x {customersPerDay} x {operatingDays} x ${averageBasket}",
        "({stores} + {customersPerDay} + {operatingDays}) x ${averageBasket}",
        "The result is annual network revenue before any cost or margin assumptions.",
        "The result is annual profit after applying an operating margin.",
        "The result is daily revenue for one store."
      )
    },
    promptTemplate:
      "A retailer has {stores} stores, each serving {customersPerDay} customers per day for {operatingDays} days. Average basket is ${averageBasket}. What is annual revenue? Enter $M.",
    variables: {
      stores: { type: "integer", values: [40, 50, 80, 100] },
      customersPerDay: { type: "integer", values: [200, 250, 300, 400] },
      operatingDays: { type: "integer", values: [300, 360] },
      averageBasket: { type: "currency", values: [20, 25, 40, 50] }
    },
    formula: { expression: "stores * customersPerDay * operatingDays * averageBasket / 1000000" },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Annual transactions equal stores x customers per day x operating days; revenue equals transactions x basket size.",
        "Calculate 1: Annual transactions are {stores} x {customersPerDay} x {operatingDays}.",
        "Calculate 2: Multiply by the ${averageBasket} basket and convert dollars to millions to get ${answer}M.",
        "Interpret: The network produces ${answer}M in annual revenue at the stated traffic and basket size."
      ]
    }
  },
  {
    id: "case_unit_growth_revenue_intermediate_001",
    category: "case_math",
    tags: ["simple_growth", "revenue", "unit_conversion"],
    difficulty: ["intermediate"],
    caseStyle: {
      calculationStepCount: 2,
      industry: "consumer_goods",
      interviewMath: interviewMath(
        "{currentUnitsThousands}K x (1 + {growthRate} / 100) x ${pricePerUnit} / 1,000",
        "{currentUnitsThousands}K x (1 + {growthRate} / 100) x ${pricePerUnit}",
        "{currentUnitsThousands}K x ({growthRate} / 100) x ${pricePerUnit} / 1,000",
        "The result is total next-year revenue at the unchanged unit price.",
        "The result is only the incremental revenue created by growth.",
        "The calculation assumes the unit price grows at the same rate as volume."
      )
    },
    promptTemplate:
      "A product sells {currentUnitsThousands}K units this year. Volume grows {growthRate}% next year and price stays at ${pricePerUnit}. What is next-year revenue? Enter $M.",
    variables: {
      currentUnitsThousands: { type: "integer", values: [100, 200, 250, 400] },
      growthRate: { type: "percentage", values: [10, 15, 20, 25] },
      pricePerUnit: { type: "currency", values: [20, 25, 40, 50] }
    },
    formula: { expression: "currentUnitsThousands * (1 + growthRate / 100) * pricePerUnit / 1000" },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Grow unit volume, then multiply next-year units by price.",
        "Calculate 1: Next-year volume is {currentUnitsThousands}K x (1 + {growthRate}%).",
        "Calculate 2: Multiply by ${pricePerUnit} and convert $K to $M to get ${answer}M.",
        "Interpret: At an unchanged price, next-year revenue is ${answer}M."
      ]
    }
  },
  {
    id: "case_market_growth_profit_advanced_001",
    category: "case_math",
    tags: ["simple_growth", "market_share", "revenue", "margin"],
    difficulty: ["advanced", "expert"],
    caseStyle: {
      calculationStepCount: 3,
      industry: "telecom",
      interviewMath: interviewMath(
        "${currentMarketMillions}M x (1 + {growthRate} / 100) x ({marketShare} / 100) x ({operatingMargin} / 100)",
        "${currentMarketMillions}M x (1 + {growthRate}) x {marketShare} x {operatingMargin}",
        "${currentMarketMillions}M x ({growthRate} + {marketShare} + {operatingMargin}) / 100",
        "The result is next-year operating profit after growth, share, and margin.",
        "The result is company revenue before applying operating margin.",
        "Market growth changes the margin but not company revenue."
      )
    },
    promptTemplate:
      "A ${currentMarketMillions}M market grows {growthRate}%. A company expects {marketShare}% share and a {operatingMargin}% margin. What is next-year operating profit? Enter $M.",
    variables: {
      currentMarketMillions: { type: "currency", values: [400, 500, 800, 1_000] },
      growthRate: { type: "percentage", values: [10, 15, 20] },
      marketShare: { type: "percentage", values: [10, 15, 20] },
      operatingMargin: { type: "percentage", values: [15, 20, 25] }
    },
    formula: {
      expression: "currentMarketMillions * (1 + growthRate / 100) * marketShare / 100 * operatingMargin / 100"
    },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Grow the market, apply company share, then apply operating margin.",
        "Calculate 1: Grow ${currentMarketMillions}M by {growthRate}%.",
        "Calculate 2: Apply {marketShare}% share to the larger market.",
        "Calculate 3: Apply the {operatingMargin}% margin to get ${answer}M of operating profit.",
        "Interpret: The growth, share, and margin assumptions imply ${answer}M of next-year operating profit."
      ]
    }
  },
  {
    id: "case_factory_profit_advanced_001",
    category: "case_math",
    tags: ["capacity_utilization", "revenue", "margin", "unit_conversion"],
    difficulty: ["advanced", "expert"],
    caseStyle: {
      calculationStepCount: 3,
      industry: "manufacturing",
      interviewMath: interviewMath(
        "{monthlyCapacityThousands}K x ({utilization} / 100) x {months} x ${pricePerUnit} x ({margin} / 100) / 1,000",
        "{monthlyCapacityThousands}K x {utilization} x {months} x ${pricePerUnit} x {margin} / 1,000",
        "{monthlyCapacityThousands}K x {months} x ${pricePerUnit} / ({utilization} x {margin})",
        "The result is annual profit at the stated utilization, price, and margin.",
        "The result is annual revenue before applying margin.",
        "Factory utilization has no effect on annual profit."
      )
    },
    promptTemplate:
      "A factory has monthly capacity of {monthlyCapacityThousands}K units, runs at {utilization}% for {months} months, sells units for ${pricePerUnit}, and earns a {margin}% margin. What is annual profit? Enter $M.",
    variables: {
      monthlyCapacityThousands: { type: "integer", values: [20, 25, 40, 50] },
      utilization: { type: "percentage", values: [70, 80, 90] },
      months: { type: "integer", values: [12] },
      pricePerUnit: { type: "currency", values: [30, 40, 50] },
      margin: { type: "percentage", values: [15, 20, 25] }
    },
    formula: {
      expression: "monthlyCapacityThousands * utilization / 100 * months * pricePerUnit * margin / 100 / 1000"
    },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Find utilized annual output, calculate revenue, then apply margin.",
        "Calculate 1: Annual output is {monthlyCapacityThousands}K x {utilization}% x {months}.",
        "Calculate 2: Multiply output by ${pricePerUnit} per unit and convert $K to $M.",
        "Calculate 3: Apply the {margin}% margin to get ${answer}M of profit.",
        "Interpret: At the stated utilization and pricing, the factory earns ${answer}M annually."
      ]
    }
  },
  {
    id: "case_saas_growth_profit_advanced_001",
    category: "case_math",
    tags: ["simple_growth", "revenue", "margin", "unit_conversion"],
    difficulty: ["advanced", "expert"],
    caseStyle: {
      calculationStepCount: 3,
      industry: "saas",
      interviewMath: interviewMath(
        "{customersThousands}K x (1 + {growthRate} / 100) x ${monthlyArpu} x 12 x ({grossMargin} / 100) / 1,000",
        "{customersThousands}K x (1 + {growthRate} / 100) x ${monthlyArpu} x ({grossMargin} / 100) / 1,000",
        "{customersThousands}K x ({growthRate} + {grossMargin}) / 100 x ${monthlyArpu}",
        "The result is projected annual gross profit from the next-year customer base.",
        "The result is one month of revenue before gross margin.",
        "Customer growth reduces gross profit when ARPU is unchanged."
      )
    },
    promptTemplate:
      "A SaaS company has {customersThousands}K customers. Customers grow {growthRate}%, monthly ARPU is ${monthlyArpu}, and gross margin is {grossMargin}%. What is next-year annual gross profit? Enter $M.",
    variables: {
      customersThousands: { type: "integer", values: [50, 80, 100, 120] },
      growthRate: { type: "percentage", values: [10, 15, 20, 25] },
      monthlyArpu: { type: "currency", values: [25, 40, 50] },
      grossMargin: { type: "percentage", values: [70, 75, 80] }
    },
    formula: {
      expression: "customersThousands * (1 + growthRate / 100) * monthlyArpu * 12 * grossMargin / 100 / 1000"
    },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Grow customers, annualize subscription revenue, then apply gross margin.",
        "Calculate 1: Next-year customers are {customersThousands}K x (1 + {growthRate}%).",
        "Calculate 2: Multiply by ${monthlyArpu} x 12 and convert $K to $M.",
        "Calculate 3: Apply the {grossMargin}% gross margin to get ${answer}M.",
        "Interpret: The projected customer base generates ${answer}M of annual gross profit."
      ]
    }
  },
  {
    id: "case_retail_profit_advanced_001",
    category: "case_math",
    tags: ["revenue", "margin", "unit_conversion"],
    difficulty: ["advanced", "expert"],
    caseStyle: {
      calculationStepCount: 3,
      industry: "retail",
      interviewMath: interviewMath(
        "{stores} x {transactionsPerDay} x {operatingDays} x ${averageBasket} x ({margin} / 100) / 1,000,000",
        "{stores} x {transactionsPerDay} x ${averageBasket} x ({margin} / 100) / 1,000,000",
        "({stores} + {transactionsPerDay} + {operatingDays}) x ${averageBasket} x ({margin} / 100)",
        "The result is annual profit after applying margin to network revenue.",
        "The result is annual revenue before applying margin.",
        "The margin assumption has no effect on annual profit."
      )
    },
    promptTemplate:
      "A retailer has {stores} stores, {transactionsPerDay} transactions per store per day, a ${averageBasket} basket, and a {margin}% margin over {operatingDays} days. What is annual profit? Enter $M.",
    variables: {
      stores: { type: "integer", values: [50, 80, 100] },
      transactionsPerDay: { type: "integer", values: [200, 300, 400] },
      averageBasket: { type: "currency", values: [25, 40, 50] },
      margin: { type: "percentage", values: [20, 25, 30] },
      operatingDays: { type: "integer", values: [300, 360] }
    },
    formula: {
      expression: "stores * transactionsPerDay * operatingDays * averageBasket * margin / 100 / 1000000"
    },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Calculate annual transactions, convert them to revenue, then apply margin.",
        "Calculate 1: Annual transactions are {stores} x {transactionsPerDay} x {operatingDays}.",
        "Calculate 2: Multiply transactions by the ${averageBasket} basket and convert dollars to millions.",
        "Calculate 3: Apply the {margin}% margin to get ${answer}M of annual profit.",
        "Interpret: The store network earns ${answer}M annually under the stated operating assumptions."
      ]
    }
  },
  {
    id: "case_airline_profit_advanced_001",
    category: "case_math",
    tags: ["capacity_utilization", "revenue", "margin", "unit_conversion"],
    difficulty: ["advanced", "expert"],
    caseStyle: {
      calculationStepCount: 3,
      industry: "airlines",
      interviewMath: interviewMath(
        "{flightsPerDay} x {seatsPerFlight} x ({loadFactor} / 100) x {operatingDays} x ${averageFare} x ({margin} / 100) / 1,000,000",
        "{flightsPerDay} x {seatsPerFlight} x {loadFactor} x {operatingDays} x ${averageFare} x {margin} / 1,000,000",
        "{flightsPerDay} x {seatsPerFlight} x (1 - {loadFactor} / 100) x {operatingDays} x ${averageFare}",
        "The result is annual profit at the stated flight schedule and load factor.",
        "The result is annual passenger volume rather than profit.",
        "A lower load factor increases annual profit when fare is unchanged."
      )
    },
    promptTemplate:
      "An airline flies {flightsPerDay} daily flights with {seatsPerFlight} seats at {loadFactor}% load factor for {operatingDays} days. Average fare is ${averageFare} and margin is {margin}%. What is annual profit? Enter $M.",
    variables: {
      flightsPerDay: { type: "integer", values: [20, 25, 30] },
      seatsPerFlight: { type: "integer", values: [120, 150, 180] },
      loadFactor: { type: "percentage", values: [70, 80, 90] },
      operatingDays: { type: "integer", values: [300, 360] },
      averageFare: { type: "currency", values: [100, 150, 200] },
      margin: { type: "percentage", values: [10, 15, 20] }
    },
    formula: {
      expression: "flightsPerDay * seatsPerFlight * loadFactor / 100 * operatingDays * averageFare * margin / 100 / 1000000"
    },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Calculate annual passengers, convert passengers to revenue, then apply margin.",
        "Calculate 1: Annual passengers are {flightsPerDay} x {seatsPerFlight} x {loadFactor}% x {operatingDays}.",
        "Calculate 2: Multiply passengers by the ${averageFare} fare and convert dollars to millions.",
        "Calculate 3: Apply the {margin}% margin to get ${answer}M of annual profit.",
        "Interpret: The route schedule produces ${answer}M of annual profit at the stated load factor."
      ]
    }
  },
  {
    id: "case_marketplace_profit_advanced_001",
    category: "case_math",
    tags: ["simple_growth", "revenue", "margin"],
    difficulty: ["advanced", "expert"],
    caseStyle: {
      calculationStepCount: 3,
      industry: "marketplaces",
      interviewMath: interviewMath(
        "${currentGmvMillions}M x (1 + {growthRate} / 100) x ({takeRate} / 100) x ({margin} / 100)",
        "${currentGmvMillions}M x (1 + {growthRate}) x {takeRate} x {margin}",
        "${currentGmvMillions}M x ({growthRate} + {takeRate} + {margin}) / 100",
        "The result is operating profit after monetizing next-year GMV and applying margin.",
        "The result is next-year GMV before applying take rate or margin.",
        "A lower take rate increases operating profit when GMV is unchanged."
      )
    },
    promptTemplate:
      "A marketplace has ${currentGmvMillions}M in GMV, expects {growthRate}% growth, earns a {takeRate}% take rate, and has a {margin}% operating margin. What is next-year operating profit? Enter $M.",
    variables: {
      currentGmvMillions: { type: "currency", values: [200, 300, 500, 800] },
      growthRate: { type: "percentage", values: [10, 15, 20, 25] },
      takeRate: { type: "percentage", values: [10, 12, 15] },
      margin: { type: "percentage", values: [15, 20, 25] }
    },
    formula: {
      expression: "currentGmvMillions * (1 + growthRate / 100) * takeRate / 100 * margin / 100"
    },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Grow GMV, apply the take rate to find revenue, then apply operating margin.",
        "Calculate 1: Next-year GMV is ${currentGmvMillions}M x (1 + {growthRate}%).",
        "Calculate 2: Apply the {takeRate}% take rate to calculate marketplace revenue.",
        "Calculate 3: Apply the {margin}% margin to get ${answer}M of operating profit.",
        "Interpret: The growth and monetization assumptions imply ${answer}M of next-year operating profit."
      ]
    }
  },
  {
    id: "case_retail_revenue_beginner_001",
    category: "case_math",
    tags: ["revenue", "unit_conversion"],
    difficulty: ["beginner"],
    caseStyle: {
      calculationStepCount: 2,
      industry: "retail",
      interviewMath: interviewMath(
        "{stores} x {customersPerDay} x {operatingDays} x ${averageBasket} / 1,000,000",
        "{stores} x {customersPerDay} x ${averageBasket} / 1,000,000",
        "({stores} + {customersPerDay} + {operatingDays}) x ${averageBasket}",
        "The result is annual revenue before any cost or margin assumptions.",
        "The result is daily revenue for the full store network.",
        "A larger average basket lowers annual revenue."
      )
    },
    promptTemplate:
      "A retailer has {stores} stores serving {customersPerDay} customers daily for {operatingDays} days. Average basket is ${averageBasket}. What is annual revenue? Enter $M.",
    variables: {
      stores: { type: "integer", values: [10, 20, 25, 40] },
      customersPerDay: { type: "integer", values: [100, 150, 200, 250] },
      operatingDays: { type: "integer", values: [250, 300, 360] },
      averageBasket: { type: "currency", values: [20, 25, 40, 50] }
    },
    formula: { expression: "stores * customersPerDay * operatingDays * averageBasket / 1000000" },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Annual revenue equals stores x daily customers x operating days x average basket.",
        "Calculate 1: Annual transactions are {stores} x {customersPerDay} x {operatingDays}.",
        "Calculate 2: Multiply by ${averageBasket} and convert dollars to millions to get ${answer}M.",
        "Interpret: The store network generates ${answer}M in annual revenue."
      ]
    }
  },
  {
    id: "case_banking_card_profit_advanced_001",
    category: "case_math",
    tags: ["revenue", "margin", "unit_conversion"],
    difficulty: ["advanced", "expert"],
    caseStyle: {
      calculationStepCount: 4,
      industry: "banking",
      interviewMath: interviewMath(
        "{accountsThousands}K x ({activeRate} / 100) x {transactionsPerMonth} x 12 x ${feePerTransaction} x ({margin} / 100) / 1,000",
        "{accountsThousands}K x {activeRate} x {transactionsPerMonth} x 12 x ${feePerTransaction} x ({margin} / 100) / 1,000",
        "{accountsThousands}K x ({activeRate} / 100) x ${feePerTransaction} / ({margin} / 100)",
        "Profit rises with active accounts, transaction frequency, fee revenue, or margin.",
        "The result is annual transaction volume rather than operating profit.",
        "Lower customer activity increases fee revenue when pricing is unchanged."
      )
    },
    promptTemplate:
      "A bank has {accountsThousands}K card accounts; {activeRate}% are active. Each active account makes {transactionsPerMonth} monthly transactions earning ${feePerTransaction} in fees. At a {margin}% margin, what is annual operating profit? Enter $M.",
    variables: {
      accountsThousands: { type: "integer", values: [200, 300, 500, 800] },
      activeRate: { type: "percentage", values: [60, 70, 80, 90] },
      transactionsPerMonth: { type: "integer", values: [8, 10, 12, 15] },
      feePerTransaction: { type: "currency", values: [1, 1.5, 2, 2.5] },
      margin: { type: "percentage", values: [20, 25, 30, 40] }
    },
    formula: {
      expression:
        "accountsThousands * activeRate / 100 * transactionsPerMonth * 12 * feePerTransaction * margin / 100 / 1000"
    },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Find active accounts, annual transactions, fee revenue, and then operating profit.",
        "Calculate 1: Active accounts are {accountsThousands}K x {activeRate}%.",
        "Calculate 2: Multiply active accounts by {transactionsPerMonth} transactions x 12 months.",
        "Calculate 3: Multiply annual transactions by ${feePerTransaction} and convert $K to $M.",
        "Calculate 4: Apply the {margin}% margin to get ${answer}M in operating profit.",
        "Interpret: Card activity and fee economics produce ${answer}M in annual operating profit."
      ]
    }
  },
  {
    id: "case_insurance_underwriting_profit_advanced_001",
    category: "case_math",
    tags: ["simple_growth", "revenue", "profit", "unit_conversion"],
    difficulty: ["advanced", "expert"],
    caseStyle: {
      calculationStepCount: 5,
      industry: "insurance",
      interviewMath: interviewMath(
        "{policiesThousands}K x (1 + {growthRate} / 100) x ${annualPremium} x (1 - {claimsRatio} / 100 - {expenseRatio} / 100) / 1,000",
        "{policiesThousands}K x (1 + {growthRate}) x ${annualPremium} x (1 - {claimsRatio} - {expenseRatio}) / 1,000",
        "{policiesThousands}K x ${annualPremium} x ({claimsRatio} + {expenseRatio}) / 100",
        "Lower claims or expenses increase underwriting profit when premiums are unchanged.",
        "The result is premium revenue before claims and operating expenses.",
        "A higher claims ratio increases underwriting profit."
      )
    },
    promptTemplate:
      "An insurer has {policiesThousands}K policies growing {growthRate}%. Annual premium is ${annualPremium}; claims are {claimsRatio}% of premiums and expenses are {expenseRatio}%. What is next-year underwriting profit? Enter $M.",
    variables: {
      policiesThousands: { type: "integer", values: [100, 200, 300, 500] },
      growthRate: { type: "percentage", values: [5, 10, 15, 20] },
      annualPremium: { type: "currency", values: [400, 500, 600, 800] },
      claimsRatio: { type: "percentage", values: [50, 55, 60, 65] },
      expenseRatio: { type: "percentage", values: [15, 20, 25] }
    },
    formula: {
      expression:
        "policiesThousands * (1 + growthRate / 100) * annualPremium * (1 - claimsRatio / 100 - expenseRatio / 100) / 1000"
    },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Grow policies, calculate premiums, calculate claims and expenses, then subtract both costs.",
        "Calculate 1: Next-year policies are {policiesThousands}K x (1 + {growthRate}%).",
        "Calculate 2: Multiply policies by the ${annualPremium} annual premium and convert $K to $M.",
        "Calculate 3: Claims equal {claimsRatio}% of next-year premium revenue.",
        "Calculate 4: Expenses equal {expenseRatio}% of next-year premium revenue.",
        "Calculate 5: Premiums minus claims and expenses equals ${answer}M in underwriting profit.",
        "Interpret: The projected book produces ${answer}M after claims and operating expenses."
      ]
    }
  },
  {
    id: "case_healthcare_network_profit_expert_001",
    category: "case_math",
    tags: ["capacity_utilization", "revenue", "margin", "profit", "unit_conversion"],
    difficulty: ["expert"],
    caseStyle: {
      calculationStepCount: 6,
      industry: "healthcare",
      interviewMath: interviewMath(
        "{clinics} x {roomsPerClinic} x {visitsPerRoomDay} x ({utilization} / 100) x {operatingDays} x ${revenuePerVisit} x ({contributionMargin} / 100) / 1,000,000 - ${fixedCostMillions}M",
        "{clinics} x {roomsPerClinic} x {visitsPerRoomDay} x {utilization} x {operatingDays} x ${revenuePerVisit} x ({contributionMargin} / 100) / 1,000,000 - ${fixedCostMillions}M",
        "{clinics} x {roomsPerClinic} x {visitsPerRoomDay} x {operatingDays} x ${revenuePerVisit} / ({contributionMargin} / 100)",
        "Profit improves with utilization, visit revenue, or contribution margin, all else equal.",
        "The result is annual revenue before contribution margin and fixed cost.",
        "Higher fixed cost increases operating profit."
      )
    },
    promptTemplate:
      "{clinics} clinics run {roomsPerClinic} rooms at {visitsPerRoomDay} visits/day, {utilization}% use, {operatingDays} days/year. Revenue is ${revenuePerVisit}/visit at {contributionMargin}% margin. Fixed cost is ${fixedCostMillions}M. Find profit ($M).",
    variables: {
      clinics: { type: "integer", values: [8, 10, 12, 15] },
      roomsPerClinic: { type: "integer", values: [12, 15, 18, 20] },
      visitsPerRoomDay: { type: "integer", values: [6, 8, 10] },
      utilization: { type: "percentage", values: [70, 75, 80, 90] },
      operatingDays: { type: "integer", values: [240, 250, 300] },
      revenuePerVisit: { type: "currency", values: [120, 150, 180, 200] },
      contributionMargin: { type: "percentage", values: [25, 30, 35, 40] },
      fixedCostMillions: { type: "currency", values: [1, 1.5, 2, 2.5] }
    },
    formula: {
      expression:
        "clinics * roomsPerClinic * visitsPerRoomDay * utilization / 100 * operatingDays * revenuePerVisit * contributionMargin / 100 / 1000000 - fixedCostMillions"
    },
    answerUnit: "m",
    explanationTemplate: {
      steps: [
        "Setup: Find room capacity, utilized daily visits, annual visits, revenue, contribution, and profit after fixed cost.",
        "Calculate 1: Total rooms are {clinics} x {roomsPerClinic}.",
        "Calculate 2: Daily utilized visits equal rooms x {visitsPerRoomDay} x {utilization}%.",
        "Calculate 3: Multiply daily visits by {operatingDays} operating days.",
        "Calculate 4: Multiply annual visits by ${revenuePerVisit} and convert dollars to millions.",
        "Calculate 5: Apply the {contributionMargin}% contribution margin.",
        "Calculate 6: Subtract ${fixedCostMillions}M fixed cost to get ${answer}M in operating profit.",
        "Interpret: The network earns ${answer}M after contribution and fixed costs."
      ]
    }
  }
];
