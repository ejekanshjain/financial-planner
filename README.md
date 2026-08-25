# Financial Planner

A private, installable goal planner for turning a future number into a monthly investment or withdrawal plan.

On first launch the app asks **where** you plan from and **which currency** to use. Region and currency lists come from the browser’s `Intl` APIs (every region it can name, every ISO currency it supports). India, the United States and the United Kingdom sit at the top; picking a region fills in its usual currency, which you can still change.

No account. Nothing is sent to a server except the optional AI chat.

[Live demo](https://financial-planner-teal-delta.vercel.app)

## Features

- **Target mode** — enter a future corpus; the app solves for the monthly contribution
- **Contribution mode** — enter a monthly amount; the app projects the corpus
- **Withdrawal mode** — enter a starting corpus and a monthly income; the app shows how long it lasts
- Inflation, annual step-ups, lump sums, and an assumed return
- Year-by-year invested vs portfolio value (or corpus vs withdrawals)
- Multiple goals, stored only in this browser
- JSON import/export and shareable links (include region + currency)
- PDF export for one goal or the whole plan
- Optional streaming AI assistant that can see your current plan
- Installable PWA with offline caching (chat always needs the network)

India uses SIP/SWP wording and lakh/crore formatting. Other regions use contribution/withdrawal wording and thousands/millions.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Vercel AI SDK + Google Generative AI
- `@react-pdf/renderer` and Streamdown
- Vitest

## Quick start

```bash
bun install
bun run dev
```

The planner works with no env vars. To enable the AI assistant:

```bash
# .env
GOOGLE_GENERATIVE_AI_API_KEY=your_key
```

Optional: `NEXT_PUBLIC_SITE_URL` for canonical SEO URLs (defaults to the production Vercel URL).

## Scripts

| Command         | What it does       |
| --------------- | ------------------ |
| `bun run dev`   | Next.js dev server |
| `bun run test`  | Vitest             |
| `bun run lint`  | ESLint             |
| `bun run build` | Production build   |

## How planning works

Amounts are numbers. Region and currency only change **display**, **new-goal defaults**, and **copy** (SIP vs contribution, lakhs vs millions). Switching region later does **not** convert existing amounts.

Calculations assume monthly compounding, contributions/withdrawals at the start of each month, and an annual step-up. They are educational projections, not advice. Actual returns, taxes, fees and inflation will differ.

Data lives in `localStorage`. Clearing the browser store wipes goals and chat. A shared link embeds the plan (and locale) in the URL; opening it imports those goals into the visitor’s browser.

## Contributing

Issues and pull requests are welcome. Please keep changes focused, run `bun run test` and `bun run lint`, and match the existing TypeScript / Prettier style (no semicolons, single quotes).

If you add a region-specific default, put it in `src/lib/locale.ts` rather than hard-coding currency in a component.

## License

MIT. See [LICENSE](LICENSE).
