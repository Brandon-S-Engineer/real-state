'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bot, Loader2, MessageSquare, Send, Trash2, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import { useInventarioHighlight } from '@/lib/inventario-highlight-store'

// Convert "JEEP #11" / "TRANSITO IMA / AMSA #36" to markdown links
function linkifyRefs(text: string): string {
  return text.replace(
    /(JEEP|MAINSTREAM|LCV|TRANSITO IMA \/ AMSA) #(\d+)/g,
    (_, tab, num) => `[${tab} #${num}](inventario://${encodeURIComponent(tab)}/${num})`,
  )
}

type Role = 'user' | 'assistant'

interface Message {
  id: string
  role: Role
  content: string
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

async function* streamCompletion(messages: { role: Role; content: string }[]) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `Request failed (${res.status})`)
  }

  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') return
        try {
          const json = JSON.parse(payload)
          const chunk: string | undefined = json.choices?.[0]?.delta?.content
          if (chunk) yield chunk
        } catch {
          // skip malformed SSE frames
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('chat-messages') ?? '[]') } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const setHighlight = useInventarioHighlight((s) => s.setHighlight)

  // Persist messages to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem('chat-messages', JSON.stringify(messages)) } catch {}
  }, [messages])

  const handleInventarioRef = useCallback((tab: string, rowNum: number) => {
    setHighlight(tab, rowNum)
    if (!pathname.includes('inventario')) {
      router.push('/dashboard/inventario')
    }
  }, [pathname, router, setHighlight])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 60)
  }, [open])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    setError(null)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg: Message = { id: uid(), role: 'user', content: text }
    const assistantMsg: Message = { id: uid(), role: 'assistant', content: '' }
    const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }))

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    try {
      for await (const chunk of streamCompletion(history)) {
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (!last || last.role !== 'assistant') return prev
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
        })
      }
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1))
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setStreaming(false)
    }
  }, [input, messages, streaming])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className='fixed bottom-[4.5rem] right-3 sm:right-6 z-50 w-[520px] max-w-[calc(100vw-1.5rem)] flex flex-col rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden'
          style={{ maxHeight: 'min(580px, calc(100vh - 7rem))' }}>
          {/* Header */}
          <div className='flex items-center gap-2.5 px-4 py-3 border-b border-border shrink-0'>
            <div className='h-7 w-7 rounded-md bg-foreground text-background flex items-center justify-center shrink-0'>
              <Bot className='h-[15px] w-[15px]' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-semibold leading-none mb-[3px]'>AI Assistant</p>
              <p className='text-[11px] text-muted-foreground leading-none'>{streaming ? 'Typing…' : 'gpt-4o-mini'}</p>
            </div>
            {messages.length > 0 && (
              <Button
                variant='ghost'
                size='icon-sm'
                onClick={() => { if (!streaming) { setMessages([]); localStorage.removeItem('chat-messages') } }}
                disabled={streaming}
                title='Clear conversation'>
                <Trash2 className='h-3.5 w-3.5' />
              </Button>
            )}
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={() => setOpen(false)}
              title='Close'>
              <X className='h-3.5 w-3.5' />
            </Button>
          </div>

          {/* Message list */}
          <div className='flex-1 overflow-y-auto p-4 space-y-4 min-h-0'>
            {messages.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-[160px] text-center gap-2.5'>
                <div className='h-10 w-10 rounded-full bg-muted flex items-center justify-center'>
                  <MessageSquare className='h-5 w-5 text-muted-foreground' />
                </div>
                <div>
                  <p className='text-sm font-medium'>How can I help?</p>
                  <p className='text-xs text-muted-foreground mt-0.5 max-w-[220px]'>Ask about your users, metrics, subscriptions, or anything else.</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn('flex gap-2 items-end', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  <div className={cn('h-6 w-6 rounded-full flex items-center justify-center shrink-0 mb-0.5', msg.role === 'assistant' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>
                    {msg.role === 'assistant' ? <Bot className='h-3.5 w-3.5' /> : <User className='h-3.5 w-3.5' />}
                  </div>
                  <div className={cn('max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed break-words', msg.role === 'assistant' ? 'bg-muted text-foreground rounded-bl-none' : 'bg-primary text-primary-foreground rounded-br-none')}>
                    {msg.content !== '' ? (
                      msg.role === 'assistant'
                        ? <div className='prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:font-semibold'>
                            <ReactMarkdown
                              components={{
                                a: ({ href, children }) => {
                                  if (href?.startsWith('inventario://')) {
                                    const [tab, num] = href.replace('inventario://', '').split('/')
                                    return (
                                      <button
                                        onClick={() => handleInventarioRef(decodeURIComponent(tab), Number(num))}
                                        className='text-blue-400 font-semibold hover:underline cursor-pointer bg-transparent border-none p-0 leading-none'
                                      >
                                        {children}
                                      </button>
                                    )
                                  }
                                  return <a href={href}>{children}</a>
                                },
                              }}
                            >
                              {linkifyRefs(msg.content)}
                            </ReactMarkdown>
                          </div>
                        : msg.content
                    ) : (
                      <span className='inline-flex items-center gap-1.5 text-muted-foreground'>
                        <Loader2 className='h-3 w-3 animate-spin' />
                        <span className='text-xs'>Thinking…</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}

            {error && <p className='text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2'>{error}</p>}
            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div className='border-t border-border p-3 flex gap-2 items-end shrink-0 bg-popover'>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder='Message AI Assistant… (Enter to send)'
              rows={1}
              disabled={streaming}
              className={cn('flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2', 'text-sm placeholder:text-muted-foreground overflow-hidden', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', 'disabled:opacity-50')}
              style={{ minHeight: '36px', maxHeight: '120px' }}
            />
            <Button
              size='icon-lg'
              onClick={send}
              disabled={!input.trim() || streaming}
              className='shrink-0'>
              {streaming ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Send className='h-3.5 w-3.5' />}
            </Button>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50',
          'h-12 w-12 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center',
          'transition-all duration-200 hover:scale-105 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
        aria-label={open ? 'Close AI chat' : 'Open AI chat'}>
        {open ? <X className='h-5 w-5' /> : <MessageSquare className='h-5 w-5' />}
      </button>
    </>
  )
}
