import {
  defaultMarketSizingRubric,
  type MarketSizingTemplate
} from "@/features/market-sizing/marketSizingTypes";

const monthsPerYearStep = {
  assumptionRange: { min: 12, max: 12, unit: "months" },
  id: "months_per_year",
  inputKind: "integer",
  label: "Months per year",
  required: true,
  unit: "months",
  variableName: "monthsPerYear"
} as const;

export const marketSizingTemplates = [
  {
    id: "market_coffee_city_001",
    title: "City Coffee Spend",
    prompt: "Estimate the annual market size for prepared coffee sold in a large Canadian city.",
    description: "Demand-side sizing from population, drinker penetration, daily cup frequency, and average price.",
    difficulty: "intermediate",
    industry: "retail",
    sizingType: "demand_side",
    inputSteps: [
      {
        assumptionRange: { min: 2_000_000, max: 4_500_000, unit: "users" },
        helperText: "Estimate the city population served by coffee retailers.",
        id: "population",
        inputKind: "integer",
        label: "Population",
        required: true,
        unit: "users",
        variableName: "population"
      },
      {
        assumptionRange: { min: 0.35, max: 0.8, unit: "percentage" },
        id: "coffee_drinker_rate",
        inputKind: "percentage",
        label: "Percent who buy prepared coffee",
        required: true,
        unit: "percentage",
        variableName: "coffeeDrinkerRate"
      },
      {
        assumptionRange: { min: 0.3, max: 2.5, unit: "units" },
        id: "cups_per_day",
        inputKind: "number",
        label: "Purchased cups per drinker per day",
        required: true,
        unit: "units",
        variableName: "cupsPerDay"
      },
      {
        assumptionRange: { min: 220, max: 365, unit: "days" },
        id: "purchase_days_per_year",
        inputKind: "integer",
        label: "Purchase days per year",
        required: true,
        unit: "days",
        variableName: "purchaseDaysPerYear"
      },
      {
        assumptionRange: { min: 2.5, max: 7, unit: "currency" },
        id: "price_per_cup",
        inputKind: "currency",
        label: "Average price per cup",
        required: true,
        unit: "currency",
        variableName: "pricePerCup"
      },
      senseCheckStep()
    ],
    finalFormula: {
      expression: "population * coffeeDrinkerRate * cupsPerDay * purchaseDaysPerYear * pricePerCup",
      outputVariable: "annualCoffeeSpend",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck(
      "Compare the result to population times a realistic annual coffee budget per buyer."
    )
  },
  {
    id: "market_smb_saas_002",
    title: "SMB Project Management SaaS",
    prompt: "Estimate the annual subscription market for project management SaaS among small businesses in a country.",
    description: "Revenue-pool sizing from business count, adoption, seats, monthly seat price, and annual billing months.",
    difficulty: "advanced",
    industry: "saas",
    sizingType: "revenue_pool",
    inputSteps: [
      {
        assumptionRange: { min: 1_000_000, max: 8_000_000, unit: "units" },
        id: "small_businesses",
        inputKind: "integer",
        label: "Small businesses",
        required: true,
        unit: "units",
        variableName: "smallBusinesses"
      },
      {
        assumptionRange: { min: 0.08, max: 0.45, unit: "percentage" },
        id: "adoption_rate",
        inputKind: "percentage",
        label: "Adoption rate",
        required: true,
        unit: "percentage",
        variableName: "adoptionRate"
      },
      {
        assumptionRange: { min: 3, max: 30, unit: "users" },
        id: "seats_per_business",
        inputKind: "number",
        label: "Paid seats per adopting business",
        required: true,
        unit: "users",
        variableName: "seatsPerBusiness"
      },
      {
        assumptionRange: { min: 6, max: 35, unit: "currency" },
        id: "monthly_price_per_seat",
        inputKind: "currency",
        label: "Monthly price per seat",
        required: true,
        unit: "currency",
        variableName: "monthlyPricePerSeat"
      },
      monthsPerYearStep,
      senseCheckStep()
    ],
    finalFormula: {
      expression:
        "smallBusinesses * adoptionRate * seatsPerBusiness * monthlyPricePerSeat * monthsPerYear",
      outputVariable: "annualSubscriptionMarket",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check whether the implied spend per adopting business fits a small-business software budget.")
  },
  {
    id: "market_airline_bags_003",
    title: "Domestic Checked Bag Fees",
    prompt: "Estimate annual checked baggage fee revenue for domestic leisure flights from a midsize airport.",
    description: "Demand-side fee sizing from passenger trips, baggage attach rate, bags per traveler, and fee.",
    difficulty: "intermediate",
    industry: "airlines",
    sizingType: "demand_side",
    inputSteps: [
      {
        assumptionRange: { min: 1_000_000, max: 12_000_000, unit: "users" },
        id: "annual_passenger_trips",
        inputKind: "integer",
        label: "Annual domestic leisure passenger trips",
        required: true,
        unit: "users",
        variableName: "annualPassengerTrips"
      },
      {
        assumptionRange: { min: 0.2, max: 0.65, unit: "percentage" },
        id: "bag_attach_rate",
        inputKind: "percentage",
        label: "Percent checking a bag",
        required: true,
        unit: "percentage",
        variableName: "bagAttachRate"
      },
      {
        assumptionRange: { min: 1, max: 1.6, unit: "units" },
        id: "bags_per_checker",
        inputKind: "number",
        label: "Checked bags per traveler who checks bags",
        required: true,
        unit: "units",
        variableName: "bagsPerChecker"
      },
      {
        assumptionRange: { min: 25, max: 60, unit: "currency" },
        id: "fee_per_bag",
        inputKind: "currency",
        label: "Fee per checked bag",
        required: true,
        unit: "currency",
        variableName: "feePerBag"
      },
      senseCheckStep()
    ],
    finalFormula: {
      expression: "annualPassengerTrips * bagAttachRate * bagsPerChecker * feePerBag",
      outputVariable: "annualBagFeeRevenue",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check the implied fee revenue per passenger trip against the bag fee.")
  },
  {
    id: "market_physiotherapy_city_004",
    title: "Metro Physiotherapy Sessions",
    prompt: "Estimate the annual private physiotherapy services market in a metropolitan area.",
    description: "Demand-side sizing from adult population, therapy need, visits per patient, and session price.",
    difficulty: "advanced",
    industry: "healthcare",
    sizingType: "demand_side",
    inputSteps: [
      {
        assumptionRange: { min: 800_000, max: 6_000_000, unit: "users" },
        id: "adult_population",
        inputKind: "integer",
        label: "Adult population",
        required: true,
        unit: "users",
        variableName: "adultPopulation"
      },
      {
        assumptionRange: { min: 0.04, max: 0.22, unit: "percentage" },
        id: "therapy_user_rate",
        inputKind: "percentage",
        label: "Percent using private physiotherapy annually",
        required: true,
        unit: "percentage",
        variableName: "therapyUserRate"
      },
      {
        assumptionRange: { min: 3, max: 14, unit: "units" },
        id: "sessions_per_patient",
        inputKind: "number",
        label: "Sessions per patient per year",
        required: true,
        unit: "units",
        variableName: "sessionsPerPatient"
      },
      {
        assumptionRange: { min: 70, max: 180, unit: "currency" },
        id: "price_per_session",
        inputKind: "currency",
        label: "Average session price",
        required: true,
        unit: "currency",
        variableName: "pricePerSession"
      },
      senseCheckStep()
    ],
    finalFormula: {
      expression: "adultPopulation * therapyUserRate * sessionsPerPatient * pricePerSession",
      outputVariable: "annualPhysiotherapyMarket",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check the implied number of sessions per clinic if you imagine a plausible clinic count.")
  },
  {
    id: "market_pet_insurance_005",
    title: "Pet Insurance Premiums",
    prompt: "Estimate the annual pet insurance premium market in a province.",
    description: "Demand-side insurance sizing from households, pet ownership, insurance take-up, and annual premium.",
    difficulty: "intermediate",
    industry: "insurance",
    sizingType: "demand_side",
    inputSteps: [
      {
        assumptionRange: { min: 500_000, max: 5_000_000, unit: "units" },
        id: "households",
        inputKind: "integer",
        label: "Households",
        required: true,
        unit: "units",
        variableName: "households"
      },
      {
        assumptionRange: { min: 0.25, max: 0.7, unit: "percentage" },
        id: "pet_ownership_rate",
        inputKind: "percentage",
        label: "Pet-owning households",
        required: true,
        unit: "percentage",
        variableName: "petOwnershipRate"
      },
      {
        assumptionRange: { min: 1, max: 2.2, unit: "units" },
        id: "pets_per_pet_household",
        inputKind: "number",
        label: "Pets per pet-owning household",
        required: true,
        unit: "units",
        variableName: "petsPerPetHousehold"
      },
      {
        assumptionRange: { min: 0.03, max: 0.35, unit: "percentage" },
        id: "insurance_takeup_rate",
        inputKind: "percentage",
        label: "Pet insurance take-up rate",
        required: true,
        unit: "percentage",
        variableName: "insuranceTakeupRate"
      },
      {
        assumptionRange: { min: 300, max: 1_400, unit: "currency" },
        id: "annual_premium",
        inputKind: "currency",
        label: "Annual premium per insured pet",
        required: true,
        unit: "currency",
        variableName: "annualPremium"
      },
      senseCheckStep()
    ],
    finalFormula: {
      expression: "households * petOwnershipRate * petsPerPetHousehold * insuranceTakeupRate * annualPremium",
      outputVariable: "annualPremiumMarket",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check whether the implied insured pet count is plausible relative to pet households.")
  },
  {
    id: "market_fiber_region_006",
    title: "Regional Fiber Internet",
    prompt: "Estimate the annual residential fiber internet subscription market in a mid-sized region.",
    description: "Revenue-pool sizing from households, broadband penetration, fiber share, monthly price, and months.",
    difficulty: "advanced",
    industry: "telecom",
    sizingType: "revenue_pool",
    inputSteps: [
      {
        assumptionRange: { min: 300_000, max: 3_000_000, unit: "units" },
        id: "households",
        inputKind: "integer",
        label: "Households",
        required: true,
        unit: "units",
        variableName: "households"
      },
      {
        assumptionRange: { min: 0.65, max: 0.98, unit: "percentage" },
        id: "broadband_penetration",
        inputKind: "percentage",
        label: "Broadband penetration",
        required: true,
        unit: "percentage",
        variableName: "broadbandPenetration"
      },
      {
        assumptionRange: { min: 0.15, max: 0.75, unit: "percentage" },
        id: "fiber_share",
        inputKind: "percentage",
        label: "Fiber share of broadband homes",
        required: true,
        unit: "percentage",
        variableName: "fiberShare"
      },
      {
        assumptionRange: { min: 45, max: 120, unit: "currency" },
        id: "monthly_subscription_price",
        inputKind: "currency",
        label: "Monthly subscription price",
        required: true,
        unit: "currency",
        variableName: "monthlySubscriptionPrice"
      },
      monthsPerYearStep,
      senseCheckStep()
    ],
    finalFormula: {
      expression: "households * broadbandPenetration * fiberShare * monthlySubscriptionPrice * monthsPerYear",
      outputVariable: "annualFiberRevenue",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check the implied subscriber count against total households.")
  },
  {
    id: "market_reusable_bottles_007",
    title: "Campus Reusable Bottles",
    prompt: "Estimate annual reusable water bottle sales to university students in a country.",
    description: "Demand-side consumer goods sizing from student population, purchase rate, units per buyer, and price.",
    difficulty: "beginner",
    industry: "consumer_goods",
    sizingType: "demand_side",
    inputSteps: [
      {
        assumptionRange: { min: 500_000, max: 6_000_000, unit: "users" },
        id: "student_population",
        inputKind: "integer",
        label: "University student population",
        required: true,
        unit: "users",
        variableName: "studentPopulation"
      },
      {
        assumptionRange: { min: 0.15, max: 0.65, unit: "percentage" },
        id: "annual_purchase_rate",
        inputKind: "percentage",
        label: "Percent buying a bottle annually",
        required: true,
        unit: "percentage",
        variableName: "annualPurchaseRate"
      },
      {
        assumptionRange: { min: 1, max: 2, unit: "units" },
        id: "bottles_per_buyer",
        inputKind: "number",
        label: "Bottles per buyer",
        required: true,
        unit: "units",
        variableName: "bottlesPerBuyer"
      },
      {
        assumptionRange: { min: 12, max: 55, unit: "currency" },
        id: "average_bottle_price",
        inputKind: "currency",
        label: "Average bottle price",
        required: true,
        unit: "currency",
        variableName: "averageBottlePrice"
      },
      senseCheckStep()
    ],
    finalFormula: {
      expression: "studentPopulation * annualPurchaseRate * bottlesPerBuyer * averageBottlePrice",
      outputVariable: "annualBottleMarket",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check whether the implied units per student seems reasonable for an annual purchase cycle.")
  },
  {
    id: "market_mobile_payments_008",
    title: "Mobile Banking Payment Volume",
    prompt: "Estimate monthly consumer mobile banking payment transactions in a country.",
    description: "Demand-side transaction sizing from adults, mobile banking adoption, and monthly transaction frequency.",
    difficulty: "intermediate",
    industry: "banking",
    sizingType: "demand_side",
    inputSteps: [
      {
        assumptionRange: { min: 5_000_000, max: 260_000_000, unit: "users" },
        id: "adult_population",
        inputKind: "integer",
        label: "Adult population",
        required: true,
        unit: "users",
        variableName: "adultPopulation"
      },
      {
        assumptionRange: { min: 0.35, max: 0.9, unit: "percentage" },
        id: "mobile_banking_rate",
        inputKind: "percentage",
        label: "Mobile banking users",
        required: true,
        unit: "percentage",
        variableName: "mobileBankingRate"
      },
      {
        assumptionRange: { min: 2, max: 35, unit: "units" },
        id: "payments_per_user_month",
        inputKind: "number",
        label: "Payment transactions per user per month",
        required: true,
        unit: "units",
        variableName: "paymentsPerUserMonth"
      },
      senseCheckStep()
    ],
    finalFormula: {
      expression: "adultPopulation * mobileBankingRate * paymentsPerUserMonth",
      outputVariable: "monthlyPaymentTransactions",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "units",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check whether the implied monthly transactions per adult is plausible.")
  },
  {
    id: "market_forklift_service_009",
    title: "Forklift Maintenance Services",
    prompt: "Estimate the annual market for outsourced forklift maintenance at regional warehouses.",
    description: "Supply-side service sizing from warehouse count, forklifts per site, service events, and event price.",
    difficulty: "advanced",
    industry: "manufacturing",
    sizingType: "supply_side",
    inputSteps: [
      {
        assumptionRange: { min: 500, max: 20_000, unit: "stores" },
        id: "warehouse_count",
        inputKind: "integer",
        label: "Warehouses in region",
        required: true,
        unit: "stores",
        variableName: "warehouseCount"
      },
      {
        assumptionRange: { min: 2, max: 35, unit: "units" },
        id: "forklifts_per_warehouse",
        inputKind: "number",
        label: "Forklifts per warehouse",
        required: true,
        unit: "units",
        variableName: "forkliftsPerWarehouse"
      },
      {
        assumptionRange: { min: 1, max: 6, unit: "units" },
        id: "service_events_per_forklift",
        inputKind: "number",
        label: "Service events per forklift per year",
        required: true,
        unit: "units",
        variableName: "serviceEventsPerForklift"
      },
      {
        assumptionRange: { min: 150, max: 900, unit: "currency" },
        id: "price_per_service_event",
        inputKind: "currency",
        label: "Average price per service event",
        required: true,
        unit: "currency",
        variableName: "pricePerServiceEvent"
      },
      senseCheckStep()
    ],
    finalFormula: {
      expression: "warehouseCount * forkliftsPerWarehouse * serviceEventsPerForklift * pricePerServiceEvent",
      outputVariable: "annualMaintenanceMarket",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check whether the implied annual maintenance spend per warehouse is plausible.")
  },
  {
    id: "market_food_delivery_city_010",
    title: "Local Food Delivery Orders",
    prompt: "Estimate the annual food delivery gross order value in a large city.",
    description: "Marketplace sizing from households, ordering penetration, monthly frequency, average order value, and months.",
    difficulty: "advanced",
    industry: "marketplaces",
    sizingType: "revenue_pool",
    inputSteps: [
      {
        assumptionRange: { min: 500_000, max: 5_000_000, unit: "units" },
        id: "households",
        inputKind: "integer",
        label: "Households",
        required: true,
        unit: "units",
        variableName: "households"
      },
      {
        assumptionRange: { min: 0.18, max: 0.7, unit: "percentage" },
        id: "ordering_household_rate",
        inputKind: "percentage",
        label: "Households ordering delivery",
        required: true,
        unit: "percentage",
        variableName: "orderingHouseholdRate"
      },
      {
        assumptionRange: { min: 1, max: 10, unit: "units" },
        id: "orders_per_household_month",
        inputKind: "number",
        label: "Orders per ordering household per month",
        required: true,
        unit: "units",
        variableName: "ordersPerHouseholdMonth"
      },
      {
        assumptionRange: { min: 18, max: 65, unit: "currency" },
        id: "average_order_value",
        inputKind: "currency",
        label: "Average order value",
        required: true,
        unit: "currency",
        variableName: "averageOrderValue"
      },
      monthsPerYearStep,
      senseCheckStep()
    ],
    finalFormula: {
      expression:
        "households * orderingHouseholdRate * ordersPerHouseholdMonth * averageOrderValue * monthsPerYear",
      outputVariable: "annualGrossOrderValue",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check the implied annual delivery spend per ordering household.")
  },
  {
    id: "market_home_fitness_equipment_011",
    title: "Home Fitness Equipment",
    prompt: "Estimate annual consumer spending on home fitness equipment in a country.",
    description: "Demand-side consumer goods sizing from households, fitness participation, annual buyer rate, and equipment spend.",
    difficulty: "beginner",
    industry: "consumer_goods",
    sizingType: "demand_side",
    inputSteps: [
      {
        assumptionRange: { min: 1_000_000, max: 60_000_000, unit: "units" },
        id: "households",
        inputKind: "integer",
        label: "Households",
        required: true,
        unit: "units",
        variableName: "households"
      },
      {
        assumptionRange: { min: 0.15, max: 0.65, unit: "percentage" },
        id: "fitness_participation_rate",
        inputKind: "percentage",
        label: "Households with active fitness users",
        required: true,
        unit: "percentage",
        variableName: "fitnessParticipationRate"
      },
      {
        assumptionRange: { min: 0.08, max: 0.45, unit: "percentage" },
        id: "annual_equipment_buyer_rate",
        inputKind: "percentage",
        label: "Annual equipment buyer rate",
        required: true,
        unit: "percentage",
        variableName: "annualEquipmentBuyerRate"
      },
      {
        assumptionRange: { min: 50, max: 600, unit: "currency" },
        id: "average_equipment_spend",
        inputKind: "currency",
        label: "Average spend per buyer",
        required: true,
        unit: "currency",
        variableName: "averageEquipmentSpend"
      },
      senseCheckStep()
    ],
    finalFormula: {
      expression: "households * fitnessParticipationRate * annualEquipmentBuyerRate * averageEquipmentSpend",
      outputVariable: "annualFitnessEquipmentSpend",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check the implied number of buyers against total fitness households.")
  },
  {
    id: "market_digital_therapy_012",
    title: "Digital Therapy Subscriptions",
    prompt: "Estimate the annual subscription market for a digital therapy program in a country.",
    description: "Revenue-pool sizing from adult population, eligible need, subscription adoption, monthly price, and annual months.",
    difficulty: "advanced",
    industry: "healthcare",
    sizingType: "revenue_pool",
    inputSteps: [
      {
        assumptionRange: { min: 5_000_000, max: 260_000_000, unit: "users" },
        id: "adult_population",
        inputKind: "integer",
        label: "Adult population",
        required: true,
        unit: "users",
        variableName: "adultPopulation"
      },
      {
        assumptionRange: { min: 0.03, max: 0.25, unit: "percentage" },
        id: "eligible_need_rate",
        inputKind: "percentage",
        label: "Adults with addressable therapy need",
        required: true,
        unit: "percentage",
        variableName: "eligibleNeedRate"
      },
      {
        assumptionRange: { min: 0.05, max: 0.4, unit: "percentage" },
        id: "subscription_adoption_rate",
        inputKind: "percentage",
        label: "Eligible adults adopting a paid program",
        required: true,
        unit: "percentage",
        variableName: "subscriptionAdoptionRate"
      },
      {
        assumptionRange: { min: 20, max: 120, unit: "currency" },
        id: "monthly_program_price",
        inputKind: "currency",
        label: "Monthly program price",
        required: true,
        unit: "currency",
        variableName: "monthlyProgramPrice"
      },
      monthsPerYearStep,
      senseCheckStep()
    ],
    finalFormula: {
      expression:
        "adultPopulation * eligibleNeedRate * subscriptionAdoptionRate * monthlyProgramPrice * monthsPerYear",
      outputVariable: "annualDigitalTherapyMarket",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check whether the implied paying subscriber count fits the eligible adult population.")
  },
  {
    id: "market_parcel_locker_013",
    title: "Parcel Locker Pickup Fees",
    prompt: "Estimate annual parcel locker pickup fee revenue in a large metropolitan area.",
    description: "Demand-side marketplace sizing from ordering households, package frequency, locker usage, fee, and months.",
    difficulty: "intermediate",
    industry: "marketplaces",
    sizingType: "demand_side",
    inputSteps: [
      {
        assumptionRange: { min: 500_000, max: 8_000_000, unit: "units" },
        id: "ordering_households",
        inputKind: "integer",
        label: "Households receiving parcels",
        required: true,
        unit: "units",
        variableName: "orderingHouseholds"
      },
      {
        assumptionRange: { min: 1, max: 12, unit: "units" },
        id: "packages_per_household_month",
        inputKind: "number",
        label: "Packages per household per month",
        required: true,
        unit: "units",
        variableName: "packagesPerHouseholdMonth"
      },
      {
        assumptionRange: { min: 0.05, max: 0.45, unit: "percentage" },
        id: "locker_pickup_rate",
        inputKind: "percentage",
        label: "Packages picked up through lockers",
        required: true,
        unit: "percentage",
        variableName: "lockerPickupRate"
      },
      {
        assumptionRange: { min: 0.5, max: 4, unit: "currency" },
        id: "fee_per_pickup",
        inputKind: "currency",
        label: "Fee per locker pickup",
        required: true,
        unit: "currency",
        variableName: "feePerPickup"
      },
      monthsPerYearStep,
      senseCheckStep()
    ],
    finalFormula: {
      expression:
        "orderingHouseholds * packagesPerHouseholdMonth * lockerPickupRate * feePerPickup * monthsPerYear",
      outputVariable: "annualLockerFeeRevenue",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check the implied locker pickups per household against package frequency.")
  },
  {
    id: "market_cyber_training_saas_014",
    title: "Employee Cybersecurity Training SaaS",
    prompt: "Estimate the annual market for employee cybersecurity training software among mid-sized companies.",
    description: "Revenue-pool sizing from company count, adoption, employees per adopting company, and annual price per employee.",
    difficulty: "intermediate",
    industry: "saas",
    sizingType: "revenue_pool",
    inputSteps: [
      {
        assumptionRange: { min: 20_000, max: 500_000, unit: "units" },
        id: "mid_sized_companies",
        inputKind: "integer",
        label: "Mid-sized companies",
        required: true,
        unit: "units",
        variableName: "midSizedCompanies"
      },
      {
        assumptionRange: { min: 0.2, max: 0.85, unit: "percentage" },
        id: "training_adoption_rate",
        inputKind: "percentage",
        label: "Training software adoption rate",
        required: true,
        unit: "percentage",
        variableName: "trainingAdoptionRate"
      },
      {
        assumptionRange: { min: 75, max: 900, unit: "users" },
        id: "employees_per_company",
        inputKind: "number",
        label: "Employees per adopting company",
        required: true,
        unit: "users",
        variableName: "employeesPerCompany"
      },
      {
        assumptionRange: { min: 8, max: 80, unit: "currency" },
        id: "annual_price_per_employee",
        inputKind: "currency",
        label: "Annual price per employee",
        required: true,
        unit: "currency",
        variableName: "annualPricePerEmployee"
      },
      senseCheckStep()
    ],
    finalFormula: {
      expression:
        "midSizedCompanies * trainingAdoptionRate * employeesPerCompany * annualPricePerEmployee",
      outputVariable: "annualTrainingSaasMarket",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check whether the implied spend per adopting company fits a training budget.")
  },
  {
    id: "market_atm_maintenance_015",
    title: "ATM Maintenance Services",
    prompt: "Estimate the annual outsourced ATM maintenance services market in a country.",
    description: "Supply-side service sizing from ATM count, maintenance visits, and average service visit price.",
    difficulty: "intermediate",
    industry: "banking",
    sizingType: "supply_side",
    inputSteps: [
      {
        assumptionRange: { min: 5_000, max: 250_000, unit: "units" },
        id: "atm_count",
        inputKind: "integer",
        label: "ATMs in service",
        required: true,
        unit: "units",
        variableName: "atmCount"
      },
      {
        assumptionRange: { min: 1, max: 8, unit: "units" },
        id: "service_visits_per_atm",
        inputKind: "number",
        label: "Maintenance visits per ATM per year",
        required: true,
        unit: "units",
        variableName: "serviceVisitsPerAtm"
      },
      {
        assumptionRange: { min: 100, max: 1_200, unit: "currency" },
        id: "average_service_visit_price",
        inputKind: "currency",
        label: "Average price per service visit",
        required: true,
        unit: "currency",
        variableName: "averageServiceVisitPrice"
      },
      senseCheckStep()
    ],
    finalFormula: {
      expression: "atmCount * serviceVisitsPerAtm * averageServiceVisitPrice",
      outputVariable: "annualAtmMaintenanceMarket",
      roundingRule: "nearest_1m",
      tolerance: { type: "percentage", value: 0.03 }
    },
    outputUnit: "currency",
    rubric: defaultMarketSizingRubric,
    senseCheck: senseCheck("Check the implied annual maintenance spend per ATM against service visit pricing.")
  }
] as const satisfies readonly MarketSizingTemplate[];

function senseCheckStep() {
  return {
    id: "sense_check",
    inputKind: "boolean",
    label: "Sense-check completed",
    required: true
  } as const;
}

function senseCheck(prompt: string): MarketSizingTemplate["senseCheck"] {
  return {
    prompt,
    required: true,
    interpretationOptions: [
      { id: "plausible", label: "Plausible; proceed with this estimate" },
      { id: "too_high", label: "Likely too high; revisit assumptions" },
      { id: "too_low", label: "Likely too low; revisit assumptions" }
    ]
  };
}
