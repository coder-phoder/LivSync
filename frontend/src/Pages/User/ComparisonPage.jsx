import axios from 'axios'
import { ArrowLeft, ArrowUpRight, MapPin, Scale, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import UserNavbar from '../../Components/User/UserNavbar'
import { useComparison } from '../../Context/ComparisonContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const SHELL = 'mx-auto w-full max-w-[1240px] px-5 sm:px-10 lg:px-16'
const money = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function rentOf(listing) {
  return Number(listing.totalMonthlyRent
    ?? (Number(listing.rent?.coldRent || 0) + Number(listing.rent?.utilities || 0) + Number(listing.rent?.otherMonthlyCharges || 0)))
}

function availableFrom(value) {
  const available = value && new Date(value)
  if (!available || Number.isNaN(available.getTime())) return '—'
  return available.getTime() <= Date.now() ? 'Available now' : date.format(available)
}

function mapsUrl(listing, destination) {
  const origin = [listing.location?.address, listing.location?.city, listing.location?.state].filter(Boolean).join(', ')
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}${destination.trim() ? `&destination=${encodeURIComponent(destination.trim())}` : ''}`
}

function ComparisonPage() {
  const navigate = useNavigate()
  const { listingIds, removeListing, clearComparison } = useComparison()
  const [listings, setListings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [destination, setDestination] = useState('')

  useEffect(() => {
    let isCurrent = true

    const load = async () => {
      if (!listingIds.length) {
        setListings([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')
      try {
        const results = await Promise.allSettled(listingIds.map((id) => axios.get(`${BASE_URL}/listings/${id}`, { withCredentials: true })))
        if (!isCurrent) return

        const loaded = results.flatMap((result) => (
          result.status === 'fulfilled' && result.value.data?.success && result.value.data?.data?.listing ? [result.value.data.data.listing] : []
        ))
        setListings(loaded)
        if (loaded.length !== listingIds.length) setError('One or more homes are no longer available to compare.')
      } catch (requestError) {
        if (isCurrent) setError(requestError.response?.data?.message || requestError.message || 'Unable to load the selected homes')
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    load()
    return () => { isCurrent = false }
  }, [listingIds])

  const lowestRent = useMemo(() => Math.min(...listings.map(rentOf)), [listings])
  const rows = [
    ['Monthly rent', (listing) => `₹${money.format(rentOf(listing))}`, (listing) => rentOf(listing) === lowestRent],
    ['Security deposit', (listing) => `₹${money.format(listing.securityDeposit || 0)}`],
    ['Area', (listing) => listing.areaSqFt ? `${money.format(listing.areaSqFt)} sq ft` : '—'],
    ['Bedrooms / baths', (listing) => `${listing.bedrooms} bed · ${listing.bathrooms} bath`],
    ['Furnishing', (listing) => listing.furnished ? 'Furnished' : 'Unfurnished'],
    ['Available from', (listing) => availableFrom(listing.availableFrom)],
    ['Amenities', (listing) => listing.amenities?.length ? listing.amenities.join(' · ') : '—'],
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-paper text-ink">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_at_76%_4%,rgba(207,240,74,.36),transparent_24rem),linear-gradient(to_right,rgba(21,19,15,.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(21,19,15,.045)_1px,transparent_1px)] bg-[size:auto,74px_74px,74px_74px]" />
      <UserNavbar />

      <main className={`${SHELL} relative pb-20 pt-9 lg:pt-12`}>
        <Link to="/user/listings" className="inline-flex items-center gap-2 rounded-full text-[13.5px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"><ArrowLeft aria-hidden className="size-4" />Browse listings</Link>
        <header className="mt-7 flex flex-wrap items-end justify-between gap-5">
          <div><p className="font-mono text-[11px] uppercase tracking-[.16em] text-faint">Shortlist tool</p><h1 className="mt-3 font-display text-[37px] font-bold leading-[.98] tracking-[-.055em] sm:text-5xl">Compare homes.</h1><p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">See the details that matter side by side before you decide what to visit.</p></div>
          {listingIds.length > 0 && <button type="button" onClick={clearComparison} className="cursor-pointer text-[13.5px] font-medium text-muted underline underline-offset-4 transition-colors hover:text-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">Clear comparison</button>}
        </header>

        {error && <p role="alert" className="mt-6 rounded-2xl border border-clay/30 bg-clay/8 px-4 py-3 text-[14px] text-ink-soft">{error}</p>}

        {!isLoading && !listings.length && <section className="mt-9 grid min-h-72 place-items-center rounded-[28px] border border-dashed border-ink/25 bg-card/60 p-8 text-center"><div className="max-w-sm"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-lime text-ink"><Scale aria-hidden className="size-6" /></span><h2 className="mt-5 font-display text-[26px] font-bold tracking-[-.04em]">Choose homes to compare.</h2><p className="mt-3 text-[14.5px] leading-relaxed text-muted">Add up to four listings from the browse page to see their cost, space, availability, and amenities together.</p><Link to="/user/listings" className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">Browse homes <ArrowUpRight aria-hidden className="size-3.5" /></Link></div></section>}

        {isLoading && <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">{[0, 1, 2, 3].map((item) => <span key={item} className="h-64 animate-pulse rounded-2xl bg-ink/6" />)}</div>}

        {!isLoading && listings.length > 0 && <>
          <section className="mt-9 overflow-x-auto rounded-[28px] border border-ink/15 bg-card shadow-[0_28px_56px_-42px_rgba(21,19,15,.75)]">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[168px_repeat(var(--comparison-count),minmax(220px,1fr))] border-b border-ink/12" style={{ '--comparison-count': listings.length }}>
                <div className="p-5"><span className="font-mono text-[10px] uppercase tracking-[.14em] text-faint">Homes</span></div>
                {listings.map((listing) => <article key={listing._id} className="relative border-l border-ink/12 p-5"><button type="button" onClick={() => removeListing(listing._id)} className="absolute right-3 top-3 grid size-7 cursor-pointer place-items-center rounded-full border border-ink/15 bg-card text-muted transition-colors hover:border-clay hover:text-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" aria-label={`Remove ${listing.title} from comparison`}><X aria-hidden className="size-3.5" /></button>{listing.photos?.[0] ? <img src={listing.photos[0]} alt="" className="h-28 w-full rounded-xl object-cover" /> : <span className="grid h-28 place-items-center rounded-xl bg-ink/5 font-mono text-[10px] uppercase tracking-[.14em] text-faint">No photo</span>}<h2 className="mt-4 pr-5 font-display text-[18px] font-semibold leading-snug tracking-[-.025em]">{listing.title}</h2><p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-muted"><MapPin aria-hidden className="size-3.5" />{listing.location?.city}, {listing.location?.state}</p><button type="button" onClick={() => navigate(`/listings/${listing._id}`)} className="mt-4 cursor-pointer text-[13px] font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:text-clay">View home</button></article>)}
              </div>
              {rows.map(([label, value, highlight]) => <div key={label} className="grid grid-cols-[168px_repeat(var(--comparison-count),minmax(220px,1fr))] border-b border-ink/10 last:border-0" style={{ '--comparison-count': listings.length }}><div className="bg-ink/[.025] px-5 py-4 text-[13px] font-medium text-ink-soft">{label}</div>{listings.map((listing) => <div key={listing._id} className={`border-l border-ink/10 px-5 py-4 text-[13.5px] leading-relaxed ${highlight?.(listing) ? 'font-semibold text-forest' : 'text-ink-soft'}`}>{value(listing)}{highlight?.(listing) && <span className="ml-2 rounded-full bg-lime px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.1em] text-ink">Lowest</span>}</div>)}</div>)}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-ink/15 bg-card/75 p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-[10.5px] uppercase tracking-[.15em] text-faint">Commute</p><h2 className="mt-2 font-display text-[21px] font-bold tracking-[-.03em]">Check the route that fits your day.</h2></div><label className="w-full sm:max-w-sm" htmlFor="comparison-destination"><span className="sr-only">Work, college, or destination</span><input id="comparison-destination" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Work, college, or destination" className="w-full rounded-full border border-ink/18 bg-card px-4 py-3 text-[14px] text-ink outline-none placeholder:text-faint focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" /></label></div><div className="mt-4 flex flex-wrap gap-2.5">{listings.map((listing) => <a key={listing._id} href={mapsUrl(listing, destination)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-[#F7F5EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">{listing.title} <ArrowUpRight aria-hidden className="size-3.5" /></a>)}</div></section>
        </>}
      </main>
    </div>
  )
}

export default ComparisonPage
