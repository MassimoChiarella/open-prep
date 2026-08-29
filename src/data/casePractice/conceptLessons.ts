import type { ConceptLesson } from "@/features/case-practice/lessons/conceptLessonScoring";

export const conceptLessons = [
  {
    id: "quarter-multiplication",
    topic: "mental_math",
    title: "Use friendly equivalents",
    objective: "Replace awkward arithmetic with an equivalent operation that is easier to do mentally.",
    principles: [
      "Translate familiar percentages and factors before calculating.",
      "Keep the transformation exact, then perform a quick magnitude check."
    ],
    workedExample: {
      prompt: "Calculate 48 x 25 without long multiplication.",
      steps: [
        "Recognize that multiplying by 25 is the same as multiplying by 100 and dividing by 4.",
        "48 x 100 = 4,800.",
        "4,800 / 4 = 1,200."
      ],
      answer: "48 x 25 = 1,200. The result is sensible because 25 is one quarter of 100."
    },
    knowledgeCheck: {
      prompt: "Using the same transformation, what is 36 x 25?",
      options: [
        { id: "a", label: "720" },
        { id: "b", label: "900" },
        { id: "c", label: "1,080" }
      ],
      correctOptionId: "b",
      explanation: "Multiplying by 25 is multiplying by 100 and dividing by 4, so 3,600 / 4 = 900."
    }
  },
  {
    id: "profit-issue-tree",
    topic: "issue_tree",
    title: "Start with an exhaustive equation",
    objective: "Turn a broad business problem into distinct branches that can be tested in a useful order.",
    principles: [
      "Anchor the first level in a complete relationship, such as profit = revenue - costs.",
      "Split each branch into non-overlapping drivers before listing possible causes."
    ],
    workedExample: {
      prompt: "A meal-delivery company reports that profit fell this year. Structure the first diagnostic cuts.",
      steps: [
        "Split profit into revenue and costs.",
        "Split revenue into order volume and average price per order.",
        "Split costs into fixed costs and variable cost per order, then compare each driver with last year."
      ],
      answer: "The structure covers every profit driver once and creates measurable branches for analysis."
    },
    knowledgeCheck: {
      prompt: "Which first-level split best structures an investigation into falling profit?",
      options: [
        { id: "a", label: "Customers, competitors, and technology" },
        { id: "b", label: "Revenue and costs" },
        { id: "c", label: "Marketing, hiring, and product ideas" }
      ],
      correctOptionId: "b",
      explanation: "Revenue and costs form the complete profit equation and can each be decomposed into measurable drivers."
    }
  },
  {
    id: "exhibit-denominator-check",
    topic: "exhibit_reading",
    title: "Read the denominator first",
    objective: "Interpret an exhibit by fixing the unit, period, and denominator before comparing values.",
    principles: [
      "Read the title, units, legend, and time period before calculating.",
      "Convert percentages to absolute values when segments have different bases."
    ],
    workedExample: {
      prompt: "Region A has 200 customers and 30% adopt a service. Region B has 300 customers and 25% adopt it. Which region contributes more adopters?",
      steps: [
        "Region A: 200 x 30% = 60 adopters.",
        "Region B: 300 x 25% = 75 adopters.",
        "Compare the absolute results rather than the percentages alone."
      ],
      answer: "Region B contributes 15 more adopters despite its lower adoption rate."
    },
    knowledgeCheck: {
      prompt: "Segment X has 120 accounts at a 25% conversion rate. Segment Y has 150 accounts at 20%. Which statement is correct?",
      options: [
        { id: "a", label: "Segment X converts more accounts" },
        { id: "b", label: "Segment Y converts more accounts" },
        { id: "c", label: "Both convert 30 accounts" }
      ],
      correctOptionId: "c",
      explanation: "120 x 25% and 150 x 20% both equal 30 converted accounts."
    }
  },
  {
    id: "break-even-economics",
    topic: "business_economics",
    title: "Link unit economics to break-even",
    objective: "Use contribution margin to connect price, variable cost, fixed cost, and required volume.",
    principles: [
      "Contribution margin per unit equals price minus variable cost per unit.",
      "Break-even volume equals fixed costs divided by contribution margin per unit."
    ],
    workedExample: {
      prompt: "A product sells for $80, costs $50 per unit to produce, and carries $300,000 of fixed costs. Find break-even volume.",
      steps: [
        "Contribution margin = $80 - $50 = $30 per unit.",
        "Break-even volume = $300,000 / $30.",
        "The company must sell 10,000 units before profit becomes positive."
      ],
      answer: "Break-even volume is 10,000 units."
    },
    knowledgeCheck: {
      prompt: "A service sells for $60, has $36 of variable cost, and $240,000 of fixed costs. What is break-even volume?",
      options: [
        { id: "a", label: "4,000 units" },
        { id: "b", label: "6,667 units" },
        { id: "c", label: "10,000 units" }
      ],
      correctOptionId: "c",
      explanation: "Contribution margin is $24, and $240,000 / $24 = 10,000 units."
    }
  },
  {
    id: "prioritized-brainstorm",
    topic: "brainstorming",
    title: "Generate broadly, then prioritize",
    objective: "Organize ideas into distinct buckets and finish with a reasoned priority.",
    principles: [
      "Use two or three buckets tied to the objective before generating individual ideas.",
      "Prioritize using explicit criteria such as impact, feasibility, speed, and evidence."
    ],
    workedExample: {
      prompt: "An airline is considering a new route. Brainstorm what it should assess.",
      steps: [
        "Demand: passenger volume, willingness to pay, seasonality, and connecting traffic.",
        "Economics: fares, load factor, airport fees, crew, fuel, and aircraft utilization.",
        "Feasibility and risk: slots, regulation, competitor response, and operational resilience."
      ],
      answer: "Test demand first because weak route demand would invalidate the economics before detailed planning adds value."
    },
    knowledgeCheck: {
      prompt: "After generating ideas across demand, economics, and feasibility, what makes the strongest close?",
      options: [
        { id: "a", label: "Repeat every idea in the order it was generated" },
        { id: "b", label: "Choose the most creative idea without a criterion" },
        { id: "c", label: "Prioritize the highest-impact test and state why it comes first" }
      ],
      correctOptionId: "c",
      explanation: "A strong brainstorm closes by prioritizing against the objective with an explicit reason."
    }
  },
  {
    id: "answer-first-synthesis",
    topic: "synthesis",
    title: "Lead with the recommendation",
    objective: "Compress analysis into an answer-first recommendation supported by evidence, risk, and action.",
    principles: [
      "State the recommendation before recounting the analysis.",
      "Support it with the decisive evidence, then name the main risk and immediate next step."
    ],
    workedExample: {
      prompt: "A retailer is evaluating a new city. The site should add $2 million of annual profit, exceed the 15% margin target at 18%, but relies on an uncertain lease renewal.",
      steps: [
        "Recommendation: enter the city, conditional on securing the lease.",
        "Evidence: the site adds $2 million of profit and clears the margin target by 3 percentage points.",
        "Risk and next step: lease uncertainty could erase the economics, so negotiate renewal protection before approval."
      ],
      answer: "Proceed conditionally, supported by profit and margin evidence, with the lease resolved before launch."
    },
    knowledgeCheck: {
      prompt: "Which opening best synthesizes the expansion analysis?",
      options: [
        { id: "a", label: "We reviewed the market, costs, competitors, and several risks." },
        { id: "b", label: "Enter the city if the lease is secured; the site adds $2M profit and reaches an 18% margin." },
        { id: "c", label: "There are advantages and disadvantages, so management should discuss them." }
      ],
      correctOptionId: "b",
      explanation: "The strongest opening gives the recommendation and condition first, followed by the decisive evidence."
    }
  }
] as const satisfies readonly ConceptLesson[];
