'use client'

import { useChat } from '@ai-sdk/react'
import { type UIMessage } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { Streamdown } from 'streamdown'
import {
  buildFinancialContext,
  clearChatStorage,
  loadChat,
  saveChat
} from '~/lib/chat'
import { displayFont } from '~/lib/fonts'
import { Goal } from '~/lib/goals'

// Streamdown renders its own block elements; these arbitrary variants tighten
// the default spacing and recolour links/code/tables to match the chat bubble.
const MARKDOWN_CLASS = [
  'space-y-2',
  '[&>:first-child]:mt-0 [&>:last-child]:mb-0',
  '[&_p]:my-1.5',
  '[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4',
  '[&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4',
  '[&_li]:my-0.5',
  '[&_a]:font-medium [&_a]:text-[#1d4d31] [&_a]:underline',
  '[&_strong]:font-semibold',
  '[&_h1]:my-2 [&_h1]:text-base [&_h1]:font-semibold',
  '[&_h2]:my-2 [&_h2]:text-[15px] [&_h2]:font-semibold',
  '[&_h3]:my-1.5 [&_h3]:text-[14px] [&_h3]:font-semibold',
  '[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-[#10301d]/8 [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[12px]',
  '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:text-[12px]',
  '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-[#10301d]/20 [&_blockquote]:pl-3 [&_blockquote]:text-[#10301d]/70',
  '[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[12.5px]',
  '[&_th]:border [&_th]:border-[#10301d]/15 [&_th]:bg-[#10301d]/5 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left',
  '[&_td]:border [&_td]:border-[#10301d]/15 [&_td]:px-2 [&_td]:py-1',
  '[&_hr]:my-3 [&_hr]:border-[#10301d]/10'
].join(' ')

const SUGGESTIONS = [
  'I earn ₹50,000/month — help me build a plan.',
  'Am I investing enough for my goals?',
  'How should I split my savings across these goals?',
  'What if I increase my monthly SIP by 5%?'
]

/* ── render a single message's text parts ─────────────────── */
function messageText(message: UIMessage): string {
  return message.parts
    .map(part => (part.type === 'text' ? part.text : ''))
    .join('')
}

