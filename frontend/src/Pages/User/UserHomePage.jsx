import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import UserNavbar from '../../Components/User/UserNavbar'
import { buildSignals, since } from '../../Components/User/homeSignals'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const SHELL = 'mx-auto w-full max-w-[1240px] px-5 sm:px-10 lg:px-16'

// The queue is the page, so each strand is fetched alongside the others and a strand that fails
// simply contributes nothing — one dead endpoint must not blank the whole dashboard.
const STRANDS = [
  ['rentals', '/rentals', (data) => data.rentals],
  ['calls', '/calls', (data) => data.calls],
  ['conversations', '/messages/conversations', (data) => data.conversations],
  ['notifications', '/alerts/notifications', (data) => data.notifications],
  ['saved', '/saved-listings', (data) => data.savedListings],
]

const COUNT_WORDS = ['Nothing', 'One thing', 'Two things', 'Three things', 'Four things', 'Five things']

function greeting() {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function UserHomePage() {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const [state, setState] = useState({ loading: true, error: '', user: null, strands: {} })
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let isCurrent = true

    const load = async () => {
      setState((current) => ({ ...current, loading: true, error: '' }))

      try {
        const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, { withCredentials: true })
        const profile = profileResponse.data?.data?.user

        if (!profileResponse.data?.success || !profile) {
          throw new Error(profileResponse.data?.message || 'Unable to load your account')
        }

        const settled = await Promise.allSettled(
          STRANDS.map(([, path]) => axios.get(`${BASE_URL}${path}`, { withCredentials: true })),
        )

        if (!isCurrent) return

        const strands = {}
        STRANDS.forEach(([key, , pick], index) => {
          const result = settled[index]
          strands[key] = result.status === 'fulfilled' ? pick(result.value.data?.data || {}) || [] : []
        })

        setState({ loading: false, error: '', user: profile, strands })
      } catch (requestError) {
        if (!isCurrent) return

        if (requestError.response?.status === 401) {
          clearSession()
          navigate('/login', { replace: true })
          return
        }

        setState({
          loading: false,
          user: null,
          strands: {},
          error: requestError.response?.data?.message || requestError.message || 'Unable to load your account',
        })
      }
    }

    load()

    return () => {
      isCurrent = false
    }
  }, [clearSession, navigate, retryKey])

  const retry = useCallback(() => setRetryKey((key) => key + 1), [])

  const { loading, error, user, strands } = state
  const { needsYou, inMotion, fresh, counts } = buildSignals({ user, ...strands })
  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-paper text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[linear-gradient(to_right,rgba(21,19,15,.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(21,19,15,.055)_1px,transparent_1px)] bg-[size:74px_74px]"
        style={{ maskImage: 'radial-gradient(105% 62% at 22% 0%, #000 16%, transparent 76%)', WebkitMaskImage: 'radial-gradient(105% 62% at 22% 0%, #000 16%, transparent 76%)' }}
      />
      <UserNavbar />

      <main className={`${SHELL} relative pb-20 pt-10 lg:pt-14`}>
        {loading && (
          <div className="grid gap-4" aria-busy="true" aria-label="Loading your account">
            <span className="h-11 w-[60%] max-w-lg animate-pulse rounded-lg bg-ink/8" />
            <span className="h-5 w-[38%] max-w-sm animate-pulse rounded bg-ink/6" />
            <div className="mt-6 grid gap-3">
              {[0, 1, 2].map((row) => <span key={row} className="h-20 animate-pulse rounded-2xl bg-ink/6" />)}
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-xl rounded-2xl border border-clay/30 bg-clay/8 p-6">
            <h1 className="font-display text-2xl font-bold tracking-[-.03em]">We could not load your account</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{error}</p>
            <button type="button" onClick={retry} className="mt-5 cursor-pointer rounded-full bg-ink px-5 py-3 text-[14.5px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
              Try again
            </button>
          </div>
        )}

        {user && !loading && !error && (
          <>
            <header className="flex flex-wrap items-end justify-between gap-6">
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-[.16em] text-faint">{greeting()}, {firstName}</p>
                <h1 className="mt-4 max-w-[15em] font-display text-[34px] font-bold leading-[1.0] tracking-[-.04em] text-balance sm:text-5xl">
                  {needsYou.length
                    ? `${COUNT_WORDS[needsYou.length] || `${needsYou.length} things`} need${needsYou.length === 1 ? 's' : ''} you today.`
                    : 'Nothing needs you right now.'}
                </h1>
              </div>
              <Link
                to="/user/listings"
                className="inline-flex items-center gap-2.5 rounded-full bg-ink px-5.5 py-3.5 text-[15px] font-medium text-[#F7F5EF] shadow-[0_14px_30px_-18px_rgba(21,19,15,.9)] transition-all hover:-translate-y-0.5 hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Browse listings
              </Link>
            </header>

            <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
              <section aria-labelledby="needs-you">
                <h2 id="needs-you" className="font-mono text-[11px] uppercase tracking-[.16em] text-faint">Needs you</h2>

                {needsYou.length ? (
                  <ul className="mt-4 grid gap-2.5">
                    {needsYou.map((action) => (
                      <li key={action.id}>
                        <Link
                          to={action.to}
                          className="group flex items-center gap-4 rounded-2xl border border-ink/15 bg-card p-4.5 transition-all hover:-translate-y-px hover:border-ink/35 hover:shadow-[0_24px_44px_-32px_rgba(21,19,15,.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:p-5"
                        >
                          <span aria-hidden className="h-11 w-[3px] shrink-0 rounded-full bg-clay" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-[17px] font-semibold tracking-[-.02em] sm:text-lg">{action.title}</span>
                            <span className="mt-1 block text-[14px] leading-snug text-muted">{action.detail}</span>
                          </span>
                          <span className="shrink-0 rounded-full border border-ink/20 px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-[#F7F5EF]">
                            {action.cta}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-ink/25 bg-ink/3 p-7">
                    <p className="max-w-[34em] text-[15.5px] leading-relaxed text-muted">
                      Every application, viewing and message is up to date. This is the good state — go and find somewhere to live.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2.5">
                      {[
                        ['/user/listings', 'Search listings'],
                        ['/buddies', 'Find a roommate'],
                        ['/user/profile', 'Tune your preferences'],
                      ].map(([to, label]) => (
                        <Link key={to} to={to} className="rounded-full border border-ink/20 bg-card px-4 py-2.5 text-[14px] font-medium transition-colors hover:border-ink hover:bg-ink hover:text-[#F7F5EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {inMotion.length > 0 && (
                  <div className="mt-10">
                    <h2 className="font-mono text-[11px] uppercase tracking-[.16em] text-faint">With someone else</h2>
                    <ul className="mt-4 grid">
                      {inMotion.map((item, index) => (
                        <li key={item.id} className={`grid gap-1 border-t border-ink/15 py-4 ${index === inMotion.length - 1 ? 'border-b' : ''}`}>
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                            <span className="font-display text-[16.5px] font-semibold tracking-[-.02em]">{item.title}</span>
                            <span className="font-mono text-[11px] uppercase tracking-[.12em] text-forest">{item.state}</span>
                          </div>
                          <p className="text-[14px] leading-snug text-muted">{item.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <aside className="grid gap-8">
                <div className="rounded-2xl border border-ink/15 bg-card p-5">
                  <h2 className="font-mono text-[11px] uppercase tracking-[.16em] text-faint">Your search</h2>
                  <dl className="mt-3.5 grid">
                    {[
                      ['Saved listings', counts.saved, '/saved'],
                      ['Live applications', counts.applications, '/rentals'],
                      ['Unread messages', counts.unread, '/messages'],
                    ].map(([label, value, to], index) => (
                      <div key={label} className={`flex items-center justify-between gap-4 py-2.5 ${index ? 'border-t border-ink/12' : ''}`}>
                        <dt className="text-[14.5px] text-ink-soft">
                          <Link to={to} className="rounded transition-colors hover:text-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">{label}</Link>
                        </dt>
                        <dd className="font-display text-xl font-bold tracking-[-.03em] tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div>
                  <h2 className="font-mono text-[11px] uppercase tracking-[.16em] text-faint">New for you</h2>
                  {fresh.length ? (
                    <ul className="mt-4 grid gap-2.5">
                      {fresh.map((notification) => (
                        <li key={notification.id}>
                          <Link
                            to={`/listings/${notification.listing.id}`}
                            className="flex items-center gap-3.5 rounded-2xl border border-ink/15 bg-card p-3 transition-colors hover:border-ink/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                          >
                            {notification.listing.photo
                              ? <img src={notification.listing.photo} alt="" className="size-13 shrink-0 rounded-xl object-cover" />
                              : <span aria-hidden className="size-13 shrink-0 rounded-xl bg-[#E7E2D6]" />}
                            <span className="min-w-0">
                              <span className="block truncate font-display text-[15.5px] font-semibold tracking-[-.02em]">{notification.listing.title}</span>
                              <span className="mt-0.5 block text-[13px] text-muted">
                                {notification.listing.city}{notification.createdAt ? ` · ${since(notification.createdAt)}` : ''}
                              </span>
                            </span>
                            {!notification.readAt && <span aria-label="New" className="ml-auto size-2 shrink-0 rounded-full bg-clay" />}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 rounded-2xl border border-dashed border-ink/25 p-5 text-[14px] leading-snug text-muted">
                      Save a search and LivSync will post matching listings here as landlords publish them.{' '}
                      <Link to="/user/listings" className="font-medium text-ink underline underline-offset-2 hover:text-clay">Set an alert</Link>
                    </p>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default UserHomePage
