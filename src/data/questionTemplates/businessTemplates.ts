import type { QuestionTemplate } from "@/lib/domain";

export const businessMathTemplates: QuestionTemplate[] = [
  {
    id: "business_revenue_beginner_001",
    category: "business_math",
    tags: ["revenue"],
    difficulty: ["beginner"],
    promptTemplate: "A product sells {volume} units at {price} each. What is revenue?",
    variables: {
      volume: { type: "integer", values: [100, 200, 500, 800, 1_000] },
      price: { type: "currency", values: [10, 20, 25, 50, 75] }
    },
    formula: { expression: "volume * price" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Revenue equals volume times price.", "{volume} x {price} = {answer}."]
    }
  },
  {
    id: "business_revenue_beginner_002",
    category: "business_math",
    tags: ["revenue"],
    difficulty: ["beginner"],
    promptTemplate: "{customers} customers spend {averageSpend} each. What is total revenue?",
    variables: {
      customers: { type: "integer", values: [250, 500, 750, 1_000, 1_500] },
      averageSpend: { type: "currency", values: [12, 20, 30, 40, 60] }
    },
    formula: { expression: "customers * averageSpend" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Total revenue equals customers times average spend.", "{customers} x {averageSpend} = {answer}."]
    }
  },
  {
    id: "business_revenue_beginner_003",
    category: "business_math",
    tags: ["revenue", "market_share"],
    difficulty: ["beginner"],
    promptTemplate: "A market is worth {marketRevenue}. A company has {share}% share. What is company revenue?",
    variables: {
      marketRevenue: { type: "currency", values: [1_000, 2_000, 5_000, 10_000, 20_000] },
      share: { type: "percentage", values: [5, 10, 20, 25, 50] }
    },
    formula: { expression: "marketRevenue * share / 100" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Company revenue equals market revenue times share.", "{marketRevenue} x {share}/100 = {answer}."]
    }
  },
  {
    id: "business_profit_beginner_001",
    category: "business_math",
    tags: ["profit"],
    difficulty: ["beginner"],
    promptTemplate: "Revenue is {revenue} and total cost is {cost}. What is profit?",
    variables: {
      revenue: { type: "currency", values: [500, 1_000, 2_000, 5_000, 10_000] },
      cost: { type: "currency", values: [200, 400, 800, 1_500, 3_000] }
    },
    formula: { expression: "revenue - cost" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Profit equals revenue minus cost.", "{revenue} - {cost} = {answer}."]
    }
  },
  {
    id: "business_profit_beginner_002",
    category: "business_math",
    tags: ["profit", "margin"],
    difficulty: ["beginner"],
    promptTemplate: "Revenue is {revenue} and margin is {margin}%. What is profit?",
    variables: {
      revenue: { type: "currency", values: [1_000, 2_000, 4_000, 8_000, 10_000] },
      margin: { type: "percentage", values: [10, 20, 25, 30, 40] }
    },
    formula: { expression: "revenue * margin / 100" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Profit equals revenue times margin.", "{revenue} x {margin}/100 = {answer}."]
    }
  },
  {
    id: "business_profit_beginner_003",
    category: "business_math",
    tags: ["profit", "contribution_margin"],
    difficulty: ["beginner"],
    promptTemplate: "{units} units sell for {price} each with variable cost {variableCost} each and fixed cost {fixedCost}. What is profit?",
    variables: {
      units: { type: "integer", values: [100, 200, 400, 500, 1_000] },
      price: { type: "currency", values: [20, 30, 40, 50, 80] },
      variableCost: { type: "currency", values: [5, 10, 15, 20, 30] },
      fixedCost: { type: "currency", values: [500, 1_000, 2_000, 3_000] }
    },
    formula: { expression: "units * (price - variableCost) - fixedCost" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Contribution per unit is price minus variable cost.",
        "{units} x ({price} - {variableCost}) - {fixedCost} = {answer}."
      ]
    }
  },
  {
    id: "business_cost_beginner_001",
    category: "business_math",
    tags: ["cost"],
    difficulty: ["beginner"],
    promptTemplate: "Fixed cost is {fixedCost}. Variable cost is {variableCost} per unit for {units} units. What is total cost?",
    variables: {
      fixedCost: { type: "currency", values: [500, 1_000, 2_000, 5_000] },
      variableCost: { type: "currency", values: [5, 10, 15, 25] },
      units: { type: "integer", values: [100, 200, 400, 800] }
    },
    formula: { expression: "fixedCost + variableCost * units" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Total cost equals fixed cost plus variable cost times units.", "{fixedCost} + {variableCost} x {units} = {answer}."]
    }
  },
  {
    id: "business_cost_beginner_002",
    category: "business_math",
    tags: ["cost", "profit"],
    difficulty: ["beginner"],
    promptTemplate: "Revenue is {revenue} and profit is {profit}. What is total cost?",
    variables: {
      revenue: { type: "currency", values: [1_000, 2_000, 5_000, 8_000] },
      profit: { type: "currency", values: [100, 500, 1_000, 2_000] }
    },
    formula: { expression: "revenue - profit" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Cost equals revenue minus profit.", "{revenue} - {profit} = {answer}."]
    }
  },
  {
    id: "business_margin_beginner_001",
    category: "business_math",
    tags: ["margin"],
    difficulty: ["beginner"],
    promptTemplate: "Profit is {profit} on revenue of {revenue}. What is margin? Enter the percent value.",
    variables: {
      profit: { type: "currency", values: [100, 200, 500, 1_000] },
      revenue: { type: "currency", values: [1_000, 2_000, 5_000, 10_000] }
    },
    formula: { expression: "profit / revenue * 100" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Margin equals profit divided by revenue.", "{profit} / {revenue} x 100 = {answer}."]
    }
  },
  {
    id: "business_margin_beginner_002",
    category: "business_math",
    tags: ["margin", "contribution_margin"],
    difficulty: ["beginner"],
    promptTemplate: "A unit sells for {price} with unit cost {cost}. What is unit margin? Enter the percent value.",
    variables: {
      price: { type: "currency", values: [20, 40, 50, 80, 100] },
      cost: { type: "currency", values: [5, 10, 20, 30, 40] }
    },
    formula: { expression: "(price - cost) / price * 100" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Unit margin equals unit profit divided by price.", "({price} - {cost}) / {price} x 100 = {answer}."]
    }
  },
  {
    id: "business_margin_beginner_003",
    category: "business_math",
    tags: ["margin", "profit"],
    difficulty: ["beginner"],
    promptTemplate: "Revenue is {revenue} and cost is {cost}. What is margin? Enter the percent value.",
    variables: {
      revenue: { type: "currency", values: [500, 1_000, 2_000, 5_000] },
      cost: { type: "currency", values: [100, 400, 800, 1_500] }
    },
    formula: { expression: "(revenue - cost) / revenue * 100" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Find profit first, then divide by revenue.", "({revenue} - {cost}) / {revenue} x 100 = {answer}."]
    }
  },
  {
    id: "business_contribution_beginner_001",
    category: "business_math",
    tags: ["contribution_margin"],
    difficulty: ["beginner"],
    promptTemplate: "Price is {price} and variable cost is {variableCost}. What is contribution margin per unit?",
    variables: {
      price: { type: "currency", values: [15, 25, 40, 60, 100] },
      variableCost: { type: "currency", values: [5, 10, 15, 20, 40] }
    },
    formula: { expression: "price - variableCost" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Contribution margin per unit equals price minus variable cost.", "{price} - {variableCost} = {answer}."]
    }
  },
  {
    id: "business_contribution_beginner_002",
    category: "business_math",
    tags: ["contribution_margin"],
    difficulty: ["beginner"],
    promptTemplate: "Contribution per unit is {contribution}. The company sells {units} units. What is total contribution?",
    variables: {
      contribution: { type: "currency", values: [5, 10, 20, 25, 40] },
      units: { type: "integer", values: [100, 200, 500, 1_000] }
    },
    formula: { expression: "contribution * units" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Total contribution equals contribution per unit times units.", "{contribution} x {units} = {answer}."]
    }
  },
  {
    id: "business_breakeven_beginner_001",
    category: "business_math",
    tags: ["breakeven"],
    difficulty: ["beginner"],
    promptTemplate: "Fixed cost is {fixedCost} and contribution margin per unit is {contribution}. How many units break even?",
    variables: {
      fixedCost: { type: "currency", values: [1_000, 2_000, 5_000, 10_000] },
      contribution: { type: "currency", values: [10, 20, 25, 50, 100] }
    },
    formula: { expression: "fixedCost / contribution" },
    answerUnit: "units",
    explanationTemplate: {
      steps: ["Breakeven units equal fixed cost divided by contribution per unit.", "{fixedCost} / {contribution} = {answer}."]
    }
  },
  {
    id: "business_breakeven_beginner_002",
    category: "business_math",
    tags: ["breakeven", "contribution_margin"],
    difficulty: ["beginner"],
    promptTemplate: "Fixed cost is {fixedCost}, price is {price}, and variable cost is {variableCost}. How many units break even?",
    variables: {
      fixedCost: { type: "currency", values: [1_000, 2_000, 4_000, 8_000] },
      price: { type: "currency", values: [20, 40, 50, 80] },
      variableCost: { type: "currency", values: [5, 10, 15] }
    },
    formula: { expression: "fixedCost / (price - variableCost)" },
    answerUnit: "units",
    explanationTemplate: {
      steps: ["Find contribution per unit, then divide fixed cost by it.", "{fixedCost} / ({price} - {variableCost}) = {answer}."]
    }
  },
  {
    id: "business_roi_beginner_001",
    category: "business_math",
    tags: ["roi"],
    difficulty: ["beginner"],
    promptTemplate: "An investment of {investment} produces a gain of {gain}. What is ROI? Enter the percent value.",
    variables: {
      investment: { type: "currency", values: [100, 200, 500, 1_000] },
      gain: { type: "currency", values: [150, 300, 750, 1_500] }
    },
    formula: { expression: "(gain - investment) / investment * 100" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["ROI equals net gain divided by investment.", "({gain} - {investment}) / {investment} x 100 = {answer}."]
    }
  },
  {
    id: "business_roi_beginner_002",
    category: "business_math",
    tags: ["roi"],
    difficulty: ["beginner"],
    promptTemplate: "A project costs {investment} and returns {returnAmount}. What is ROI? Enter the percent value.",
    variables: {
      investment: { type: "currency", values: [1_000, 2_000, 4_000, 5_000] },
      returnAmount: { type: "currency", values: [1_500, 3_000, 6_000, 10_000] }
    },
    formula: { expression: "(returnAmount - investment) / investment * 100" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Subtract investment from return, then divide by investment.", "({returnAmount} - {investment}) / {investment} x 100 = {answer}."]
    }
  },
  {
    id: "business_payback_beginner_001",
    category: "business_math",
    tags: ["payback"],
    difficulty: ["beginner"],
    promptTemplate: "An investment costs {investment} and produces {annualCashFlow} per year. What is payback period in years?",
    variables: {
      investment: { type: "currency", values: [1_000, 2_000, 5_000, 10_000] },
      annualCashFlow: { type: "currency", values: [250, 500, 1_000, 2_000] }
    },
    formula: { expression: "investment / annualCashFlow" },
    answerUnit: "years",
    explanationTemplate: {
      steps: ["Payback period equals investment divided by annual cash flow.", "{investment} / {annualCashFlow} = {answer}."]
    }
  },
  {
    id: "business_market_share_beginner_001",
    category: "business_math",
    tags: ["market_share"],
    difficulty: ["beginner"],
    promptTemplate: "Company sales are {companySales} in a {marketSales} market. What is market share? Enter the percent value.",
    variables: {
      companySales: { type: "currency", values: [100, 200, 500, 1_000] },
      marketSales: { type: "currency", values: [1_000, 2_000, 5_000, 10_000] }
    },
    formula: { expression: "companySales / marketSales * 100" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Market share equals company sales divided by total market sales.", "{companySales} / {marketSales} x 100 = {answer}."]
    }
  },
  {
    id: "business_capacity_beginner_001",
    category: "business_math",
    tags: ["capacity_utilization"],
    difficulty: ["beginner"],
    promptTemplate: "Actual output is {actualOutput} units and max capacity is {capacity} units. What is capacity utilization? Enter the percent value.",
    variables: {
      actualOutput: { type: "integer", values: [400, 600, 800, 1_000] },
      capacity: { type: "integer", values: [1_000, 1_200, 1_600, 2_000] }
    },
    formula: { expression: "actualOutput / capacity * 100" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Capacity utilization equals actual output divided by maximum capacity.", "{actualOutput} / {capacity} x 100 = {answer}."]
    }
  },
  {
    id: "business_revenue_beginner_004",
    category: "business_math",
    tags: ["revenue"],
    difficulty: ["beginner"],
    promptTemplate: "{subscribers} subscribers pay {monthlyPrice} per month for {months} months. What is subscription revenue?",
    variables: {
      subscribers: { type: "integer", values: [500, 1_000, 2_500, 5_000] },
      monthlyPrice: { type: "currency", values: [8, 12, 20, 25] },
      months: { type: "integer", values: [3, 6, 12] }
    },
    formula: { expression: "subscribers * monthlyPrice * months" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Subscription revenue equals subscribers times monthly price times months.", "{subscribers} x {monthlyPrice} x {months} = {answer}."]
    }
  },
  {
    id: "business_revenue_beginner_005",
    category: "business_math",
    tags: ["revenue"],
    difficulty: ["beginner"],
    promptTemplate: "{stores} stores each complete {transactions} transactions at an average ticket of {averageTicket}. What is total revenue?",
    variables: {
      stores: { type: "integer", values: [5, 10, 20, 40] },
      transactions: { type: "integer", values: [1_000, 2_500, 5_000] },
      averageTicket: { type: "currency", values: [12, 20, 35, 50] }
    },
    formula: { expression: "stores * transactions * averageTicket" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Total revenue equals stores times transactions per store times average ticket.", "{stores} x {transactions} x {averageTicket} = {answer}."]
    }
  },
  {
    id: "business_profit_beginner_004",
    category: "business_math",
    tags: ["profit", "revenue"],
    difficulty: ["beginner"],
    promptTemplate: "A price increase adds {priceIncrease} per unit across {units} units, with no cost change. What is incremental profit?",
    variables: {
      priceIncrease: { type: "currency", values: [2, 5, 8, 10] },
      units: { type: "integer", values: [1_000, 2_000, 5_000, 10_000] }
    },
    formula: { expression: "priceIncrease * units" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["With no cost change, each extra dollar of price becomes incremental profit.", "{priceIncrease} x {units} = {answer}."]
    }
  },
  {
    id: "business_cost_beginner_003",
    category: "business_math",
    tags: ["cost"],
    difficulty: ["beginner"],
    promptTemplate: "Annual cost is {baselineCost}. A process improvement reduces cost by {reductionRate}%. What is annual savings?",
    variables: {
      baselineCost: { type: "currency", values: [10_000, 25_000, 50_000, 100_000] },
      reductionRate: { type: "percentage", values: [5, 10, 15, 20] }
    },
    formula: { expression: "baselineCost * reductionRate / 100" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Savings equal baseline cost times the reduction percentage.", "{baselineCost} x {reductionRate}/100 = {answer}."]
    }
  },
  {
    id: "business_margin_beginner_004",
    category: "business_math",
    tags: ["margin", "profit"],
    difficulty: ["beginner"],
    promptTemplate: "A team needs {targetProfit} profit at a {margin}% margin. What revenue is required?",
    variables: {
      targetProfit: { type: "currency", values: [1_000, 2_500, 5_000, 10_000] },
      margin: { type: "percentage", values: [10, 20, 25, 40] }
    },
    formula: { expression: "targetProfit / (margin / 100)" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Revenue equals target profit divided by margin.", "{targetProfit} / ({margin}/100) = {answer}."]
    }
  },
  {
    id: "business_contribution_beginner_003",
    category: "business_math",
    tags: ["contribution_margin", "margin"],
    difficulty: ["beginner"],
    promptTemplate: "A product priced at {price} has contribution margin of {contributionRate}%. What is contribution per unit?",
    variables: {
      price: { type: "currency", values: [20, 40, 60, 100] },
      contributionRate: { type: "percentage", values: [25, 40, 50, 60] }
    },
    formula: { expression: "price * contributionRate / 100" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Contribution per unit equals price times contribution margin percentage.", "{price} x {contributionRate}/100 = {answer}."]
    }
  },
  {
    id: "business_breakeven_beginner_003",
    category: "business_math",
    tags: ["breakeven", "margin"],
    difficulty: ["beginner"],
    promptTemplate: "Fixed cost is {fixedCost}. Gross margin is {grossMargin}%. What revenue is needed to break even?",
    variables: {
      fixedCost: { type: "currency", values: [2_000, 5_000, 10_000, 20_000] },
      grossMargin: { type: "percentage", values: [20, 25, 40, 50] }
    },
    formula: { expression: "fixedCost / (grossMargin / 100)" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Breakeven revenue equals fixed cost divided by gross margin.", "{fixedCost} / ({grossMargin}/100) = {answer}."]
    }
  },
  {
    id: "business_payback_beginner_002",
    category: "business_math",
    tags: ["payback"],
    difficulty: ["beginner"],
    promptTemplate: "A project costs {investment} and generates {monthlyCashFlow} per month. What is payback period in months?",
    variables: {
      investment: { type: "currency", values: [3_000, 6_000, 12_000, 24_000] },
      monthlyCashFlow: { type: "currency", values: [500, 1_000, 1_500, 2_000] }
    },
    formula: { expression: "investment / monthlyCashFlow" },
    answerUnit: "months",
    explanationTemplate: {
      steps: ["Payback period equals investment divided by monthly cash flow.", "{investment} / {monthlyCashFlow} = {answer}."]
    }
  },
  {
    id: "business_market_share_beginner_002",
    category: "business_math",
    tags: ["market_share"],
    difficulty: ["beginner"],
    promptTemplate: "A company sells {companySales} and has {share}% market share. What is total market size?",
    variables: {
      companySales: { type: "currency", values: [1_000, 2_500, 5_000, 10_000] },
      share: { type: "percentage", values: [5, 10, 20, 25] }
    },
    formula: { expression: "companySales / (share / 100)" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Total market equals company sales divided by share.", "{companySales} / ({share}/100) = {answer}."]
    }
  },
  {
    id: "business_capacity_beginner_002",
    category: "business_math",
    tags: ["capacity_utilization"],
    difficulty: ["beginner"],
    promptTemplate: "A plant has capacity of {capacity} units. Utilization rises from {currentUtilization}% to {targetUtilization}%. How many additional units are produced?",
    variables: {
      capacity: { type: "integer", values: [10_000, 20_000, 50_000, 100_000] },
      currentUtilization: { type: "percentage", values: [50, 60, 70] },
      targetUtilization: { type: "percentage", values: [75, 80, 90] }
    },
    formula: { expression: "capacity * (targetUtilization - currentUtilization) / 100" },
    answerUnit: "units",
    explanationTemplate: {
      steps: ["Additional output equals capacity times the utilization increase.", "{capacity} x ({targetUtilization} - {currentUtilization})/100 = {answer}."]
    }
  },
  {
    id: "business_revenue_intermediate_price_001",
    category: "business_math",
    tags: ["revenue"],
    difficulty: ["intermediate"],
    promptTemplate: "A service line generates {revenue} from {volume} projects. What is the average price per project?",
    variables: {
      revenue: { type: "currency", values: [120_000, 240_000, 360_000, 480_000] },
      volume: { type: "integer", values: [2_000, 4_000, 6_000] }
    },
    formula: { expression: "revenue / volume" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Price equals revenue divided by volume.", "{revenue} / {volume} = {answer} per project."]
    }
  },
  {
    id: "business_revenue_advanced_volume_001",
    category: "business_math",
    tags: ["revenue"],
    difficulty: ["advanced"],
    promptTemplate: "A product must generate {revenue} at an average realized price of {price}. How many units must be sold?",
    variables: {
      revenue: { type: "currency", values: [240_000, 480_000, 720_000, 960_000] },
      price: { type: "currency", values: [40, 60, 80, 120] }
    },
    formula: { expression: "revenue / price" },
    answerUnit: "units",
    explanationTemplate: {
      steps: ["Required volume equals target revenue divided by realized price.", "{revenue} / {price} = {answer} units."]
    }
  },
  {
    id: "business_revenue_expert_target_price_001",
    category: "business_math",
    tags: ["revenue", "profit", "cost", "margin", "contribution_margin"],
    difficulty: ["expert"],
    promptTemplate: "A product must earn {targetProfit} after covering {fixedCost} of fixed cost. It will sell {units} units with variable cost of {variableCost} each. What price per unit is required?",
    variables: {
      targetProfit: { type: "currency", values: [100_000, 200_000, 300_000] },
      fixedCost: { type: "currency", values: [100_000, 200_000] },
      units: { type: "integer", values: [10_000, 20_000, 25_000] },
      variableCost: { type: "currency", values: [20, 30, 40] }
    },
    formula: { expression: "(targetProfit + fixedCost) / units + variableCost" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Required contribution per unit equals target profit plus fixed cost, divided by units; add variable cost to obtain price.",
        "({targetProfit} + {fixedCost}) / {units} + {variableCost} = {answer}."
      ]
    }
  },
  {
    id: "business_cost_intermediate_fixed_001",
    category: "business_math",
    tags: ["cost"],
    difficulty: ["intermediate"],
    promptTemplate: "Total cost is {totalCost} for {units} units, and variable cost is {variableCost} per unit. What is fixed cost?",
    variables: {
      totalCost: { type: "currency", values: [80_000, 100_000, 120_000, 140_000] },
      units: { type: "integer", values: [1_000, 2_000] },
      variableCost: { type: "currency", values: [10, 20, 30] }
    },
    formula: { expression: "totalCost - variableCost * units" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Fixed cost equals total cost minus total variable cost.",
        "{totalCost} - ({variableCost} x {units}) = {answer}."
      ]
    }
  },
  {
    id: "business_cost_advanced_variable_001",
    category: "business_math",
    tags: ["cost"],
    difficulty: ["advanced"],
    promptTemplate: "Total cost is {totalCost}, including {fixedCost} of fixed cost, across {units} units. What is variable cost per unit?",
    variables: {
      totalCost: { type: "currency", values: [120_000, 180_000, 240_000] },
      fixedCost: { type: "currency", values: [60_000] },
      units: { type: "integer", values: [2_000, 3_000, 6_000] }
    },
    formula: { expression: "(totalCost - fixedCost) / units" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Subtract fixed cost, then divide the remaining variable cost by units.",
        "({totalCost} - {fixedCost}) / {units} = {answer} per unit."
      ]
    }
  },
  {
    id: "business_cost_expert_units_001",
    category: "business_math",
    tags: ["cost"],
    difficulty: ["expert"],
    promptTemplate: "A cost budget of {totalCost} includes {fixedCost} of fixed cost and {variableCost} of variable cost per unit. How many units does the budget support?",
    variables: {
      totalCost: { type: "currency", values: [90_000, 130_000, 170_000] },
      fixedCost: { type: "currency", values: [10_000, 30_000, 50_000] },
      variableCost: { type: "currency", values: [20, 40, 50] }
    },
    formula: { expression: "(totalCost - fixedCost) / variableCost" },
    answerUnit: "units",
    explanationTemplate: {
      steps: [
        "Subtract fixed cost to find the variable-cost budget, then divide by variable cost per unit.",
        "({totalCost} - {fixedCost}) / {variableCost} = {answer} units."
      ]
    }
  },
  {
    id: "business_contribution_intermediate_price_001",
    category: "business_math",
    tags: ["contribution_margin"],
    difficulty: ["intermediate"],
    promptTemplate: "Variable cost is {variableCost} per unit and required contribution is {contribution} per unit. What price should be charged?",
    variables: {
      variableCost: { type: "currency", values: [10, 20, 30] },
      contribution: { type: "currency", values: [20, 30, 40] }
    },
    formula: { expression: "variableCost + contribution" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Price equals variable cost plus contribution per unit.", "{variableCost} + {contribution} = {answer}."]
    }
  },
  {
    id: "business_contribution_advanced_variable_cost_001",
    category: "business_math",
    tags: ["contribution_margin", "cost"],
    difficulty: ["advanced"],
    promptTemplate: "A product sells for {price} and must deliver {contribution} of contribution per unit. What is the maximum variable cost per unit?",
    variables: {
      price: { type: "currency", values: [80, 100, 120] },
      contribution: { type: "currency", values: [20, 30, 40] }
    },
    formula: { expression: "price - contribution" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Variable cost equals price minus required contribution.", "{price} - {contribution} = {answer}."]
    }
  },
  {
    id: "business_contribution_expert_variable_cost_001",
    category: "business_math",
    tags: ["contribution_margin", "cost"],
    difficulty: ["expert"],
    promptTemplate: "A product priced at {price} must generate {targetContribution} of total contribution across {units} units. What is the maximum variable cost per unit?",
    variables: {
      price: { type: "currency", values: [50, 60, 80] },
      targetContribution: { type: "currency", values: [200_000, 300_000, 400_000] },
      units: { type: "integer", values: [10_000, 20_000] }
    },
    formula: { expression: "price - targetContribution / units" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Divide target contribution by units to find required contribution per unit, then subtract it from price.",
        "{price} - ({targetContribution} / {units}) = {answer}."
      ]
    }
  },
  {
    id: "business_roi_intermediate_gain_001",
    category: "business_math",
    tags: ["roi"],
    difficulty: ["intermediate"],
    promptTemplate: "An investment of {investment} must earn an ROI of {roi}%. What total return, including the original investment, is required?",
    variables: {
      investment: { type: "currency", values: [100_000, 200_000, 400_000] },
      roi: { type: "percentage", values: [15, 25, 40] }
    },
    formula: { expression: "investment * (1 + roi / 100)" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Required total return equals investment times one plus the target ROI.",
        "{investment} x (1 + {roi}/100) = {answer}."
      ]
    }
  },
  {
    id: "business_roi_advanced_investment_001",
    category: "business_math",
    tags: ["roi"],
    difficulty: ["advanced"],
    promptTemplate: "A project is expected to return {totalReturn} in total at an ROI of {roi}%. What initial investment does that imply?",
    variables: {
      totalReturn: { type: "currency", values: [150_000, 250_000, 500_000] },
      roi: { type: "percentage", values: [20, 25, 50] }
    },
    formula: { expression: "totalReturn / (1 + roi / 100)" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Because total return equals investment times one plus ROI, divide total return by one plus ROI.",
        "{totalReturn} / (1 + {roi}/100) = {answer}."
      ]
    }
  },
  {
    id: "business_roi_expert_comparison_001",
    category: "business_math",
    tags: ["roi"],
    difficulty: ["expert"],
    promptTemplate: "Option A requires {investmentA} and returns {returnA} in total. Option B requires {investmentB} and returns {returnB} in total. By how many percentage points does Option A's ROI exceed Option B's?",
    variables: {
      investmentA: { type: "currency", values: [2_000, 2_500] },
      returnA: { type: "currency", values: [3_500, 4_000] },
      investmentB: { type: "currency", values: [2_000, 2_500] },
      returnB: { type: "currency", values: [2_400, 2_600] }
    },
    formula: {
      expression: "(returnA - investmentA) / investmentA * 100 - (returnB - investmentB) / investmentB * 100"
    },
    answerUnit: "percentage_points",
    explanationTemplate: {
      steps: [
        "Calculate each option's ROI, then subtract Option B's ROI from Option A's ROI.",
        "(({returnA} - {investmentA}) / {investmentA} x 100) - (({returnB} - {investmentB}) / {investmentB} x 100) = {answer} percentage points."
      ]
    }
  },
  {
    id: "business_payback_intermediate_cash_flow_001",
    category: "business_math",
    tags: ["payback"],
    difficulty: ["intermediate"],
    promptTemplate: "An investment of {investment} must pay back within {years} years. What annual cash flow is required?",
    variables: {
      investment: { type: "currency", values: [120_000, 240_000, 360_000] },
      years: { type: "integer", values: [2, 3, 4] }
    },
    formula: { expression: "investment / years" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Required annual cash flow equals investment divided by target payback years.", "{investment} / {years} = {answer} per year."]
    }
  },
  {
    id: "business_payback_advanced_max_investment_001",
    category: "business_math",
    tags: ["payback"],
    difficulty: ["advanced"],
    promptTemplate: "A project will generate {annualCashFlow} per year and must pay back within {years} years. What is the maximum acceptable investment?",
    variables: {
      annualCashFlow: { type: "currency", values: [50_000, 75_000, 100_000] },
      years: { type: "integer", values: [2, 3, 4] }
    },
    formula: { expression: "annualCashFlow * years" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Maximum investment equals annual cash flow times the allowed payback period.",
        "{annualCashFlow} x {years} = {answer}."
      ]
    }
  },
  {
    id: "business_payback_expert_cash_flow_001",
    category: "business_math",
    tags: ["payback"],
    difficulty: ["expert"],
    promptTemplate: "An investment of {investment} returns {firstYearCashFlow} in year one and must fully pay back in {years} years. If cash flow is level after year one, what annual cash flow is required in each remaining year?",
    variables: {
      investment: { type: "currency", values: [500_000, 750_000, 1_000_000] },
      firstYearCashFlow: { type: "currency", values: [100_000, 150_000, 200_000] },
      years: { type: "integer", values: [3, 4, 5] }
    },
    formula: { expression: "(investment - firstYearCashFlow) / (years - 1)" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Subtract year-one cash flow from the investment, then spread the remainder across the remaining years.",
        "({investment} - {firstYearCashFlow}) / ({years} - 1) = {answer} per year."
      ]
    }
  },
  {
    id: "business_profit_intermediate_required_revenue_001",
    category: "business_math",
    tags: ["profit", "margin", "cost"],
    difficulty: ["intermediate", "advanced"],
    promptTemplate: "A business expects total cost of {cost} and wants an operating margin of {margin}%. What revenue is required?",
    variables: {
      cost: { type: "currency", values: [80_000, 120_000, 160_000] },
      margin: { type: "percentage", values: [20, 25, 40] }
    },
    formula: { expression: "cost / (1 - margin / 100)" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Cost is the portion of revenue left after the target margin, so divide cost by one minus margin.",
        "{cost} / (1 - {margin}/100) = {answer}."
      ]
    }
  },
  {
    id: "business_breakeven_multilayer_001",
    category: "business_math",
    tags: ["breakeven", "payback", "contribution_margin"],
    difficulty: ["intermediate", "advanced", "expert"],
    promptTemplate: "A business has annual fixed cost of {fixedCost} and wants to recover an additional investment of {investment} evenly over {paybackYears} years. At {contribution} contribution per unit, how many units must it sell annually?",
    variables: {
      fixedCost: { type: "currency", values: [200_000, 400_000] },
      investment: { type: "currency", values: [100_000, 200_000] },
      paybackYears: { type: "integer", values: [2, 4] },
      contribution: { type: "currency", values: [20, 40, 50] }
    },
    formula: { expression: "(fixedCost + investment / paybackYears) / contribution" },
    answerUnit: "units",
    explanationTemplate: {
      steps: [
        "Add annualized investment recovery to fixed cost, then divide by contribution per unit.",
        "({fixedCost} + {investment} / {paybackYears}) / {contribution} = {answer} units."
      ]
    }
  },
  {
    id: "business_market_share_growth_001",
    category: "business_math",
    tags: ["market_share", "revenue"],
    difficulty: ["intermediate", "advanced"],
    promptTemplate: "A market worth {marketRevenue} grows by {growth}% and the company captures {share}% of the resulting market. What is company revenue?",
    variables: {
      marketRevenue: { type: "currency", values: [2_000_000, 4_000_000, 8_000_000] },
      growth: { type: "percentage", values: [10, 20, 25] },
      share: { type: "percentage", values: [5, 10, 15] }
    },
    formula: { expression: "marketRevenue * (1 + growth / 100) * share / 100" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Grow the market first, then multiply by the company's share.",
        "{marketRevenue} x (1 + {growth}/100) x {share}/100 = {answer}."
      ]
    }
  },
  {
    id: "business_market_share_expert_required_001",
    category: "business_math",
    tags: ["market_share", "revenue"],
    difficulty: ["expert"],
    promptTemplate: "A market currently worth {marketRevenue} will grow by {growth}%. What market share is required to reach revenue of {targetRevenue}? Enter the percent value.",
    variables: {
      marketRevenue: { type: "currency", values: [5_000_000, 10_000_000] },
      growth: { type: "percentage", values: [10, 25] },
      targetRevenue: { type: "currency", values: [500_000, 1_000_000] }
    },
    formula: { expression: "targetRevenue / (marketRevenue * (1 + growth / 100)) * 100" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "Divide target revenue by the market's future value to find required share.",
        "{targetRevenue} / ({marketRevenue} x (1 + {growth}/100)) x 100 = {answer}."
      ]
    }
  },
  {
    id: "business_capacity_intermediate_required_utilization_001",
    category: "business_math",
    tags: ["capacity_utilization"],
    difficulty: ["intermediate", "advanced"],
    promptTemplate: "A plant with capacity of {capacity} units currently runs at {currentUtilization}% utilization. Demand rises by {additionalDemand} units. What utilization rate is required? Enter the percent value.",
    variables: {
      capacity: { type: "integer", values: [100_000, 200_000] },
      currentUtilization: { type: "percentage", values: [60, 70] },
      additionalDemand: { type: "integer", values: [10_000, 20_000] }
    },
    formula: { expression: "(capacity * currentUtilization / 100 + additionalDemand) / capacity * 100" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "Add incremental demand to current output, then divide by capacity.",
        "({capacity} x {currentUtilization}/100 + {additionalDemand}) / {capacity} x 100 = {answer}."
      ]
    }
  },
  {
    id: "business_capacity_expert_incremental_001",
    category: "business_math",
    tags: ["capacity_utilization"],
    difficulty: ["expert"],
    promptTemplate: "A network must supply {demand} units while operating at no more than {targetUtilization}% utilization. It already has {existingCapacity} units of capacity. How much additional capacity is required?",
    variables: {
      demand: { type: "integer", values: [100_000, 150_000, 200_000] },
      targetUtilization: { type: "percentage", values: [80, 90] },
      existingCapacity: { type: "integer", values: [20_000, 40_000] }
    },
    formula: { expression: "demand / (targetUtilization / 100) - existingCapacity" },
    answerUnit: "units",
    explanationTemplate: {
      steps: [
        "Divide demand by target utilization to find required total capacity, then subtract existing capacity.",
        "{demand} / ({targetUtilization}/100) - {existingCapacity} = {answer}."
      ]
    }
  }
];

