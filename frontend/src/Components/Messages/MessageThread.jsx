import axios from 'axios'
import { ArrowLeft, ArrowUpRight, CheckCheck, SendHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import VerifiedBadge from '../Common/VerifiedBadge'

function formatTime(value) {
  return value ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : ''
}

function dayKey(value) {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function dayLabel(value) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (dayKey(date) === dayKey(today)) return 'Today'
  if (dayKey(date) === dayKey(yesterday)) return 'Yesterday'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function initialOf(value) {
  return value?.trim()?.[0]?.toUpperCase() || '?'
}

// Mounted with key={threadUrl}, so switching threads remounts with clean state. The compact
// default keeps BuddyUp intact; the inbox variant gives the property-message page its own rhythm.
function MessageThread({
  threadUrl,
  title,
  subtitle,
  verified,
  refreshToken,
  onSent,
  onError,
  onOpened,
  listing,
  onBack,
  variant = 'standard',
}) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const cursorRef = useRef('')
  const endRef = useRef(null)
  const draftRef = useRef(null)
  const isInbox = variant === 'inbox'

  useEffect(() => {
    let isCurrent = true

    const load = async () => {
      try {
        const cursor = cursorRef.current
        const response = await axios.get(`${threadUrl}/messages`, {
          params: cursor ? { after: cursor } : {},
          withCredentials: true,
        })

        if (!response.data?.success) throw new Error(response.data?.message || 'Unable to load messages')
        if (!isCurrent) return

        const loaded = response.data.data.messages
        setMessages((current) => {
          const next = cursor ? [...current, ...loaded] : loaded
          cursorRef.current = next.length ? next[next.length - 1].id : ''
          return next
        })

        if (!cursor) onOpened?.()
        onError('')
      } catch (requestError) {
        if (isCurrent) onError(requestError, 'Unable to load messages')
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    load()

    return () => { isCurrent = false }
  }, [threadUrl, refreshToken, onError, onOpened])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages])

  const handleSend = async (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return

    setIsSending(true)

    try {
      const response = await axios.post(`${threadUrl}/messages`, { text }, { withCredentials: true })
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to send message')

      const sent = response.data.data.message
      cursorRef.current = sent.id
      setMessages((current) => [...current, sent])
      setDraft('')
      onError('')
      onSent?.()
    } catch (requestError) {
      onError(requestError, 'Unable to send message')
    } finally {
      setIsSending(false)
    }
  }

  const setStarter = (message) => {
    setDraft(message)
    requestAnimationFrame(() => draftRef.current?.focus())
  }

  const onComposerKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') handleSend(event)
  }

  const headerClass = isInbox
    ? 'flex items-center gap-3 border-b border-ink/12 bg-card/70 px-4 py-4 sm:px-6'
    : 'border-b border-slate-200 px-5 py-3'
  const threadClass = isInbox
    ? 'flex-1 overflow-y-auto bg-[linear-gradient(to_bottom,rgba(21,19,15,.025)_1px,transparent_1px)] bg-[size:100%_34px] px-4 py-6 sm:px-7'
    : 'flex-1 space-y-3 overflow-y-auto px-5 py-4'
  const composerClass = isInbox
    ? 'border-t border-ink/12 bg-card/85 px-4 py-4 sm:px-6 sm:py-5'
    : 'flex items-end gap-3 border-t border-slate-200 px-5 py-4'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className={headerClass}>
        {isInbox && onBack && (
          <button type="button" onClick={onBack} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-ink/15 text-ink transition-colors hover:bg-ink/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:hidden" aria-label="Back to conversations">
            <ArrowLeft aria-hidden className="size-4" />
          </button>
        )}
        {isInbox ? (
          <>
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-forest text-[15px] font-semibold text-lime">{initialOf(title)}</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate font-display text-[17px] font-bold tracking-[-.025em]">{title}</span>
                <VerifiedBadge verified={verified} label="Verified" size="xs" />
              </span>
              <span className="mt-0.5 block truncate text-[12.5px] text-muted">{subtitle || 'Property conversation'}</span>
            </span>
            {listing?.id && (
              <Link to={`/listings/${listing.id}`} className="hidden shrink-0 items-center gap-1.5 rounded-full border border-ink/15 bg-card px-3.5 py-2 text-[12.5px] font-medium text-ink transition-colors hover:border-ink/45 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:inline-flex">
                Listing <ArrowUpRight aria-hidden className="size-3.5" />
              </Link>
            )}
          </>
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              {title}
              <VerifiedBadge verified={verified} label="Verified" size="xs" />
            </p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </>
        )}
      </header>

      <div className={threadClass}>
        {isLoading && (isInbox ? (
          <div aria-busy="true" className="mx-auto grid max-w-2xl gap-3">
            <span className="h-14 w-3/5 animate-pulse rounded-2xl bg-ink/7" />
            <span className="ml-auto h-20 w-1/2 animate-pulse rounded-2xl bg-forest/12" />
            <span className="h-12 w-2/5 animate-pulse rounded-2xl bg-ink/7" />
          </div>
        ) : <p className="text-sm text-slate-600">Loading messages…</p>)}

        {!isLoading && !messages.length && (isInbox ? (
          <div className="mx-auto grid max-w-md place-items-center py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-lime text-ink"><SendHorizontal aria-hidden className="size-5" /></span>
            <h2 className="mt-5 font-display text-2xl font-bold tracking-[-.04em]">Start a useful conversation.</h2>
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted">A clear first question gets you closer to a viewing. Try one of these, or write your own.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {['Is this still available?', 'Could I schedule a viewing?', 'What is the move-in date?'].map((starter) => (
                <button key={starter} type="button" onClick={() => setStarter(starter)} className="cursor-pointer rounded-full border border-ink/15 bg-card px-3.5 py-2 text-[12.5px] text-ink-soft transition-colors hover:border-ink/40 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">{starter}</button>
              ))}
            </div>
          </div>
        ) : <p className="text-sm text-slate-600">No messages yet. Say hello.</p>)}

        {!isLoading && messages.length > 0 && (
          <div className={isInbox ? 'mx-auto max-w-2xl space-y-4' : 'space-y-3'}>
            {messages.map((message, index) => {
              const showDay = isInbox && (!index || dayKey(message.createdAt) !== dayKey(messages[index - 1].createdAt))
              return (
                <div key={message.id}>
                  {showDay && <p className="mb-4 text-center font-mono text-[10px] uppercase tracking-[.14em] text-faint"><span className="bg-card px-3">{dayLabel(message.createdAt)}</span></p>}
                  <div className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={isInbox
                      ? `max-w-[86%] rounded-[18px] px-4 py-3 sm:max-w-[76%] ${message.mine ? 'rounded-br-md bg-forest text-[#F7F5EF]' : 'rounded-bl-md border border-ink/10 bg-card text-ink shadow-[0_8px_20px_-18px_rgba(21,19,15,.65)]'}`
                      : `max-w-[80%] rounded-xl px-4 py-2 text-sm ${message.mine ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}
                    >
                      <p className={`whitespace-pre-wrap ${isInbox ? 'text-[14px] leading-relaxed' : ''}`}>{message.text}</p>
                      <p className={`mt-1.5 flex items-center gap-1 text-[10.5px] ${isInbox ? (message.mine ? 'text-[#F7F5EF]/60' : 'text-faint') : (message.mine ? 'text-slate-300' : 'text-slate-500')}`}>
                        {formatTime(message.createdAt)}
                        {isInbox && message.mine && <CheckCheck aria-hidden className="size-3" />}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className={composerClass}>
        {isInbox ? (
          <div className="mx-auto max-w-2xl">
            <div className="flex items-end gap-3 rounded-2xl border border-ink/15 bg-card p-2.5 shadow-[0_14px_30px_-24px_rgba(21,19,15,.65)] focus-within:border-ink/45">
              <textarea ref={draftRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onComposerKeyDown} rows={2} maxLength={2000} placeholder="Write a message…" className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-faint" />
              <button type="submit" disabled={isSending || !draft.trim()} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl bg-ink text-[#F7F5EF] transition-all hover:-translate-y-px hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-45" aria-label={isSending ? 'Sending message' : 'Send message'} title={isSending ? 'Sending message' : 'Send message'}>
                <SendHorizontal aria-hidden className="size-[17px]" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-faint">Press Ctrl + Enter to send · Keep messages focused on the home.</p>
          </div>
        ) : (
          <>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} maxLength={2000} placeholder="Write a message…" className="flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none" />
            <button type="submit" disabled={isSending || !draft.trim()} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{isSending ? 'Sending…' : 'Send'}</button>
          </>
        )}
      </form>
    </div>
  )
}

export default MessageThread
