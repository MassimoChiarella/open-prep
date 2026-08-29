import type {
  BenchmarkId,
  BenchmarkScoreBand,
  BenchmarkTest
} from "@/features/benchmarks/benchmarkTypes";
import type {
  AnswerSpec,
  Difficulty,
  DrillSettings,
  Question,
  SkillCategory,
  SkillTag,
  ToleranceSpec,
  UnitType
} from "@/lib/domain";

export const benchmarkScoreBands: readonly BenchmarkScoreBand[] = [
  { label: "needs_work", minAccuracy: 0, title: "Needs work" },
  { label: "developing", minAccuracy: 0.6, title: "Developing" },
  { label: "strong", minAccuracy: 0.75, title: "Strong" },
  { label: "excellent", minAccuracy: 0.9, title: "Excellent" }
];

const beginnerQuestions = createQuestions("beginner", "beginner", [
  q("q01", "arithmetic", ["addition"], "What is 48 + 37?", 85, {
    steps: ["Add the tens: 40 + 30 = 70.", "Add the ones: 8 + 7 = 15, so 70 + 15 = 85."]
  }),
  q("q02", "arithmetic", ["subtraction"], "What is 120 - 47?", 73, {
    steps: ["Break 47 into 40 and 7.", "120 - 40 = 80, then 80 - 7 = 73."]
  }),
  q("q03", "arithmetic", ["multiplication"], "What is 24 x 6?", 144, {
    steps: ["24 x 6 = (20 x 6) + (4 x 6).", "120 + 24 = 144."]
  }),
  q("q04", "arithmetic", ["division"], "What is 96 / 8?", 12, {
    steps: ["8 x 12 = 96.", "So 96 divided by 8 is 12."]
  }),
  q("q05", "percentages", ["percentage_of_number"], "What is 15% of 200?", 30, {
    steps: ["15% equals 0.15.", "0.15 x 200 = 30."]
  }),
  q("q06", "percentages", ["percentage_change"], "A metric rises from 50 to 60. What is the percentage change?", 0.2, {
    unit: "percentage",
    steps: ["The change is 60 - 50 = 10.", "10 / 50 = 0.20, or 20%."]
  }),
  q("q07", "fractions_decimals_ratios", ["fraction_conversion"], "What is one quarter of 80?", 20, {
    steps: ["One quarter means divide by 4.", "80 / 4 = 20."]
  }),
  q("q08", "fractions_decimals_ratios", ["fraction_conversion"], "What is 0.75 x 40?", 30, {
    steps: ["0.75 is three quarters.", "Three quarters of 40 is 30."]
  }),
  q("q09", "business_math", ["revenue"], "A shop sells 300 units at $12 each. What is revenue?", 3_600, {
    unit: "currency",
    steps: ["Revenue equals price x volume.", "300 x 12 = 3,600."]
  }),
  q("q10", "business_math", ["profit"], "Revenue is $5,000 and cost is $3,200. What is profit?", 1_800, {
    unit: "currency",
    steps: ["Profit equals revenue minus cost.", "5,000 - 3,200 = 1,800."]
  }),
  q("q11", "business_math", ["margin"], "Profit is $800 on revenue of $4,000. What is margin?", 0.2, {
    unit: "percentage",
    steps: ["Margin equals profit / revenue.", "800 / 4,000 = 0.20, or 20%."]
  }),
  q("q12", "weighted_averages", ["weighted_average"], "A score is 40% weighted at 80 and 60% weighted at 90. What is the weighted average?", 86, {
    steps: ["Multiply each value by its weight.", "0.40 x 80 + 0.60 x 90 = 32 + 54 = 86."]
  }),
  q("q13", "fractions_decimals_ratios", ["ratio_conversion"], "A 100-person group is split 3:2. How many are in the larger group?", 60, {
    unit: "units",
    steps: ["The ratio has 3 + 2 = 5 parts.", "100 / 5 = 20 per part, and 3 parts is 60."]
  }),
  q("q14", "business_math", ["market_share"], "Company sales are $25M in a $100M market. What is market share?", 0.25, {
    unit: "percentage",
    steps: ["Market share equals company sales / total market sales.", "25M / 100M = 0.25, or 25%."]
  }),
  q("q15", "business_math", ["cost"], "Fixed cost is $1,000 and variable cost is $4 for 250 units. What is total cost?", 2_000, {
    unit: "currency",
    steps: ["Total cost equals fixed cost plus variable cost x units.", "1,000 + 4 x 250 = 2,000."]
  }),
  q("q16", "business_math", ["capacity_utilization"], "A site produces 750 units with capacity for 1,000 units. What is utilization?", 0.75, {
    unit: "percentage",
    steps: ["Utilization equals actual output / capacity.", "750 / 1,000 = 0.75, or 75%."]
  }),
  q("q17", "arithmetic", ["mixed_operations"], "What is 12 + 18 x 3?", 66, {
    steps: ["Multiply before adding: 18 x 3 = 54.", "12 + 54 = 66."]
  }),
  q("q18", "percentages", ["percentage_of_number"], "A $80 item is discounted by 10%. What is the sale price?", 72, {
    unit: "currency",
    steps: ["10% of 80 is 8.", "80 - 8 = 72."]
  }),
  q("q19", "business_math", ["breakeven"], "Fixed cost is $1,200 and contribution per unit is $6. How many units break even?", 200, {
    unit: "units",
    steps: ["Breakeven units equal fixed cost / contribution per unit.", "1,200 / 6 = 200."]
  }),
  q("q20", "arithmetic", ["addition"], "What is the average of 12, 18, and 24?", 18, {
    steps: ["Add the values: 12 + 18 + 24 = 54.", "54 / 3 = 18."]
  })
]);

