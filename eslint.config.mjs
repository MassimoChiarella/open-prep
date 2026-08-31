import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      ".dist-verification/**",
      "node_modules/**",
      "dist/**",
      "dist-desktop/**",
      "out/**",
      "playwright-report/**",
      "scripts/**/*.d.mts",
      "test-results/**",
      "coverage/**",
      "next-env.d.ts"
    ]
  },
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.{js,mjs,cjs}"],
    rules: {
      "no-restricted-globals": ["error", "fetch", "WebSocket", "XMLHttpRequest", "EventSource"],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@amplitude/*",
                "@datadog/*",
                "@rudderstack/*",
                "@segment/*",
                "@sentry/*",
                "*analytics*",
                "*fullstory*",
                "*hotjar*",
                "*logrocket*",
                "*mixpanel*",
                "*newrelic*",
                "*posthog*"
              ],
              message: "Analytics and telemetry dependencies are not allowed in this local-first app."
            }
          ]
        }
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='navigator'][callee.property.name='sendBeacon']",
          message: "Browser beacon transmission is not allowed in this local-first app."
        }
      ]
    }
  }
];

export default eslintConfig;
