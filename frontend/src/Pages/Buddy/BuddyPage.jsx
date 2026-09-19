import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import BuddyCard from '../../Components/Buddy/BuddyCard'
import MessageThread from '../../Components/Messages/MessageThread'
import UserNavbar from '../../Components/User/UserNavbar'
import { loginPathFor, useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const REFRESH_INTERVAL = 5 * 60 * 1000

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
  const [isSwiping, setIsSwiping] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState(null)
  const [error, setError] = useState('')
  const [deckNotice, setDeckNotice] = useState('')
  const [matchedWith, setMatchedWith] = useState('')
  // Bumped by the refresh button, by the 5 minute timer and after a send; every fetch hangs off it.
  const [refreshToken, setRefreshToken] = useState(0)

  const handleError = useCallback((requestError, fallback) => {
    if (!requestError) {
      setError('')
      return
    }

    if (requestError.response?.status === 401) {
      clearSession()
      navigate(loginPathFor('user'), { replace: true })
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

  const swipe = async (profile, direction) => {
    setIsSwiping(true)
    setMatchedWith('')

    try {
      const response = await axios.post(`${BASE_URL}/buddies/swipe`, { userId: profile.id, direction }, { withCredentials: true })

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to record your swipe')

      setDeck((current) => current.filter((candidate) => candidate.id !== profile.id))

      if (response.data.data.matched) {
        setMatchedWith(profile.name)
        await loadBuddies()
      }

      handleError(null)
    } catch (requestError) {
      handleError(requestError, 'Unable to record your swipe')
    } finally {
      setIsSwiping(false)
    }
  }

  const openTab = (nextTab) => setSearchParams(nextTab === 'buddies' ? { tab: 'buddies' } : {}, { replace: true })
  const activeBuddy = buddies.find((buddy) => buddy.id === activeId)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <UserNavbar />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Find a flatmate</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">BuddyUp</h1>
          </div>
          <div className="text-right">
            <button
              type="button"
              onClick={refresh}
              disabled={isSyncing}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncing ? 'Refreshing…' : 'Refresh'}
            </button>
            <p className="mt-2 text-xs text-slate-500">
              {refreshedAt ? `Updated ${refreshedAt.toLocaleTimeString()} · auto every 5 min` : 'Auto refresh every 5 min'}
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Swipe on tenants whose preferences line up with yours. Buddy up with someone and you can chat, then apply for a listing together and split the costs.
        </p>

        <div className="mt-6 flex gap-2">
          {[['discover', 'Discover'], ['buddies', `Your buddies (${buddies.length})`]].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => openTab(value)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${tab === value ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {matchedWith && (
          <p className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            You and {matchedWith} buddied up.{' '}
            <button type="button" onClick={() => openTab('buddies')} className="font-semibold underline">Say hello</button>
          </p>
        )}
        {isLoading && <p className="mt-8 text-slate-600">Loading BuddyUp…</p>}

        {!isLoading && tab === 'discover' && (
          <div className="mt-6 max-w-2xl">
            {deckNotice && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                {deckNotice}.{' '}
                <Link to="/user/profile" className="font-semibold underline">Open your preferences</Link>
              </p>
            )}
            {!deckNotice && !deck.length && (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
                No one new to show right now. Check back once more tenants join BuddyUp, or{' '}
                <Link to="/user/profile" className="font-semibold underline">widen your preferences</Link>.
              </p>
            )}
            {deck[0] && <BuddyCard profile={deck[0]} onSwipe={(direction) => swipe(deck[0], direction)} isBusy={isSwiping} />}
            {deck.length > 1 && <p className="mt-3 text-center text-xs text-slate-500">{deck.length - 1} more to review</p>}
          </div>
        )}

        {!isLoading && tab === 'buddies' && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr]">
            <section className="h-fit rounded-xl border border-slate-200 bg-white">
              <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Matches</h2>
              {!buddies.length && <p className="px-4 py-5 text-sm text-slate-600">No matches yet. Keep swiping in Discover.</p>}
              <ul className="max-h-128 divide-y divide-slate-200 overflow-y-auto">
                {buddies.map((buddy) => (
                  <li key={buddy.id}>
                    <button
                      type="button"
                      onClick={() => setSearchParams({ tab: 'buddies', b: buddy.id }, { replace: true })}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-50 ${buddy.id === activeId ? 'bg-slate-100' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{buddy.peer.name}</span>
                        {buddy.unreadCount > 0 && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">{buddy.unreadCount}</span>}
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-600">{buddy.lastMessage?.text || 'No messages yet'}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex min-h-112 flex-col rounded-xl border border-slate-200 bg-white">
              {activeId ? (
                <MessageThread
                  key={activeId}
                  threadUrl={`${BASE_URL}/buddies/${activeId}`}
                  title={activeBuddy?.peer?.name || 'Buddy'}
                  subtitle="Agree on a place and a cost split, then apply from any listing"
                  verified={activeBuddy?.peer?.emailVerified}
                  refreshToken={refreshToken}
                  onSent={refresh}
                  onError={handleError}
                />
              ) : (
                <p className="m-auto px-4 text-center text-sm text-slate-600">
                  Pick a buddy to chat.{' '}
                  <Link to="/user/listings" className="font-semibold underline">Browse listings</Link> to apply together.
                </p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default BuddyPage
