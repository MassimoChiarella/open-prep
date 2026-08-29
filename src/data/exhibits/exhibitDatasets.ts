import type { ExhibitDataset } from "@/features/exhibits/exhibitTypes";

const sourceNote = "Synthetic local dataset authored for deterministic practice.";

export const exhibitDatasets = [
  {
    id: "exhibit_retail_formats_001",
    title: "Retail Format Economics",
    description: "Annual store count, revenue, and gross margin by retail format.",
    unit: "currency",
    sourceNote,
    visualization: {
      selectedColumnIds: ["format", "stores", "average_revenue", "gross_margin"],
      title: "Store Format Comparison",
      type: "table"
    },
    columns: [
      { id: "format", label: "Format", role: "dimension", valueType: "text" },
      { id: "stores", label: "Stores", role: "metric", unit: "stores", valueType: "number" },
      { id: "average_revenue", label: "Average revenue per store", role: "metric", unit: "currency", valueType: "currency" },
      { id: "gross_margin", label: "Gross margin", role: "metric", unit: "percentage", valueType: "percentage" }
    ],
    rows: [
      {
        id: "downtown_flagship",
        cells: { average_revenue: 12_500_000, format: "Downtown flagship", gross_margin: 0.38, stores: 8 }
      },
      {
        id: "suburban_store",
        cells: { average_revenue: 3_600_000, format: "Suburban store", gross_margin: 0.32, stores: 42 }
      },
      {
        id: "mall_kiosk",
        cells: { average_revenue: 1_900_000, format: "Mall kiosk", gross_margin: 0.41, stores: 36 }
      }
    ],
    questions: [
      {
        id: "suburban_gross_profit",
        prompt: "How much annual gross profit do the suburban stores generate?",
        difficulty: "intermediate",
        expectedTimeSeconds: 75,
        tags: ["profit", "margin", "multiplication"],
        answer: {
          value: 48_384_000,
          unit: "currency",
          tolerance: { type: "percentage", value: 0.005 },
          roundingRule: "nearest_1k"
        },
        explanation: {
          short: "Suburban gross profit is stores times average revenue times gross margin.",
          steps: [
            "Annual suburban revenue = 42 x $3.6M = $151.2M.",
            "Gross profit = $151.2M x 32% = $48.384M."
          ]
        }
      }
    ]
  },
  {
    id: "exhibit_saas_segments_001",
    title: "SaaS Revenue by Segment",
    description: "Recurring revenue and year-over-year growth for three customer segments.",
    unit: "currency",
    sourceNote,
    visualization: {
      title: "Recurring Revenue by Segment",
      type: "bar_chart",
      xColumnId: "segment",
      yColumnIds: ["revenue"]
    },
    columns: [
      { id: "segment", label: "Segment", role: "dimension", valueType: "text" },
      { id: "revenue", label: "Recurring revenue", role: "metric", unit: "currency", valueType: "currency" },
      { id: "growth_rate", label: "YoY growth", role: "metric", unit: "percentage", valueType: "percentage" }
    ],
    rows: [
      { id: "smb", cells: { growth_rate: 0.22, revenue: 18_000_000, segment: "SMB" } },
      { id: "mid_market", cells: { growth_rate: 0.18, revenue: 27_000_000, segment: "Mid-market" } },
      { id: "enterprise", cells: { growth_rate: 0.11, revenue: 45_000_000, segment: "Enterprise" } }
    ],
    questions: [
      {
        id: "total_revenue",
        prompt: "What is the total recurring revenue across all three segments?",
        difficulty: "beginner",
        expectedTimeSeconds: 45,
        tags: ["addition", "revenue"],
        answer: {
          value: 90_000_000,
          unit: "currency",
          tolerance: { type: "absolute", value: 1 },
          roundingRule: "exact"
        },
        explanation: {
          short: "Add the three segment revenue figures.",
          steps: ["$18M + $27M + $45M = $90M.", "The total recurring revenue is $90M."]
        }
      }
    ]
  },
  {
    id: "exhibit_delivery_costs_001",
    title: "Delivery Cost Trend",
    description: "Cost per order and order volume for a delivery network across three years.",
    unit: "currency",
    sourceNote,
    visualization: {
      title: "Cost per Order Over Time",
      type: "line_chart",
      xColumnId: "year",
      yColumnIds: ["cost_per_order"]
    },
    columns: [
      { id: "year", label: "Year", role: "dimension", valueType: "year" },
      { id: "cost_per_order", label: "Cost per order", role: "metric", unit: "currency", valueType: "currency" },
      { id: "orders", label: "Orders", role: "metric", unit: "units", valueType: "number" }
    ],
    rows: [
      { id: "year_2022", cells: { cost_per_order: 5.2, orders: 12_000_000, year: 2022 } },
      { id: "year_2023", cells: { cost_per_order: 4.75, orders: 15_000_000, year: 2023 } },
      { id: "year_2024", cells: { cost_per_order: 4.1, orders: 18_000_000, year: 2024 } }
    ],
    questions: [
      {
        id: "cost_reduction",
        prompt: "By what percentage did cost per order decline from 2022 to 2024?",
        difficulty: "intermediate",
        expectedTimeSeconds: 60,
        tags: ["percentage_change", "cost"],
        answer: {
          value: 0.2115384615,
          unit: "percentage",
          tolerance: { type: "absolute", value: 0.001 },
          roundingRule: "nearest_0_1"
        },
        explanation: {
          short: "The decline is the cost reduction divided by the 2022 cost.",
          steps: ["Reduction = $5.20 - $4.10 = $1.10.", "$1.10 / $5.20 = 21.2%."]
        }
      }
    ]
  },
  {
    id: "exhibit_insurance_claims_001",
    title: "Insurance Claims Mix",
    description: "Claim dollars by product line for a regional insurer.",
    unit: "currency",
    sourceNote,
    visualization: {
      categoryColumnId: "claim_type",
      title: "Claim Dollars by Type",
      type: "pie_chart",
      valueColumnId: "claim_dollars"
    },
    columns: [
      { id: "claim_type", label: "Claim type", role: "dimension", valueType: "text" },
      { id: "claim_dollars", label: "Claim dollars", role: "metric", unit: "currency", valueType: "currency" }
    ],
    rows: [
      { id: "auto", cells: { claim_dollars: 32_000_000, claim_type: "Auto" } },
      { id: "home", cells: { claim_dollars: 21_000_000, claim_type: "Home" } },
      { id: "travel", cells: { claim_dollars: 9_000_000, claim_type: "Travel" } },
      { id: "other", cells: { claim_dollars: 8_000_000, claim_type: "Other" } }
    ],
    questions: [
      {
        id: "auto_claim_share",
        prompt: "What share of total claim dollars comes from auto claims?",
        difficulty: "intermediate",
        expectedTimeSeconds: 55,
        tags: ["percentage_of_number", "mixed_operations"],
        answer: {
          value: 0.4571428571,
          unit: "percentage",
          tolerance: { type: "absolute", value: 0.001 },
          roundingRule: "nearest_0_1"
        },
        explanation: {
          short: "Auto share is auto claim dollars divided by total claim dollars.",
          steps: ["Total claims = $32M + $21M + $9M + $8M = $70M.", "$32M / $70M = 45.7%."]
        }
      }
    ]
  },
  {
    id: "exhibit_airline_routes_001",
    title: "Airline Route Revenue",
    description: "Passenger count, average fare, and load factor by route.",
    unit: "currency",
    sourceNote,
    visualization: {
      title: "Passengers by Route",
      type: "bar_chart",
      xColumnId: "route",
      yColumnIds: ["passengers"]
    },
    columns: [
      { id: "route", label: "Route", role: "dimension", valueType: "text" },
      { id: "passengers", label: "Passengers", role: "metric", unit: "users", valueType: "number" },
      { id: "average_fare", label: "Average fare", role: "metric", unit: "currency", valueType: "currency" },
      { id: "load_factor", label: "Load factor", role: "metric", unit: "percentage", valueType: "percentage" }
    ],
    rows: [
      { id: "east", cells: { average_fare: 220, load_factor: 0.84, passengers: 180_000, route: "East" } },
      { id: "west", cells: { average_fare: 310, load_factor: 0.79, passengers: 140_000, route: "West" } },
      { id: "south", cells: { average_fare: 160, load_factor: 0.88, passengers: 210_000, route: "South" } },
      { id: "north", cells: { average_fare: 280, load_factor: 0.73, passengers: 95_000, route: "North" } }
    ],
    questions: [
      {
        id: "west_route_revenue",
        prompt: "What revenue did the West route generate?",
        difficulty: "beginner",
        expectedTimeSeconds: 45,
        tags: ["revenue", "multiplication"],
        answer: {
          value: 43_400_000,
          unit: "currency",
          tolerance: { type: "percentage", value: 0.005 },
          roundingRule: "nearest_1k"
        },
        explanation: {
          short: "Route revenue is passengers times average fare.",
          steps: ["West route passengers = 140,000.", "Revenue = 140,000 x $310 = $43.4M."]
        }
      }
    ]
  },
  {
    id: "exhibit_manufacturing_capacity_001",
    title: "Plant Capacity Utilization",
    description: "Installed capacity and actual output by plant.",
    unit: "percentage",
    sourceNote,
    visualization: {
      title: "Output by Plant",
      type: "bar_chart",
      xColumnId: "plant",
      yColumnIds: ["actual_output"]
    },
    columns: [
      { id: "plant", label: "Plant", role: "dimension", valueType: "text" },
      { id: "capacity", label: "Capacity", role: "metric", unit: "units", valueType: "number" },
      { id: "actual_output", label: "Actual output", role: "metric", unit: "units", valueType: "number" }
    ],
    rows: [
      { id: "plant_a", cells: { actual_output: 92_000, capacity: 100_000, plant: "Plant A" } },
      { id: "plant_b", cells: { actual_output: 68_000, capacity: 85_000, plant: "Plant B" } },
      { id: "plant_c", cells: { actual_output: 78_000, capacity: 120_000, plant: "Plant C" } }
    ],
    questions: [
      {
        id: "plant_c_utilization",
        prompt: "What is Plant C's capacity utilization?",
        difficulty: "beginner",
        expectedTimeSeconds: 45,
        tags: ["capacity_utilization", "division"],
        answer: {
          value: 0.65,
          unit: "percentage",
          tolerance: { type: "absolute", value: 0.001 },
          roundingRule: "nearest_0_1"
        },
        explanation: {
          short: "Capacity utilization is actual output divided by installed capacity.",
          steps: ["Plant C utilization = 78,000 / 120,000.", "78,000 / 120,000 = 65%."]
        }
      }
    ]
  },
  {
    id: "exhibit_grocery_margin_001",
    title: "Grocery Department Margins",
    description: "Department-level sales and gross margin rates for a grocery chain.",
    unit: "currency",
    sourceNote,
    visualization: {
      selectedColumnIds: ["department", "sales", "gross_margin"],
      title: "Department Sales and Margins",
      type: "table"
    },
    columns: [
      { id: "department", label: "Department", role: "dimension", valueType: "text" },
      { id: "sales", label: "Sales", role: "metric", unit: "currency", valueType: "currency" },
      { id: "gross_margin", label: "Gross margin", role: "metric", unit: "percentage", valueType: "percentage" }
    ],
    rows: [
      { id: "produce", cells: { department: "Produce", gross_margin: 0.34, sales: 24_000_000 } },
      { id: "deli", cells: { department: "Deli", gross_margin: 0.29, sales: 18_000_000 } },
      { id: "bakery", cells: { department: "Bakery", gross_margin: 0.37, sales: 12_000_000 } },
      { id: "center_store", cells: { department: "Center store", gross_margin: 0.22, sales: 36_000_000 } }
    ],
    questions: [
      {
        id: "produce_gross_profit",
        prompt: "How much gross profit does Produce generate?",
        difficulty: "beginner",
        expectedTimeSeconds: 40,
        tags: ["profit", "margin", "multiplication"],
        answer: {
          value: 8_160_000,
          unit: "currency",
          tolerance: { type: "percentage", value: 0.005 },
          roundingRule: "nearest_1k"
        },
        explanation: {
          short: "Gross profit is department sales times gross margin.",
          steps: ["Produce sales = $24M.", "Gross profit = $24M x 34% = $8.16M."]
        }
      }
    ]
  },
  {
    id: "exhibit_subscription_churn_001",
    title: "Subscription Base Trend",
    description: "Monthly subscriber count and churn rate for a digital subscription product.",
    unit: "users",
    sourceNote,
    visualization: {
      title: "Subscribers by Month",
      type: "line_chart",
      xColumnId: "month",
      yColumnIds: ["subscribers"]
    },
    columns: [
      { id: "month", label: "Month", role: "dimension", valueType: "text" },
      { id: "subscribers", label: "Subscribers", role: "metric", unit: "users", valueType: "number" },
      { id: "churn_rate", label: "Monthly churn", role: "metric", unit: "percentage", valueType: "percentage" }
    ],
    rows: [
      { id: "jan", cells: { churn_rate: 0.045, month: "Jan", subscribers: 12_000 } },
      { id: "feb", cells: { churn_rate: 0.041, month: "Feb", subscribers: 12_450 } },
      { id: "mar", cells: { churn_rate: 0.039, month: "Mar", subscribers: 12_900 } },
      { id: "apr", cells: { churn_rate: 0.036, month: "Apr", subscribers: 13_200 } }
    ],
    questions: [
      {
        id: "subscriber_gain",
        prompt: "How many net subscribers were added from January to April?",
        difficulty: "beginner",
        expectedTimeSeconds: 35,
        tags: ["subtraction", "mixed_operations"],
        answer: {
          value: 1_200,
          unit: "users",
          tolerance: { type: "absolute", value: 0 },
          roundingRule: "exact"
        },
        explanation: {
          short: "Net additions are April subscribers minus January subscribers.",
          steps: ["April subscribers = 13,200.", "January subscribers = 12,000, so net additions = 1,200."]
        }
      }
    ]
  },
  {
    id: "exhibit_hospital_mix_001",
    title: "Hospital Service Mix",
    description: "Visit volume and average revenue per visit by hospital service line.",
    unit: "users",
    sourceNote,
    visualization: {
      categoryColumnId: "service_line",
      title: "Visits by Service Line",
      type: "pie_chart",
      valueColumnId: "visits"
    },
    columns: [
      { id: "service_line", label: "Service line", role: "dimension", valueType: "text" },
      { id: "visits", label: "Visits", role: "metric", unit: "users", valueType: "number" },
      { id: "average_revenue", label: "Average revenue per visit", role: "metric", unit: "currency", valueType: "currency" }
    ],
    rows: [
      { id: "outpatient", cells: { average_revenue: 240, service_line: "Outpatient", visits: 18_500 } },
      { id: "imaging", cells: { average_revenue: 410, service_line: "Imaging", visits: 9_200 } },
      { id: "emergency", cells: { average_revenue: 680, service_line: "Emergency", visits: 6_400 } },
      { id: "surgery", cells: { average_revenue: 2_750, service_line: "Surgery", visits: 1_100 } }
    ],
    questions: [
      {
        id: "outpatient_revenue",
        prompt: "What revenue is generated by outpatient visits?",
        difficulty: "intermediate",
        expectedTimeSeconds: 55,
        tags: ["revenue", "multiplication"],
        answer: {
          value: 4_440_000,
          unit: "currency",
          tolerance: { type: "percentage", value: 0.005 },
          roundingRule: "nearest_1k"
        },
        explanation: {
          short: "Outpatient revenue is visits times average revenue per visit.",
          steps: ["Outpatient visits = 18,500.", "Revenue = 18,500 x $240 = $4.44M."]
        }
      }
    ]
  },
  {
    id: "exhibit_market_share_001",
    title: "Market Share Snapshot",
    description: "Current market share by competitor in a regional business services market.",
    unit: "percentage",
    sourceNote,
    visualization: {
      title: "Market Share by Competitor",
      type: "bar_chart",
      xColumnId: "competitor",
      yColumnIds: ["share"]
    },
    columns: [
      { id: "competitor", label: "Competitor", role: "dimension", valueType: "text" },
      { id: "share", label: "Market share", role: "metric", unit: "percentage", valueType: "percentage" },
      { id: "revenue", label: "Revenue", role: "metric", unit: "currency", valueType: "currency" }
    ],
    rows: [
      { id: "alpha", cells: { competitor: "Alpha", revenue: 62_000_000, share: 0.31 } },
      { id: "bravo", cells: { competitor: "Bravo", revenue: 46_000_000, share: 0.23 } },
      { id: "charlie", cells: { competitor: "Charlie", revenue: 38_000_000, share: 0.19 } },
      { id: "others", cells: { competitor: "Others", revenue: 54_000_000, share: 0.27 } }
    ],
    questions: [
      {
        id: "top_two_share",
        prompt: "What combined market share do Alpha and Bravo hold?",
        difficulty: "beginner",
        expectedTimeSeconds: 35,
        tags: ["market_share", "addition"],
        answer: {
          value: 0.54,
          unit: "percentage",
          tolerance: { type: "absolute", value: 0.001 },
          roundingRule: "nearest_0_1"
        },
        explanation: {
          short: "Add the two market share percentages.",
          steps: ["Alpha share = 31%.", "Bravo share = 23%, so combined share = 54%."]
        }
      }
    ]
  },
  {
    id: "exhibit_cloud_cost_mix_002",
    title: "Cloud Cost Mix",
    description: "Monthly cloud spend, utilization, and committed-use discounts by workload.",
    unit: "currency",
    sourceNote,
    visualization: {
      selectedColumnIds: ["workload", "monthly_spend", "utilization", "committed_discount"],
      title: "Cloud Workload Economics",
      type: "table"
    },
    columns: [
      { id: "workload", label: "Workload", role: "dimension", valueType: "text" },
      { id: "monthly_spend", label: "Monthly spend", role: "metric", unit: "currency", valueType: "currency" },
      { id: "utilization", label: "Utilization", role: "metric", unit: "percentage", valueType: "percentage" },
      { id: "committed_discount", label: "Committed-use discount", role: "metric", unit: "percentage", valueType: "percentage" }
    ],
    rows: [
      { id: "api_services", cells: { committed_discount: 0.12, monthly_spend: 420_000, utilization: 0.68, workload: "API services" } },
      { id: "data_platform", cells: { committed_discount: 0.18, monthly_spend: 310_000, utilization: 0.74, workload: "Data platform" } },
      { id: "analytics", cells: { committed_discount: 0.1, monthly_spend: 260_000, utilization: 0.52, workload: "Analytics" } },
      { id: "sandbox", cells: { committed_discount: 0.05, monthly_spend: 90_000, utilization: 0.35, workload: "Sandbox" } }
    ],
    questions: [
      {
        id: "production_monthly_spend",
        prompt: "What is the total monthly spend for API services, Data platform, and Analytics?",
        difficulty: "beginner",
        expectedTimeSeconds: 45,
        tags: ["addition", "cost"],
        answer: {
          value: 990_000,
          unit: "currency",
          tolerance: { type: "absolute", value: 1 },
          roundingRule: "exact"
        },
        explanation: {
          short: "Add the three production workload spend amounts.",
          steps: ["API services, Data platform, and Analytics spend $420K, $310K, and $260K per month.", "$420K + $310K + $260K = $990K."]
        }
      },
      {
        id: "sandbox_annual_savings",
        prompt: "If Sandbox monthly spend is reduced by 10%, what annual savings would that create?",
        difficulty: "intermediate",
        expectedTimeSeconds: 55,
        tags: ["percentage_of_number", "cost", "multiplication"],
        answer: {
          value: 108_000,
          unit: "currency",
          tolerance: { type: "absolute", value: 1 },
          roundingRule: "exact"
        },
        explanation: {
          short: "A 10% monthly reduction on Sandbox spend is multiplied by 12 months.",
          steps: ["Monthly savings = $90K x 10% = $9K.", "Annual savings = $9K x 12 = $108K."]
        }
      }
    ]
  },
  {
    id: "exhibit_quick_service_dayparts_002",
    title: "Quick Service Daypart Economics",
    description: "Transactions, average ticket, and labor cost rate by restaurant daypart.",
    unit: "currency",
    sourceNote,
    visualization: {
      title: "Transactions by Daypart",
      type: "bar_chart",
      xColumnId: "daypart",
      yColumnIds: ["transactions"]
    },
    columns: [
      { id: "daypart", label: "Daypart", role: "dimension", valueType: "text" },
      { id: "transactions", label: "Transactions", role: "metric", unit: "units", valueType: "number" },
      { id: "average_ticket", label: "Average ticket", role: "metric", unit: "currency", valueType: "currency" },
      { id: "labor_cost_rate", label: "Labor cost rate", role: "metric", unit: "percentage", valueType: "percentage" }
    ],
    rows: [
      { id: "breakfast", cells: { average_ticket: 8, daypart: "Breakfast", labor_cost_rate: 0.24, transactions: 180_000 } },
      { id: "lunch", cells: { average_ticket: 11, daypart: "Lunch", labor_cost_rate: 0.28, transactions: 260_000 } },
      { id: "dinner", cells: { average_ticket: 14, daypart: "Dinner", labor_cost_rate: 0.31, transactions: 210_000 } },
      { id: "late_night", cells: { average_ticket: 9, daypart: "Late night", labor_cost_rate: 0.22, transactions: 65_000 } }
    ],
    questions: [
      {
        id: "lunch_revenue",
        prompt: "What revenue does Lunch generate?",
        difficulty: "beginner",
        expectedTimeSeconds: 40,
        tags: ["revenue", "multiplication"],
        answer: {
          value: 2_860_000,
          unit: "currency",
          tolerance: { type: "absolute", value: 1 },
          roundingRule: "exact"
        },
        explanation: {
          short: "Lunch revenue is lunch transactions times average ticket.",
          steps: ["Lunch transactions = 260,000 and average ticket = $11.", "Revenue = 260,000 x $11 = $2.86M."]
        }
      },
      {
        id: "dinner_labor_cost",
        prompt: "What is Dinner labor cost?",
        difficulty: "intermediate",
        expectedTimeSeconds: 60,
        tags: ["cost", "percentage_of_number", "multiplication"],
        answer: {
          value: 911_400,
          unit: "currency",
          tolerance: { type: "absolute", value: 1 },
          roundingRule: "exact"
        },
        explanation: {
          short: "Dinner labor cost is dinner revenue times the labor cost rate.",
          steps: ["Dinner revenue = 210,000 x $14 = $2.94M.", "Labor cost = $2.94M x 31% = $911.4K."]
        }
      }
    ]
  },
  {
    id: "exhibit_logistics_cost_trend_002",
    title: "Logistics Cost Trend",
    description: "Shipment volume, cost per shipment, and on-time rate over four months.",
    unit: "currency",
    sourceNote,
    visualization: {
      title: "Cost per Shipment by Month",
      type: "line_chart",
      xColumnId: "month",
      yColumnIds: ["cost_per_shipment"]
    },
    columns: [
      { id: "month", label: "Month", role: "dimension", valueType: "text" },
      { id: "shipments", label: "Shipments", role: "metric", unit: "units", valueType: "number" },
      { id: "cost_per_shipment", label: "Cost per shipment", role: "metric", unit: "currency", valueType: "currency" },
      { id: "on_time_rate", label: "On-time rate", role: "metric", unit: "percentage", valueType: "percentage" }
    ],
    rows: [
      { id: "jan", cells: { cost_per_shipment: 18, month: "Jan", on_time_rate: 0.91, shipments: 12_000 } },
      { id: "feb", cells: { cost_per_shipment: 17.2, month: "Feb", on_time_rate: 0.92, shipments: 13_500 } },
      { id: "mar", cells: { cost_per_shipment: 16.5, month: "Mar", on_time_rate: 0.94, shipments: 15_000 } },
      { id: "apr", cells: { cost_per_shipment: 15.8, month: "Apr", on_time_rate: 0.95, shipments: 16_500 } }
    ],
    questions: [
      {
        id: "cost_per_shipment_decline",
        prompt: "By what percentage did cost per shipment decline from January to April?",
        difficulty: "intermediate",
        expectedTimeSeconds: 60,
        tags: ["percentage_change", "cost"],
        answer: {
          value: 0.1222222222,
          unit: "percentage",
          tolerance: { type: "absolute", value: 0.001 },
          roundingRule: "nearest_0_1"
        },
        explanation: {
          short: "The percentage decline is the cost reduction divided by January cost.",
          steps: ["Reduction = $18.00 - $15.80 = $2.20.", "$2.20 / $18.00 = 12.2%."]
        }
      },
      {
        id: "april_total_shipping_cost",
        prompt: "What is total shipping cost in April?",
        difficulty: "beginner",
        expectedTimeSeconds: 45,
        tags: ["cost", "multiplication"],
        answer: {
          value: 260_700,
          unit: "currency",
          tolerance: { type: "absolute", value: 1 },
          roundingRule: "exact"
        },
        explanation: {
          short: "April total shipping cost is shipments times cost per shipment.",
          steps: ["April shipments = 16,500 and cost per shipment = $15.80.", "16,500 x $15.80 = $260,700."]
        }
      }
    ]
  },
  {
    id: "exhibit_banking_product_mix_002",
    title: "Banking Product Revenue Mix",
    description: "Customers, revenue, and churn rate by banking product line.",
    unit: "currency",
    sourceNote,
    visualization: {
      categoryColumnId: "product",
      title: "Revenue by Product",
      type: "pie_chart",
      valueColumnId: "revenue"
    },
    columns: [
      { id: "product", label: "Product", role: "dimension", valueType: "text" },
      { id: "customers", label: "Customers", role: "metric", unit: "customers", valueType: "number" },
      { id: "revenue", label: "Revenue", role: "metric", unit: "currency", valueType: "currency" },
      { id: "churn_rate", label: "Annual churn", role: "metric", unit: "percentage", valueType: "percentage" }
    ],
    rows: [
      { id: "checking", cells: { churn_rate: 0.04, customers: 120_000, product: "Checking", revenue: 12_000_000 } },
      { id: "credit_cards", cells: { churn_rate: 0.07, customers: 85_000, product: "Credit cards", revenue: 25_500_000 } },
      { id: "loans", cells: { churn_rate: 0.03, customers: 22_000, product: "Loans", revenue: 18_700_000 } },
      { id: "wealth", cells: { churn_rate: 0.02, customers: 9_000, product: "Wealth", revenue: 16_200_000 } }
    ],
    questions: [
      {
        id: "credit_card_revenue_share",
        prompt: "What share of total product revenue comes from Credit cards?",
        difficulty: "intermediate",
        expectedTimeSeconds: 65,
        tags: ["percentage_of_number", "revenue", "mixed_operations"],
        answer: {
          value: 0.3522099448,
          unit: "percentage",
          tolerance: { type: "absolute", value: 0.001 },
          roundingRule: "nearest_0_1"
        },
        explanation: {
          short: "Credit card share is credit card revenue divided by total revenue.",
          steps: ["Total revenue = $12.0M + $25.5M + $18.7M + $16.2M = $72.4M.", "$25.5M / $72.4M = 35.2%."]
        }
      },
      {
        id: "wealth_revenue_per_customer",
        prompt: "What is average revenue per Wealth customer?",
        difficulty: "beginner",
        expectedTimeSeconds: 45,
        tags: ["division", "revenue"],
        answer: {
          value: 1_800,
          unit: "currency",
          tolerance: { type: "absolute", value: 1 },
          roundingRule: "exact"
        },
        explanation: {
          short: "Average revenue per customer is revenue divided by customer count.",
          steps: ["Wealth revenue = $16.2M and Wealth customers = 9,000.", "$16.2M / 9,000 = $1,800."]
        }
      }
    ]
  },
  {
    id: "exhibit_manufacturing_yield_002",
    title: "Manufacturing Yield by Plant",
    description: "Input units, good units, and rework cost by production plant.",
    unit: "units",
    sourceNote,
    visualization: {
      title: "Good Units by Plant",
      type: "bar_chart",
      xColumnId: "plant",
      yColumnIds: ["good_units"]
    },
    columns: [
      { id: "plant", label: "Plant", role: "dimension", valueType: "text" },
      { id: "input_units", label: "Input units", role: "metric", unit: "units", valueType: "number" },
      { id: "good_units", label: "Good units", role: "metric", unit: "units", valueType: "number" },
      { id: "rework_cost_per_defect", label: "Rework cost per defect", role: "metric", unit: "currency", valueType: "currency" }
    ],
    rows: [
      { id: "plant_a", cells: { good_units: 92_000, input_units: 100_000, plant: "Plant A", rework_cost_per_defect: 1.2 } },
      { id: "plant_b", cells: { good_units: 78_200, input_units: 85_000, plant: "Plant B", rework_cost_per_defect: 1.6 } },
      { id: "plant_c", cells: { good_units: 108_000, input_units: 120_000, plant: "Plant C", rework_cost_per_defect: 1.1 } },
      { id: "plant_d", cells: { good_units: 90_250, input_units: 95_000, plant: "Plant D", rework_cost_per_defect: 1.4 } }
    ],
    questions: [
      {
        id: "plant_c_yield",
        prompt: "What is Plant C's yield rate?",
        difficulty: "beginner",
        expectedTimeSeconds: 45,
        tags: ["division", "capacity_utilization"],
        answer: {
          value: 0.9,
          unit: "percentage",
          tolerance: { type: "absolute", value: 0.001 },
          roundingRule: "nearest_0_1"
        },
        explanation: {
          short: "Yield is good units divided by input units.",
          steps: ["Plant C good units = 108,000 and input units = 120,000.", "108,000 / 120,000 = 90%."]
        }
      },
      {
        id: "plant_b_defects",
        prompt: "How many defective units did Plant B produce?",
        difficulty: "beginner",
        expectedTimeSeconds: 40,
        tags: ["subtraction"],
        answer: {
          value: 6_800,
          unit: "units",
          tolerance: { type: "absolute", value: 0 },
          roundingRule: "exact"
        },
        explanation: {
          short: "Defects are input units minus good units.",
          steps: ["Plant B input units = 85,000 and good units = 78,200.", "85,000 - 78,200 = 6,800."]
        }
      }
    ]
  },
  {
    id: "exhibit_consumer_profit_bridge_003",
    title: "Consumer Services Profit Bridge",
    description: "A bridge from annual revenue through commercial gains and operating costs to profit.",
    unit: "currency",
    sourceNote,
    visualization: {
      title: "Revenue to Operating Profit Bridge",
      totalRowIds: ["operating_profit"],
      type: "waterfall",
      xColumnId: "driver",
      yColumnIds: ["impact"]
    },
    columns: [
      { id: "driver", label: "Driver", role: "dimension", valueType: "text" },
      { id: "impact", label: "Profit impact", role: "metric", unit: "currency", valueType: "currency" }
    ],
    rows: [
      { id: "starting_revenue", cells: { driver: "Starting revenue", impact: 120_000_000 } },
      { id: "price_mix", cells: { driver: "Price and mix", impact: 8_000_000 } },
      { id: "volume_growth", cells: { driver: "Volume growth", impact: 12_000_000 } },
      { id: "variable_costs", cells: { driver: "Variable costs", impact: -54_000_000 } },
      { id: "fixed_costs", cells: { driver: "Fixed costs", impact: -31_000_000 } },
      { id: "operating_profit", cells: { driver: "Operating profit", impact: 55_000_000 } }
    ],
    questions: [
      {
        id: "operating_margin",
        prompt: "What operating margin does the bridge imply relative to starting revenue?",
        difficulty: "intermediate",
        expectedTimeSeconds: 60,
        tags: ["margin", "division", "profit"],
        answer: {
          value: 0.4583333333,
          unit: "percentage",
          tolerance: { type: "absolute", value: 0.001 },
          roundingRule: "nearest_0_1"
        },
        explanation: {
          short: "Divide operating profit by starting revenue.",
          steps: ["Operating profit is $55M and starting revenue is $120M.", "$55M / $120M = 45.8%."]
        }
      },
      {
        id: "largest_commercial_lever",
        prompt: "Which commercial lever contributes the larger positive improvement?",
        difficulty: "beginner",
        expectedTimeSeconds: 35,
        tags: ["profit"],
        responseType: "multiple_choice",
        choices: [
          { id: "price_mix", label: "Price and mix" },
          { id: "volume_growth", label: "Volume growth" },
          { id: "variable_costs", label: "Variable costs" },
          { id: "fixed_costs", label: "Fixed costs" }
        ],
        correctChoiceId: "volume_growth",
        explanation: {
          short: "Volume growth is the larger of the two positive commercial movements.",
          steps: ["Price and mix adds $8M.", "Volume growth adds $12M, which is $4M more."]
        }
      }
    ]
  },
  {
    id: "exhibit_regional_productivity_003",
    title: "Regional Store Productivity",
    description: "Monthly foot traffic and purchase conversion across four retail regions.",
    unit: "percentage",
    sourceNote,
    visualization: {
      categoryColumnId: "region",
      title: "Traffic Versus Conversion",
      type: "scatterplot",
      xColumnId: "monthly_visits",
      yColumnIds: ["conversion_rate"]
    },
    columns: [
      { id: "region", label: "Region", role: "dimension", valueType: "text" },
      { id: "monthly_visits", label: "Monthly visits", role: "metric", unit: "customers", valueType: "number" },
      { id: "conversion_rate", label: "Conversion rate", role: "metric", unit: "percentage", valueType: "percentage" }
    ],
    rows: [
      { id: "north", cells: { conversion_rate: 0.18, monthly_visits: 120_000, region: "North" } },
      { id: "east", cells: { conversion_rate: 0.19, monthly_visits: 150_000, region: "East" } },
      { id: "south", cells: { conversion_rate: 0.13, monthly_visits: 100_000, region: "South" } },
      { id: "west", cells: { conversion_rate: 0.14, monthly_visits: 180_000, region: "West" } }
    ],
    questions: [
      {
        id: "north_west_conversion_gap",
        prompt: "What is the conversion-rate gap between North and West?",
        difficulty: "beginner",
        expectedTimeSeconds: 40,
        tags: ["subtraction", "percentage_points"],
        answer: {
          value: 0.04,
          unit: "percentage_points",
          tolerance: { type: "absolute", value: 0.001 },
          roundingRule: "nearest_0_1"
        },
        explanation: {
          short: "Subtract West conversion from North conversion.",
          steps: ["North converts 18% and West converts 14%.", "18% - 14% = 4 percentage points."]
        }
      },
      {
        id: "conversion_priority",
        prompt: "Which region offers the clearest conversion-improvement opportunity based on high traffic and below-average conversion?",
        difficulty: "intermediate",
        expectedTimeSeconds: 50,
        tags: ["percentage_change"],
        responseType: "multiple_choice",
        choices: [
          { id: "north", label: "North" },
          { id: "east", label: "East" },
          { id: "south", label: "South" },
          { id: "west", label: "West" }
        ],
        correctChoiceId: "west",
        explanation: {
          short: "West combines the highest traffic with a conversion rate below North and East.",
          steps: ["West receives 180,000 monthly visits, the highest traffic in the exhibit.", "Its 14% conversion trails North and East, so small improvements affect a large visitor base."]
        }
      }
    ]
  },
  {
    id: "exhibit_meal_kit_mix_003",
    title: "Meal Kit Subscriber Mix",
    description: "Quarterly subscribers across Basic, Premium, and Family plans.",
    unit: "customers",
    sourceNote,
    visualization: {
      title: "Subscribers by Plan",
      type: "stacked_bar",
      xColumnId: "quarter",
      yColumnIds: ["basic", "premium", "family"]
    },
    columns: [
      { id: "quarter", label: "Quarter", role: "dimension", valueType: "text" },
      { id: "basic", label: "Basic", role: "metric", unit: "customers", valueType: "number" },
      { id: "premium", label: "Premium", role: "metric", unit: "customers", valueType: "number" },
      { id: "family", label: "Family", role: "metric", unit: "customers", valueType: "number" }
    ],
    rows: [
      { id: "q1", cells: { basic: 45_000, family: 20_000, premium: 25_000, quarter: "Q1" } },
      { id: "q2", cells: { basic: 47_000, family: 22_000, premium: 27_000, quarter: "Q2" } },
      { id: "q3", cells: { basic: 48_000, family: 25_000, premium: 30_000, quarter: "Q3" } },
      { id: "q4", cells: { basic: 50_000, family: 28_000, premium: 32_000, quarter: "Q4" } }
    ],
    questions: [
      {
        id: "q4_total_subscribers",
        prompt: "How many total subscribers did the business have in Q4?",
        difficulty: "beginner",
        expectedTimeSeconds: 40,
        tags: ["addition"],
        answer: {
          value: 110_000,
          unit: "customers",
          tolerance: { type: "absolute", value: 0 },
          roundingRule: "exact"
        },
        explanation: {
          short: "Add all three Q4 plan segments.",
          steps: ["Q4 has 50,000 Basic, 32,000 Premium, and 28,000 Family subscribers.", "50,000 + 32,000 + 28,000 = 110,000."]
        }
      },
      {
        id: "largest_growth_segment",
        prompt: "Which plan added the most subscribers from Q1 to Q4?",
        difficulty: "beginner",
        expectedTimeSeconds: 40,
        tags: ["subtraction"],
        responseType: "multiple_choice",
        choices: [
          { id: "basic", label: "Basic" },
          { id: "premium", label: "Premium" },
          { id: "family", label: "Family" },
          { id: "all_equal", label: "All plans added the same number" }
        ],
        correctChoiceId: "family",
        explanation: {
          short: "Family had the largest absolute subscriber increase.",
          steps: ["Basic added 5,000 and Premium added 7,000 subscribers.", "Family added 8,000 subscribers, from 20,000 to 28,000."]
        }
      }
    ]
  },
  {
    id: "exhibit_input_cost_index_003",
    title: "Industrial Input Cost Index",
    description: "Indexed energy, materials, and labor costs with 2022 set to 100.",
    unit: "none",
    sourceNote,
    visualization: {
      title: "Input Cost Index (2022 = 100)",
      type: "index_chart",
      xColumnId: "year",
      yColumnIds: ["energy_index", "materials_index", "labor_index"]
    },
    columns: [
      { id: "year", label: "Year", role: "dimension", valueType: "year" },
      { id: "energy_index", label: "Energy index", role: "metric", valueType: "number" },
      { id: "materials_index", label: "Materials index", role: "metric", valueType: "number" },
      { id: "labor_index", label: "Labor index", role: "metric", valueType: "number" }
    ],
    rows: [
      { id: "year_2022", cells: { energy_index: 100, labor_index: 100, materials_index: 100, year: 2022 } },
      { id: "year_2023", cells: { energy_index: 118, labor_index: 106, materials_index: 112, year: 2023 } },
      { id: "year_2024", cells: { energy_index: 109, labor_index: 112, materials_index: 116, year: 2024 } },
      { id: "year_2025", cells: { energy_index: 130, labor_index: 119, materials_index: 111, year: 2025 } }
    ],
    questions: [
      {
        id: "energy_increase",
        prompt: "By what percentage did the energy index increase from 2022 to 2025?",
        difficulty: "beginner",
        expectedTimeSeconds: 40,
        tags: ["percentage_change"],
        answer: {
          value: 0.3,
          unit: "percentage",
          tolerance: { type: "absolute", value: 0.001 },
          roundingRule: "nearest_0_1"
        },
        explanation: {
          short: "An index moving from 100 to 130 represents a 30% increase.",
          steps: ["The index rises by 30 points from a base of 100.", "30 / 100 = 30%."]
        }
      },
      {
        id: "persistent_cost_pressure",
        prompt: "Which input shows the most consistent year-over-year cost pressure?",
        difficulty: "intermediate",
        expectedTimeSeconds: 45,
        tags: ["simple_growth"],
        responseType: "multiple_choice",
        choices: [
          { id: "energy", label: "Energy" },
          { id: "materials", label: "Materials" },
          { id: "labor", label: "Labor" },
          { id: "none", label: "No input rises consistently" }
        ],
        correctChoiceId: "labor",
        explanation: {
          short: "Labor is the only input index that rises in every period.",
          steps: ["Labor moves from 100 to 106 to 112 to 119.", "Energy and materials each decline in at least one year."]
        }
      }
    ]
  }
] as const satisfies readonly ExhibitDataset[];
