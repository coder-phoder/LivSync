import axios from 'axios'
import { ArrowLeft, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import RequestCallForm from '../../Components/Calls/RequestCallForm'
import VerifiedBadge from '../../Components/Common/VerifiedBadge'
import ListingChat from '../../Components/Listings/ListingChat'
import ListingMap from '../../Components/Listings/ListingMap'
import ListingModel from '../../Components/Listings/ListingModel'
import SaveListingButton from '../../Components/Listings/SaveListingButton'
import RentalRequestForm from '../../Components/Rentals/RentalRequestForm'
import UserNavbar from '../../Components/User/UserNavbar'

const BASE_URL = import.meta.env.VITE_BASE_URL
const SHELL = 'mx-auto w-full max-w-[1240px] px-5 sm:px-10 lg:px-16'
const EYEBROW = 'font-mono text-[10.5px] uppercase tracking-[.16em] text-faint'
const OUTLINE = 'inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-ink/20 px-5 py-3 text-[14.5px] font-medium transition-colors hover:border-ink hover:bg-ink hover:text-[#F7F5EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-55'
const SOLID = 'inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[14.5px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-55'

function formatAmount(value) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value) || 0)}`
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

function Cost({ label, value, strong = false }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 border-t border-ink/10 pt-2.5 first:border-0 first:pt-0 ${strong ? 'mt-1 border-ink/20' : ''}`}>
      <dt className={strong ? 'text-[14px] font-medium' : 'text-[13.5px] text-muted'}>{label}</dt>
      <dd className={`tabular-nums ${strong ? 'font-display text-[17px] font-bold tracking-[-.03em]' : 'text-[14px] text-ink-soft'}`}>{value}</dd>
    </div>
  )
}

