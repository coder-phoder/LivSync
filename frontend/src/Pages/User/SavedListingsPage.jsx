import axios from 'axios'
import { ArrowUpRight, Bell, BellRing, Bookmark, Check, Clock3, Mail, MapPin, Pause, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ListingCard from '../../Components/Listings/ListingCard'
import UserNavbar from '../../Components/User/UserNavbar'
import { loginPathFor, useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const SHELL = 'mx-auto w-full max-w-[1240px] px-5 sm:px-10 lg:px-16'
const money = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const savedDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

function rentOf(listing) {
  return Number(listing?.totalMonthlyRent
    ?? (Number(listing?.rent?.coldRent || 0) + Number(listing?.rent?.utilities || 0) + Number(listing?.rent?.otherMonthlyCharges || 0)))
}

function alertDescription(criteria = {}) {
  const parts = [
    criteria.city,
    criteria.propertyType?.replaceAll('-', ' '),
    criteria.roomType?.replaceAll('-', ' '),
    criteria.minRent !== undefined && `from ₹${money.format(criteria.minRent)}`,
    criteria.maxRent !== undefined && `up to ₹${money.format(criteria.maxRent)}`,
    criteria.minBedrooms !== undefined && `${criteria.minBedrooms}+ bedrooms`,
    criteria.furnished !== undefined && (criteria.furnished ? 'furnished' : 'unfurnished'),
    criteria.verifiedLandlord && 'verified landlords',
  ].filter(Boolean)

  return parts.length ? parts.join(' · ') : 'All new listings'
}

function savedLabel(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? `Saved ${savedDate.format(date)}` : 'Saved home'
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink/12 bg-card/75 p-3.5 shadow-[0_12px_30px_-28px_rgba(21,19,15,.75)] sm:p-4">
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone}`}><Icon aria-hidden className="size-[18px]" /></span>
      <span><span className="block font-display text-xl font-bold leading-none tracking-[-.04em] tabular-nums">{value}</span><span className="mt-1 block text-[12.5px] text-muted">{label}</span></span>
    </div>
  )
}

function AlertSwitch({ active, disabled, onClick, icon: Icon, label }) {
  return (
    <button type="button" aria-pressed={active} disabled={disabled} onClick={onClick} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[12.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-progress disabled:opacity-60 ${active ? 'border-forest/25 bg-forest/7 text-forest' : 'border-ink/15 bg-card text-muted hover:border-ink/35 hover:text-ink'}`}>
      <Icon aria-hidden className="size-3.5" />{label}<span aria-hidden className={`ml-0.5 size-1.5 rounded-full ${active ? 'bg-forest' : 'bg-ink/25'}`} />
    </button>
  )
}

