import type { Formula } from "@/lib/domain";

export const coreFormulas: Formula[] = [
  {
    id: "revenue",
    name: "Revenue",
    category: "business_math",
    formulaText: "Revenue = Price x Volume",
    explanation: "Revenue is the total sales value created by selling a number of units at a given price.",
    example: "Selling 12,000 units at $25 each creates $300,000 in revenue.",
    tags: ["revenue"]
  },
  {
    id: "profit",
    name: "Profit",
    category: "business_math",
    formulaText: "Profit = Revenue - Cost",
    explanation: "Profit is the amount left after subtracting all relevant costs from revenue.",
    example: "If revenue is $500,000 and cost is $380,000, profit is $120,000.",
    tags: ["profit", "revenue", "cost"]
  },
  {
    id: "margin",
    name: "Margin",
    category: "business_math",
    formulaText: "Margin = Profit / Revenue",
    explanation: "Margin shows profit as a percentage of revenue, which makes profitability easier to compare.",
    example: "A $90,000 profit on $600,000 of revenue is a 15% margin.",
    tags: ["margin", "profit", "revenue"]
  },
  {
    id: "total_cost",
    name: "Total Cost",
    category: "business_math",
    formulaText: "Total Cost = Fixed Cost + Variable Cost per Unit x Units",
    explanation: "Total cost combines costs that do not vary with volume and costs that scale with each unit sold.",
    example: "$200,000 fixed cost plus $8 variable cost across 25,000 units equals $400,000 total cost.",
    tags: ["cost"]
  },
  {
    id: "contribution_margin",
    name: "Contribution Margin",
    category: "business_math",
    formulaText: "Contribution Margin = Price - Variable Cost per Unit",
    explanation: "Contribution margin is the amount each unit contributes toward fixed costs and profit.",
    example: "A $30 price with $18 variable cost leaves $12 of contribution margin per unit.",
    tags: ["contribution_margin", "margin", "cost"]
  },
  {
    id: "breakeven_volume",
    name: "Breakeven Volume",
    category: "business_math",
    formulaText: "Breakeven Volume = Fixed Cost / Contribution Margin",
    explanation: "Breakeven volume is the number of units needed for contribution margin to cover fixed cost.",
    example: "$240,000 of fixed cost divided by $12 contribution margin requires 20,000 units to break even.",
    tags: ["breakeven", "contribution_margin", "cost"]
  },
  {
    id: "roi",
    name: "ROI",
    category: "business_math",
    formulaText: "ROI = (Gain - Investment) / Investment",
    explanation: "ROI compares net gain with the original investment to estimate return efficiency.",
    example: "A $150,000 gain on a $100,000 investment produces a 50% ROI.",
    tags: ["roi"]
  },
  {
    id: "payback_period",
    name: "Payback Period",
    category: "business_math",
    formulaText: "Payback Period = Initial Investment / Annual Cash Flow",
    explanation: "Payback period estimates how many years it takes for cash flow to recover an upfront investment.",
    example: "A $300,000 investment with $75,000 annual cash flow has a 4-year payback period.",
    tags: ["payback", "roi"]
  },
  {
    id: "percentage_change",
    name: "Percentage Change",
    category: "percentages",
    formulaText: "Percentage Change = (New - Old) / Old",
    explanation: "Percentage change measures the size of an increase or decrease relative to the starting value.",
    example: "Growing from 80 to 100 is a 25% increase because 20 divided by 80 equals 25%.",
    tags: ["percentage_change"]
  },
  {
    id: "weighted_average",
    name: "Weighted Average",
    category: "weighted_averages",
    formulaText: "Weighted Average = Sum(weight x value) / Sum(weights)",
    explanation: "A weighted average gives each value influence in proportion to its weight.",
    example: "70 units at $10 and 30 units at $20 produce a weighted average price of $13.",
    tags: ["weighted_average"]
  },
  {
    id: "cagr",
    name: "CAGR",
    category: "growth_compounding",
    formulaText: "CAGR = (Ending Value / Beginning Value)^(1 / Years) - 1",
    explanation: "CAGR is the steady annual growth rate that would turn the beginning value into the ending value.",
    example: "Doubling from $50M to $100M over 4 years is about 19% annual growth.",
    tags: ["cagr", "compound_growth"]
  },
  {
    id: "rule_of_72",
    name: "Rule of 72",
    category: "growth_compounding",
    formulaText: "Years to Double = 72 / Growth Rate",
    explanation: "The Rule of 72 approximates doubling time when the growth rate is expressed as a percent.",
    example: "At 12% annual growth, doubling takes about 6 years because 72 divided by 12 equals 6.",
    tags: ["rule_of_72", "simple_growth"]
  },
  {
    id: "market_share",
    name: "Market Share",
    category: "business_math",
    formulaText: "Market Share = Company Sales / Total Market Sales",
    explanation: "Market share compares a company's sales with the total sales in the market.",
    example: "$45M of company sales in a $300M market equals 15% market share.",
    tags: ["market_share", "revenue"]
  },
  {
    id: "capacity_utilization",
    name: "Capacity Utilization",
    category: "business_math",
    formulaText: "Capacity Utilization = Actual Output / Maximum Capacity",
    explanation: "Capacity utilization shows how much of available capacity is being used.",
    example: "Producing 72,000 units out of 90,000 possible units means 80% capacity utilization.",
    tags: ["capacity_utilization"]
  }
];
