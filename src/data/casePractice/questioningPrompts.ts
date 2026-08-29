import type { CaseQuestioningPrompt } from "@/features/case-practice/questioning/questioningScoring";

export const questioningPrompts = [
  {
    id: "questioning_mealkit_profit_001",
    title: "Tablewise Meal Kits Profit Decline",
    industry: "Consumer subscriptions",
    situation:
      "Tablewise delivers meal kits to households in three regions. Revenue grew 9% last year, but operating profit fell 18%. Management wants to understand the decline before choosing a response.",
    objective: "Ask the most useful diagnostic questions to locate the profit decline.",
    language: "en",
    mode: "diagnostic",
    minimumQuestions: 3,
    maximumQuestions: 8,
    concepts: [
      { id: "revenue", label: "Revenue", aliases: ["revenue", "sales", "top line", "income"] },
      { id: "price", label: "Price", aliases: ["price", "pricing", "subscription fee", "average order value"] },
      { id: "volume", label: "Volume", aliases: ["volume", "orders", "customers", "subscribers", "deliveries"] },
      { id: "cost", label: "Costs", aliases: ["cost", "costs", "expense", "expenses", "spending"] },
      { id: "food", label: "Food inputs", aliases: ["food", "ingredients", "produce", "input costs", "procurement"] },
      { id: "fulfillment", label: "Fulfillment", aliases: ["fulfillment", "delivery", "shipping", "packaging", "warehouse", "logistics"] },
      { id: "segment", label: "Segments", aliases: ["region", "regions", "customer segment", "plan", "product mix", "cohort"] },
      { id: "timing", label: "Timing", aliases: ["month", "months", "quarter", "quarters", "timing", "trend", "start", "begin", "began", "period"] }
    ],
    intents: [
      {
        id: "revenue_drivers",
        label: "Revenue drivers",
        feedback: "Separate revenue growth into price, order volume, and customer effects.",
        priority: true,
        weight: 25,
        requiredConceptGroups: [["revenue"], ["price", "volume"]],
        supportingConceptIds: ["price", "volume"],
        referenceQuestions: [
          "How did price, subscribers, and orders per customer contribute to revenue growth?",
          "Was sales growth driven by pricing or delivery volume?"
        ]
      },
      {
        id: "input_costs",
        label: "Food input costs",
        feedback: "Test ingredient inflation, waste, and supplier economics.",
        priority: true,
        weight: 25,
        requiredConceptGroups: [["cost"], ["food"]],
        supportingConceptIds: ["food"],
        referenceQuestions: [
          "Which ingredient and procurement costs increased?",
          "Did food inflation, supplier terms, or waste reduce gross margin?"
        ]
      },
      {
        id: "fulfillment_costs",
        label: "Fulfillment costs",
        feedback: "Investigate delivery, packaging, labor, and warehouse productivity.",
        priority: true,
        weight: 25,
        requiredConceptGroups: [["cost"], ["fulfillment"]],
        supportingConceptIds: ["fulfillment"],
        referenceQuestions: [
          "How did delivery and fulfillment costs per order change?",
          "Did packaging, warehouse labor, or shipping expenses increase?"
        ]
      },
      {
        id: "segmentation",
        label: "Segment concentration",
        feedback: "Locate the decline by region, plan, product mix, or customer cohort.",
        priority: false,
        weight: 15,
        requiredConceptGroups: [["segment"]],
        referenceQuestions: [
          "Is the profit decline concentrated in a region, customer segment, or subscription plan?"
        ]
      },
      {
        id: "timing",
        label: "Timing and trend",
        feedback: "Establish when the decline began and whether it was gradual or sudden.",
        priority: false,
        weight: 10,
        requiredConceptGroups: [["timing"]],
        referenceQuestions: [
          "When did profitability begin to decline, and was the change gradual or sudden?"
        ]
      }
    ]
  },
  {
    id: "questioning_diagnostics_entry_002",
    title: "Luma Diagnostics Market Entry",
    industry: "Healthcare services",
    situation:
      "Luma Diagnostics operates imaging centers in two mid-sized cities. It is considering entering a larger neighboring city where several hospital systems and independent clinics already provide imaging services.",
    objective: "Ask clarifying questions that define the decision and the evidence needed before structuring the case.",
    language: "en",
    mode: "clarifying",
    minimumQuestions: 3,
    maximumQuestions: 8,
    concepts: [
      { id: "objective", label: "Objective", aliases: ["objective", "goal", "success", "target", "decision criteria"] },
      { id: "economics", label: "Economics", aliases: ["profit", "profitability", "return", "revenue", "margin", "economics"] },
      { id: "time", label: "Time horizon", aliases: ["time", "timeline", "year", "years", "horizon", "deadline"] },
      { id: "scope", label: "Scope", aliases: ["city", "geography", "area", "modality", "service", "services", "patient segment"] },
      { id: "demand", label: "Demand", aliases: ["demand", "patients", "referrals", "volume", "market size", "growth"] },
      { id: "competition", label: "Competition", aliases: ["competitor", "competitors", "competition", "hospital", "clinics", "capacity"] },
      { id: "constraints", label: "Constraints", aliases: ["constraint", "constraints", "budget", "capital", "regulation", "license", "staffing", "radiologists"] },
      { id: "entry", label: "Entry mode", aliases: ["build", "acquire", "acquisition", "partner", "partnership", "entry mode"] }
    ],
    intents: [
      {
        id: "success_criteria",
        label: "Success criteria",
        feedback: "Clarify the financial or strategic objective and the required time horizon.",
        priority: true,
        weight: 25,
        requiredConceptGroups: [["objective", "economics"], ["time"]],
        supportingConceptIds: ["economics"],
        referenceQuestions: [
          "What financial return defines success, and over what time horizon?",
          "Is management optimizing for profit, growth, or another goal, and by when?"
        ]
      },
      {
        id: "decision_scope",
        label: "Decision scope",
        feedback: "Define the geography, services, and patient groups included in the decision.",
        priority: true,
        weight: 20,
        requiredConceptGroups: [["scope"]],
        referenceQuestions: [
          "Which imaging services, patient segments, and parts of the city are in scope?"
        ]
      },
      {
        id: "market_context",
        label: "Market context",
        feedback: "Establish what is known about demand, referrals, capacity, and competitors.",
        priority: true,
        weight: 25,
        requiredConceptGroups: [["demand", "competition"]],
        referenceQuestions: [
          "What do we know about patient demand, referral volume, and existing competitor capacity?"
        ]
      },
      {
        id: "constraints",
        label: "Constraints",
        feedback: "Surface capital, regulatory, staffing, and timing constraints.",
        priority: false,
        weight: 15,
        requiredConceptGroups: [["constraints"]],
        referenceQuestions: [
          "Are there capital, licensing, staffing, or timing constraints we must respect?"
        ]
      },
      {
        id: "entry_options",
        label: "Entry options",
        feedback: "Clarify whether build, acquisition, and partnership options are all available.",
        priority: false,
        weight: 15,
        requiredConceptGroups: [["entry"]],
        referenceQuestions: [
          "Should we consider building, acquiring, and partnering, or is one entry mode required?"
        ]
      }
    ]
  },
  {
    id: "questioning_furniture_delays_003",
    title: "Oakline Furniture Delivery Delays",
    industry: "Manufacturing and retail",
    situation:
      "Oakline sells made-to-order furniture through stores and online. On-time delivery fell from 92% to 71% over six months, while order volume increased only modestly. Customer complaints and cancellations are rising.",
    objective: "Ask diagnostic questions that isolate where and why orders are being delayed.",
    language: "en",
    mode: "diagnostic",
    minimumQuestions: 3,
    maximumQuestions: 8,
    concepts: [
      { id: "process", label: "Process stage", aliases: ["stage", "step", "process", "bottleneck", "delay", "lead time", "cycle time"] },
      { id: "production", label: "Production", aliases: ["production", "factory", "manufacturing", "assembly", "machine", "labor"] },
      { id: "supplier", label: "Suppliers", aliases: ["supplier", "suppliers", "material", "materials", "component", "components", "inventory"] },
      { id: "delivery", label: "Delivery", aliases: ["delivery", "shipping", "carrier", "carriers", "transport", "warehouse", "last mile"] },
      { id: "segment", label: "Segments", aliases: ["product", "products", "store", "online", "region", "customer", "order type"] },
      { id: "capacity", label: "Capacity", aliases: ["capacity", "utilization", "backlog", "staffing", "shift", "throughput"] },
      { id: "change", label: "Recent changes", aliases: ["change", "changed", "new", "recent", "six months", "implementation"] }
    ],
    intents: [
      {
        id: "delay_location",
        label: "Delay location",
        feedback: "Measure lead time by process stage to locate the bottleneck.",
        priority: true,
        weight: 25,
        requiredConceptGroups: [["process"]],
        referenceQuestions: [
          "At which stage of the order-to-delivery process has lead time increased?"
        ]
      },
      {
        id: "production_capacity",
        label: "Production capacity",
        feedback: "Test factory capacity, staffing, utilization, and backlog.",
        priority: true,
        weight: 20,
        requiredConceptGroups: [["production"], ["capacity"]],
        supportingConceptIds: ["capacity"],
        referenceQuestions: [
          "Have factory capacity, labor availability, or production backlogs changed?"
        ]
      },
      {
        id: "supplier_inputs",
        label: "Supplier inputs",
        feedback: "Investigate material availability, supplier performance, and inventory gaps.",
        priority: true,
        weight: 20,
        requiredConceptGroups: [["supplier"]],
        referenceQuestions: [
          "Are supplier delays or material shortages holding up production?"
        ]
      },
      {
        id: "logistics",
        label: "Warehousing and delivery",
        feedback: "Test warehouse handling, carrier capacity, and last-mile performance.",
        priority: false,
        weight: 15,
        requiredConceptGroups: [["delivery"]],
        referenceQuestions: [
          "Did warehouse processing, carrier capacity, or last-mile delivery performance deteriorate?"
        ]
      },
      {
        id: "segmentation",
        label: "Delay concentration",
        feedback: "Segment delays by product, channel, region, and order type.",
        priority: false,
        weight: 10,
        requiredConceptGroups: [["segment"]],
        referenceQuestions: [
          "Are delays concentrated in certain products, channels, regions, or order types?"
        ]
      },
      {
        id: "recent_changes",
        label: "Recent changes",
        feedback: "Connect the timing to recent process, system, supplier, or policy changes.",
        priority: false,
        weight: 10,
        requiredConceptGroups: [["change"]],
        referenceQuestions: [
          "What changed in the operation around the time delivery performance began to fall?"
        ]
      }
    ]
  }
] as const satisfies readonly CaseQuestioningPrompt[];
