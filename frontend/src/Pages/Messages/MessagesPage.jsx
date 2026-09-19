import axios from 'axios'
import { ArrowUpRight, Inbox, LoaderCircle, MessageCircle, RefreshCw, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import LandlordNavbar from '../../Components/Landlord/LandlordNavbar'
import MessageThread from '../../Components/Messages/MessageThread'
import UserNavbar from '../../Components/User/UserNavbar'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const REFRESH_INTERVAL = 5 * 60 * 1000
const SHELL = 'mx-auto w-full max-w-[1360px] px-5 sm:px-10 lg:px-16'

function initialOf(value) {
  return value?.trim()?.[0]?.toUpperCase() || '?'
}

function when(value) {
  if (!value) return ''
  const elapsed = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(elapsed / 60000))
  if (minutes < 1) return 'Now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  if (hours < 48) return 'Yesterday'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(value))
}

function ConversationRow({ conversation, selected, onSelect }) {
  const hasUnread = conversation.unreadCount > 0
  const date = conversation.lastMessage?.sentAt || conversation.updatedAt

  return (
    <li className="px-2">
      <button
        type="button"
        onClick={onSelect}
        className={`group flex w-full cursor-pointer gap-3 rounded-2xl p-3.5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${selected ? 'bg-ink text-[#F7F5EF] shadow-[0_12px_26px_-20px_rgba(21,19,15,.95)]' : 'text-ink hover:bg-ink/5'}`}
      >
        {conversation.listing?.photo ? (
          <img src={conversation.listing.photo} alt="" className="size-11 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className={`grid size-11 shrink-0 place-items-center rounded-2xl font-display text-[15px] font-bold ${selected ? 'bg-lime text-ink' : 'bg-forest text-lime'}`}>{initialOf(conversation.counterpart?.name)}</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{conversation.counterpart?.name || 'Unknown'}</span>
            <span className={`shrink-0 text-[11px] ${selected ? 'text-[#F7F5EF]/60' : 'text-faint'}`}>{when(date)}</span>
          </span>
          <span className={`mt-0.5 block truncate text-[12px] ${selected ? 'text-lime/80' : 'text-muted'}`}>{conversation.listing?.title || 'Listing removed'}</span>
          <span className="mt-2 flex items-center gap-2">
            <span className={`min-w-0 flex-1 truncate text-[12.5px] ${selected ? 'text-[#F7F5EF]/70' : hasUnread ? 'font-medium text-ink-soft' : 'text-muted'}`}>{conversation.lastMessage?.text || 'No messages yet'}</span>
            {hasUnread && <span className={`grid min-w-5 shrink-0 place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${selected ? 'bg-lime text-ink' : 'bg-clay text-[#F7F5EF]'}`}>{conversation.unreadCount}</span>}
          </span>
        </span>
      </button>
    </li>
  )
}

function MessagesPage() {
  const { role, clearSession } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeId = searchParams.get('c') || ''
  const [conversations, setConversations] = useState([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState('')
  const [refreshedAt, setRefreshedAt] = useState(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [query, setQuery] = useState('')
  const [onlyUnread, setOnlyUnread] = useState(false)

  const Navbar = role === 'landlord' ? LandlordNavbar : UserNavbar
  const isUser = role === 'user'

  const handleError = useCallback((requestError, fallback) => {
    if (!requestError) {
      setError('')
      return
    }
    if (requestError.response?.status === 401) {
      clearSession()
      navigate(role === 'landlord' ? '/landlord/login' : '/user/login', { replace: true })
      return
    }
    setError(requestError.response?.data?.message || requestError.message || fallback)
  }, [clearSession, navigate, role])

  useEffect(() => {
    let isCurrent = true

    const loadConversations = async () => {
      setIsSyncing(true)
      try {
        const response = await axios.get(`${BASE_URL}/messages/conversations`, { withCredentials: true })
        if (!response.data?.success) throw new Error(response.data?.message || 'Unable to load conversations')
        if (!isCurrent) return

        setConversations(response.data.data.conversations)
        setRefreshedAt(new Date())
        handleError(null)
      } catch (requestError) {
        if (isCurrent) handleError(requestError, 'Unable to load conversations')
      } finally {
        if (isCurrent) {
          setIsLoadingList(false)
          setIsSyncing(false)
        }
      }
    }

    loadConversations()
    return () => { isCurrent = false }
  }, [handleError, refreshToken])

  useEffect(() => {
    const timer = setInterval(() => setRefreshToken((token) => token + 1), REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), [])
  const activeConversation = conversations.find((conversation) => conversation.id === activeId)
  const unreadCount = conversations.reduce((count, conversation) => count + conversation.unreadCount, 0)
  const filteredConversations = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()

    return conversations.filter((conversation) => {
      const searchable = [conversation.counterpart?.name, conversation.listing?.title, conversation.listing?.city, conversation.lastMessage?.text]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
      return (!onlyUnread || conversation.unreadCount > 0) && (!needle || searchable.includes(needle))
    })
  }, [conversations, onlyUnread, query])
  const markActiveRead = useCallback(() => {
    if (!activeId) return
    setConversations((current) => current.map((conversation) => (
      conversation.id === activeId && conversation.unreadCount ? { ...conversation, unreadCount: 0 } : conversation
    )))
  }, [activeId])
  const selectConversation = (conversationId) => setSearchParams({ c: conversationId }, { replace: true })
  const clearConversation = () => setSearchParams({}, { replace: true })

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-paper text-ink">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_74%_4%,rgba(207,240,74,.42),transparent_22rem),radial-gradient(ellipse_at_12%_15%,rgba(200,185,143,.24),transparent_18rem)]" />
      <Navbar />

      <main className={`${SHELL} relative pb-10 pt-9 lg:pb-14 lg:pt-12`}>
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[.17em] text-faint">{isUser ? 'Home enquiries' : 'Tenant enquiries'}</p>
            <h1 className="mt-3 font-display text-[37px] font-bold leading-[.98] tracking-[-.055em] sm:text-5xl">{isUser ? 'Your conversations.' : 'Your tenant inbox.'}</h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{isUser ? 'Keep the practical details, next questions, and viewing plans moving in one place.' : 'Keep every tenant conversation clear, timely, and tied to the right home.'}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-ink/15 bg-card/70 px-3.5 py-2 text-[12.5px] text-muted sm:inline-flex">{unreadCount ? `${unreadCount} unread` : 'All caught up'}</span>
            <button type="button" onClick={refresh} disabled={isSyncing} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/20 bg-card/80 px-4 py-2.5 text-[13px] font-medium transition-colors hover:border-ink/45 hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-progress disabled:opacity-60">
              {isSyncing ? <LoaderCircle aria-hidden className="size-3.5 animate-spin" /> : <RefreshCw aria-hidden className="size-3.5" />}
              {isSyncing ? 'Syncing' : 'Sync'}
            </button>
          </div>
        </header>

        {error && <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-clay/30 bg-clay/8 px-4 py-3.5 text-[13.5px] text-ink-soft"><span>{error}</span><button type="button" onClick={refresh} className="cursor-pointer font-medium text-clay underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">Try again</button></div>}

        <div className="mt-8 overflow-hidden rounded-[28px] border border-ink/15 bg-card/90 shadow-[0_30px_70px_-52px_rgba(21,19,15,.85)] lg:mt-10 lg:grid lg:h-[calc(100svh-218px)] lg:min-h-[620px] lg:grid-cols-[350px_minmax(0,1fr)]">
          <section aria-label="Conversation inbox" className={`${activeConversation ? 'hidden lg:flex' : 'flex'} min-h-[calc(100svh-210px)] flex-col border-r border-ink/12 bg-[#F8F6F0] lg:min-h-0`}>
            <div className="border-b border-ink/12 px-4 pb-4 pt-5 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <span><h2 className="font-display text-[22px] font-bold tracking-[-.04em]">Inbox</h2><p className="mt-1 text-[12px] text-muted">{refreshedAt ? `Synced ${refreshedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Finding your messages'}</p></span>
                <span className="grid size-9 place-items-center rounded-xl bg-lime text-ink"><Inbox aria-hidden className="size-[18px]" /></span>
              </div>

              <label className="mt-4 flex items-center gap-2 rounded-xl border border-ink/14 bg-card px-3 py-2.5 text-muted focus-within:border-ink/45" htmlFor="conversation-search">
                <Search aria-hidden className="size-4 shrink-0" />
                <input id="conversation-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint" />
                {query && <button type="button" onClick={() => setQuery('')} className="grid size-5 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-ink/7 hover:text-ink" aria-label="Clear search"><X aria-hidden className="size-3.5" /></button>}
              </label>

              <div className="mt-3 flex gap-1 rounded-xl bg-ink/5 p-1" role="group" aria-label="Conversation filter">
                <button type="button" onClick={() => setOnlyUnread(false)} className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${!onlyUnread ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>All <span className="ml-1 text-faint">{conversations.length}</span></button>
                <button type="button" onClick={() => setOnlyUnread(true)} className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${onlyUnread ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>Unread <span className="ml-1 text-faint">{unreadCount}</span></button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-2.5">
              {isLoadingList && <div aria-busy="true" className="grid gap-2 px-3 py-3">{[0, 1, 2, 3].map((row) => <span key={row} className="h-[76px] animate-pulse rounded-2xl bg-ink/6" />)}</div>}
              {!isLoadingList && !conversations.length && (
                <div className="grid place-items-center px-7 py-16 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-lime text-ink"><MessageCircle aria-hidden className="size-5" /></span><h3 className="mt-5 font-display text-xl font-bold tracking-[-.035em]">No conversations yet.</h3><p className="mt-2 text-[13.5px] leading-relaxed text-muted">{isUser ? 'When a home catches your eye, send the landlord a note and it will appear here.' : 'A tenant message will appear here as soon as someone gets in touch.'}</p>{isUser && <Link to="/user/listings" className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:text-clay hover:decoration-clay">Browse homes <ArrowUpRight aria-hidden className="size-3.5" /></Link>}</div>
              )}
              {!isLoadingList && conversations.length > 0 && !filteredConversations.length && (
                <div className="grid place-items-center px-7 py-16 text-center"><span className="grid size-11 place-items-center rounded-2xl bg-ink/5 text-muted"><Search aria-hidden className="size-4" /></span><p className="mt-4 font-medium text-[14px]">No conversations found.</p><button type="button" onClick={() => { setQuery(''); setOnlyUnread(false) }} className="mt-2 cursor-pointer text-[13px] text-muted underline underline-offset-4 hover:text-ink">Clear filters</button></div>
              )}
              {!isLoadingList && filteredConversations.length > 0 && <ul className="grid gap-1">{filteredConversations.map((conversation) => <ConversationRow key={conversation.id} conversation={conversation} selected={conversation.id === activeId} onSelect={() => selectConversation(conversation.id)} />)}</ul>}
            </div>
          </section>

          <section aria-label="Active conversation" className={`${activeConversation ? 'flex' : 'hidden lg:flex'} min-h-[calc(100svh-210px)] flex-col bg-card lg:min-h-0`}>
            {activeConversation ? (
              <MessageThread
                key={activeId}
                variant="inbox"
                threadUrl={`${BASE_URL}/messages/conversations/${activeId}`}
                title={activeConversation.counterpart?.name || 'Conversation'}
                subtitle={activeConversation.listing?.title || ''}
                listing={isUser ? activeConversation.listing : undefined}
                verified={activeConversation.counterpart?.emailVerified}
                refreshToken={refreshToken}
                onSent={refresh}
                onOpened={markActiveRead}
                onBack={clearConversation}
                onError={handleError}
              />
            ) : (
              <div className="m-auto grid max-w-sm place-items-center px-7 py-12 text-center">
                <span className="relative grid size-16 place-items-center rounded-[24px] bg-forest text-lime"><MessageCircle aria-hidden className="size-7" /><span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-card bg-clay" /></span>
                <h2 className="mt-6 font-display text-[28px] font-bold tracking-[-.045em]">Choose a conversation.</h2>
                <p className="mt-3 text-[14.5px] leading-relaxed text-muted">Every question, reply, and next step stays connected to the home you are considering.</p>
                {isUser && <Link to="/user/listings" className="mt-6 inline-flex items-center gap-2 rounded-full border border-ink/20 bg-card px-4 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-[#F7F5EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">Find a home to ask about <ArrowUpRight aria-hidden className="size-3.5" /></Link>}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default MessagesPage