function SavedListingsPage() {
  const { clearSession } = useAuth()
  const navigate = useNavigate()
  const [savedListings, setSavedListings] = useState([])
  const [alerts, setAlerts] = useState([])
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [savedSort, setSavedSort] = useState('recent')
  const [retryKey, setRetryKey] = useState(0)

  const handleError = useCallback((requestError, fallback) => {
    if (requestError.response?.status === 401) {
      clearSession()
      navigate(loginPathFor('user'), { replace: true })
      return
    }
    setError(requestError.response?.data?.message || requestError.message || fallback)
  }, [clearSession, navigate])

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const [savedResponse, alertsResponse, notificationsResponse] = await Promise.all([
          axios.get(`${BASE_URL}/saved-listings`, { withCredentials: true }),
          axios.get(`${BASE_URL}/listing-alerts`, { withCredentials: true }),
          axios.get(`${BASE_URL}/listing-alerts/notifications`, { withCredentials: true }),
        ])
        if (!savedResponse.data?.success || !alertsResponse.data?.success || !notificationsResponse.data?.success) throw new Error('Unable to load your saved homes and alerts')
        if (isCurrent) {
          setSavedListings(savedResponse.data.data.savedListings || [])
          setAlerts(alertsResponse.data.data.alerts || [])
          setNotifications(notificationsResponse.data.data.notifications || [])
        }
      } catch (requestError) {
        if (isCurrent) handleError(requestError, 'Unable to load your saved homes and alerts')
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }
    load()
    return () => { isCurrent = false }
  }, [handleError, retryKey])

  const runAction = async (id, request, fallback, onSuccess) => {
    setBusyId(id)
    setError('')
    try {
      const response = await request()
      if (!response.data?.success) throw new Error(response.data?.message || fallback)
      onSuccess()
    } catch (requestError) {
      handleError(requestError, fallback)
    } finally {
      setBusyId('')
    }
  }

  const removeSavedListing = (listingId) => runAction(
    `saved-${listingId}`,
    () => axios.delete(`${BASE_URL}/saved-listings/${listingId}`, { withCredentials: true }),
    'Unable to remove saved home',
    () => setSavedListings((current) => current.filter((entry) => entry.listing?._id !== listingId)),
  )
  const updateAlert = (alertId, changes) => runAction(
    `alert-${alertId}`,
    () => axios.patch(`${BASE_URL}/listing-alerts/${alertId}`, changes, { withCredentials: true }),
    'Unable to update listing alert',
    () => setAlerts((current) => current.map((alert) => (alert.id === alertId ? { ...alert, ...changes } : alert))),
  )
  const removeAlert = (alertId) => runAction(
    `alert-${alertId}`,
    () => axios.delete(`${BASE_URL}/listing-alerts/${alertId}`, { withCredentials: true }),
    'Unable to delete listing alert',
    () => setAlerts((current) => current.filter((alert) => alert.id !== alertId)),
  )
  const markRead = (notificationId) => runAction(
    `notification-${notificationId}`,
    () => axios.patch(`${BASE_URL}/listing-alerts/notifications/${notificationId}/read`, {}, { withCredentials: true }),
    'Unable to mark notification as read',
    () => setNotifications((current) => current.map((notification) => (notification.id === notificationId ? { ...notification, readAt: new Date().toISOString() } : notification))),
  )

  const orderedSavedListings = useMemo(() => [...savedListings].sort((first, second) => {
    if (savedSort === 'rent-low') return rentOf(first.listing) - rentOf(second.listing)
    if (savedSort === 'rent-high') return rentOf(second.listing) - rentOf(first.listing)
    return new Date(second.savedAt || 0) - new Date(first.savedAt || 0)
  }), [savedListings, savedSort])
  const unreadMatches = notifications.filter((notification) => !notification.readAt).length
  const activeAlerts = alerts.filter((alert) => alert.active !== false).length

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-paper text-ink">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_84%_7%,rgba(207,240,74,.44),transparent_18rem),radial-gradient(circle_at_17%_24%,rgba(200,185,143,.22),transparent_19rem),linear-gradient(to_right,rgba(21,19,15,.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(21,19,15,.045)_1px,transparent_1px)] bg-[size:auto,auto,74px_74px,74px_74px]" style={{ maskImage: 'linear-gradient(to bottom, #000 0%, rgba(0,0,0,.72) 48%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, rgba(0,0,0,.72) 48%, transparent 100%)' }} />
      <UserNavbar />

      <main className={`${SHELL} relative pb-20 pt-10 lg:pt-14`}>
        {isLoading && (
          <div aria-busy="true" aria-label="Loading your saved homes" className="grid gap-8">
            <div className="grid gap-4"><span className="h-3 w-28 animate-pulse rounded bg-ink/8" /><span className="h-12 w-full max-w-xl animate-pulse rounded-xl bg-ink/8" /><span className="h-5 w-full max-w-md animate-pulse rounded bg-ink/6" /></div>
            <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((card) => <span key={card} className="h-[76px] animate-pulse rounded-2xl bg-ink/6" />)}</div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="grid gap-5 sm:grid-cols-2">{[0, 1, 2, 3].map((card) => <span key={card} className="h-[340px] animate-pulse rounded-2xl bg-ink/6" />)}</div><div className="h-[420px] animate-pulse rounded-2xl bg-ink/6" /></div>
          </div>
        )}

        {!isLoading && error && (
          <section role="alert" className="max-w-xl rounded-2xl border border-clay/30 bg-clay/8 p-6">
            <p className="font-mono text-[11px] uppercase tracking-[.16em] text-clay">Saved space unavailable</p><h1 className="mt-3 font-display text-2xl font-bold tracking-[-.035em]">We could not load your saved space.</h1><p className="mt-2 text-[15px] leading-relaxed text-muted">{error}</p>
            <button type="button" onClick={() => setRetryKey((current) => current + 1)} className="mt-5 cursor-pointer rounded-full bg-ink px-5 py-3 text-[14.5px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">Try again</button>
          </section>
        )}

        {!isLoading && !error && (
          <>
            <header className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end">
              <div><p className="font-mono text-[11px] uppercase tracking-[.17em] text-faint">Your saved space</p><h1 className="mt-4 max-w-[13ch] font-display text-[38px] font-bold leading-[.98] tracking-[-.055em] text-balance sm:text-5xl lg:text-[58px]">A shortlist worth coming back to.</h1><p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-muted">Keep the homes you love close, let your searches keep working, and catch every promising new match in one calm place.</p></div>
              <a href="#new-matches" className="group rounded-2xl border border-forest/20 bg-forest p-5 text-[#F7F5EF] shadow-[0_25px_50px_-32px_rgba(19,50,42,.9)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"><span className="flex items-center justify-between gap-4"><span className="grid size-10 place-items-center rounded-xl bg-lime text-ink"><BellRing aria-hidden className="size-5" /></span><ArrowUpRight aria-hidden className="size-5 text-lime transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span><p className="mt-5 font-display text-[22px] font-bold leading-tight tracking-[-.035em]">{unreadMatches ? `${unreadMatches} new ${unreadMatches === 1 ? 'match' : 'matches'} waiting` : 'Your match inbox is clear'}</p><p className="mt-1.5 text-[13.5px] leading-relaxed text-[#F7F5EF]/70">{unreadMatches ? 'See what your saved searches found.' : 'New homes from your alerts will appear here.'}</p></a>
            </header>

            <section aria-label="Shortlist overview" className="mt-9 grid gap-3 sm:grid-cols-3">
              <Stat icon={Bookmark} value={savedListings.length} label={savedListings.length === 1 ? 'home saved' : 'homes saved'} tone="bg-lime text-ink" />
              <Stat icon={Bell} value={activeAlerts} label={activeAlerts === 1 ? 'active alert' : 'active alerts'} tone="bg-forest text-lime" />
              <Stat icon={BellRing} value={unreadMatches} label={unreadMatches === 1 ? 'new match' : 'new matches'} tone="bg-clay text-[#F7F5EF]" />
            </section>

            <div className="mt-11 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
              <section aria-labelledby="saved-homes-heading">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-4"><div><p className="font-mono text-[11px] uppercase tracking-[.16em] text-faint">Collection</p><h2 id="saved-homes-heading" className="mt-2 font-display text-[28px] font-bold tracking-[-.04em]">Saved homes</h2></div>{savedListings.length > 1 && <label className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-card/75 py-1.5 pl-3.5 pr-2 text-[12px] text-muted focus-within:border-ink/45" htmlFor="saved-sort">Sort by<select id="saved-sort" value={savedSort} onChange={(event) => setSavedSort(event.target.value)} className="cursor-pointer appearance-none bg-transparent pr-2 text-[12.5px] font-medium text-ink outline-none"><option value="recent">Recently saved</option><option value="rent-low">Rent: low to high</option><option value="rent-high">Rent: high to low</option></select></label>}</div>
                {!savedListings.length ? (
                  <div className="mt-5 grid min-h-[342px] place-items-center rounded-2xl border border-dashed border-ink/25 bg-card/55 p-7 text-center"><div className="max-w-sm"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-lime text-ink"><Bookmark aria-hidden className="size-5" /></span><h3 className="mt-5 font-display text-2xl font-bold tracking-[-.035em]">Your shortlist starts here.</h3><p className="mt-3 text-[14.5px] leading-relaxed text-muted">Save the places that make you pause. We will keep them handy while you compare your options.</p><Link to="/user/listings" className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"><Search aria-hidden className="size-4" />Explore listings</Link></div></div>
                ) : (
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">{orderedSavedListings.map((entry) => <ListingCard key={entry.id} listing={entry.listing} to={`/listings/${entry.listing._id}`} saved onSaveToggle={() => removeSavedListing(entry.listing._id)} isSaving={busyId === `saved-${entry.listing._id}`} footer={<span className="flex w-full items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-[12px] text-muted"><Clock3 aria-hidden className="size-3.5" />{savedLabel(entry.savedAt)}</span><Link to={`/listings/${entry.listing._id}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-ink transition-colors hover:text-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">Details <ArrowUpRight aria-hidden className="size-3.5" /></Link></span>} />)}</div>
                )}
              </section>

              <aside className="grid gap-5">
                <section aria-labelledby="alerts-heading" className="overflow-hidden rounded-2xl border border-ink/15 bg-card/85 shadow-[0_22px_48px_-40px_rgba(21,19,15,.75)]">
                  <div className="border-b border-ink/12 px-5 pb-4 pt-5"><span className="flex items-start justify-between gap-4"><span><p className="font-mono text-[10.5px] uppercase tracking-[.15em] text-faint">Saved searches</p><h2 id="alerts-heading" className="mt-2 font-display text-[22px] font-bold tracking-[-.035em]">Your alerts</h2></span><span className="grid size-9 place-items-center rounded-xl bg-forest text-lime"><Bell aria-hidden className="size-[18px]" /></span></span><p className="mt-3 text-[13.5px] leading-relaxed text-muted">Fine-tune how each search keeps you in the loop.</p></div>
                  {!alerts.length ? (
                    <div className="p-5"><div className="rounded-xl bg-ink/4 p-4"><p className="font-medium text-[14px]">No alerts running yet.</p><p className="mt-1.5 text-[13px] leading-relaxed text-muted">Set your filters while browsing and we will watch for the right fit.</p></div><Link to="/user/listings" className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:text-clay hover:decoration-clay">Create an alert <ArrowUpRight aria-hidden className="size-3.5" /></Link></div>
                  ) : <ul className="divide-y divide-ink/10">{alerts.map((alert) => {
                    const alertBusy = busyId === `alert-${alert.id}`
                    const isActive = alert.active !== false
                    return <li key={alert.id} className={`p-5 transition-opacity ${isActive ? '' : 'opacity-60'}`}><div className="flex items-start justify-between gap-3"><p className="min-w-0 text-[14px] font-medium leading-relaxed capitalize text-ink">{alertDescription(alert.criteria)}</p><button type="button" disabled={alertBusy} onClick={() => updateAlert(alert.id, { active: !isActive })} className="shrink-0 rounded-full border border-ink/15 p-2 text-muted transition-colors hover:border-ink/40 hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-progress" aria-label={isActive ? 'Pause alert' : 'Resume alert'} title={isActive ? 'Pause alert' : 'Resume alert'}>{isActive ? <Pause aria-hidden className="size-3.5" /> : <Check aria-hidden className="size-3.5" />}</button></div><div className="mt-3 flex flex-wrap gap-2"><AlertSwitch active={isActive && alert.inAppEnabled} disabled={alertBusy} onClick={() => updateAlert(alert.id, { inAppEnabled: !alert.inAppEnabled })} icon={Bell} label="In-app" /><AlertSwitch active={isActive && alert.emailEnabled} disabled={alertBusy} onClick={() => updateAlert(alert.id, { emailEnabled: !alert.emailEnabled })} icon={Mail} label="Email" /></div><div className="mt-4 flex items-center justify-between gap-3"><span className="text-[11.5px] text-muted">{isActive ? 'Watching for a match' : 'Alert paused'}</span><button type="button" disabled={alertBusy} onClick={() => removeAlert(alert.id)} className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-muted transition-colors hover:text-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-progress" aria-label="Delete alert"><Trash2 aria-hidden className="size-3.5" /> Delete</button></div></li>
                  })}</ul>}
                  <p className="border-t border-ink/10 px-5 py-3.5 text-[11.5px] leading-relaxed text-faint">Email alerts are delivered after your email address has been verified.</p>
                </section>

                <section id="new-matches" aria-labelledby="matches-heading" className="scroll-mt-24 overflow-hidden rounded-2xl border border-ink/15 bg-card/85 shadow-[0_22px_48px_-40px_rgba(21,19,15,.75)]">
                  <div className="flex items-center justify-between gap-4 border-b border-ink/12 px-5 py-5"><span><p className="font-mono text-[10.5px] uppercase tracking-[.15em] text-faint">Match inbox</p><h2 id="matches-heading" className="mt-2 font-display text-[22px] font-bold tracking-[-.035em]">Fresh finds</h2></span>{unreadMatches > 0 && <span className="rounded-full bg-clay px-2.5 py-1 font-mono text-[10px] font-medium tracking-[.08em] text-[#F7F5EF]">{unreadMatches} NEW</span>}</div>
                  {!notifications.length ? (
                    <div className="p-5"><div className="grid place-items-center rounded-xl bg-ink/4 px-5 py-8 text-center"><span className="grid size-10 place-items-center rounded-xl bg-card text-forest"><Mail aria-hidden className="size-[18px]" /></span><p className="mt-4 font-medium text-[14px]">Nothing new just yet.</p><p className="mt-1 text-[13px] leading-relaxed text-muted">When an alert spots a home, its details will land here.</p></div></div>
                  ) : <ul className="divide-y divide-ink/10">{notifications.map((notification) => <li key={notification.id} className={`p-4.5 ${notification.readAt ? '' : 'bg-lime/10'}`}><div className="flex gap-3">{notification.listing?.photo ? <img src={notification.listing.photo} alt="" className="size-12 shrink-0 rounded-xl object-cover" /> : <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-forest/8 text-forest"><MapPin aria-hidden className="size-4" /></span>}<div className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><p className="text-[13.5px] font-medium leading-snug text-ink">{notification.title}</p>{!notification.readAt && <span aria-label="Unread" className="mt-1 size-1.5 shrink-0 rounded-full bg-clay" />}</span><p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{notification.message}</p><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">{notification.listing && <Link to={`/listings/${notification.listing.id}`} className="text-[12.5px] font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:text-clay hover:decoration-clay">View home</Link>}{!notification.readAt && <button type="button" disabled={busyId === `notification-${notification.id}`} onClick={() => markRead(notification.id)} className="inline-flex cursor-pointer items-center gap-1 text-[12.5px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-progress"><Check aria-hidden className="size-3.5" /> Mark read</button>}</div></div></div></li>)}</ul>}
                </section>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default SavedListingsPage