const intermediateQuestions = createQuestions("intermediate", "intermediate", [
  q("q01", "arithmetic", ["addition"], "What is 375 + 486?", 861, {
    steps: ["375 + 400 = 775.", "775 + 86 = 861."]
  }),
  q("q02", "arithmetic", ["subtraction"], "What is 920 - 365?", 555, {
    steps: ["920 - 300 = 620.", "620 - 65 = 555."]
  }),
  q("q03", "arithmetic", ["multiplication"], "What is 42 x 18?", 756, {
    steps: ["42 x 18 = 42 x (20 - 2).", "840 - 84 = 756."]
  }),
  q("q04", "arithmetic", ["division"], "What is 1,248 / 16?", 78, {
    steps: ["16 x 80 = 1,280.", "1,280 - 32 is two 16s, so the answer is 78."]
  }),
  q("q05", "percentages", ["percentage_of_number"], "What is 18% of 750?", 135, {
    steps: ["18% equals 0.18.", "0.18 x 750 = 135."]
  }),
  q("q06", "percentages", ["percentage_change"], "A metric moves from 80 to 100. What is the percentage change?", 0.25, {
    unit: "percentage",
    steps: ["The change is 20.", "20 / 80 = 0.25, or 25%."]
  }),
  q("q07", "percentages", ["reverse_percentage"], "After a 20% increase, price is $144. What was the original price?", 120, {
    unit: "currency",
    steps: ["A 20% increase means final price is 1.20 x original.", "144 / 1.20 = 120."]
  }),
  q("q08", "fractions_decimals_ratios", ["fraction_conversion"], "What is two fifths of 1,250?", 500, {
    steps: ["One fifth of 1,250 is 250.", "Two fifths is 2 x 250 = 500."]
  }),
  q("q09", "business_math", ["revenue"], "A company sells 4,500 units at $18 each. What is revenue?", 81_000, {
    unit: "currency",
    steps: ["Revenue equals units x price.", "4,500 x 18 = 81,000."]
  }),
  q("q10", "business_math", ["margin"], "Revenue is $12,000 and margin is 35%. What is profit?", 4_200, {
    unit: "currency",
    steps: ["Profit equals revenue x margin.", "12,000 x 0.35 = 4,200."]
  }),
  q("q11", "business_math", ["cost"], "Fixed cost is $15,000 and variable cost is $8 for 2,500 units. What is total cost?", 35_000, {
    unit: "currency",
    steps: ["Variable cost total is 8 x 2,500 = 20,000.", "15,000 + 20,000 = 35,000."]
  }),
  q("q12", "business_math", ["contribution_margin"], "Price is $45 and variable cost is $30. What is contribution margin per unit?", 15, {
    unit: "currency",
    steps: ["Contribution per unit equals price minus variable cost.", "45 - 30 = 15."]
  }),
  q("q13", "business_math", ["breakeven"], "Fixed cost is $60,000 and contribution per unit is $15. How many units break even?", 4_000, {
    unit: "units",
    steps: ["Breakeven units equal fixed cost / contribution.", "60,000 / 15 = 4,000."]
  }),
  q("q14", "weighted_averages", ["weighted_average"], "A mix is 30% at 70, 50% at 80, and 20% at 95. What is the weighted average?", 80, {
    steps: ["Calculate 0.30 x 70 + 0.50 x 80 + 0.20 x 95.", "21 + 40 + 19 = 80."]
  }),
  q("q15", "business_math", ["market_share"], "Company sales are $18M in a $120M market. What is market share?", 0.15, {
    unit: "percentage",
    steps: ["Market share equals company sales / market size.", "18M / 120M = 0.15, or 15%."]
  }),
  q("q16", "business_math", ["capacity_utilization"], "A plant produces 84,000 units with capacity for 120,000. What is utilization?", 0.7, {
    unit: "percentage",
    steps: ["Utilization equals output / capacity.", "84,000 / 120,000 = 0.70, or 70%."]
  }),
  q("q17", "growth_compounding", ["simple_growth"], "A market of $250M grows by 12%. What is the new market size?", 280_000_000, {
    unit: "currency",
    steps: ["A 12% increase means multiply by 1.12.", "250M x 1.12 = 280M."]
  }),
  q("q18", "arithmetic", ["mixed_operations"], "What is (240 + 360) / 15?", 40, {
    steps: ["Add first: 240 + 360 = 600.", "600 / 15 = 40."]
  }),
  q("q19", "business_math", ["payback"], "An investment of $90,000 returns $18,000 per year. What is payback period?", 5, {
    unit: "years",
    steps: ["Payback period equals initial investment / annual cash flow.", "90,000 / 18,000 = 5 years."]
  }),
  q("q20", "business_math", ["roi"], "A project returns $150,000 on a $120,000 investment. What is ROI?", 0.25, {
    unit: "percentage",
    steps: ["ROI equals gain over investment: (150,000 - 120,000) / 120,000.", "30,000 / 120,000 = 0.25, or 25%."]
  })
]);