export const weightedAverageTemplates: QuestionTemplate[] = [
  {
    id: "weighted_average_beginner_001",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["beginner"],
    promptTemplate: "Group A has {countA} people averaging {valueA}. Group B has {countB} people averaging {valueB}. What is the weighted average?",
    variables: {
      countA: { type: "integer", values: [10, 20, 30, 40] },
      valueA: { type: "integer", values: [20, 40, 60, 80] },
      countB: { type: "integer", values: [10, 20, 30, 40] },
      valueB: { type: "integer", values: [30, 50, 70, 90] }
    },
    formula: { expression: "(countA * valueA + countB * valueB) / (countA + countB)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Multiply each average by its group size, add, then divide by total size.", "({countA} x {valueA} + {countB} x {valueB}) / ({countA} + {countB}) = {answer}."]
    }
  },
  {
    id: "weighted_average_beginner_002",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["beginner"],
    promptTemplate: "A product mix sells {unitsA} units at {priceA} and {unitsB} units at {priceB}. What is average price?",
    variables: {
      unitsA: { type: "integer", values: [100, 200, 300] },
      priceA: { type: "currency", values: [10, 20, 30] },
      unitsB: { type: "integer", values: [100, 200, 300] },
      priceB: { type: "currency", values: [40, 50, 60] }
    },
    formula: { expression: "(unitsA * priceA + unitsB * priceB) / (unitsA + unitsB)" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Use units as weights for each price.", "({unitsA} x {priceA} + {unitsB} x {priceB}) / ({unitsA} + {unitsB}) = {answer}."]
    }
  },
  {
    id: "weighted_average_beginner_003",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["beginner"],
    promptTemplate: "Segment A is {shareA}% at margin {marginA}%. Segment B is {shareB}% at margin {marginB}%. What is blended margin? Enter the percent value.",
    variables: {
      shareA: { type: "percentage", values: [25, 40, 50, 60] },
      marginA: { type: "percentage", values: [10, 20, 30, 40] },
      shareB: { type: "percentage", values: [40, 50, 60, 75] },
      marginB: { type: "percentage", values: [20, 30, 40, 50] }
    },
    formula: { expression: "(shareA * marginA + shareB * marginB) / (shareA + shareB)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Weight each margin by its share.", "({shareA} x {marginA} + {shareB} x {marginB}) / ({shareA} + {shareB}) = {answer}."]
    }
  },
  {
    id: "weighted_average_beginner_004",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["beginner"],
    promptTemplate: "Tier 1 has {usersA} users paying {priceA}; Tier 2 has {usersB} users paying {priceB}. What is average revenue per user?",
    variables: {
      usersA: { type: "integer", values: [100, 200, 500] },
      priceA: { type: "currency", values: [10, 15, 20] },
      usersB: { type: "integer", values: [100, 200, 500] },
      priceB: { type: "currency", values: [30, 40, 50] }
    },
    formula: { expression: "(usersA * priceA + usersB * priceB) / (usersA + usersB)" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Average revenue per user is total revenue divided by total users.", "({usersA} x {priceA} + {usersB} x {priceB}) / ({usersA} + {usersB}) = {answer}."]
    }
  },
  {
    id: "weighted_average_beginner_005",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["beginner"],
    promptTemplate: "A company sources {unitsA} units at cost {costA} and {unitsB} units at cost {costB}. What is average unit cost?",
    variables: {
      unitsA: { type: "integer", values: [100, 250, 500] },
      costA: { type: "currency", values: [5, 10, 15] },
      unitsB: { type: "integer", values: [100, 250, 500] },
      costB: { type: "currency", values: [20, 25, 30] }
    },
    formula: { expression: "(unitsA * costA + unitsB * costB) / (unitsA + unitsB)" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Use units as weights for unit cost.", "({unitsA} x {costA} + {unitsB} x {costB}) / ({unitsA} + {unitsB}) = {answer}."]
    }
  },
  {
    id: "weighted_average_beginner_006",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["beginner"],
    promptTemplate: "Channel A converts at {rateA}% with {leadsA} leads. Channel B converts at {rateB}% with {leadsB} leads. What is blended conversion rate? Enter the percent value.",
    variables: {
      rateA: { type: "percentage", values: [10, 20, 30, 40] },
      leadsA: { type: "integer", values: [100, 200, 500] },
      rateB: { type: "percentage", values: [20, 30, 40, 50] },
      leadsB: { type: "integer", values: [100, 200, 500] }
    },
    formula: { expression: "(rateA * leadsA + rateB * leadsB) / (leadsA + leadsB)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Weight each conversion rate by leads.", "({rateA} x {leadsA} + {rateB} x {leadsB}) / ({leadsA} + {leadsB}) = {answer}."]
    }
  },
  {
    id: "weighted_average_beginner_007",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["beginner"],
    promptTemplate: "Region A has {storesA} stores averaging {salesA} sales. Region B has {storesB} stores averaging {salesB}. What is average sales per store?",
    variables: {
      storesA: { type: "integer", values: [10, 20, 30] },
      salesA: { type: "currency", values: [100, 200, 300] },
      storesB: { type: "integer", values: [10, 20, 30] },
      salesB: { type: "currency", values: [300, 400, 500] }
    },
    formula: { expression: "(storesA * salesA + storesB * salesB) / (storesA + storesB)" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: ["Weight each region's average by store count.", "({storesA} x {salesA} + {storesB} x {salesB}) / ({storesA} + {storesB}) = {answer}."]
    }
  },
  {
    id: "weighted_average_beginner_008",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["beginner"],
    promptTemplate: "Two plants produce {unitsA} units with defect rate {rateA}% and {unitsB} units with defect rate {rateB}%. What is blended defect rate? Enter the percent value.",
    variables: {
      unitsA: { type: "integer", values: [100, 200, 500] },
      rateA: { type: "percentage", values: [2, 5, 10] },
      unitsB: { type: "integer", values: [100, 200, 500] },
      rateB: { type: "percentage", values: [5, 10, 15] }
    },
    formula: { expression: "(unitsA * rateA + unitsB * rateB) / (unitsA + unitsB)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: ["Weight each defect rate by units produced.", "({unitsA} x {rateA} + {unitsB} x {rateB}) / ({unitsA} + {unitsB}) = {answer}."]
    }
  },
  {
    id: "weighted_average_beginner_009",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["beginner", "expert"],
    promptTemplate: "Basic has {basicUsers} users paying {basicPrice}; Pro has {proUsers} users paying {proPrice}; Team has {teamUsers} users paying {teamPrice}. What is blended price per user?",
    variables: {
      basicUsers: { type: "integer", values: [100, 200, 500] },
      basicPrice: { type: "currency", values: [8, 10, 12] },
      proUsers: { type: "integer", values: [100, 200, 500] },
      proPrice: { type: "currency", values: [20, 25, 30] },
      teamUsers: { type: "integer", values: [50, 100, 200] },
      teamPrice: { type: "currency", values: [40, 50, 60] }
    },
    formula: { expression: "(basicUsers * basicPrice + proUsers * proPrice + teamUsers * teamPrice) / (basicUsers + proUsers + teamUsers)" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Multiply each tier price by its user count, add total revenue, then divide by total users.",
        "({basicUsers} x {basicPrice} + {proUsers} x {proPrice} + {teamUsers} x {teamPrice}) / ({basicUsers} + {proUsers} + {teamUsers}) = {answer}."
      ]
    }
  },
  {
    id: "weighted_average_beginner_010",
    category: "weighted_averages",
    tags: ["weighted_average", "margin"],
    difficulty: ["beginner", "expert"],
    promptTemplate: "Product A is {shareA}% of sales at {marginA}% margin, Product B is {shareB}% at {marginB}%, and Product C is {shareC}% at {marginC}%. What is blended margin? Enter the percent value.",
    variables: {
      shareA: { type: "percentage", values: [20, 30, 40] },
      marginA: { type: "percentage", values: [15, 20, 25] },
      shareB: { type: "percentage", values: [30, 40, 50] },
      marginB: { type: "percentage", values: [25, 30, 35] },
      shareC: { type: "percentage", values: [20, 30, 40] },
      marginC: { type: "percentage", values: [35, 40, 45] }
    },
    formula: { expression: "(shareA * marginA + shareB * marginB + shareC * marginC) / (shareA + shareB + shareC)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "Weight each margin by its sales share.",
        "({shareA} x {marginA} + {shareB} x {marginB} + {shareC} x {marginC}) / ({shareA} + {shareB} + {shareC}) = {answer}."
      ]
    }
  },
  {
    id: "weighted_average_beginner_011",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["beginner"],
    promptTemplate: "Standard orders take {standardMinutes} minutes for {standardOrders} orders. Express orders take {expressMinutes} minutes for {expressOrders} orders. What is average fulfillment time?",
    variables: {
      standardMinutes: { type: "integer", values: [18, 20, 24, 30] },
      standardOrders: { type: "integer", values: [100, 200, 400] },
      expressMinutes: { type: "integer", values: [8, 10, 12, 15] },
      expressOrders: { type: "integer", values: [50, 100, 200] }
    },
    formula: { expression: "(standardMinutes * standardOrders + expressMinutes * expressOrders) / (standardOrders + expressOrders)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "Use order count as the weight for each fulfillment time.",
        "({standardMinutes} x {standardOrders} + {expressMinutes} x {expressOrders}) / ({standardOrders} + {expressOrders}) = {answer}."
      ]
    }
  },
  {
    id: "weighted_average_beginner_012",
    category: "weighted_averages",
    tags: ["weighted_average", "cost"],
    difficulty: ["beginner", "expert"],
    promptTemplate: "Local suppliers provide {localUnits} units at {localCost}; regional suppliers provide {regionalUnits} units at {regionalCost}; import suppliers provide {importUnits} units at {importCost}. What is blended unit cost?",
    variables: {
      localUnits: { type: "integer", values: [100, 250, 500] },
      localCost: { type: "currency", values: [12, 15, 18] },
      regionalUnits: { type: "integer", values: [100, 250, 500] },
      regionalCost: { type: "currency", values: [9, 11, 13] },
      importUnits: { type: "integer", values: [100, 250, 500] },
      importCost: { type: "currency", values: [6, 8, 10] }
    },
    formula: { expression: "(localUnits * localCost + regionalUnits * regionalCost + importUnits * importCost) / (localUnits + regionalUnits + importUnits)" },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Multiply each supplier cost by its unit volume, then divide by total units.",
        "({localUnits} x {localCost} + {regionalUnits} x {regionalCost} + {importUnits} x {importCost}) / ({localUnits} + {regionalUnits} + {importUnits}) = {answer}."
      ]
    }
  },
  {
    id: "weighted_average_intermediate_mix_shift_001",
    category: "weighted_averages",
    tags: ["weighted_average", "margin"],
    difficulty: ["intermediate"],
    promptTemplate: "A high-margin product earns {highMargin}% margin and a low-margin product earns {lowMargin}%. The high-margin product's sales share rises from {oldShare}% to {newShare}%. By how many percentage points does blended margin improve?",
    variables: {
      highMargin: { type: "percentage", values: [35, 40, 45] },
      lowMargin: { type: "percentage", values: [10, 15, 20] },
      oldShare: { type: "percentage", values: [20, 30, 40] },
      newShare: { type: "percentage", values: [50, 60, 70] }
    },
    formula: {
      expression:
        "(newShare * highMargin + (100 - newShare) * lowMargin) / 100 - (oldShare * highMargin + (100 - oldShare) * lowMargin) / 100"
    },
    answerUnit: "percentage_points",
    explanationTemplate: {
      steps: [
        "Calculate the new blended margin and subtract the old blended margin.",
        "(({newShare} x {highMargin} + (100 - {newShare}) x {lowMargin}) / 100) - (({oldShare} x {highMargin} + (100 - {oldShare}) x {lowMargin}) / 100) = {answer} percentage points."
      ]
    }
  },
  {
    id: "weighted_average_intermediate_missing_value_001",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["intermediate"],
    promptTemplate: "A blended average is {target}. Segment A represents {shareA}% of the mix and averages {valueA}. What must Segment B's average be if it represents the remaining share?",
    variables: {
      target: { type: "integer", values: [60, 70] },
      shareA: { type: "percentage", values: [25, 40] },
      valueA: { type: "integer", values: [40, 50] }
    },
    formula: { expression: "(target * 100 - shareA * valueA) / (100 - shareA)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "Remove Segment A's weighted contribution from the target total, then divide by Segment B's remaining share.",
        "({target} x 100 - {shareA} x {valueA}) / (100 - {shareA}) = {answer}."
      ]
    }
  },
  {
    id: "weighted_average_advanced_missing_weight_001",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["advanced"],
    promptTemplate: "A blended average must equal {target}. Segment A averages {valueA}, Segment B averages {valueB}, and their shares total 100%. What percentage share must Segment A have?",
    variables: {
      target: { type: "integer", values: [50, 55, 60] },
      valueA: { type: "integer", values: [80, 90] },
      valueB: { type: "integer", values: [20, 30] }
    },
    formula: { expression: "(target - valueB) / (valueA - valueB) * 100" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "The required share equals the target's distance above Segment B divided by the gap between segment values.",
        "({target} - {valueB}) / ({valueA} - {valueB}) x 100 = {answer}."
      ]
    }
  },
  {
    id: "weighted_average_advanced_arpu_mix_shift_001",
    category: "weighted_averages",
    tags: ["weighted_average", "revenue"],
    difficulty: ["advanced"],
    promptTemplate: "Premium users pay {premiumPrice} and basic users pay {basicPrice}. Premium share rises from {oldPremiumShare}% to {newPremiumShare}%. By how much does blended revenue per user increase?",
    variables: {
      premiumPrice: { type: "currency", values: [80, 100, 120] },
      basicPrice: { type: "currency", values: [20, 30, 40] },
      oldPremiumShare: { type: "percentage", values: [20, 30] },
      newPremiumShare: { type: "percentage", values: [40, 50, 60] }
    },
    formula: {
      expression:
        "(newPremiumShare * premiumPrice + (100 - newPremiumShare) * basicPrice) / 100 - (oldPremiumShare * premiumPrice + (100 - oldPremiumShare) * basicPrice) / 100"
    },
    answerUnit: "currency",
    explanationTemplate: {
      steps: [
        "Calculate blended revenue per user under each mix, then subtract the old blend from the new blend.",
        "(({newPremiumShare} x {premiumPrice} + (100 - {newPremiumShare}) x {basicPrice}) / 100) - (({oldPremiumShare} x {premiumPrice} + (100 - {oldPremiumShare}) x {basicPrice}) / 100) = {answer}."
      ]
    }
  },
  {
    id: "weighted_average_expert_missing_third_value_001",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["expert"],
    promptTemplate: "A three-segment portfolio must average {target}. Segment A is {shareA}% at {valueA}; Segment B is {shareB}% at {valueB}; Segment C is the remaining share. What value must Segment C achieve?",
    variables: {
      target: { type: "integer", values: [70, 75] },
      shareA: { type: "percentage", values: [20, 25] },
      valueA: { type: "integer", values: [40, 50] },
      shareB: { type: "percentage", values: [30, 35] },
      valueB: { type: "integer", values: [60, 65] }
    },
    formula: { expression: "(target * 100 - shareA * valueA - shareB * valueB) / (100 - shareA - shareB)" },
    answerUnit: "none",
    explanationTemplate: {
      steps: [
        "Subtract the first two weighted contributions from the target total, then divide by Segment C's remaining share.",
        "({target} x 100 - {shareA} x {valueA} - {shareB} x {valueB}) / (100 - {shareA} - {shareB}) = {answer}."
      ]
    }
  },
  {
    id: "weighted_average_expert_missing_weight_001",
    category: "weighted_averages",
    tags: ["weighted_average"],
    difficulty: ["expert"],
    promptTemplate: "Segment A has {countA} observations averaging {valueA}. How many observations averaging {valueB} must be added to produce a combined average of {target}?",
    variables: {
      countA: { type: "integer", values: [120, 240, 360] },
      valueA: { type: "integer", values: [80, 90] },
      valueB: { type: "integer", values: [30, 40] },
      target: { type: "integer", values: [60] }
    },
    formula: { expression: "countA * (valueA - target) / (target - valueB)" },
    answerUnit: "units",
    explanationTemplate: {
      steps: [
        "Balance Segment A's excess above the target against each new observation's shortfall below the target.",
        "{countA} x ({valueA} - {target}) / ({target} - {valueB}) = {answer} observations."
      ]
    }
  }
];
