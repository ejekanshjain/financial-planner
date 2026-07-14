# Financial Planner

Financial Planner is an India-focused personal finance PWA for turning long-term goals into understandable investment or withdrawal plans.

## Features

- Target-driven planning that calculates the monthly SIP required for a future corpus
- SIP-driven planning that projects the corpus from a chosen monthly contribution
- Systematic withdrawal plan (SWP) simulations for retirement and income planning
- Inflation adjustment, annual contribution step-ups, lump-sum investments, and return assumptions
- Year-by-year invested-value and portfolio-value projections
- Multiple locally persisted goals with focused detail views
- PDF export for individual goals and complete plans
- Streaming AI planning assistant powered through the AI SDK
- Installable PWA with offline caching and update notifications
- Focused Vitest coverage for financial calculations

## Stack

- Next.js, React, TypeScript, and Tailwind CSS
- Vercel AI SDK with Google Generative AI
- React PDF Renderer and Streamdown
- Vitest

## Local development

    bun install
    bun run dev

The planner works locally without an account. Configure GOOGLE_GENERATIVE_AI_API_KEY to enable the AI chat assistant.

## Verification

    bun run test
    bun run lint
    bun run build

## Disclaimer

The calculations are educational projections, not financial advice. Actual returns, taxes, fees, and inflation will vary.
