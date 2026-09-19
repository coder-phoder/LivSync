import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, MessageCircle, RefreshCw, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import BuddyCard from '../../Components/Buddy/BuddyCard'
import MessageThread from '../../Components/Messages/MessageThread'
import UserNavbar from '../../Components/User/UserNavbar'
import { since } from '../../Components/User/homeSignals'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const SHELL = 'mx-auto w-full max-w-[1240px] px-5 sm:px-10 lg:px-16'
const REFRESH_INTERVAL = 5 * 60 * 1000
const STACK = 3

const initialOf = (value) => value?.trim()?.[0]?.toUpperCase() || '?'
const firstNameOf = (value) => String(value || '').split(' ')[0]

function Monogram({ label, className = 'size-10 rounded-2xl bg-forest text-[15px] text-lime' }) {
  return <span aria-hidden className={`grid shrink-0 place-items-center font-semibold ${className}`}>{label}</span>
}

function SwipeButton({ icon: Icon, label, tone, onClick }) {
  const tones = {
    pass: 'border-clay/35 text-clay hover:border-clay hover:bg-clay hover:text-paper',
    like: 'border-forest/30 text-forest hover:border-forest hover:bg-forest hover:text-lime',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid size-15 cursor-pointer place-items-center rounded-full border-2 bg-card shadow-[0_16px_30px_-22px_rgba(21,19,15,.9)] transition-all hover:-translate-y-0.5 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:size-16 ${tones[tone]}`}
    >
      <Icon aria-hidden className="size-6.5" />
    </button>
  )
}

function Key({ children }) {
  return <kbd className="rounded-[5px] border border-ink/20 bg-card px-1.5 py-0.5 font-mono text-[10.5px] text-ink-soft">{children}</kbd>
}

// Both dead ends in Discover read the same: one sentence, one way forward.
function DeckNotice({ icon: Icon, tone, title, children, actions }) {
  return (
    <div className="w-full max-w-md rounded-[28px] border border-dashed border-ink/20 bg-card/70 p-8 text-center">
      <span className={`mx-auto grid size-12 place-items-center rounded-2xl ${tone}`}>
        <Icon aria-hidden className="size-5" />
      </span>
      <h2 className="mt-5 font-display text-[26px] leading-tight font-bold tracking-[-.035em] text-balance">{title}</h2>
      <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted">{children}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">{actions}</div>
    </div>
  )
}

function BuddyPage() {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'buddies' ? 'buddies' : 'discover'
  const activeId = searchParams.get('b') || ''

  const [deck, setDeck] = useState([])
  const [buddies, setBuddies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState(null)
  const [error, setError] = useState('')
  const [deckNotice, setDeckNotice] = useState('')
  const [match, setMatch] = useState(null)
  // Bumped by the refresh button, by the 5 minute timer and after a send; every fetch hangs off it.
  const [refreshToken, setRefreshToken] = useState(0)
  const cardRef = useRef(null)

  const handleError = useCallback((requestError, fallback) => {
    if (!requestError) {
      setError('')
      return
    }

    if (requestError.response?.status === 401) {
      clearSession()
      navigate('/user/login', { replace: true })
      return
    }

    setError(requestError.response?.data?.message || requestError.message || fallback)
  }, [clearSession, navigate])

  const loadBuddies = useCallback(async () => {
    const response = await axios.get(`${BASE_URL}/buddies`, { withCredentials: true })

    if (!response.data?.success) throw new Error(response.data?.message || 'Unable to load your buddies')

    setBuddies(response.data.data.buddies)
  }, [])

  useEffect(() => {
    let isCurrent = true

    const load = async () => {
      setIsSyncing(true)

      try {
        // A 409 here only means BuddyUp is switched off, so the buddy list still loads.
        const deckResponse = await axios.get(`${BASE_URL}/buddies/deck`, { withCredentials: true })
          .catch((requestError) => {
            if (requestError.response?.status !== 409) throw requestError

            if (isCurrent) setDeckNotice(requestError.response.data.message)

            return null
          })

        await loadBuddies()

        if (!isCurrent) return

        setDeck(deckResponse?.data?.data?.deck || [])
        if (deckResponse) setDeckNotice('')
        setRefreshedAt(new Date())
        handleError(null)
      } catch (requestError) {
        if (isCurrent) handleError(requestError, 'Unable to load BuddyUp')
      } finally {
        if (isCurrent) {
          setIsLoading(false)
          setIsSyncing(false)
        }
      }
    }

    load()

    return () => {
      isCurrent = false
    }
  }, [handleError, loadBuddies, refreshToken])

  useEffect(() => {
    const timer = setInterval(() => setRefreshToken((token) => token + 1), REFRESH_INTERVAL)

    return () => clearInterval(timer)
  }, [])

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), [])
  const openTab = useCallback((nextTab) => setSearchParams(nextTab === 'buddies' ? { tab: 'buddies' } : {}, { replace: true }), [setSearchParams])
  const openBuddy = (buddyId) => setSearchParams({ tab: 'buddies', b: buddyId }, { replace: true })

  // The card has already flown off by now, so the deck drops it first and the request follows.
  // A failed swipe puts the profile back on top rather than silently losing it.
  const swipe = async (profile, direction) => {
    setDeck((current) => current.filter((candidate) => candidate.id !== profile.id))

    try {
      const response = await axios.post(`${BASE_URL}/buddies/swipe`, { userId: profile.id, direction }, { withCredentials: true })

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to record your swipe')

      if (response.data.data.matched) {
        setMatch({ name: profile.name, buddyId: response.data.data.buddy?.id })
        await loadBuddies()
      }

      handleError(null)
    } catch (requestError) {
      setDeck((current) => [profile, ...current])
      handleError(requestError, 'Unable to record your swipe')
    }
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMatch(null)
        return
      }

      if (tab !== 'discover' || match || event.metaKey || event.ctrlKey) return

      if (event.key === 'ArrowLeft') cardRef.current?.fling(-1)
      if (event.key === 'ArrowRight') cardRef.current?.fling(1)
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tab, match])

  const activeBuddy = buddies.find((buddy) => buddy.id === activeId)
  const unreadTotal = buddies.reduce((total, buddy) => total + (buddy.unreadCount || 0), 0)

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper text-ink">
      <UserNavbar />

      <main className={`${SHELL} flex min-h-[calc(100dvh-4rem)] flex-col pb-8`}>
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 pt-7 sm:pt-9">
          <div>
            <p className="font-mono text-[11px] tracking-[.16em] text-faint uppercase">Find a flatmate</p>
            <h1 className="mt-2.5 font-display text-[32px] leading-none font-bold tracking-[-.04em] sm:text-[42px]">BuddyUp</h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-right text-[11.5px] leading-tight text-faint sm:block">
              {refreshedAt ? `Updated ${refreshedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : 'Syncing'}
              <br />auto every 5 min
            </p>
            <button
              type="button"
              onClick={refresh}
              disabled={isSyncing}
              aria-label="Refresh BuddyUp"
              title="Refresh BuddyUp"
              className="grid size-11 cursor-pointer place-items-center rounded-full border border-ink/15 bg-card text-ink transition-colors hover:border-ink/40 hover:bg-ink/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-progress disabled:opacity-60"
            >
              <RefreshCw aria-hidden className={`size-4.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-ink/12 bg-card p-1">
            {[['discover', 'Discover'], ['buddies', 'Your buddies']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => openTab(value)}
                aria-current={tab === value}
                className={`cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:px-5 ${tab === value ? 'bg-ink text-[#F7F5EF]' : 'text-ink-soft hover:text-ink'}`}
              >
                {label}
                {value === 'buddies' && buddies.length > 0 && (
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${unreadTotal ? 'bg-clay text-paper' : tab === value ? 'bg-paper/20' : 'bg-ink/8'}`}>
                    {unreadTotal || buddies.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          {tab === 'discover' && deck.length > 0 && (
            <p className="font-mono text-[11px] tracking-[.14em] text-faint uppercase">{deck.length} left</p>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-2xl border border-clay/30 bg-clay/8 px-5 py-3.5 text-[13.5px] text-clay">{error}</p>
        )}

        {isLoading && (
          <div className="mt-8 flex flex-1 justify-center" aria-busy="true" aria-label="Loading BuddyUp">
            <span className="h-full max-h-[34rem] w-full max-w-[25rem] animate-pulse rounded-[28px] bg-ink/7" />
          </div>
        )}

        {!isLoading && tab === 'discover' && (
          deck.length ? (
            <section className="flex flex-1 flex-col items-center pt-6 pb-2">
              <div className="relative min-h-[22rem] w-full max-w-[25rem] flex-1">
                {deck.slice(0, STACK).map((profile, index) => (
                  <BuddyCard
                    key={profile.id}
                    ref={index === 0 ? cardRef : undefined}
                    profile={profile}
                    depth={index}
                    isTop={index === 0}
                    onSwipe={(direction) => swipe(profile, direction)}
                  />
                ))}
              </div>

              <div className="mt-7 flex shrink-0 items-center justify-center gap-7">
                <SwipeButton icon={X} label="Pass" tone="pass" onClick={() => cardRef.current?.fling(-1)} />
                <SwipeButton icon={Heart} label="Buddy up" tone="like" onClick={() => cardRef.current?.fling(1)} />
              </div>

              <p className="mt-4 shrink-0 text-center text-[12px] text-faint">
                <span className="sm:hidden">Swipe left to pass · right to buddy up</span>
                <span className="hidden items-center justify-center gap-1.5 sm:inline-flex">
                  Drag the card, or press <Key>←</Key> <Key>→</Key>
                </span>
              </p>
            </section>
          ) : (
            <section className="flex flex-1 items-center justify-center py-10">
              {deckNotice ? (
                <DeckNotice
                  icon={SlidersHorizontal}
                  tone="bg-clay/12 text-clay"
                  title="BuddyUp is switched off."
                  actions={<Link to="/user/profile" className="rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">Open preferences</Link>}
                >
                  {deckNotice}. Your lifestyle answers are what the match score is built from.
                </DeckNotice>
              ) : (
                <DeckNotice
                  icon={Sparkles}
                  tone="bg-lime text-ink"
                  title="You are all caught up."
                  actions={(
                    <>
                      <button type="button" onClick={refresh} className="cursor-pointer rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                        Check again
                      </button>
                      <Link to="/user/profile" className="rounded-full border border-ink/20 px-5 py-3 text-[14px] font-medium text-ink-soft transition-colors hover:bg-ink/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                        Widen preferences
                      </Link>
                    </>
                  )}
                >
                  Everyone who fits your preferences has been reviewed. New tenants join every day — widen your budget or city to see more people.
                </DeckNotice>
              )}
            </section>
          )
        )}

        {!isLoading && tab === 'buddies' && (
          <div className="mt-6 grid min-h-0 flex-1 gap-5 lg:grid-cols-[20rem_1fr]">
            <section className={`${activeId ? 'hidden lg:flex' : 'flex'} max-h-[36rem] flex-col overflow-hidden rounded-3xl border border-ink/10 bg-card lg:max-h-none`}>
              <h2 className="border-b border-ink/10 px-5 py-4 font-mono text-[11px] tracking-[.16em] text-faint uppercase">
                Matches {buddies.length > 0 && `· ${buddies.length}`}
              </h2>

              {!buddies.length ? (
                <div className="m-auto px-6 py-10 text-center">
                  <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-ink/6"><Heart aria-hidden className="size-5 text-faint" /></span>
                  <p className="mt-4 text-[14px] leading-relaxed text-muted">No matches yet. Buddies appear here the moment someone likes you back.</p>
                  <button type="button" onClick={() => openTab('discover')} className="mt-5 cursor-pointer rounded-full bg-ink px-4.5 py-2.5 text-[13.5px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                    Start swiping
                  </button>
                </div>
              ) : (
                <ul className="flex-1 divide-y divide-ink/8 overflow-y-auto">
                  {buddies.map((buddy) => (
                    <li key={buddy.id}>
                      <button
                        type="button"
                        onClick={() => openBuddy(buddy.id)}
                        className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink/4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${buddy.id === activeId ? 'bg-ink/6' : ''}`}
                      >
                        <Monogram label={initialOf(buddy.peer?.name)} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[14.5px] font-semibold">{buddy.peer?.name || 'Buddy'}</span>
                            {buddy.unreadCount > 0 && (
                              <span className="shrink-0 rounded-full bg-clay px-1.5 py-0.5 text-[10.5px] font-semibold text-paper">{buddy.unreadCount}</span>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-[12.5px] text-muted">
                            {buddy.lastMessage?.text || `Matched ${since(buddy.matchedAt)}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={`${activeId ? 'flex' : 'hidden lg:flex'} min-h-[30rem] flex-col overflow-hidden rounded-3xl border border-ink/10 bg-card`}>
              {activeId ? (
                <MessageThread
                  key={activeId}
                  variant="inbox"
                  threadUrl={`${BASE_URL}/buddies/${activeId}`}
                  title={activeBuddy?.peer?.name || 'Buddy'}
                  subtitle={activeBuddy?.matchedAt ? `Matched ${since(activeBuddy.matchedAt)} · apply together and split the rent` : 'Agree on a place, then apply together'}
                  verified={activeBuddy?.peer?.emailVerified}
                  refreshToken={refreshToken}
                  onSent={refresh}
                  onOpened={loadBuddies}
                  onError={handleError}
                  onBack={() => openTab('buddies')}
                />
              ) : (
                <div className="m-auto max-w-xs p-8 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-ink/6"><MessageCircle aria-hidden className="size-5 text-ink-soft" /></span>
                  <h2 className="mt-4 font-display text-xl font-bold tracking-[-.03em]">Pick a buddy to chat.</h2>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                    Agree on a place and a cost split, then <Link to="/user/listings" className="font-medium text-ink underline underline-offset-2">apply together</Link>.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <AnimatePresence>
        {match && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="It is a match"
            onClick={() => setMatch(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 grid place-items-center bg-ink/75 p-5 backdrop-blur-sm"
          >
            <motion.div
              onClick={(event) => event.stopPropagation()}
              initial={{ scale: 0.9, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="relative w-full max-w-sm overflow-hidden rounded-[30px] border border-ink/10 bg-card p-8 text-center"
            >
              <span aria-hidden className="pointer-events-none absolute -top-16 left-1/2 size-56 -translate-x-1/2 rounded-full bg-lime/35 blur-2xl animate-pulse-ring" />

              <div className="relative flex items-center justify-center -space-x-3">
                <Monogram label="You" className="size-16 rotate-[-7deg] rounded-[22px] bg-ink text-[13px] text-[#F7F5EF]" />
                <Monogram label={initialOf(match.name)} className="size-16 rotate-[7deg] rounded-[22px] bg-lime text-[22px] text-forest" />
              </div>

              <p className="relative mt-6 font-mono text-[11px] tracking-[.18em] text-faint uppercase">It is a match</p>
              <h2 className="relative mt-2.5 font-display text-[30px] leading-[1.05] font-bold tracking-[-.04em] text-balance">
                You and {firstNameOf(match.name)} buddied up.
              </h2>
              <p className="relative mt-3 text-[14px] leading-relaxed text-muted">
                Say hello, agree on a place and a cost split, then apply for it together.
              </p>

              <div className="relative mt-7 grid gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMatch(null)
                    if (match.buddyId) openBuddy(match.buddyId)
                    else openTab('buddies')
                  }}
                  className="cursor-pointer rounded-full bg-forest px-5 py-3.5 text-[14.5px] font-medium text-lime transition-colors hover:bg-forest-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  Say hello
                </button>
                <button
                  type="button"
                  onClick={() => setMatch(null)}
                  className="cursor-pointer rounded-full border border-ink/15 px-5 py-3.5 text-[14.5px] font-medium text-ink-soft transition-colors hover:bg-ink/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  Keep swiping
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default BuddyPage
