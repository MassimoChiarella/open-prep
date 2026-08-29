import type { SynthesisPrompt } from "@/features/case-practice/synthesis/synthesisScoring";

export const synthesisPrompts = [
  {
    id: "freshlane-click-collect",
    title: "FreshLane click-and-collect rollout",
    client: "FreshLane Grocers",
    situation:
      "FreshLane, a 42-store regional grocer, has completed a 12-week click-and-collect pilot in six stores.",
    decision: "What should FreshLane do next?",
    facts: [
      "Pilot order volume finished 40% above the business case, and 61% of customers reordered versus a 55% target.",
      "Average contribution margin was 14%, below the 18% rollout hurdle; overtime and manual picking caused most of the gap.",
      "The two pilot stores using dedicated picking shifts reached 19% contribution margin by week 10.",
      "Customer satisfaction averaged 4.6 out of 5 across all six stores."
    ],
    options: {
      recommendation: [
        { id: "expand-all", label: "Expand immediately to all 42 stores to capture demand." },
        {
          id: "expand-phased",
          label: "Expand in stages to 12 high-demand stores while standardizing dedicated picking shifts."
        },
        { id: "stop-pilot", label: "Stop click-and-collect because the pilot missed the margin hurdle." }
      ],
      evidence: [
        {
          id: "demand-and-margin",
          label: "Demand and repeat use beat plan, while dedicated-shift stores already cleared the margin hurdle."
        },
        {
          id: "satisfaction-only",
          label: "Customer satisfaction was 4.6 out of 5 in the pilot stores."
        },
        {
          id: "margin-miss-only",
          label: "Average pilot contribution margin was four points below the rollout hurdle."
        }
      ],
      risk: [
        {
          id: "efficiency-transfer",
          label: "Dedicated-shift labor efficiency may not transfer to lower-volume stores."
        },
        { id: "basket-demand", label: "Existing customers may stop buying groceries in stores entirely." },
        { id: "supplier-terms", label: "Suppliers may renegotiate product costs because ordering is digital." }
      ],
      nextStep: [
        {
          id: "controlled-wave",
          label: "Run a four-week 12-store wave and track margin, repeat rate, and labor minutes per order."
        },
        { id: "national-vendor", label: "Select a national delivery vendor before doing more testing." },
        { id: "brand-campaign", label: "Launch a chain-wide advertising campaign immediately." }
      ]
    },
    correctResponse: {
      recommendation: "expand-phased",
      evidence: "demand-and-margin",
      risk: "efficiency-transfer",
      nextStep: "controlled-wave"
    },
    modelClose:
      "FreshLane should expand click-and-collect in stages to 12 high-demand stores using dedicated picking shifts. Demand and repeat use exceeded plan, and the stores using that labor model already passed the 18% margin hurdle. The key risk is that the efficiency may not carry into lower-volume locations, so FreshLane should run a four-week wave and monitor contribution margin, repeat rate, and labor minutes per order before expanding further."
  },
  {
    id: "northstar-service-contracts",
    title: "Northstar service-contract growth",
    client: "Northstar Pumps",
    situation:
      "Northstar manufactures industrial pumps and is considering a push to grow its preventive-maintenance contracts.",
    decision: "How should Northstar pursue the opportunity?",
    facts: [
      "Only 18% of Northstar's 4,000 installed pumps have a service contract, compared with a 35% peer benchmark.",
      "Service contracts earn a 34% gross margin versus 21% on new equipment, and 82% of contracts renew annually.",
      "Sixty-five percent of unattached pumps serve food, beverage, and chemical plants where downtime is especially costly.",
      "Technician utilization is already 88%; historical service-level misses rise sharply above 90%."
    ],
    options: {
      recommendation: [
        {
          id: "targeted-launch",
          label: "Launch a targeted contract offer for high-downtime industries while adding technician capacity."
        },
        { id: "all-customers", label: "Offer discounted contracts to every installed-base customer immediately." },
        { id: "equipment-only", label: "Keep focusing on equipment sales because service is operationally complex." }
      ],
      evidence: [
        {
          id: "underpenetrated-profitable",
          label: "Contract penetration trails peers, while service has higher margins and strong renewal."
        },
        { id: "installed-base", label: "Northstar has 4,000 pumps installed at customer sites." },
        { id: "utilization", label: "Technician utilization is currently 88%." }
      ],
      risk: [
        {
          id: "service-capacity",
          label: "New contracts could push technician utilization past the point where service levels deteriorate."
        },
        { id: "equipment-demand", label: "Service growth could eliminate all demand for replacement pumps." },
        { id: "renewal-zero", label: "Every current contract customer could decline renewal in the same year." }
      ],
      nextStep: [
        {
          id: "capacity-pilot",
          label: "Pilot with 75 high-downtime accounts, add planned capacity, and track attach rate, margin, and service levels."
        },
        { id: "price-cut", label: "Cut contract prices by 30% across the installed base." },
        { id: "acquire-rival", label: "Acquire a national service company before contacting customers." }
      ]
    },
    correctResponse: {
      recommendation: "targeted-launch",
      evidence: "underpenetrated-profitable",
      risk: "service-capacity",
      nextStep: "capacity-pilot"
    },
    modelClose:
      "Northstar should launch a targeted service-contract offer to food, beverage, and chemical customers while adding technician capacity. Contract penetration is well below peers, and the business offers higher margins with strong renewal. The main risk is service quality as technician utilization crosses 90%, so Northstar should pilot with 75 high-downtime accounts and track attach rate, margin, utilization, and service-level performance before scaling."
  },
  {
    id: "metrobrew-station-kiosks",
    title: "MetroBrew station kiosk expansion",
    client: "MetroBrew Coffee",
    situation:
      "MetroBrew has tested compact coffee kiosks at four commuter rail stations and must decide whether to expand.",
    decision: "What expansion approach should MetroBrew take?",
    facts: [
      "After 10 weeks, the two stations with more than 18,000 morning commuters were 25% above break-even revenue and earned a 16% contribution margin.",
      "The two stations with fewer than 10,000 morning commuters remained 30% below break-even.",
      "Menu, pricing, service time, and customer ratings were similar across all four pilot locations.",
      "Six unserved stations have more than 17,000 morning commuters and available kiosk leases."
    ],
    options: {
      recommendation: [
        { id: "six-high-volume", label: "Expand only to the six available high-volume stations." },
        { id: "all-stations", label: "Expand to every station to build a citywide brand presence." },
        { id: "no-expansion", label: "Do not expand because half of the pilot kiosks missed break-even." }
      ],
      evidence: [
        {
          id: "footfall-pattern",
          label: "High-volume pilots were profitable, low-volume pilots were not, and six available sites match the winning traffic profile."
        },
        { id: "ratings", label: "Customer ratings were similar across the four pilot locations." },
        { id: "pilot-count", label: "MetroBrew operated exactly four pilot kiosks for 10 weeks." }
      ],
      risk: [
        {
          id: "commuter-volatility",
          label: "Seasonal or hybrid-work changes could reduce commuter volume against fixed lease costs."
        },
        { id: "menu-copying", label: "Competitors could copy MetroBrew's menu names." },
        { id: "equipment-color", label: "Customers may dislike the color of equipment at new kiosks." }
      ],
      nextStep: [
        {
          id: "validate-and-stage",
          label: "Validate recent footfall and lease terms, then open two sites first and confirm unit economics."
        },
        { id: "sign-six", label: "Sign long-term leases for all six sites before traffic changes." },
        { id: "new-menu", label: "Develop a completely new menu before selecting locations." }
      ]
    },
    correctResponse: {
      recommendation: "six-high-volume",
      evidence: "footfall-pattern",
      risk: "commuter-volatility",
      nextStep: "validate-and-stage"
    },
    modelClose:
      "MetroBrew should expand selectively to the six available high-volume stations. The pilot shows a clear traffic threshold: high-volume stations exceeded break-even and earned attractive margins, while otherwise similar low-volume sites underperformed. The key risk is commuter volatility against fixed rent, so MetroBrew should validate current footfall and lease terms, open two sites first, and confirm unit economics before completing the rollout."
  }
] as const satisfies readonly SynthesisPrompt[];
