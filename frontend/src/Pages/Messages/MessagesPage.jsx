import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import LandlordNavbar from '../../Components/Landlord/LandlordNavbar'
import MessageThread from '../../Components/Messages/MessageThread'
import UserNavbar from '../../Components/User/UserNavbar'
import { loginPathFor, useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const REFRESH_INTERVAL = 5 * 60 * 1000

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
  // Bumped by the refresh button and by the 5 minute timer; every fetch hangs off it.
  const [refreshToken, setRefreshToken] = useState(0)

  const Navbar = role === 'landlord' ? LandlordNavbar : UserNavbar

  const handleError = useCallback((requestError, fallback) => {
    if (!requestError) {
      setError('')
      return
    }

    if (requestError.response?.status === 401) {
      clearSession()
      navigate(loginPathFor(role), { replace: true })
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

    return () => {
      isCurrent = false
    }
  }, [handleError, refreshToken])

  useEffect(() => {
    const timer = setInterval(() => setRefreshToken((token) => token + 1), REFRESH_INTERVAL)

    return () => clearInterval(timer)
  }, [])

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), [])
  const activeConversation = conversations.find((conversation) => conversation.id === activeId)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Enquiries</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Messages</h1>
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

        {error && <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <div className="mt-8 grid gap-6 lg:grid-cols-[18rem_1fr]">
          <section className="h-fit rounded-xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Conversations</h2>
            {isLoadingList && <p className="px-4 py-5 text-sm text-slate-600">Loading conversations…</p>}
            {!isLoadingList && !conversations.length && (
              <p className="px-4 py-5 text-sm text-slate-600">
                {role === 'landlord' ? 'No tenant has contacted you yet.' : 'Open a listing and message the landlord to start.'}
              </p>
            )}
            <ul className="max-h-128 divide-y divide-slate-200 overflow-y-auto">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setSearchParams({ c: conversation.id }, { replace: true })}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 ${conversation.id === activeId ? 'bg-slate-100' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{conversation.counterpart?.name || 'Unknown'}</span>
                      {conversation.unreadCount > 0 && (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">{conversation.unreadCount}</span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{conversation.listing?.title || 'Listing removed'}</p>
                    <p className="mt-1 truncate text-xs text-slate-600">{conversation.lastMessage?.text || 'No messages yet'}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex min-h-112 flex-col rounded-xl border border-slate-200 bg-white">
            {activeId ? (
              <MessageThread
                key={activeId}
                threadUrl={`${BASE_URL}/messages/conversations/${activeId}`}
                title={activeConversation?.counterpart?.name || 'Conversation'}
                subtitle={activeConversation?.listing?.title || ''}
                verified={activeConversation?.counterpart?.emailVerified}
                refreshToken={refreshToken}
                onSent={refresh}
                onError={handleError}
              />
            ) : (
              <p className="m-auto px-4 text-sm text-slate-600">Select a conversation to read and reply.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default MessagesPage