const advancedQuestions = createQuestions("advanced", "advanced", [
  q("q01", "arithmetic", ["addition"], "What is 2,450 + 3,875 + 1,225?", 7_550, {
    steps: ["Combine 2,450 + 1,225 = 3,675.", "3,675 + 3,875 = 7,550."]
  }),
  q("q02", "arithmetic", ["subtraction"], "What is 8,400 - 2,785?", 5_615, {
    steps: ["8,400 - 2,700 = 5,700.", "5,700 - 85 = 5,615."]
  }),
  q("q03", "arithmetic", ["multiplication"], "What is 125 x 48?", 6_000, {
    steps: ["125 x 48 = 125 x (50 - 2).", "6,250 - 250 = 6,000."]
  }),
  q("q04", "arithmetic", ["division"], "What is 7,560 / 24?", 315, {
    steps: ["24 x 300 = 7,200.", "360 remains, and 360 / 24 = 15, so total is 315."]
  }),
  q("q05", "percentages", ["percentage_of_number"], "What is 22.5% of 1,600?", 360, {
    steps: ["22.5% equals 0.225.", "0.225 x 1,600 = 360."]
  }),
  q("q06", "percentages", ["percentage_change"], "A metric falls from 125 to 95. What is the percentage change?", -0.24, {
    unit: "percentage",
    steps: ["The change is 95 - 125 = -30.", "-30 / 125 = -0.24, or -24%."]
  }),
  q("q07", "percentages", ["reverse_percentage"], "After a 15% decrease, revenue is $425M. What was the original revenue?", 500_000_000, {
    unit: "currency",
    steps: ["A 15% decrease means final revenue is 0.85 x original.", "425M / 0.85 = 500M."]
  }),
  q("q08", "fractions_decimals_ratios", ["ratio_conversion"], "A 1,200-unit pool is split 5:3:2. How many units are in the largest segment?", 600, {
    unit: "units",
    steps: ["The ratio has 5 + 3 + 2 = 10 parts.", "1,200 / 10 = 120 per part, and 5 parts is 600."]
  }),
  q("q09", "business_math", ["revenue"], "A company sells 125,000 units at $24 each. What is revenue?", 3_000_000, {
    unit: "currency",
    steps: ["Revenue equals units x price.", "125,000 x 24 = 3,000,000."]
  }),
  q("q10", "business_math", ["profit"], "A product sells 18,000 units at $55. Variable cost is $32 per unit and fixed cost is $150,000. What is profit?", 264_000, {
    unit: "currency",
    steps: ["Contribution per unit is 55 - 32 = 23.", "18,000 x 23 - 150,000 = 264,000."]
  }),
  q("q11", "business_math", ["margin"], "Profit is $360,000 on revenue of $2.4M. What is margin?", 0.15, {
    unit: "percentage",
    steps: ["Margin equals profit / revenue.", "360,000 / 2,400,000 = 0.15, or 15%."]
  }),
  q("q12", "business_math", ["cost"], "Fixed cost is $250,000 and variable cost is $18 for 40,000 units. What is total cost?", 970_000, {
    unit: "currency",
    steps: ["Variable cost total is 18 x 40,000 = 720,000.", "250,000 + 720,000 = 970,000."]
  }),
  q("q13", "weighted_averages", ["weighted_average"], "A portfolio is 25% at 12, 35% at 18, and 40% at 24. What is the weighted average?", 18.9, {
    steps: ["Calculate 0.25 x 12 + 0.35 x 18 + 0.40 x 24.", "3 + 6.3 + 9.6 = 18.9."]
  }),
  q("q14", "business_math", ["market_share"], "Company sales are $72M in a $450M market. What is market share?", 0.16, {
    unit: "percentage",
    steps: ["Market share equals company sales / market size.", "72M / 450M = 0.16, or 16%."]
  }),
  q("q15", "business_math", ["capacity_utilization"], "Output is 1.35M units and capacity is 1.8M units. What is utilization?", 0.75, {
    unit: "percentage",
    steps: ["Utilization equals output / capacity.", "1.35M / 1.8M = 0.75, or 75%."]
  }),
  q("q16", "business_math", ["breakeven"], "Fixed cost is $1.2M, price is $80, and variable cost is $50. How many units break even?", 40_000, {
    unit: "units",
    steps: ["Contribution per unit is 80 - 50 = 30.", "1,200,000 / 30 = 40,000."]
  }),
  q("q17", "business_math", ["contribution_margin"], "Price is $60 and variable cost is $42. What is contribution margin as a percent of price?", 0.3, {
    unit: "percentage",
    steps: ["Contribution per unit is 60 - 42 = 18.", "18 / 60 = 0.30, or 30%."]
  }),
  q("q18", "business_math", ["payback"], "An investment of $2.5M returns $625,000 per year. What is payback period?", 4, {
    unit: "years",
    steps: ["Payback equals investment / annual cash flow.", "2.5M / 625,000 = 4 years."]
  }),
  q("q19", "business_math", ["roi"], "A project returns $3.2M on a $2.5M investment. What is ROI?", 0.28, {
    unit: "percentage",
    steps: ["ROI equals (gain - investment) / investment.", "700,000 / 2,500,000 = 0.28, or 28%."]
  }),
  q("q20", "arithmetic", ["mixed_operations"], "What is (950 - 275) x 12?", 8_100, {
    steps: ["Subtract first: 950 - 275 = 675.", "675 x 12 = 8,100."]
  })
]);

