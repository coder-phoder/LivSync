import axios from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LandlordNavbar from '../../Components/Landlord/LandlordNavbar'
import ListingCard from '../../Components/Listings/ListingCard'
import ListingForm from '../../Components/Listings/ListingForm'
import { loginPathFor, useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL

function LandlordListingsPage() {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const [listings, setListings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingListing, setEditingListing] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [retryKey, setRetryKey] = useState(0)

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
          navigate(loginPathFor('landlord'), { replace: true })
          return
        }

        setListError(requestError.response?.data?.message || requestError.message || 'Unable to load your listings')
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadListings()

    return () => {
      isCurrent = false
    }
  }, [clearSession, navigate, retryKey])

  const openCreateForm = () => {
    setEditingListing(null)
    setFormError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const openEditForm = (listing) => {
    setEditingListing(listing)
    setFormError('')
    setNotice('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSubmitting) return

    setIsFormOpen(false)
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
      setIsFormOpen(false)
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

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete listing')
      }

      setListings((currentListings) => currentListings.filter((listing) => listing._id !== listingId))
      setNotice(response.data.message)
    } catch (requestError) {
      setListError(requestError.response?.data?.message || requestError.message || 'Unable to delete listing')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <LandlordNavbar />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Landlord dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your listings</h1>
          </div>
          {!isFormOpen && <button type="button" onClick={openCreateForm} className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Add listing</button>}
        </div>

        {notice && <p className="mt-5 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

        {isFormOpen && (
          <ListingForm
            key={editingListing?._id || 'new-listing'}
            listing={editingListing}
            onSave={saveListing}
            onCancel={closeForm}
            isSubmitting={isSubmitting}
            error={formError}
          />
        )}

        {isLoading && <p className="mt-8 text-slate-600">Loading your listings…</p>}
        {listError && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{listError}</p>
            <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="mt-3 font-semibold underline">Try again</button>
          </div>
        )}
        {!isLoading && !listError && !listings.length && !isFormOpen && <p className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-slate-600">You have not created any listings yet.</p>}

        {!isLoading && listings.length > 0 && (
          <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing._id}
                listing={listing}
                footer={(
                  <div className="flex gap-3">
                    <button type="button" onClick={() => openEditForm(listing)} disabled={Boolean(deletingId)} className="text-sm font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-50">Edit</button>
                    <button type="button" onClick={() => deleteListing(listing._id)} disabled={Boolean(deletingId)} className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">
                      {deletingId === listing._id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                )}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  )
}

export default LandlordListingsPage
