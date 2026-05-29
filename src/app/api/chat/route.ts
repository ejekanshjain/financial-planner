import { google } from '@ai-sdk/google'
import { convertToModelMessages, streamText, UIMessage } from 'ai'

// Allow streaming responses up to 30 seconds.
export const maxDuration = 30

const SYSTEM_PROMPT = `You are a friendly, knowledgeable financial planning assistant built into a SIP (Systematic Investment Plan) goal-planning app for Indian investors.

Your job is to help the user plan and reason about their financial goals:
- Explain how much to invest monthly to reach a goal, and the trade-offs of time horizon, expected return, step-up, inflation, and lump sums.
- When the user shares their income or savings capacity, suggest a realistic, prioritised plan: how to split investments across goals, what is achievable, and what to adjust if it isn't.
- Use the user's existing goals (provided below) as concrete context — reference their actual numbers.

Guidelines:
- All amounts are in Indian Rupees (₹). Use Indian formatting (lakhs/crores) where natural.
- Be concrete and numeric, but keep answers concise and easy to scan. Use short paragraphs or bullet points.
- SIP returns are projections based on assumed annual returns, not guarantees. Briefly remind the user of this when giving return-dependent advice, without being preachy.
- You are not a SEBI-registered advisor; for large or complex decisions, gently suggest consulting a qualified financial advisor.
- If the user asks something unrelated to personal finance, answer briefly and steer back to planning.`

export async function POST(req: Request) {
  const {
    messages,
    financialContext
  }: { messages: UIMessage[]; financialContext?: string } = await req.json()

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          'The AI chat is not configured. Add GOOGLE_GENERATIVE_AI_API_KEY to your .env file.'
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    )
  }

  const system = financialContext
    ? `${SYSTEM_PROMPT}\n\n--- The user's current financial plan ---\n${financialContext}`
    : SYSTEM_PROMPT

  const result = streamText({
    model: google('gemini-3.1-flash-lite-preview'),
    system,
    messages: await convertToModelMessages(messages)
  })

  return result.toUIMessageStreamResponse()
}