const expertPressureQuestions = createQuestions("expert-pressure", "expert", [
  q("q01", "arithmetic", ["mixed_operations"], "What is 18,750 + 46,825 - 12,400?", 53_175, {
    steps: ["18,750 + 46,825 = 65,575.", "65,575 - 12,400 = 53,175."]
  }),
  q("q02", "arithmetic", ["multiplication"], "What is 375 x 64?", 24_000, {
    steps: ["64 = 8 x 8, and 375 x 8 = 3,000.", "3,000 x 8 = 24,000."]
  }),
  q("q03", "arithmetic", ["division"], "What is 98,000 / 175?", 560, {
    steps: ["175 x 500 = 87,500.", "10,500 remains, and 175 x 60 = 10,500, so the answer is 560."]
  }),
  q("q04", "percentages", ["percentage_of_number"], "What is 37.5% of $2.4M?", 900_000, {
    unit: "currency",
    steps: ["37.5% is three eighths.", "2.4M x 0.375 = 900,000."]
  }),
  q("q05", "percentages", ["percentage_change"], "Revenue falls from $240M to $198M. What is the percentage change?", -0.175, {
    unit: "percentage",
    steps: ["The change is 198M - 240M = -42M.", "-42M / 240M = -0.175, or -17.5%."]
  }),
  q("q06", "percentages", ["reverse_percentage"], "After a 25% increase, revenue is $6.25M. What was original revenue?", 5_000_000, {
    unit: "currency",
    steps: ["A 25% increase means final revenue is 1.25 x original.", "6.25M / 1.25 = 5M."]
  }),
  q("q07", "percentages", ["reverse_percentage"], "After a 12% decrease, volume is 1.76M units. What was original volume?", 2_000_000, {
    unit: "units",
    steps: ["A 12% decrease means final volume is 0.88 x original.", "1.76M / 0.88 = 2M."]
  }),
  q("q08", "weighted_averages", ["weighted_average"], "A mix is 15% at 8, 25% at 14, and 60% at 19. What is the weighted average?", 16.1, {
    steps: ["Calculate 0.15 x 8 + 0.25 x 14 + 0.60 x 19.", "1.2 + 3.5 + 11.4 = 16.1."]
  }),
  q("q09", "business_math", ["revenue"], "Segment A sells 40,000 units at $120. Segment B sells 25,000 units at $180. What is total revenue?", 9_300_000, {
    unit: "currency",
    steps: ["Segment A revenue is 40,000 x 120 = 4.8M.", "Segment B revenue is 25,000 x 180 = 4.5M, so total revenue is 9.3M."]
  }),
  q("q10", "business_math", ["profit"], "Revenue is $9.3M, gross margin is 42%, and operating cost is $2.1M. What is operating profit?", 1_806_000, {
    unit: "currency",
    steps: ["Gross profit is 9.3M x 0.42 = 3.906M.", "3.906M - 2.1M = 1.806M."]
  }),
  q("q11", "business_math", ["margin"], "Operating profit is $1.806M on revenue of $9.3M. What is operating margin?", 0.194, {
    unit: "percentage",
    tolerance: { type: "absolute", value: 0.001 },
    steps: ["Operating margin equals operating profit / revenue.", "1.806M / 9.3M = about 0.194, or 19.4%."]
  }),
  q("q12", "business_math", ["market_share", "simple_growth"], "Company sales grow from $54M by 20%. The market grows from $360M by 8%. What is the new market share?", 0.1667, {
    unit: "percentage",
    tolerance: { type: "absolute", value: 0.001 },
    steps: ["New company sales are 54M x 1.20 = 64.8M and new market size is 360M x 1.08 = 388.8M.", "64.8M / 388.8M = 0.1667, or about 16.7%."]
  }),
  q("q13", "growth_compounding", ["cagr"], "A market grows from $100M to $133.1M over 3 years. What is CAGR?", 0.1, {
    unit: "percentage",
    steps: ["CAGR solves 100M x (1 + r)^3 = 133.1M.", "1.10 cubed is 1.331, so CAGR is 10%."]
  }),
  q("q14", "business_math", ["breakeven"], "Fixed cost is $3.6M, price is $125, and variable cost is $80. How many units break even?", 80_000, {
    unit: "units",
    steps: ["Contribution per unit is 125 - 80 = 45.", "3.6M / 45 = 80,000 units."]
  }),
  q("q15", "business_math", ["capacity_utilization"], "Line A can produce 1,200 units per day and Line B can produce 900 per day. Over 25 days, what is total capacity?", 52_500, {
    unit: "units",
    steps: ["Daily capacity is 1,200 + 900 = 2,100.", "2,100 x 25 = 52,500 units."]
  }),
  q("q16", "business_math", ["capacity_utilization"], "Demand is 44,100 units and capacity is 52,500 units. What utilization does that imply?", 0.84, {
    unit: "percentage",
    steps: ["Utilization equals demand / capacity.", "44,100 / 52,500 = 0.84, or 84%."]
  }),
  q("q17", "business_math", ["roi"], "A project returns $7.8M on a $6.0M investment. What is ROI?", 0.3, {
    unit: "percentage",
    steps: ["ROI equals (gain - investment) / investment.", "1.8M / 6.0M = 0.30, or 30%."]
  }),
  q("q18", "business_math", ["payback"], "A $4.8M investment produces $1.2M annual cash flow. What is payback period?", 4, {
    unit: "years",
    steps: ["Payback equals investment / annual cash flow.", "4.8M / 1.2M = 4 years."]
  }),
  q("q19", "arithmetic", ["mixed_operations"], "What is ((1,250 x 48) - 18,000) / 6?", 7_000, {
    steps: ["1,250 x 48 = 60,000, then 60,000 - 18,000 = 42,000.", "42,000 / 6 = 7,000."]
  }),
  q("q20", "percentages", ["percentage_change", "percentage_points"], "Share rises from 18% to 24%. What is the relative percentage increase?", 0.3333, {
    unit: "percentage",
    tolerance: { type: "absolute", value: 0.001 },
    errorChecks: { percentagePointValue: 0.06 },
    steps: ["The percentage-point change is 24% - 18% = 6 points.", "The relative increase is 6 / 18 = 0.3333, or about 33.3%."]
  })
]);

