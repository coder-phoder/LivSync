import axios from 'axios'
import { Building2, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ListingEditorModal from '../../Components/Landlord/ListingEditorModal'
import LandlordListingCard from '../../Components/Landlord/LandlordListingCard'
import LandlordNavbar from '../../Components/Landlord/LandlordNavbar'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const SHELL = 'mx-auto w-full max-w-[1240px] px-5 sm:px-10 lg:px-16'
const FILTERS = [['all', 'All'], ['published', 'Live'], ['rented', 'Rented'], ['archived', 'Archived']]

function LandlordListingsPage() {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const [listings, setListings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingListing, setEditingListing] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let isCurrent = true

    const loadListings = async () => {
      setIsLoading(true)
      setListError('')

      try {
        const response = await axios.get(`${BASE_URL}/listings/mine`, { withCredentials: true })

        if (!response.data?.success || !Array.isArray(response.data?.data?.listings)) {
          throw new Error(response.data?.message || 'Unable to load your listings')
        }

        if (isCurrent) setListings(response.data.data.listings)
      } catch (requestError) {
        if (!isCurrent) return

        if (requestError.response?.status === 401) {
          clearSession()
          navigate('/landlord/login', { replace: true })
          return
        }

        setListError(requestError.response?.data?.message || requestError.message || 'Unable to load your listings')
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadListings()
    return () => { isCurrent = false }
  }, [clearSession, navigate, retryKey])

  const counts = useMemo(() => ({
    all: listings.length,
    published: listings.filter((listing) => listing.status === 'published').length,
    rented: listings.filter((listing) => listing.status === 'rented').length,
    archived: listings.filter((listing) => listing.status === 'archived').length,
  }), [listings])
  const visibleListings = filter === 'all' ? listings : listings.filter((listing) => listing.status === filter)

  const openCreateEditor = () => {
    setEditingListing(null)
    setFormError('')
    setNotice('')
    setIsEditorOpen(true)
  }

  const openEditEditor = (listing) => {
    setEditingListing(listing)
    setFormError('')
    setNotice('')
    setIsEditorOpen(true)
  }

  const closeEditor = () => {
    if (isSubmitting) return
    setIsEditorOpen(false)
    setEditingListing(null)
    setFormError('')
  }

  const saveListing = async (payload) => {
    setFormError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      const response = editingListing
        ? await axios.patch(`${BASE_URL}/listings/${editingListing._id}`, payload, { withCredentials: true })
        : await axios.post(`${BASE_URL}/listings`, payload, { withCredentials: true })
      const savedListing = response.data?.data?.listing

      if (!response.data?.success || !savedListing) {
        throw new Error(response.data?.message || 'Unable to save listing')
      }

      setListings((currentListings) => (
        editingListing
          ? currentListings.map((listing) => (listing._id === savedListing._id ? savedListing : listing))
          : [savedListing, ...currentListings]
      ))
      setNotice(response.data.message)
      setIsEditorOpen(false)
      setEditingListing(null)
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || requestError.message || 'Unable to save listing')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteListing = async (listingId) => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return

    setNotice('')
    setListError('')
    setDeletingId(listingId)

    try {
      const response = await axios.delete(`${BASE_URL}/listings/${listingId}`, { withCredentials: true })
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to delete listing')

      setListings((currentListings) => currentListings.filter((listing) => listing._id !== listingId))
      setNotice(response.data.message)
    } catch (requestError) {
      setListError(requestError.response?.data?.message || requestError.message || 'Unable to delete listing')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-landlord-paper text-landlord-ink">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_at_79%_0%,rgba(102,221,227,.27),transparent_25rem),linear-gradient(to_right,rgba(16,53,83,.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,53,83,.045)_1px,transparent_1px)] bg-[size:auto,76px_76px,76px_76px]" />
      <LandlordNavbar />

      <main className={`${SHELL} relative pb-20 pt-10 lg:pt-14`}>
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div><p className="font-mono text-[11px] uppercase tracking-[.17em] text-landlord-faint">Portfolio inventory</p><h1 className="mt-3 font-display text-[36px] font-bold leading-[1] tracking-[-.05em] sm:text-5xl">Your listings.</h1><p className="mt-4 max-w-xl text-[15px] leading-relaxed text-landlord-muted">Publish, update, and keep every home in your portfolio ready for the right tenant.</p></div>
          <button type="button" onClick={openCreateEditor} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-landlord-navy px-5 py-3.5 text-[15px] font-medium text-landlord-card shadow-[0_16px_30px_-18px_rgba(16,53,83,.95)] transition-all hover:-translate-y-0.5 hover:bg-landlord-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy"><Plus aria-hidden className="size-4" />Add a listing</button>
        </header>

        {notice && <p role="status" className="mt-7 rounded-2xl border border-landlord-blue/25 bg-landlord-card px-4 py-3.5 text-[13.5px] text-landlord-ink-soft shadow-[0_16px_28px_-28px_rgba(16,53,83,.65)]">{notice}</p>}

        <section className="mt-9 flex flex-wrap items-center justify-between gap-4 border-y border-landlord-ink/12 py-4" aria-label="Listing filters">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`cursor-pointer rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy ${filter === value ? 'bg-landlord-navy text-landlord-card' : 'bg-landlord-card/70 text-landlord-ink-soft hover:bg-landlord-navy/8 hover:text-landlord-navy'}`}>{label} <span className={`ml-1.5 tabular-nums ${filter === value ? 'text-landlord-cyan' : 'text-landlord-faint'}`}>{counts[value]}</span></button>
            ))}
          </div>
          <p className="hidden items-center gap-2 text-[13px] text-landlord-muted sm:flex"><Building2 aria-hidden className="size-4 text-landlord-blue" />{counts.published ? `${counts.published} listing${counts.published === 1 ? '' : 's'} currently live` : 'No listings live yet'}</p>
        </section>

        {isLoading && <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading your listings">{[0, 1, 2].map((item) => <span key={item} className="h-[360px] animate-pulse rounded-[24px] bg-landlord-ink/6" />)}</div>}

        {listError && !isLoading && (
          <div role="alert" className="mt-8 flex max-w-xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-landlord-alert/30 bg-landlord-card p-5 text-[14px] text-landlord-ink-soft"><span>{listError}</span><button type="button" onClick={() => setRetryKey((key) => key + 1)} className="inline-flex cursor-pointer items-center gap-2 font-medium text-landlord-alert underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-alert"><RefreshCw aria-hidden className="size-3.5" />Try again</button></div>
        )}

        {!isLoading && !listError && !listings.length && (
          <section className="mt-8 grid min-h-72 place-items-center rounded-[28px] border border-dashed border-landlord-ink/25 bg-landlord-card/55 p-8 text-center"><div className="max-w-sm"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-landlord-navy text-landlord-cyan"><Building2 aria-hidden className="size-6" /></span><h2 className="mt-5 font-display text-[25px] font-bold tracking-[-.04em]">Your portfolio starts here.</h2><p className="mt-3 text-[14.5px] leading-relaxed text-landlord-muted">Create your first listing to collect tenant enquiries, applications, and viewing requests in LivSync.</p><button type="button" onClick={openCreateEditor} className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-landlord-navy px-4 py-2.5 text-[14px] font-medium text-landlord-card transition-colors hover:bg-landlord-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy"><Plus aria-hidden className="size-3.5" />Create your first listing</button></div></section>
        )}

        {!isLoading && !listError && listings.length > 0 && !visibleListings.length && (
          <section className="mt-8 rounded-[28px] border border-dashed border-landlord-ink/25 bg-landlord-card/55 p-8 text-center"><h2 className="font-display text-xl font-bold tracking-[-.035em]">No {filter} listings.</h2><p className="mt-2 text-[14px] text-landlord-muted">Choose another status to see the rest of your portfolio.</p><button type="button" onClick={() => setFilter('all')} className="mt-4 cursor-pointer text-[13px] font-medium text-landlord-blue underline underline-offset-4">Show all listings</button></section>
        )}

        {!isLoading && !listError && visibleListings.length > 0 && (
          <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Your listings">
            {visibleListings.map((listing) => <LandlordListingCard key={listing._id} listing={listing} onEdit={openEditEditor} onDelete={deleteListing} isDeleting={Boolean(deletingId)} />)}
          </section>
        )}
      </main>

      {isEditorOpen && <ListingEditorModal listing={editingListing} onSave={saveListing} onClose={closeEditor} isSubmitting={isSubmitting} error={formError} />}
    </div>
  )
}

export default LandlordListingsPage
