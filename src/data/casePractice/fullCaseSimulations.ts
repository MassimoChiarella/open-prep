import type { FullCaseSimulationSpec } from "@/features/case-practice/simulation/fullCaseTypes";

export const brightCartFullCase: FullCaseSimulationSpec = {
    id: "brightcart_same_day_rollout_001",
    client: "BrightCart",
    title: "Same-day delivery rollout",
    situation:
      "BrightCart, a regional online grocer, piloted same-day delivery in three cities. The CEO must decide where to expand the service next quarter without weakening unit economics or delivery reliability.",
    questioning: {
      id: "brightcart_rollout_questions",
      title: "BrightCart same-day delivery",
      industry: "Online grocery",
      situation:
        "BrightCart completed a three-city same-day delivery pilot and must decide where to expand next quarter.",
      objective: "Ask the questions needed to clarify the decision and diagnose the strongest expansion candidates.",
      language: "en",
      mode: "clarifying",
      minimumQuestions: 3,
      maximumQuestions: 7,
      concepts: [
        { id: "objective", label: "Success criteria", aliases: ["objective", "goal", "success", "threshold", "target"] },
        { id: "timing", label: "Time horizon", aliases: ["time", "timeline", "quarter", "quarters", "horizon", "deadline"] },
        { id: "scope", label: "Scope", aliases: ["city", "cities", "market", "markets", "region", "geography", "customer segment"] },
        { id: "demand", label: "Demand", aliases: ["demand", "adoption", "customers", "orders", "volume", "repeat use"] },
        { id: "economics", label: "Economics", aliases: ["economics", "profit", "profitability", "contribution", "cost", "costs", "revenue", "break even"] },
        { id: "operations", label: "Operations", aliases: ["operations", "capacity", "courier", "couriers", "delivery", "reliability", "service level", "on time"] },
        { id: "constraints", label: "Constraints", aliases: ["constraint", "constraints", "budget", "capital", "resources", "risk", "risks"] }
      ],
      intents: [
        {
          id: "decision_criteria",
          label: "Decision criteria",
          feedback: "Clarify what success means and when the expansion decision must deliver it.",
          priority: true,
          weight: 20,
          requiredConceptGroups: [["objective"], ["timing"]],
          referenceQuestions: ["What defines a successful expansion, and over what time horizon?"]
        },
        {
          id: "scope",
          label: "Decision scope",
          feedback: "Define which markets and customer groups are eligible for expansion.",
          priority: false,
          weight: 15,
          requiredConceptGroups: [["scope"]],
          referenceQuestions: ["Which cities, regions, or customer segments are in scope?"]
        },
        {
          id: "demand",
          label: "Demand quality",
          feedback: "Test adoption, repeat use, and sufficient order density.",
          priority: true,
          weight: 20,
          requiredConceptGroups: [["demand"]],
          referenceQuestions: ["How do adoption, repeat use, and order density differ by city?"]
        },
        {
          id: "economics",
          label: "Unit economics",
          feedback: "Compare contribution, cost, and break-even volume by market.",
          priority: true,
          weight: 25,
          requiredConceptGroups: [["economics"]],
          referenceQuestions: ["What are contribution and break-even economics in each city?"]
        },
        {
          id: "operational_feasibility",
          label: "Operational feasibility",
          feedback: "Assess delivery reliability, courier capacity, and scalability.",
          priority: false,
          weight: 20,
          requiredConceptGroups: [["operations", "constraints"]],
          supportingConceptIds: ["constraints"],
          referenceQuestions: ["Can courier capacity and on-time delivery remain reliable as volume scales?"]
        }
      ]
    },
    calculationQuestionId: "north_weekly_contribution",
    structure: {
      id: "brightcart_rollout_structure",
      title: "BrightCart same-day delivery",
      industry: "Online grocery",
      situation:
        "A three-city pilot produced different levels of customer adoption, contribution, and delivery reliability.",
      objective:
        "Determine whether and where BrightCart should expand same-day delivery next quarter.",
      acceptedHypothesisId: "conditional_expansion",
      maxBranches: 4,
      hypotheses: [
        {
          id: "conditional_expansion",
          label:
            "BrightCart should expand first in markets where demand density and reliable operations sustain positive contribution.",
          rationale: "This is testable and links the decision to demand, economics, and execution."
        },
        {
          id: "national_rollout",
          label: "BrightCart should launch nationally because at least one pilot city performed well.",
          rationale: "One strong city does not establish that every market will meet the same thresholds."
        },
        {
          id: "stop_service",
          label: "BrightCart should stop same-day delivery until all pilot cities perform equally.",
          rationale: "The decision can be market-specific; equal performance is not required."
        }
      ],
      branchOptions: [
        {
          id: "demand",
          label: "Customer demand",
          description: "Adoption, repeat use, willingness to pay, and addressable order density."
        },
        {
          id: "economics",
          label: "Unit economics",
          description: "Incremental revenue, delivery cost, contribution, and break-even volume."
        },
        {
          id: "operations",
          label: "Operational feasibility",
          description: "Courier capacity, fulfillment speed, service quality, and scalability."
        },
        {
          id: "rollout_risk",
          label: "Rollout and risk",
          description: "Market sequencing, test gates, cannibalization, and downside controls."
        },
        {
          id: "brand_refresh",
          label: "Corporate brand refresh",
          description: "A new logo and national brand campaign independent of pilot economics."
        },
        {
          id: "headquarters",
          label: "Headquarters location",
          description: "Office lease options unrelated to the same-day delivery decision."
        }
      ],
      modelStructure: [
        {
          branchId: "demand",
          title: "Customer demand",
          questions: ["Which customer segments adopt the service?", "Is usage sustained after trial?"]
        },
        {
          branchId: "economics",
          title: "Unit economics",
          questions: ["What is contribution per adopted order?", "What volume is needed to break even?"]
        },
        {
          branchId: "operations",
          title: "Operational feasibility",
          questions: ["Can each city meet service levels at scale?", "Where are capacity constraints?"]
        },
        {
          branchId: "rollout_risk",
          title: "Rollout and risk",
          questions: ["Which markets should launch first?", "What evidence should trigger the next phase?"]
        }
      ]
    },
    exhibit: {
      id: "brightcart_pilot_performance",
      title: "Same-day delivery pilot performance",
      description: "Average weekly results during the final four weeks of the pilot.",
      unit: "none",
      sourceNote: "Original synthetic practice data.",
      visualization: {
        type: "table",
        title: "BrightCart pilot performance by city",
        selectedColumnIds: ["city", "eligible_orders", "adoption", "contribution", "on_time"]
      },
      columns: [
        { id: "city", label: "City", role: "dimension", valueType: "text" },
        {
          id: "eligible_orders",
          label: "Eligible weekly orders",
          role: "metric",
          unit: "units",
          valueType: "number"
        },
        {
          id: "adoption",
          label: "Pilot adoption",
          role: "metric",
          unit: "percentage",
          valueType: "percentage"
        },
        {
          id: "contribution",
          label: "Contribution per adopted order",
          role: "metric",
          unit: "currency",
          valueType: "currency"
        },
        {
          id: "on_time",
          label: "On-time delivery",
          role: "metric",
          unit: "percentage",
          valueType: "percentage"
        }
      ],
      rows: [
        {
          id: "north",
          label: "North",
          cells: { city: "North", eligible_orders: 100_000, adoption: 0.3, contribution: 4, on_time: 0.96 }
        },
        {
          id: "central",
          label: "Central",
          cells: { city: "Central", eligible_orders: 70_000, adoption: 0.25, contribution: 3, on_time: 0.92 }
        },
        {
          id: "south",
          label: "South",
          cells: { city: "South", eligible_orders: 50_000, adoption: 0.15, contribution: 1, on_time: 0.85 }
        }
      ],
      questions: [
        {
          id: "north_weekly_contribution",
          difficulty: "intermediate",
          prompt:
            "Using the North row, what weekly incremental contribution does the pilot generate?",
          tags: ["multiplication", "contribution_margin"],
          expectedTimeSeconds: 90,
          answer: {
            value: 120_000,
            unit: "currency",
            roundingRule: "nearest_1k",
            tolerance: { type: "absolute", value: 500 }
          },
          explanation: {
            short: "Multiply eligible orders by adoption and contribution per adopted order.",
            steps: [
              "Adopted weekly orders = 100,000 x 30% = 30,000.",
              "Weekly incremental contribution = 30,000 x $4 = $120,000."
            ],
            shortcut: "Combine the rates: 100,000 x 0.30 x $4."
          }
        }
      ]
    },
    brainstorming: {
      id: "brightcart_rollout_brainstorm",
      title: "Improve rollout economics",
      context:
        "BrightCart wants actions it can test over the next eight weeks before committing to a broader rollout.",
      question: "Which actions should BrightCart prioritize to improve demand quality, economics, and reliability?",
      selectionLimit: 6,
      priorityLimit: 2,
      priorityIdeaIds: ["target_dense_zones", "batch_routes"],
      themes: [
        {
          id: "demand",
          label: "Demand quality",
          ideas: [
            { id: "target_dense_zones", label: "Target high-density delivery zones first", relevant: true },
            { id: "subscription_offer", label: "Test a subscription offer with frequent buyers", relevant: true },
            { id: "national_tv", label: "Buy a national TV campaign before further testing", relevant: false }
          ]
        },
        {
          id: "operations",
          label: "Operations",
          ideas: [
            { id: "batch_routes", label: "Batch orders into tighter courier routes", relevant: true },
            { id: "flex_shifts", label: "Align flexible courier shifts to peak order windows", relevant: true },
            { id: "all_zip_codes", label: "Promise 15-minute delivery in every postal code", relevant: false }
          ]
        },
        {
          id: "economics",
          label: "Economics and learning",
          ideas: [
            { id: "minimum_basket", label: "Test a minimum basket or delivery fee", relevant: true },
            { id: "cohort_dashboard", label: "Track repeat use, refunds, and contribution by cohort", relevant: true },
            { id: "simultaneous_launch", label: "Launch every remaining city on the same day", relevant: false }
          ]
        }
      ]
    },
    synthesis: {
      id: "brightcart_rollout_synthesis",
      title: "Recommend the rollout path",
      client: "BrightCart",
      situation: "The pilot shows meaningful differences in economics and reliability by city.",
      decision: "Recommend where BrightCart should expand same-day delivery next quarter.",
      facts: [
        "North generates about $120,000 of weekly incremental contribution with 96% on-time delivery.",
        "Central generates about $52,500 weekly but has lower reliability at 92% on-time delivery.",
        "South generates only about $7,500 weekly and delivers on time 85% of the time."
      ],
      options: {
        recommendation: [
          { id: "north_first", label: "Expand North first, improve Central, and pause South." },
          { id: "all_markets", label: "Expand all markets at once to maximize coverage." },
          { id: "stop_program", label: "Stop same-day delivery in every market." }
        ],
        evidence: [
          { id: "north_economics", label: "North combines the strongest contribution and service reliability." },
          { id: "south_population", label: "South has the largest general population." },
          { id: "brand_awareness", label: "BrightCart has strong unaided brand awareness." }
        ],
        risk: [
          { id: "scale_capacity", label: "North's service levels may weaken as order volume scales." },
          { id: "office_lease", label: "The headquarters lease may renew next year." },
          { id: "logo_color", label: "Customers may dislike BrightCart's current logo color." }
        ],
        nextStep: [
          {
            id: "gated_test",
            label: "Run a four-week capacity and retention test with contribution and on-time gates."
          },
          { id: "national_launch", label: "Approve a national launch before collecting more evidence." },
          { id: "annual_review", label: "Review the pilot again after one year without changing it." }
        ]
      },
      correctResponse: {
        recommendation: "north_first",
        evidence: "north_economics",
        risk: "scale_capacity",
        nextStep: "gated_test"
      },
      modelClose:
        "BrightCart should expand same-day delivery in North first, where the pilot generates about $120,000 in weekly contribution at 96% on-time delivery. It should hold South and improve Central before expansion. The key risk is that North's service level declines at higher volume, so the next step is a four-week capacity and retention test with explicit contribution and on-time gates."
    }
};

export const fullCaseSimulations: readonly FullCaseSimulationSpec[] = [brightCartFullCase];