export const benchmarkTests: readonly BenchmarkTest[] = [
  createBenchmarkTest({
    description: "Core arithmetic, percentages, ratios, and single-step business math.",
    difficulty: "beginner",
    id: "beginner",
    questions: beginnerQuestions,
    title: "Beginner Benchmark",
    totalSessionSeconds: 1_200
  }),
  createBenchmarkTest({
    description: "Faster arithmetic, reverse percentages, breakeven, ROI, and weighted averages.",
    difficulty: "intermediate",
    id: "intermediate",
    questions: intermediateQuestions,
    title: "Intermediate Benchmark",
    totalSessionSeconds: 1_000
  }),
  createBenchmarkTest({
    description: "Multi-step business math, larger numbers, ratios, and rounded percentage work.",
    difficulty: "advanced",
    id: "advanced",
    questions: advancedQuestions,
    title: "Advanced Benchmark",
    totalSessionSeconds: 900
  }),
  createBenchmarkTest({
    description: "Pressure-paced case math with larger figures, layered formulas, and precision checks.",
    difficulty: "expert",
    id: "expert-pressure",
    questions: expertPressureQuestions,
    title: "Expert Benchmark",
    totalSessionSeconds: 600
  })
];

interface BenchmarkTestInput {
  description: string;
  difficulty: Difficulty;
  id: BenchmarkId;
  questions: Question[];
  title: string;
  totalSessionSeconds: number;
}

