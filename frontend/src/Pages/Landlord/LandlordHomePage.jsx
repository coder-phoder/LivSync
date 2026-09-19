import axios from 'axios'
import { ArrowUpRight, Building2, CalendarClock, CheckCircle2, FileSignature, Mail, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LandlordNavbar from '../../Components/Landlord/LandlordNavbar'
import { buildLandlordSignals } from '../../Components/Landlord/landlordHomeSignals'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const SHELL = 'mx-auto w-full max-w-[1240px] px-5 sm:px-10 lg:px-16'

// Each operational strand is independent. A slow inbox should never hide an application
// that needs a decision, but the profile itself remains the session gate.
const STRANDS = [
  ['listings', '/listings/mine', (data) => data.listings],
  ['rentals', '/rentals', (data) => data.rentals],
  ['calls', '/calls', (data) => data.calls],
  ['conversations', '/messages/conversations', (data) => data.conversations],
]

const TONE = {
  cyan: 'bg-landlord-cyan',
  amber: 'bg-landlord-amber',
  blue: 'bg-landlord-blue',
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function titleCase(value) {
  return String(value || '—').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function monthlyRent(listing) {
  const value = listing.totalMonthlyRent
    ?? (Number(listing.rent?.coldRent || 0) + Number(listing.rent?.utilities || 0) + Number(listing.rent?.otherMonthlyCharges || 0))
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

function queueHeading(count) {
  if (!count) return 'Your desk is clear.'
  if (count === 1) return 'One decision needs your attention.'
  return `${count} decisions need your attention.`
}

function LandlordHomePage() {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const [state, setState] = useState({ loading: true, error: '', landlord: null, strands: {} })
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let isCurrent = true

    const load = async () => {
      setState((current) => ({ ...current, loading: true, error: '' }))

      try {
        const profileRequest = axios.get(`${BASE_URL}/landlord/profile`, { withCredentials: true })
        const strandsRequest = Promise.allSettled(
          STRANDS.map(([, path]) => axios.get(`${BASE_URL}${path}`, { withCredentials: true })),
        )
        const [profileResult, settled] = await Promise.all([profileRequest, strandsRequest])
        const landlord = profileResult.data?.data?.landlord

        if (!profileResult.data?.success || !landlord) {
          throw new Error(profileResult.data?.message || 'Unable to load your account')
        }
        if (!isCurrent) return

        const strands = {}
        STRANDS.forEach(([key, , pick], index) => {
          const result = settled[index]
          strands[key] = result.status === 'fulfilled' ? pick(result.value.data?.data || {}) || [] : []
        })

        setState({ loading: false, error: '', landlord, strands })
      } catch (requestError) {
        if (!isCurrent) return

        if (requestError.response?.status === 401) {
          clearSession()
          navigate('/landlord/login', { replace: true })
          return
        }

        setState({
          loading: false,
          landlord: null,
          strands: {},
          error: requestError.response?.data?.message || requestError.message || 'Unable to load your account',
        })
      }
    }

    load()
    return () => { isCurrent = false }
  }, [clearSession, navigate, retryKey])

  const retry = useCallback(() => setRetryKey((key) => key + 1), [])
  const { loading, error, landlord, strands } = state
  const { needsYou, inMotion, counts, listings } = buildLandlordSignals({ landlord, ...strands })
  const firstName = landlord?.name?.split(' ')[0] || 'there'
  const businessRows = landlord && [
    ['Business', landlord.companyName || landlord.name],
    ['Account type', titleCase(landlord.businessType)],
    ['Contact', landlord.name],
    ['Email', landlord.email],
    ['Location', [landlord.city, landlord.address].filter(Boolean).join(' · ') || '—'],
    ['Property types', landlord.propertyTypes?.map(titleCase).join(', ') || '—'],
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-landlord-paper text-landlord-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[650px] bg-[linear-gradient(to_right,rgba(16,53,83,.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,53,83,.06)_1px,transparent_1px)] bg-[size:76px_76px]"
        style={{ maskImage: 'radial-gradient(100% 66% at 78% 0%, #000 14%, transparent 76%)', WebkitMaskImage: 'radial-gradient(100% 66% at 78% 0%, #000 14%, transparent 76%)' }}
      />
      <div aria-hidden className="pointer-events-none absolute right-[-9rem] top-8 size-[31rem] rounded-full bg-landlord-cyan/18 blur-3xl" />
      <LandlordNavbar />

      <main className={`${SHELL} relative pb-20 pt-10 lg:pt-14`}>
        {loading && (
          <div className="grid gap-4" aria-busy="true" aria-label="Loading your landlord workspace">
            <span className="h-11 w-[60%] max-w-lg animate-pulse rounded-lg bg-landlord-ink/8" />
            <span className="h-5 w-[38%] max-w-sm animate-pulse rounded bg-landlord-ink/6" />
            <div className="mt-6 grid gap-3"><span className="h-44 animate-pulse rounded-3xl bg-landlord-ink/6" /><span className="h-28 animate-pulse rounded-3xl bg-landlord-ink/6" /></div>
          </div>
        )}

        {error && !loading && (
          <div role="alert" className="max-w-xl rounded-3xl border border-landlord-alert/30 bg-landlord-card p-6 shadow-[0_20px_45px_-35px_rgba(16,53,83,.65)]">
            <h1 className="font-display text-2xl font-bold tracking-[-.03em]">We could not load your workspace</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-landlord-muted">{error}</p>
            <button type="button" onClick={retry} className="mt-5 cursor-pointer rounded-full bg-landlord-navy px-5 py-3 text-[14.5px] font-medium text-landlord-card transition-colors hover:bg-landlord-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy">Try again</button>
          </div>
        )}

        {landlord && !loading && !error && (
          <>
            <header className="flex flex-wrap items-end justify-between gap-6">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[.17em] text-landlord-faint">Portfolio desk · {landlord.city || 'LivSync'}</p>
                <h1 className="mt-4 max-w-[17em] font-display text-[35px] font-bold leading-[1] tracking-[-.05em] text-balance sm:text-5xl">{queueHeading(needsYou.length)}</h1>
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-landlord-muted">{greeting()}, {firstName}. Keep tenant decisions, viewings, and your active homes moving from one calm place.</p>
              </div>
              <Link to="/landlord/listings" className="inline-flex items-center gap-2 rounded-full bg-landlord-navy px-5.5 py-3.5 text-[15px] font-medium text-landlord-card shadow-[0_16px_30px_-18px_rgba(16,53,83,.95)] transition-all hover:-translate-y-0.5 hover:bg-landlord-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy">
                <Plus aria-hidden className="size-4" /> Add a listing
              </Link>
            </header>

            <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
              <section aria-labelledby="needs-attention">
                <h2 id="needs-attention" className="font-mono text-[11px] uppercase tracking-[.17em] text-landlord-faint">Needs attention</h2>

                {needsYou.length ? (
                  <ul className="mt-4 grid gap-2.5">
                    {needsYou.map((action) => (
                      <li key={action.id}>
                        <Link to={action.to} className="group flex items-center gap-4 rounded-2xl border border-landlord-ink/14 bg-landlord-card p-4.5 shadow-[0_18px_32px_-29px_rgba(16,53,83,.4)] transition-all hover:-translate-y-px hover:border-landlord-ink/35 hover:shadow-[0_24px_44px_-32px_rgba(16,53,83,.62)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy sm:p-5">
                          <span aria-hidden className={`h-11 w-[3px] shrink-0 rounded-full ${TONE[action.tone]}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-[17px] font-semibold tracking-[-.02em] sm:text-lg">{action.title}</span>
                            <span className="mt-1 block text-[14px] leading-snug text-landlord-muted">{action.detail}</span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-landlord-ink/20 px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors group-hover:border-landlord-navy group-hover:bg-landlord-navy group-hover:text-landlord-card">
                            {action.cta}<ArrowUpRight aria-hidden className="size-3.5" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-landlord-ink/25 bg-landlord-card/55 p-7">
                    <CheckCircle2 aria-hidden className="size-6 text-landlord-blue" />
                    <p className="mt-4 max-w-[34em] text-[15.5px] leading-relaxed text-landlord-muted">Every application, enquiry, and viewing is up to date. Your portfolio is in a good place.</p>
                    <Link to="/landlord/listings" className="mt-5 inline-flex items-center gap-2 rounded-full border border-landlord-ink/20 bg-landlord-card px-4 py-2.5 text-[14px] font-medium transition-colors hover:border-landlord-navy hover:bg-landlord-navy hover:text-landlord-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy">Manage listings <ArrowUpRight aria-hidden className="size-3.5" /></Link>
                  </div>
                )}

                {inMotion.length > 0 && (
                  <div className="mt-10">
                    <h2 className="font-mono text-[11px] uppercase tracking-[.17em] text-landlord-faint">In motion</h2>
                    <ul className="mt-4 grid">
                      {inMotion.map((item, index) => (
                        <li key={item.id} className={`grid gap-1 border-t border-landlord-ink/14 py-4 ${index === inMotion.length - 1 ? 'border-b' : ''}`}>
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><span className="font-display text-[16.5px] font-semibold tracking-[-.02em]">{item.title}</span><span className="font-mono text-[10.5px] uppercase tracking-[.13em] text-landlord-blue">{item.state}</span></div>
                          <p className="text-[14px] leading-snug text-landlord-muted">{item.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <aside className="grid gap-8">
                <section className="rounded-3xl border border-landlord-ink/14 bg-landlord-navy p-5 text-landlord-card shadow-[0_28px_48px_-36px_rgba(16,53,83,.9)]" aria-labelledby="portfolio-pulse">
                  <div className="flex items-center justify-between gap-4"><h2 id="portfolio-pulse" className="font-mono text-[10.5px] uppercase tracking-[.16em] text-landlord-cyan">Portfolio pulse</h2><Building2 aria-hidden className="size-4 text-landlord-cyan" /></div>
                  <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-landlord-card/15">
                    {[
                      ['Live listings', counts.published, '/landlord/listings'],
                      ['Applications', counts.pending, '/rentals'],
                      ['Unread notes', counts.unread, '/messages'],
                      ['Viewings set', counts.scheduled, '/calls'],
                    ].map(([label, value, to]) => (
                      <div key={label} className="bg-landlord-navy px-3.5 py-3.5"><dt className="text-[12px] text-landlord-card/62"><Link to={to} className="rounded hover:text-landlord-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-cyan">{label}</Link></dt><dd className="mt-1 font-display text-[25px] font-bold tracking-[-.04em] tabular-nums">{value}</dd></div>
                    ))}
                  </dl>
                </section>

                <section aria-labelledby="places">
                  <div className="flex items-center justify-between gap-4"><h2 id="places" className="font-mono text-[11px] uppercase tracking-[.17em] text-landlord-faint">Your places</h2><Link to="/landlord/listings" className="text-[13px] font-medium text-landlord-ink-soft underline decoration-landlord-ink/25 underline-offset-4 transition-colors hover:text-landlord-blue hover:decoration-landlord-blue">All listings</Link></div>
                  {listings.length ? (
                    <ul className="mt-4 grid gap-2.5">
                      {listings.map((listing) => (
                        <li key={listing._id}>
                          <Link to="/landlord/listings" className="group flex items-center gap-3.5 rounded-2xl border border-landlord-ink/14 bg-landlord-card p-3 transition-colors hover:border-landlord-ink/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy">
                            {listing.photos?.[0] ? <img src={listing.photos[0]} alt="" className="size-13 shrink-0 rounded-xl object-cover" /> : <span aria-hidden className="grid size-13 shrink-0 place-items-center rounded-xl bg-landlord-paper text-landlord-blue"><Building2 className="size-5" /></span>}
                            <span className="min-w-0 flex-1"><span className="block truncate font-display text-[15.5px] font-semibold tracking-[-.02em]">{listing.title}</span><span className="mt-0.5 block truncate text-[13px] text-landlord-muted">{listing.location?.city || 'Location pending'} · ₹{monthlyRent(listing)}/mo</span></span>
                            <span className={`size-2 shrink-0 rounded-full ${listing.status === 'published' ? 'bg-landlord-cyan' : 'bg-landlord-amber'}`} aria-label={listing.status === 'published' ? 'Published' : 'Rented'} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-landlord-ink/25 p-5"><p className="text-[14px] leading-snug text-landlord-muted">Publish your first place to start receiving tenant enquiries and viewing requests.</p><Link to="/landlord/listings" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-landlord-ink underline decoration-landlord-ink/25 underline-offset-4 hover:text-landlord-blue">Create a listing <ArrowUpRight aria-hidden className="size-3.5" /></Link></div>
                  )}
                </section>
              </aside>
            </div>

            <section id="profile" className="mt-12 border-t border-landlord-ink/14 pt-8" aria-labelledby="account-details">
              <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="font-mono text-[11px] uppercase tracking-[.17em] text-landlord-faint">Account</p><h2 id="account-details" className="mt-2 font-display text-[26px] font-bold tracking-[-.04em]">Business details</h2></div><span className="rounded-full border border-landlord-ink/15 bg-landlord-card/70 px-3 py-1.5 text-[12px] font-medium text-landlord-ink-soft">{titleCase(landlord.verificationStatus)} account</span></div>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-landlord-ink/14 bg-landlord-card p-4"><Mail aria-hidden className="size-4 text-landlord-blue" /><p className="mt-3 text-[13px] text-landlord-muted">Email trust</p><p className="mt-1 text-[14.5px] font-medium">{landlord.emailVerified ? 'Email verified' : 'Email verification pending'}</p>{!landlord.emailVerified && <Link to="/verify-email" className="mt-2 inline-block text-[13px] font-medium text-landlord-blue underline underline-offset-4">Verify now</Link>}</div>
                <div className="rounded-2xl border border-landlord-ink/14 bg-landlord-card p-4"><FileSignature aria-hidden className="size-4 text-landlord-blue" /><p className="mt-3 text-[13px] text-landlord-muted">Agreement signature</p><p className="mt-1 text-[14.5px] font-medium">{landlord.hasSignature ? 'Signature on file' : 'Signature not added'}</p><Link to="/landlord/signature" className="mt-2 inline-block text-[13px] font-medium text-landlord-blue underline underline-offset-4">{landlord.hasSignature ? 'Redraw signature' : 'Add signature'}</Link></div>
                <div className="rounded-2xl border border-landlord-ink/14 bg-landlord-card p-4"><CalendarClock aria-hidden className="size-4 text-landlord-blue" /><p className="mt-3 text-[13px] text-landlord-muted">Member since</p><p className="mt-1 text-[14.5px] font-medium">{landlord.createdAt ? new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(landlord.createdAt)) : 'Recently joined'}</p><p className="mt-2 text-[13px] text-landlord-muted">{landlord.phone}</p></div>
              </div>
              <dl className="mt-3 grid gap-x-8 gap-y-0 rounded-2xl border border-landlord-ink/14 bg-landlord-card px-5 sm:grid-cols-2">
                {businessRows.map(([label, value], index) => <div key={label} className={`py-4 ${index > 1 ? 'border-t border-landlord-ink/10' : ''}`}><dt className="text-[13px] text-landlord-muted">{label}</dt><dd className="mt-1 text-[14.5px] font-medium text-landlord-ink-soft">{value}</dd></div>)}
              </dl>
              {landlord.profileDescription && <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-landlord-muted">{landlord.profileDescription}</p>}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default LandlordHomePage
