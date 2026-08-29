import type { BrainstormingPrompt } from "@/features/case-practice/brainstorming/brainstormingScoring";

export const brainstormingPrompts: readonly BrainstormingPrompt[] = [
  {
    id: "grocer-profit-recovery",
    title: "Neighborhood Grocer Profit Recovery",
    context:
      "A 40-store grocery chain has flat revenue and lower profit. Food waste is up 30%, top-selling categories are often out of stock on weekends, labor cost is stable, and customer traffic is unchanged.",
    question: "Which initiatives should management evaluate to restore profit over the next 12 months?",
    selectionLimit: 6,
    priorityLimit: 2,
    priorityIdeaIds: ["grocer-forecast", "grocer-availability"],
    themes: [
      {
        id: "revenue-assortment",
        label: "Revenue and assortment",
        ideas: [
          {
            id: "grocer-availability",
            label: "Improve shelf availability for the highest-selling products",
            relevant: true
          },
          {
            id: "grocer-sku-margin",
            label: "Review SKU margins and simplify low-contribution assortment",
            relevant: true
          },
          {
            id: "grocer-clothing",
            label: "Launch an unrelated premium clothing range in every store",
            relevant: false
          }
        ]
      },
      {
        id: "cost-waste",
        label: "Cost and waste",
        ideas: [
          {
            id: "grocer-forecast",
            label: "Improve ordering forecasts to reduce spoilage",
            relevant: true
          },
          {
            id: "grocer-suppliers",
            label: "Renegotiate terms with the highest-spend suppliers",
            relevant: true
          },
          {
            id: "grocer-maintenance",
            label: "Stop refrigerator maintenance to lower near-term expense",
            relevant: false
          }
        ]
      },
      {
        id: "store-operations",
        label: "Store operations",
        ideas: [
          {
            id: "grocer-replenishment",
            label: "Align replenishment schedules with weekend demand",
            relevant: true
          },
          {
            id: "grocer-waste-tracking",
            label: "Pilot consistent waste tracking by department",
            relevant: true
          },
          {
            id: "grocer-approvals",
            label: "Add another approval layer to every restocking decision",
            relevant: false
          }
        ]
      }
    ]
  },
  {
    id: "bus-ridership-recovery",
    title: "Regional Bus Ridership Recovery",
    context:
      "A regional bus operator has lost weekday commuters. Peak buses bunch together, on-time performance has fallen, riders do not trust arrival times, and the existing fleet has enough capacity.",
    question: "What should the operator test to recover weekday ridership?",
    selectionLimit: 6,
    priorityLimit: 2,
    priorityIdeaIds: ["bus-schedules", "bus-arrivals"],
    themes: [
      {
        id: "service-reliability",
        label: "Service reliability",
        ideas: [
          {
            id: "bus-schedules",
            label: "Retime peak schedules using observed travel times",
            relevant: true
          },
          {
            id: "bus-dispatch",
            label: "Use active dispatching to reduce bus bunching",
            relevant: true
          },
          {
            id: "bus-training",
            label: "Reduce driver refresher training to free more service hours",
            relevant: false
          }
        ]
      },
      {
        id: "rider-experience",
        label: "Rider experience",
        ideas: [
          {
            id: "bus-arrivals",
            label: "Provide accurate real-time arrival alerts",
            relevant: true
          },
          {
            id: "bus-fares",
            label: "Simplify fare reloads and delay refunds",
            relevant: true
          },
          {
            id: "bus-hide-delays",
            label: "Hide delayed trips from the rider information screen",
            relevant: false
          }
        ]
      },
      {
        id: "demand-partnerships",
        label: "Demand and partnerships",
        ideas: [
          {
            id: "bus-employers",
            label: "Pilot employer passes after reliability improves",
            relevant: true
          },
          {
            id: "bus-transfers",
            label: "Coordinate transfer timing with regional rail",
            relevant: true
          },
          {
            id: "bus-tv",
            label: "Buy a national television campaign before fixing service",
            relevant: false
          }
        ]
      }
    ]
  },
  {
    id: "software-churn-reduction",
    title: "Small-Business Software Churn",
    context:
      "A workflow software company has rising churn among small-business customers in their first 90 days. Exit interviews cite setup confusion and slow support; product reliability and pricing are unchanged.",
    question: "Which actions should the company consider to reduce early customer churn?",
    selectionLimit: 6,
    priorityLimit: 2,
    priorityIdeaIds: ["software-guided-setup", "software-risk-support"],
    themes: [
      {
        id: "onboarding",
        label: "Onboarding",
        ideas: [
          {
            id: "software-guided-setup",
            label: "Add a guided setup checklist for core workflows",
            relevant: true
          },
          {
            id: "software-webinars",
            label: "Offer onboarding sessions for common workflows",
            relevant: true
          },
          {
            id: "software-remove-docs",
            label: "Remove setup documentation to shorten the help center",
            relevant: false
          }
        ]
      },
      {
        id: "activation-engagement",
        label: "Activation and engagement",
        ideas: [
          {
            id: "software-nudges",
            label: "Trigger help when an account misses activation milestones",
            relevant: true
          },
          {
            id: "software-usage",
            label: "Surface a simple usage dashboard to account administrators",
            relevant: true
          },
          {
            id: "software-features",
            label: "Build unrelated features that churn interviews did not mention",
            relevant: false
          }
        ]
      },
      {
        id: "customer-support",
        label: "Customer support",
        ideas: [
          {
            id: "software-risk-support",
            label: "Prioritize onboarding support for accounts showing setup risk",
            relevant: true
          },
          {
            id: "software-playbooks",
            label: "Create response playbooks for the most common setup issues",
            relevant: true
          },
          {
            id: "software-hours",
            label: "Reduce support hours during each customer's first 90 days",
            relevant: false
          }
        ]
      }
    ]
  }
];
