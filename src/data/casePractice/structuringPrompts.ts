import type { CaseStructuringPrompt } from "@/features/case-practice/structuring/structuringScoring";

export const structuringPrompts = [
  {
    id: "structure_grocery_margin_001",
    title: "Northstar Grocers Margin Decline",
    industry: "Grocery retail",
    situation:
      "Northstar Grocers operates 85 stores across two provinces. Revenue grew 4% last year, but operating profit fell 22%. Management has asked where the decline came from and how to restore profitability without slowing growth.",
    objective: "Structure the analysis needed to identify the causes of the profit decline and the most practical response.",
    hypotheses: [
      {
        id: "costs_outpaced_pricing",
        label: "Input and store-cost inflation outpaced pricing and mix gains",
        rationale: "Revenue growth alongside a sharp profit decline points first to gross-margin and operating-cost pressure."
      },
      {
        id: "temporary_weather",
        label: "Unusual weather is the sole cause, so no action is required",
        rationale: "A single temporary factor is too narrow before the economics are segmented and tested."
      },
      {
        id: "store_growth_only",
        label: "New stores are certainly unprofitable and should be closed",
        rationale: "New-store performance may matter, but the conclusion is premature without comparing cohorts and cost drivers."
      }
    ],
    acceptedHypothesisId: "costs_outpaced_pricing",
    branchOptions: [
      {
        id: "sales_mix",
        label: "Sales and mix",
        description: "Separate traffic, basket size, price, promotions, category mix, and channel mix."
      },
      {
        id: "gross_margin",
        label: "Gross margin",
        description: "Test supplier inflation, shrink, markdowns, private-label mix, and pricing pass-through."
      },
      {
        id: "store_operations",
        label: "Store operations",
        description: "Compare labor, occupancy, utilities, logistics, and productivity by store cohort."
      },
      {
        id: "market_context",
        label: "Market and competitive context",
        description: "Assess competitor pricing, customer switching, regulation, and regional demand changes."
      },
      {
        id: "loyalty_launch",
        label: "Design a new loyalty program",
        description: "Specify rewards, partner offers, launch communications, and enrollment targets."
      },
      {
        id: "organization_redesign",
        label: "Redesign the corporate organization",
        description: "Map reporting lines and consolidate head-office teams before diagnosing profit drivers."
      }
    ],
    maxBranches: 4,
    modelStructure: [
      {
        branchId: "sales_mix",
        title: "Sales and mix",
        questions: [
          "Did traffic, basket size, price, or volume change?",
          "Which categories, channels, and store cohorts drove revenue growth?"
        ]
      },
      {
        branchId: "gross_margin",
        title: "Gross margin",
        questions: [
          "Where did supplier costs, shrink, or markdowns increase?",
          "How much inflation was passed through without damaging volume?"
        ]
      },
      {
        branchId: "store_operations",
        title: "Store operations",
        questions: [
          "Which labor, occupancy, logistics, or utility costs changed?",
          "Do mature and recently opened stores show different economics?"
        ]
      },
      {
        branchId: "market_context",
        title: "Market and competitive context",
        questions: [
          "Have competitor moves changed local price positions or traffic?",
          "Are regional demand or regulatory changes affecting performance?"
        ]
      }
    ]
  },
  {
    id: "structure_physiotherapy_entry_002",
    title: "Harbor Health City Expansion",
    industry: "Healthcare services",
    situation:
      "Harbor Health runs a profitable network of physiotherapy clinics in smaller cities. It is considering opening six clinics in a nearby metropolitan area where rents and clinician wages are higher and several established chains already operate.",
    objective: "Structure whether Harbor Health should enter the metropolitan market and, if so, under what conditions.",
    hypotheses: [
      {
        id: "conditional_entry",
        label: "Enter only if demand supports attractive clinic economics and Harbor Health can secure patients and clinicians",
        rationale: "The decision depends on market attractiveness, defensible access, unit economics, and execution capability."
      },
      {
        id: "population_guarantees_entry",
        label: "Enter because a larger population guarantees sufficient demand",
        rationale: "Population alone does not establish accessible demand, competitive differentiation, or profitable economics."
      },
      {
        id: "avoid_all_competition",
        label: "Do not enter because the presence of competitors proves the market is unattractive",
        rationale: "Competition can validate demand; its intensity and Harbor Health's differentiation still need analysis."
      }
    ],
    acceptedHypothesisId: "conditional_entry",
    branchOptions: [
      {
        id: "market_demand",
        label: "Market demand",
        description: "Size accessible patient demand by segment, geography, referral source, and growth."
      },
      {
        id: "competition",
        label: "Competition and differentiation",
        description: "Map capacity, locations, service gaps, pricing, wait times, and likely competitor response."
      },
      {
        id: "unit_economics",
        label: "Clinic unit economics",
        description: "Model visits, utilization, reimbursement, staffing, rent, ramp-up, and investment returns."
      },
      {
        id: "capabilities_risks",
        label: "Capabilities and entry risks",
        description: "Test recruiting, referral access, brand transferability, regulation, and entry mode."
      },
      {
        id: "launch_campaign",
        label: "Detailed launch campaign",
        description: "Choose media channels, slogans, opening events, and promotional creative."
      },
      {
        id: "acquisition_financing",
        label: "Acquisition financing",
        description: "Negotiate debt terms for buying a clinic before confirming whether entry is attractive."
      }
    ],
    maxBranches: 4,
    modelStructure: [
      {
        branchId: "market_demand",
        title: "Market demand",
        questions: [
          "How large and fast-growing is accessible demand by patient segment?",
          "Which neighborhoods and referral channels have unmet need?"
        ]
      },
      {
        branchId: "competition",
        title: "Competition and differentiation",
        questions: [
          "How do current providers compare on capacity, service, price, and wait time?",
          "Can Harbor Health offer a defensible reason for patients and referrers to switch?"
        ]
      },
      {
        branchId: "unit_economics",
        title: "Clinic unit economics",
        questions: [
          "What utilization and visit economics are required to break even?",
          "Do ramp-up costs and returns clear Harbor Health's investment threshold?"
        ]
      },
      {
        branchId: "capabilities_risks",
        title: "Capabilities and entry risks",
        questions: [
          "Can the company recruit clinicians and build referral relationships?",
          "Which regulatory, execution, and competitor-response risks affect the entry mode?"
        ]
      }
    ]
  },
  {
    id: "structure_saas_churn_003",
    title: "Clearpath Software Churn Spike",
    industry: "B2B software",
    situation:
      "Clearpath provides scheduling software to small service businesses. Three months after a 15% price increase, monthly customer churn rose from 2% to 5%, while larger customers remained comparatively stable.",
    objective: "Structure the analysis needed to explain the churn increase and restore durable customer retention.",
    hypotheses: [
      {
        id: "price_exposed_weak_value",
        label: "The price increase exposed weak product value and onboarding among smaller customers",
        rationale: "The timing and segment pattern suggest pricing, usage, and customer-success factors should be tested together."
      },
      {
        id: "all_customers_price_sensitive",
        label: "All customers are equally price-sensitive, so the increase must be fully reversed",
        rationale: "Larger customers remained stable, which argues for segment-level diagnosis before a blanket response."
      },
      {
        id: "sales_team_failure",
        label: "The sales team caused churn by signing too many new customers",
        rationale: "Acquisition quality may contribute, but it does not yet explain the timing or affected segments."
      }
    ],
    acceptedHypothesisId: "price_exposed_weak_value",
    branchOptions: [
      {
        id: "churn_segments",
        label: "Churn pattern and segments",
        description: "Segment churn by tenure, size, plan, acquisition cohort, geography, and stated reason."
      },
      {
        id: "product_value",
        label: "Product value and usage",
        description: "Compare adoption, feature usage, reliability, outcomes, and unmet needs for retained and lost users."
      },
      {
        id: "pricing_contracts",
        label: "Pricing and contract mechanics",
        description: "Test willingness to pay, communication, packaging, billing shocks, and competitive price positions."
      },
      {
        id: "customer_success",
        label: "Customer success and alternatives",
        description: "Review onboarding, support, save offers, switching paths, and competitor actions."
      },
      {
        id: "new_logo_growth",
        label: "Increase new-customer acquisition",
        description: "Raise lead volume and sales quotas to replace customers who leave."
      },
      {
        id: "office_productivity",
        label: "Head-office productivity",
        description: "Analyze office attendance, internal meetings, and employee travel policy."
      }
    ],
    maxBranches: 4,
    modelStructure: [
      {
        branchId: "churn_segments",
        title: "Churn pattern and segments",
        questions: [
          "Which customer cohorts account for the increase and when do they leave?",
          "What cancellation reasons and leading indicators distinguish lost customers?"
        ]
      },
      {
        branchId: "product_value",
        title: "Product value and usage",
        questions: [
          "Did adoption, reliability, or realized customer outcomes change?",
          "Which unmet needs make the higher price harder to justify?"
        ]
      },
      {
        branchId: "pricing_contracts",
        title: "Pricing and contract mechanics",
        questions: [
          "How did the price increase affect value perception by segment?",
          "Did packaging, notice periods, billing, or competitor prices amplify the response?"
        ]
      },
      {
        branchId: "customer_success",
        title: "Customer success and alternatives",
        questions: [
          "Where do onboarding, support, and renewal interventions fail?",
          "Which competitors or manual alternatives are customers choosing instead?"
        ]
      }
    ]
  }
] as const satisfies readonly CaseStructuringPrompt[];
