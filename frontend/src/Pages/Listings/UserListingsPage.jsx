import axios from 'axios'
import { BellPlus, Bookmark, Scale, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ListingCard from '../../Components/Listings/ListingCard'
import ListingFilters from '../../Components/Listings/ListingFilters'
import UserNavbar from '../../Components/User/UserNavbar'
import { useComparison } from '../../Context/ComparisonContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const SHELL = 'mx-auto w-full max-w-[1240px] px-5 sm:px-10 lg:px-16'
const PAGE_SIZE = 12

const DEFAULT_FILTERS = {
  city: '',
  propertyType: '',
  roomType: '',
  minRent: '',
  maxRent: '',
  minBedrooms: '',
  furnished: '',
  availableFrom: '',
  verifiedLandlord: false,
  sort: 'newest',
}

const money = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

// Every filter that can be worn as a removable chip, and how it reads once applied.
// `sort` is deliberately absent: it is a view of the results, not a narrowing of them.
const CHIP_LABELS = {
  city: (value) => value,
  propertyType: (value) => value,
  roomType: (value) => value.replaceAll('-', ' '),
  minRent: (value) => `Over ₹${money.format(value)}`,
  maxRent: (value) => `Under ₹${money.format(value)}`,
  minBedrooms: (value) => (value === '0' ? 'Studio' : `${value}+ bed`),
  furnished: (value) => (value === 'true' ? 'Furnished' : 'Unfurnished'),
  availableFrom: (value) => `By ${new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
  verifiedLandlord: () => 'Verified landlords',
}

function activeChips(filters) {
  return Object.entries(filters)
    .filter(([name, value]) => CHIP_LABELS[name] && value !== '' && value !== false)
    .map(([name, value]) => ({ name, label: CHIP_LABELS[name](value) }))
}

function buildListingParams(filters, page) {
  const params = { page, limit: PAGE_SIZE, sort: filters.sort }

  Object.keys(CHIP_LABELS).forEach((name) => {
    if (filters[name] !== '' && filters[name] !== false) params[name] = filters[name]
  })

  return params
}

function headline({ total, filters, chipCount }) {
  if (!total) return chipCount ? 'Nothing matches that yet.' : 'No homes are published yet.'

  const city = filters.city ? `${filters.city[0].toUpperCase()}${filters.city.slice(1)}` : ''

  return `${total} ${total === 1 ? 'home' : 'homes'} ${city ? `in ${city}` : 'to look through'}.`
}

function UserListingsPage() {
  const { listingIds: comparisonIds, maxListings, toggleListing } = useComparison()
  const [listings, setListings] = useState([])
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const [savedListingIds, setSavedListingIds] = useState(new Set())
  const [savingListingId, setSavingListingId] = useState('')
  const [isCreatingAlert, setIsCreatingAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  useEffect(() => {
    let isCurrent = true

    const loadListings = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await axios.get(`${BASE_URL}/listings`, {
          params: buildListingParams(appliedFilters, page),
          withCredentials: true,
        })

        if (!response.data?.success || !Array.isArray(response.data?.data?.listings) || !Number.isFinite(response.data?.data?.pagination?.total)) {
          throw new Error(response.data?.message || 'Unable to load listings')
        }

        if (!isCurrent) return

        // Page one replaces the results; later pages extend them under the same filters.
        const { listings: loaded, pagination } = response.data.data
        setListings((current) => (page === 1 ? loaded : [...current, ...loaded]))
        setTotal(pagination.total)
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.response?.data?.message || requestError.message || 'Unable to load listings')
        }
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadListings()

    return () => {
      isCurrent = false
    }
  }, [appliedFilters, page, retryKey])

  useEffect(() => {
    let isCurrent = true

    const loadSavedListings = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/saved-listings`, { withCredentials: true })
        const savedListings = response.data?.data?.savedListings

        if (!response.data?.success || !Array.isArray(savedListings)) throw new Error(response.data?.message || 'Unable to load saved homes')
        if (isCurrent) setSavedListingIds(new Set(savedListings.map((entry) => entry.listing?._id).filter(Boolean)))
      } catch (requestError) {
        if (isCurrent) setError(requestError.response?.data?.message || requestError.message || 'Unable to load saved homes')
      }
    }

    loadSavedListings()

    return () => {
      isCurrent = false
    }
  }, [])

  // The sheet covers the page on a phone, so the page behind it must stop scrolling.
  useEffect(() => {
    if (!isSheetOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsSheetOpen(false)
    }

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isSheetOpen])

  // Apply/reset replace the whole set; sort and chip removal only patch it, so
  // half-typed values in the panel survive a sort change.
  const search = (nextFilters) => {
    setFilters(nextFilters)
    setAppliedFilters(nextFilters)
    setPage(1)
    setAlertMessage('')
  }

  const patch = (changes) => {
    setFilters((current) => ({ ...current, ...changes }))
    setAppliedFilters((current) => ({ ...current, ...changes }))
    setPage(1)
    setAlertMessage('')
  }

  const updateFilter = (name, value) => {
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }))
  }

  const applyFilters = (event) => {
    event.preventDefault()
    search({ ...filters })
    setIsSheetOpen(false)
  }

  const resetFilters = () => {
    search({ ...DEFAULT_FILTERS })
    setIsSheetOpen(false)
  }

  const clearChip = (name) => patch({ [name]: DEFAULT_FILTERS[name] })

  const toggleSavedListing = async (listingId) => {
    const isSaved = savedListingIds.has(listingId)
    setSavingListingId(listingId)
    setError('')

    try {
      const response = isSaved
        ? await axios.delete(`${BASE_URL}/saved-listings/${listingId}`, { withCredentials: true })
        : await axios.post(`${BASE_URL}/saved-listings/${listingId}`, {}, { withCredentials: true })

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to update saved home')

      setSavedListingIds((current) => {
        const next = new Set(current)
        if (isSaved) next.delete(listingId)
        else next.add(listingId)
        return next
      })
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to update saved home')
    } finally {
      setSavingListingId('')
    }
  }

  const appliedChips = activeChips(appliedFilters)
  const draftChipCount = activeChips(filters).length
  const isFirstPage = page === 1
  const isLoadingMore = isLoading && !isFirstPage
  const showSkeleton = isLoading && isFirstPage
  const hasMore = listings.length < total
  const filterProps = { filters, onChange: updateFilter, onApply: applyFilters, onReset: resetFilters, isLoading }

  const createAlert = async () => {
    setIsCreatingAlert(true)
    setAlertMessage('')
    setError('')

    try {
      const response = await axios.post(`${BASE_URL}/listing-alerts`, {
        criteria: Object.fromEntries(appliedChips.map(({ name }) => [name, appliedFilters[name]])),
        emailEnabled: true,
        inAppEnabled: true,
      }, { withCredentials: true })

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to create listing alert')
      setAlertMessage('Alert saved. New matches will reach you by email and on your home page.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to create listing alert')
    } finally {
      setIsCreatingAlert(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-paper text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[linear-gradient(to_right,rgba(21,19,15,.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(21,19,15,.055)_1px,transparent_1px)] bg-[size:74px_74px]"
        style={{ maskImage: 'radial-gradient(105% 62% at 22% 0%, #000 16%, transparent 76%)', WebkitMaskImage: 'radial-gradient(105% 62% at 22% 0%, #000 16%, transparent 76%)' }}
      />
      <UserNavbar />

      <main className={`${SHELL} relative pb-20 pt-9 lg:pt-12`}>
        <header className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[.16em] text-faint">Find a place</p>
          <h1 className="mt-4 font-display text-[34px] font-bold leading-[1.02] tracking-[-.04em] text-balance sm:text-5xl">
            {showSkeleton ? 'Looking for homes…' : headline({ total, filters: appliedFilters, chipCount: appliedChips.length })}
          </h1>

          <form onSubmit={applyFilters} className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <label className="relative flex-1" htmlFor="listing-city-search">
              <span className="sr-only">Search homes by city</span>
              <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-faint" />
              <input
                id="listing-city-search"
                name="city"
                value={filters.city}
                onChange={(event) => updateFilter('city', event.target.value)}
                placeholder="Search a city — Pune, Mumbai, Bengaluru"
                className="w-full rounded-full border border-ink/18 bg-card py-3.5 pl-11 pr-4 text-[15px] text-ink outline-none transition-colors placeholder:text-faint/80 focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
            </label>
            <button
              type="submit"
              className="cursor-pointer rounded-full bg-ink px-6 py-3.5 text-[15px] font-medium text-[#F7F5EF] shadow-[0_14px_30px_-18px_rgba(21,19,15,.9)] transition-all hover:-translate-y-0.5 hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Search
            </button>
          </form>
        </header>

        <div className="mt-10 grid items-start gap-8 lg:mt-12 lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-12">
          <aside className="sticky top-24 hidden lg:block">
            <h2 className="font-mono text-[11px] uppercase tracking-[.16em] text-faint">Refine</h2>
            <div className="mt-4">
              <ListingFilters {...filterProps} idPrefix="rail" />
            </div>
          </aside>

          <section>
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="mr-auto text-[14px] text-muted" aria-live="polite">
                {showSkeleton ? 'Loading…' : `Showing ${listings.length} of ${total}`}
              </p>

              <button
                type="button"
                onClick={() => setIsSheetOpen(true)}
                aria-haspopup="dialog"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/20 bg-card px-4 py-2.5 text-[14px] font-medium transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:hidden"
              >
                <SlidersHorizontal aria-hidden className="size-4" />
                Filters
                {draftChipCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-clay text-[11px] font-semibold text-[#F7F5EF] tabular-nums">{draftChipCount}</span>}
              </button>

              <Link
                to="/saved"
                className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-card px-4 py-2.5 text-[14px] font-medium transition-colors hover:border-ink hover:bg-ink hover:text-[#F7F5EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <Bookmark aria-hidden className="size-4" />
                Saved homes
                {savedListingIds.size > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-lime px-1.5 py-0.5 text-[10px] font-semibold text-ink tabular-nums">{savedListingIds.size}</span>}
              </Link>

              {comparisonIds.length > 0 && <Link to="/compare" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"><Scale aria-hidden className="size-4" />Compare <span className="rounded-full bg-lime px-1.5 py-0.5 text-[10px] font-semibold text-ink tabular-nums">{comparisonIds.length}</span></Link>}

              <button
                type="button"
                onClick={createAlert}
                disabled={isCreatingAlert}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/20 bg-card px-4 py-2.5 text-[14px] font-medium transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-progress disabled:opacity-70"
              >
                <BellPlus aria-hidden className="size-4" />
                {isCreatingAlert ? 'Saving…' : 'Alert me'}
              </button>

              <label className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-card pl-4 pr-2 text-[14px] text-muted focus-within:border-ink" htmlFor="listing-sort">
                Sort
                <select
                  id="listing-sort"
                  value={filters.sort}
                  onChange={(event) => patch({ sort: event.target.value })}
                  className="cursor-pointer rounded-full bg-transparent py-2.5 pr-2 text-[14px] font-medium text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <option value="newest">Newest</option>
                  <option value="rent_asc">Rent: low to high</option>
                  <option value="rent_desc">Rent: high to low</option>
                </select>
              </label>
            </div>

            {appliedChips.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {appliedChips.map(({ name, label }) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => clearChip(name)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ink/20 bg-ink/4 py-1.5 pl-3.5 pr-2.5 text-[13px] font-medium capitalize text-ink-soft transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      {label}
                      <X aria-hidden className="size-3.5" />
                      <span className="sr-only">Remove filter</span>
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={resetFilters} className="cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-medium text-muted underline underline-offset-2 transition-colors hover:text-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                    Clear all
                  </button>
                </li>
              </ul>
            )}

            {alertMessage && (
              <p role="status" className="mt-4 rounded-2xl border border-forest/25 bg-forest/6 px-4 py-3 text-[14px] text-forest">{alertMessage}</p>
            )}

            {error && (
              <div role="alert" className="mt-6 rounded-2xl border border-clay/30 bg-clay/8 p-5">
                <p className="text-[15px] leading-relaxed text-ink-soft">{error}</p>
                <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="mt-4 cursor-pointer rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                  Try again
                </button>
              </div>
            )}

            {showSkeleton && (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading listings">
                {[0, 1, 2, 3, 4, 5].map((card) => (
                  <div key={card} className="overflow-hidden rounded-2xl border border-ink/12 bg-card">
                    <span className="block aspect-[4/3] animate-pulse bg-ink/6" />
                    <div className="grid gap-2.5 p-5">
                      <span className="h-4 w-4/5 animate-pulse rounded bg-ink/8" />
                      <span className="h-3 w-2/5 animate-pulse rounded bg-ink/6" />
                      <span className="mt-1.5 h-5 w-1/2 animate-pulse rounded bg-ink/8" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showSkeleton && !error && !listings.length && (
              <div className="mt-6 rounded-2xl border border-dashed border-ink/25 bg-ink/3 p-7">
                <p className="max-w-[36em] text-[15.5px] leading-relaxed text-muted">
                  {appliedChips.length
                    ? 'Nothing matches every one of those filters. Loosen the budget or drop a filter chip and the list will fill back up.'
                    : 'No landlord has published a home yet. Set an alert and you will hear the moment one appears.'}
                </p>
                {appliedChips.length > 0 && (
                  <button type="button" onClick={resetFilters} className="mt-5 cursor-pointer rounded-full bg-ink px-5 py-3 text-[14.5px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {listings.length > 0 && (
              <>
                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {listings.map((listing) => (
                    <ListingCard
                      key={listing._id}
                      listing={listing}
                      to={`/listings/${listing._id}`}
                      saved={savedListingIds.has(listing._id)}
                      onSaveToggle={() => toggleSavedListing(listing._id)}
                      isSaving={savingListingId === listing._id}
                      compared={comparisonIds.includes(listing._id)}
                      compareDisabled={!comparisonIds.includes(listing._id) && comparisonIds.length >= maxListings}
                      onCompareToggle={() => toggleListing(listing._id)}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-10 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setPage((current) => current + 1)}
                      disabled={isLoadingMore}
                      className="cursor-pointer rounded-full border border-ink/20 bg-card px-7 py-3.5 text-[15px] font-medium transition-all hover:-translate-y-0.5 hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-progress disabled:opacity-70"
                    >
                      {isLoadingMore ? 'Loading…' : `Show ${Math.min(PAGE_SIZE, total - listings.length)} more`}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      {isSheetOpen && (
        <div
          role="presentation"
          onPointerDown={(event) => { if (event.target === event.currentTarget) setIsSheetOpen(false) }}
          className="fixed inset-0 z-[60] flex items-end bg-ink/45 backdrop-blur-[2px] lg:hidden"
        >
          <div role="dialog" aria-modal="true" aria-labelledby="filter-sheet-title" className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-t border-ink/15 bg-paper px-5 pb-8 pt-5">
            <div className="flex items-center justify-between gap-4">
              <h2 id="filter-sheet-title" className="font-display text-xl font-bold tracking-[-.03em]">Refine</h2>
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                aria-label="Close filters"
                className="grid size-9 cursor-pointer place-items-center rounded-full border border-ink/20 text-ink transition-colors hover:bg-ink/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <div className="mt-5">
              <ListingFilters {...filterProps} idPrefix="sheet" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserListingsPage
