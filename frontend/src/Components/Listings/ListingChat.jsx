import axios from 'axios'
import { Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const BASE_URL = import.meta.env.VITE_BASE_URL

function ListingChat({ listingId, listingTitle }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, isAsking, isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)

    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const asked = question.trim()
    if (!asked || isAsking) return

    const history = messages
    setMessages([...history, { role: 'user', text: asked }])
    setQuestion('')
    setError('')
    setIsAsking(true)

    try {
      const response = await axios.post(
        `${BASE_URL}/listings/${listingId}/chat`,
        { message: asked, history },
        { withCredentials: true },
      )

      const reply = response.data?.data?.reply
      if (!response.data?.success || !reply) throw new Error(response.data?.message || 'Unable to answer that')

      setMessages((current) => [...current, { role: 'model', text: reply }])
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to answer that')
    } finally {
      setIsAsking(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed right-5 bottom-5 z-40 inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-ink px-5 py-3.5 text-[14.5px] font-medium text-[#F7F5EF] shadow-[0_20px_40px_-20px_rgba(21,19,15,.95)] transition-all hover:-translate-y-0.5 hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:right-8 sm:bottom-8"
      >
        <Sparkles aria-hidden className="size-4.5" />
        Ask about this listing
      </button>
    )
  }

  return (
    // A drawer on a laptop, a bottom sheet on a phone — the same panel, anchored where the thumb is.
    <aside
      aria-label="Listing assistant"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[82dvh] flex-col rounded-t-[26px] border border-ink/15 bg-card shadow-[0_-24px_60px_-30px_rgba(21,19,15,.5)] sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:w-[400px] sm:rounded-none sm:border-y-0 sm:border-r-0"
    >
      <header className="flex items-start justify-between gap-3 border-b border-ink/10 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-[16px] font-semibold tracking-[-.02em]">
            <Sparkles aria-hidden className="size-4 text-clay" />
            Listing assistant
          </p>
          <p className="mt-1 line-clamp-1 text-[12.5px] text-faint">{listingTitle}</p>
        </div>
        <button type="button" onClick={() => setIsOpen(false)} aria-label="Close assistant" className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-ink/15 text-ink-soft transition-colors hover:bg-ink/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
          <X aria-hidden className="size-4" />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-[14px] sm:p-5">
        {!messages.length && (
          <p className="rounded-2xl border border-dashed border-ink/20 bg-paper/60 p-4 leading-relaxed text-muted">
            Ask me anything about this place — rent, deposit, move-in costs, amenities, size or availability.
          </p>
        )}
        {messages.map((entry, index) => (
          <p
            key={index}
            className={entry.role === 'user'
              ? 'ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap text-[#F7F5EF]'
              : 'w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-paper/80 px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap text-ink-soft'}
          >
            {entry.text}
          </p>
        ))}
        {isAsking && <p className="text-[13px] text-faint">Thinking…</p>}
        {error && <p role="alert" className="text-[13px] text-clay">{error}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-ink/10 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] sm:p-5">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={500}
          placeholder="What is the total move-in cost?"
          className="min-w-0 flex-1 rounded-full border border-ink/20 bg-paper/60 px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-ink"
        />
        <button
          type="submit"
          disabled={isAsking || !question.trim()}
          aria-label="Send"
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-ink text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send aria-hidden className="size-4" />
        </button>
      </form>
    </aside>
  )
}

export default ListingChat