// The photograph is the product, so it gets the full width of the screen and the title sits in it.
function Hero({ listing, photo, price, isSoldOut, saveButton }) {
  return (
    <header className="relative h-[62vh] max-h-[720px] min-h-[430px] w-full overflow-hidden bg-forest-deep">
      {photo
        ? <img src={photo} alt={listing.title} className="absolute inset-0 size-full object-cover" />
        : <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,#1B4438,#0E2620)]" />}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,26,22,.94)_4%,rgba(10,26,22,.55)_38%,rgba(10,26,22,.12)_70%)]" />

      <div className={`${SHELL} relative flex h-full flex-col justify-between py-6 sm:py-9`}>
        <div className="flex items-start justify-between gap-4">
          <Link to="/user/listings" className="inline-flex items-center gap-2 rounded-full border border-[#F4F1EA]/25 bg-[#0A1A16]/40 px-4 py-2 text-[13px] font-medium text-[#F4F1EA] backdrop-blur-sm transition-colors hover:bg-[#0A1A16]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4F1EA]">
            <ArrowLeft aria-hidden className="size-4" /> All listings
          </Link>
          {saveButton}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5 text-[#F4F1EA]">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[.16em] text-forest-mute">
              <span className="capitalize">{listing.propertyType} · {listing.roomType.replaceAll('-', ' ')}</span>
              {isSoldOut && <span className="rounded-full bg-clay px-2.5 py-1 text-[#F7F5EF]">Rented</span>}
            </p>
            <h1 className="mt-4 max-w-[16em] font-display text-[34px] leading-[1.02] font-bold tracking-[-.04em] text-balance sm:text-[52px]">{listing.title}</h1>
            <p className="mt-3.5 flex items-start gap-2 text-[14.5px] text-[#F4F1EA]/75">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
              {listing.location.address}, {listing.location.city}, {listing.location.state} {listing.location.postalCode}
            </p>
          </div>

          <p className="shrink-0 rounded-[20px] border border-[#F4F1EA]/20 bg-[#0A1A16]/45 px-5 py-3.5 backdrop-blur-sm">
            <span className="block font-display text-[26px] leading-none font-bold tracking-[-.035em] tabular-nums sm:text-[30px]">{price}</span>
            <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[.16em] text-forest-mute">Per month</span>
          </p>
        </div>
      </div>
    </header>
  )
}

// Native scroll-snap does what a carousel library would, at the cost of nothing.
function MediaStrip({ items }) {
  if (!items.length) return null

  const videos = items.filter((item) => item.kind === 'video').length
  const frame = 'h-[280px] w-[80vw] shrink-0 snap-center rounded-[24px] object-cover sm:h-[440px] sm:w-[620px]'

  return (
    <section className="mt-20" aria-label="Photos and videos">
      <div className={`${SHELL} flex flex-wrap items-baseline justify-between gap-3`}>
        <h2 className={EYEBROW}>{videos ? 'Photos & video' : 'Photos'}</h2>
        <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-faint">{items.length} in total · swipe</p>
      </div>
      <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 sm:px-10 lg:px-16 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {items.map((item) => (item.kind === 'video'
          ? <iframe key={item.key} src={item.src} title={item.alt} allow="autoplay; fullscreen" className={`${frame} border-0 bg-[#0A1A16]`} />
          : <img key={item.key} src={item.src} alt={item.alt} loading="lazy" className={frame} />))}
      </div>
    </section>
  )
}

function ListingDetailPage() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const [isContacting, setIsContacting] = useState(false)
  const [contactError, setContactError] = useState('')
  const [isSaved, setIsSaved] = useState(false)
  const [isSavingListing, setIsSavingListing] = useState(false)

  useEffect(() => {
    let isCurrent = true

    const loadListing = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [listingResponse, savedResponse] = await Promise.all([
          axios.get(`${BASE_URL}/listings/${listingId}`, { withCredentials: true }),
          axios.get(`${BASE_URL}/saved-listings`, { withCredentials: true }),
        ])
        const loadedListing = listingResponse.data?.data?.listing
        const savedListings = savedResponse.data?.data?.savedListings

        if (!listingResponse.data?.success || !loadedListing || !savedResponse.data?.success || !Array.isArray(savedListings)) {
          throw new Error(listingResponse.data?.message || savedResponse.data?.message || 'Unable to load listing')
        }

        if (isCurrent) {
          setListing(loadedListing)
          setIsSaved(savedListings.some((entry) => entry.listing?._id === listingId))
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.response?.data?.message || requestError.message || 'Unable to load listing')
        }
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadListing()

    return () => {
      isCurrent = false
    }
  }, [listingId, retryKey])

  const handleContactLandlord = async () => {
    setContactError('')
    setIsContacting(true)

    try {
      const response = await axios.post(`${BASE_URL}/messages/conversations`, { listingId }, { withCredentials: true })
      const conversationId = response.data?.data?.conversation?.id

      if (!response.data?.success || !conversationId) {
        throw new Error(response.data?.message || 'Unable to contact landlord')
      }

      navigate(`/messages?c=${conversationId}`)
    } catch (requestError) {
      setContactError(requestError.response?.data?.message || requestError.message || 'Unable to contact landlord')
      setIsContacting(false)
    }
  }

  const toggleSavedListing = async () => {
    setIsSavingListing(true)
    setContactError('')

    try {
      const response = isSaved
        ? await axios.delete(`${BASE_URL}/saved-listings/${listingId}`, { withCredentials: true })
        : await axios.post(`${BASE_URL}/saved-listings/${listingId}`, {}, { withCredentials: true })

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to update saved home')
      setIsSaved((current) => !current)
    } catch (requestError) {
      setContactError(requestError.response?.data?.message || requestError.message || 'Unable to update saved home')
    } finally {
      setIsSavingListing(false)
    }
  }

  const isSoldOut = listing?.status === 'rented'
  const monthlyRent = listing && (listing.totalMonthlyRent
    ?? (Number(listing.rent?.coldRent || 0) + Number(listing.rent?.utilities || 0) + Number(listing.rent?.otherMonthlyCharges || 0)))
  const moveInTotal = listing && monthlyRent + (listing.securityDeposit || 0) + (listing.brokerageFee || 0)

  const heroSrc = listing?.photos?.[0] || ''
  const gallery = [
    ...(listing?.photos || []).slice(1).map((src, index) => ({ key: src, kind: 'image', src, alt: `${listing.title} ${index + 2}` })),
    ...(listing?.videos || []).map((video) => ({ key: video.id, kind: 'video', src: video.src, alt: `${listing.title} video` })),
  ]

  const specs = listing ? [
    ['Bedrooms', listing.bedrooms],
    ['Bathrooms', listing.bathrooms],
    ['Area', `${listing.areaSqFt} sq ft`],
    ['Furnishing', listing.furnished ? 'Furnished' : 'Unfurnished'],
    ['Available from', formatDate(listing.availableFrom)],
  ] : []

  if (isLoading || error) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <UserNavbar />
        <main className={`${SHELL} py-10`}>
          {isLoading && (
            <div className="grid gap-4" aria-busy="true" aria-label="Loading listing">
              <span className="h-[58vh] min-h-[400px] animate-pulse rounded-[26px] bg-ink/6" />
              <span className="h-24 animate-pulse rounded-[24px] bg-ink/6" />
            </div>
          )}
          {error && !isLoading && (
            <div className="max-w-xl rounded-[22px] border border-clay/30 bg-clay/8 p-6">
              <h1 className="font-display text-2xl font-bold tracking-[-.03em]">We could not load this listing</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{error}</p>
              <button type="button" onClick={() => setRetryKey((key) => key + 1)} className={`mt-5 sm:w-auto ${SOLID}`}>Try again</button>
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper text-ink">
      <UserNavbar />

      {listing && (
        <main className="pb-28">
          <Hero
            listing={listing}
            photo={heroSrc}
            price={formatAmount(monthlyRent)}
            isSoldOut={isSoldOut}
            saveButton={!isSoldOut && <SaveListingButton saved={isSaved} onToggle={toggleSavedListing} isSaving={isSavingListing} variant="icon" />}
          />

          {/* The five numbers people compare listings on, read as one line before anything else. */}
          <section className={`${SHELL} relative mt-8 sm:-mt-7`} aria-label="Key details">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[24px] border border-ink/12 bg-ink/12 shadow-[0_30px_60px_-50px_rgba(21,19,15,.8)] sm:grid-cols-3 lg:grid-cols-5">
              {specs.map(([label, value], index) => (
                <div key={label} className={`bg-card p-5 ${index === specs.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}>
                  <dt className={EYEBROW}>{label}</dt>
                  <dd className="mt-2.5 font-display text-[19px] font-bold tracking-[-.03em] capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className={`${SHELL} mt-20 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-20`}>
            <div className="order-2 grid gap-16 lg:order-1">
              <section>
                <h2 className={EYEBROW}>About this home</h2>
                <p className="mt-5 max-w-[58ch] text-[17px] leading-[1.8] whitespace-pre-wrap text-ink-soft">{listing.description}</p>
              </section>

              <section>
                <h2 className={EYEBROW}>What is here</h2>
                {listing.amenities?.length ? (
                  <ul className="mt-5 grid gap-x-8 gap-y-0 sm:grid-cols-2">
                    {listing.amenities.map((amenity) => (
                      <li key={amenity} className="flex items-center gap-3 border-b border-ink/10 py-3.5 text-[15px] capitalize">
                        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-clay" />
                        {amenity}
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-4 text-[15px] text-muted">No amenities have been listed.</p>}
              </section>

              {listing.documentRequirements?.length > 0 && (
                <section>
                  <h2 className={EYEBROW}>Documents requested</h2>
                  <p className="mt-5 max-w-[58ch] text-[15px] leading-relaxed text-muted">
                    The landlord needs these before approving a rental request. Upload them with your request, or pick files already in your private vault.
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {listing.documentRequirements.map((requirement) => (
                      <li key={requirement._id || requirement.id || requirement.name} className="rounded-full border border-sand bg-sand/20 px-3.5 py-2 text-[13.5px] text-ink-soft">{requirement.name}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Costs and the way in: first thing on a phone, always in view on a desktop. */}
            <aside className="order-1 self-start rounded-[26px] border border-ink/15 bg-card p-5 shadow-[0_30px_55px_-45px_rgba(21,19,15,.7)] sm:p-6 lg:order-2 lg:sticky lg:top-24">
              <h2 className={EYEBROW}>Monthly costs</h2>
              <dl className="mt-4 grid gap-2.5">
                <Cost label="Base rent" value={formatAmount(listing.rent?.coldRent)} />
                <Cost label="Utilities" value={formatAmount(listing.rent?.utilities)} />
                <Cost label="Other charges" value={formatAmount(listing.rent?.otherMonthlyCharges)} />
                <Cost label="Total monthly" value={formatAmount(monthlyRent)} strong />
                <Cost label="Security deposit" value={formatAmount(listing.securityDeposit)} />
                <Cost label="Brokerage fee" value={formatAmount(listing.brokerageFee)} />
              </dl>

              <div className="mt-5 rounded-2xl border border-forest/20 bg-forest/8 p-4">
                <p className={EYEBROW}>To move in</p>
                <p className="mt-2 font-display text-[24px] font-bold tracking-[-.035em] tabular-nums text-forest">{formatAmount(moveInTotal)}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-muted">First month, deposit and brokerage together.</p>
              </div>

              <div className="mt-5 border-t border-ink/12 pt-5">
                <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-medium">
                  Listed by {listing.landlord?.name || 'Landlord'}
                  <VerifiedBadge verified={listing.landlord?.emailVerified} label="Verified landlord" />
                </p>
                {listing.landlord?.companyName && <p className="mt-1 text-[13.5px] text-muted">{listing.landlord.companyName}</p>}

                {isSoldOut ? (
                  <div className="mt-4 rounded-2xl border border-clay/30 bg-clay/10 p-4 text-center">
                    <p className="font-display text-[16px] font-semibold tracking-[-.02em] text-clay">Already rented</p>
                    <p className="mt-1 text-[13px] leading-snug text-muted">This place is no longer taking requests. Similar homes are still listed.</p>
                    <Link to="/user/listings" className="mt-3 inline-block text-[13.5px] font-medium underline underline-offset-2 hover:text-clay">Browse listings</Link>
                  </div>
                ) : (
                  <>
                    {/* One solid action: the request that costs money. Everything else is an outline. */}
                    <RentalRequestForm listingId={listingId} totalDue={moveInTotal} documentRequirements={listing.documentRequirements || []} />
                    <button type="button" onClick={handleContactLandlord} disabled={isContacting} className={`mt-2.5 ${OUTLINE}`}>
                      {isContacting ? 'Opening chat…' : 'Message landlord'}
                    </button>
                    {contactError && <p role="alert" className="mt-2 text-[13px] text-clay">{contactError}</p>}
                    <RequestCallForm listingId={listingId} />
                  </>
                )}

                {(listing.floorPlanUrl || listing.virtualTourUrl) && (
                  <div className="mt-4 grid gap-2 border-t border-ink/12 pt-4">
                    {listing.floorPlanUrl && <a href={listing.floorPlanUrl} target="_blank" rel="noreferrer" className="text-[13.5px] font-medium underline underline-offset-2 transition-colors hover:text-clay">View floor plan</a>}
                    {listing.virtualTourUrl && <a href={listing.virtualTourUrl} target="_blank" rel="noreferrer" className="text-[13.5px] font-medium underline underline-offset-2 transition-colors hover:text-clay">Open virtual tour</a>}
                  </div>
                )}
              </div>
            </aside>
          </div>

          <MediaStrip items={gallery} />

          {listing.modelUrl && (
            <div className={`${SHELL} mt-20`}>
              <ListingModel listingId={listingId} title={listing.title} />
            </div>
          )}

          <div className={`${SHELL} mt-20`}>
            <ListingMap
              listingId={listingId}
              title={listing.title}
              address={`${listing.location.address}, ${listing.location.city}, ${listing.location.state} ${listing.location.postalCode}`}
            />
          </div>
        </main>
      )}

      {listing && <ListingChat listingId={listingId} listingTitle={listing.title} />}
    </div>
  )
}

export default ListingDetailPage