interface QuestionDefinition {
  answer: AnswerSpec;
  category: SkillCategory;
  expectedTimeSeconds?: number;
  id: string;
  prompt: string;
  shortcut?: string;
  steps: [string, string, ...string[]];
  tags: SkillTag[];
}

interface QuestionOptions {
  errorChecks?: AnswerSpec["errorChecks"];
  expectedTimeSeconds?: number;
  shortcut?: string;
  steps: [string, string, ...string[]];
  tolerance?: ToleranceSpec;
  unit?: UnitType;
}

function createBenchmarkTest(input: BenchmarkTestInput): BenchmarkTest {
  return {
    description: input.description,
    difficulty: input.difficulty,
    id: input.id,
    questions: input.questions,
    scoreBands: benchmarkScoreBands,
    settings: createBenchmarkSettings(input.questions, input.difficulty, input.totalSessionSeconds),
    title: input.title
  };
}

function createBenchmarkSettings(
  questions: readonly Question[],
  difficulty: Difficulty,
  totalSessionSeconds: number
): DrillSettings {
  return {
    categories: Array.from(new Set(questions.map((question) => question.category))),
    difficulty,
    feedbackMode: "end_of_session",
    questionCount: questions.length,
    timeMode: "session",
    totalSessionSeconds
  };
}

function createQuestions(
  benchmarkId: BenchmarkId,
  difficulty: Difficulty,
  definitions: readonly QuestionDefinition[]
): Question[] {
  return definitions.map((definition) => ({
    id: `${benchmarkId}-${definition.id}`,
    type: "numeric",
    category: definition.category,
    tags: definition.tags,
    difficulty,
    prompt: definition.prompt,
    answer: definition.answer,
    explanation: {
      short: definition.steps[0],
      steps: definition.steps,
      shortcut: definition.shortcut
    },
    metadata: {
      expectedTimeSeconds: definition.expectedTimeSeconds,
      sourceType: "benchmark"
    }
  }));
}

function q(
  id: string,
  category: SkillCategory,
  tags: SkillTag[],
  prompt: string,
  value: number,
  options: QuestionOptions
): QuestionDefinition {
  return {
    answer: {
      value,
      unit: options.unit,
      tolerance: options.tolerance,
      errorChecks: options.errorChecks
    },
    category,
    expectedTimeSeconds: options.expectedTimeSeconds,
    id,
    prompt,
    shortcut: options.shortcut,
    steps: options.steps,
    tags
  };
}