export function ChatWidget({
  goals,
  clearSignal
}: {
  /** Latest goals, sent to the model as context with every message. */
  goals: Goal[]
  /** Bumped by the parent when the user clears all data, to wipe the chat too. */
  clearSignal: number
}) {
  const [open, setOpen] = useState(false)

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
    error,
    clearError
  } = useChat({ messages: loadChat() })

  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const busy = status === 'submitted' || status === 'streaming'

  // Persist the transcript once a turn settles (avoids a write per stream chunk).
  useEffect(() => {
    if (status === 'ready' || status === 'error') saveChat(messages)
  }, [messages, status])

  // Wipe the chat when the parent clears all app data.
  useEffect(() => {
    if (clearSignal > 0) {
      setMessages([])
      clearChatStorage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSignal])

  // Keep the latest message in view as it streams in.
  useEffect(() => {
    if (open)
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, open, status])

  const submit = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    clearError()
    // Attach a fresh snapshot of the user's goals so the model always reasons
    // over their current plan, even after edits made since the last message.
    sendMessage(
      { text: trimmed },
      { body: { financialContext: buildFinancialContext(goals) } }
    )
    setInput('')
  }

  const handleClearChat = () => {
    stop()
    setMessages([])
    clearChatStorage()
  }

  return (
    <>
      {/* ── floating launcher ──────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={
          open ? 'Close financial assistant' : 'Open financial assistant'
        }
        aria-expanded={open}
        className="fixed right-5 bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1d4d31] text-[#f4efe2] shadow-[0_8px_30px_-8px_rgba(16,48,29,0.6)] transition-all hover:scale-105 hover:bg-[#10301d] active:scale-95 sm:right-7 sm:bottom-7"
      >
        {open ? (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>

      {/* ── chat panel ─────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-label="Financial assistant"
          className="fixed right-3 bottom-22 z-40 flex h-[min(620px,calc(100vh-7rem))] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-[#10301d]/12 bg-[#f4efe2] shadow-[0_24px_70px_-20px_rgba(16,48,29,0.55)] sm:right-7 sm:bottom-26"
        >
          {/* header */}
          <div className="flex items-center justify-between gap-3 border-b border-[#10301d]/10 bg-[#1d4d31] px-5 py-4 text-[#f4efe2]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4efe2]/15 text-lg">
                💸
              </div>
              <div>
                <p
                  className={`text-[15px] leading-tight ${displayFont.className}`}
                >
                  Plan with AI
                </p>
                <p className="text-[11px] text-[#f4efe2]/60">
                  Your financial planning assistant
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                title="Clear conversation"
                aria-label="Clear conversation"
                className="rounded-full p-1.5 text-[#f4efe2]/55 transition-colors hover:bg-[#f4efe2]/10 hover:text-[#f4efe2]"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto px-4 py-5"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center px-2 pt-6 text-center">
                <div className="mb-4 text-5xl">🌿</div>
                <h3
                  className={`mb-2 text-lg text-[#10301d] ${displayFont.className}`}
                >
                  How can I help you plan?
                </h3>
                <p className="mb-5 text-[13px] leading-relaxed text-[#10301d]/55">
                  Tell me your income and goals, and I’ll suggest how much to
                  invest each month. I can see your current goals.
                </p>
                <div className="flex w-full flex-col gap-2">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="rounded-xl border border-[#10301d]/12 bg-[#fffdf7] px-3.5 py-2.5 text-left text-[13px] text-[#10301d]/75 transition-colors hover:border-[#1d4d31]/40 hover:bg-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(message => {
              const isUser = message.role === 'user'
              const text = messageText(message)
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                      isUser
                        ? 'rounded-br-md bg-[#1d4d31] whitespace-pre-wrap text-[#f4efe2]'
                        : 'rounded-bl-md border border-[#10301d]/10 bg-[#fffdf7] text-[#10301d]'
                    }`}
                  >
                    {isUser ? (
                      text
                    ) : text ? (
                      <Streamdown className={MARKDOWN_CLASS}>{text}</Streamdown>
                    ) : (
                      <span className="inline-flex gap-1">
                        <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {status === 'submitted' && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-[#10301d]/10 bg-[#fffdf7] px-3.5 py-3">
                  <span className="inline-flex gap-1">
                    <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-600">
                Something went wrong. Make sure the API key is set in{' '}
                <code className="rounded bg-red-100 px-1">.env</code>, then try
                again.
              </div>
            )}
          </div>

          {/* composer */}
          <form
            onSubmit={e => {
              e.preventDefault()
              submit(input)
            }}
            className="border-t border-[#10301d]/10 bg-[#f4efe2] px-3 py-3"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-[#10301d]/15 bg-[#fffdf7] px-3 py-2 focus-within:border-[#1d4d31]/50">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submit(input)
                  }
                }}
                rows={1}
                placeholder="Ask about your financial plan…"
                className="max-h-28 flex-1 resize-none bg-transparent py-1 text-[13.5px] text-[#10301d] placeholder:text-[#10301d]/35 focus:outline-none"
              />
              {busy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  aria-label="Stop generating"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10301d]/15 text-[#10301d] transition-colors hover:bg-[#10301d]/25"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d4d31] text-[#f4efe2] transition-colors hover:bg-[#10301d] disabled:opacity-30"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12h14M12 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
            </div>
            <p className="mt-2 px-1 text-center text-[10px] text-[#10301d]/35">
              AI projections are estimates, not financial advice.
            </p>
          </form>
        </div>
      )}
    </>
  )
}

function Dot({ delay = '0s' }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#10301d]/40"
      style={{ animationDelay: delay }}
    />
  )
}
