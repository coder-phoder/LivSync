import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import RequiredDocumentsPicker from './RequiredDocumentsPicker'

const BASE_URL = import.meta.env.VITE_BASE_URL

const LABEL = 'block font-mono text-[10.5px] uppercase tracking-[.14em] text-faint'
const FIELD = 'mt-1.5 w-full rounded-xl border border-ink/20 bg-card px-3 py-2.5 font-sans text-[14px] tracking-normal text-ink normal-case outline-none transition-colors focus:border-ink disabled:opacity-55'

// How the requester states their share; the buddy covers whatever is left of the total.
const SPLIT_MODES = [['even', 'Split evenly (50 / 50)'], ['percent', 'By percentage'], ['amount', 'By amount']]

const today = () => new Date().toISOString().slice(0, 10)
const formatAmount = (value) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value) || 0)}`

// Mirrors the server: the asked-for share is clamped so both tenants still owe something.
function previewShares(totalDue, mode, value) {
  if (!totalDue || totalDue < 2) return null

  const asked = mode === 'amount' ? Number(value) : (totalDue * Number(value)) / 100
  const mine = Math.min(Math.max(Math.round(asked) || 0, 1), totalDue - 1)

  return { mine, theirs: totalDue - mine }
}

function RentalRequestForm({ listingId, totalDue = 0, documentRequirements = [] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ moveInDate: today(), durationMonths: 12, occupants: 1, note: '', message: '', buddyId: '', splitMode: 'even', splitValue: 50 })
  const [buddies, setBuddies] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isSent, setIsSent] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState([])

  // Only matched buddies can be named on a request, so the list is the server's answer.
  useEffect(() => {
    if (!isOpen) return

    axios.get(`${BASE_URL}/buddies`, { withCredentials: true })
      .then((response) => setBuddies(response.data?.data?.buddies || []))
      .catch(() => setBuddies([]))
  }, [isOpen])

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
      // Changing how the split is stated resets the figure to an even share of the costs.
      ...(name === 'splitMode' ? { splitValue: value === 'amount' ? Math.round(totalDue / 2) || 1 : 50 } : {}),
    }))
  }

  const shares = form.buddyId ? previewShares(totalDue, form.splitMode === 'even' ? 'percent' : form.splitMode, form.splitMode === 'even' ? 50 : form.splitValue) : null
  const buddyName = buddies.find((buddy) => buddy.peer.id === form.buddyId)?.peer?.name || 'your buddy'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await axios.post(
        `${BASE_URL}/rentals`,
        {
          listingId,
          message: form.message,
          buddyId: form.buddyId || undefined,
          split: form.splitMode === 'even'
            ? { mode: 'percent', value: 50 }
            : { mode: form.splitMode, value: Number(form.splitValue) },
          preferences: {
            moveInDate: form.moveInDate,
            durationMonths: Number(form.durationMonths),
            occupants: Number(form.occupants),
            note: form.note,
          },
          documents: selectedDocuments,
        },
        { withCredentials: true },
      )

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to send your request')

      setIsSent(true)
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to send your request')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSent) {
    return (
      <div className="mt-4 rounded-2xl border border-forest/25 bg-forest/8 p-4">
        <p className="font-display text-[15px] font-semibold tracking-[-.02em] text-forest">Request sent</p>
        <p className="mt-1.5 text-[13.5px] leading-snug text-muted">The landlord will review the profile and preferences of everyone on the request and reply. Payment opens once they accept.</p>
        <Link to="/rentals" className="mt-2.5 inline-block text-[13.5px] font-medium underline underline-offset-2 transition-colors hover:text-clay">Track your requests</Link>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-4 w-full cursor-pointer rounded-full bg-ink px-5 py-3 text-[14.5px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Request to rent
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-ink/12 pt-4">
      <p className="font-display text-[15.5px] font-semibold tracking-[-.02em]">Request to rent</p>
      <p className="text-[12.5px] leading-snug text-muted">Your name, contact details and the preferences below are shared with the landlord.</p>
      <label className={LABEL} htmlFor="moveInDate">
        Move-in date
        <input id="moveInDate" name="moveInDate" type="date" min={today()} value={form.moveInDate} onChange={handleChange} required className={FIELD} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={LABEL} htmlFor="durationMonths">
          Months
          <input id="durationMonths" name="durationMonths" type="number" min="1" max="120" value={form.durationMonths} onChange={handleChange} required className={FIELD} />
        </label>
        <label className={LABEL} htmlFor="occupants">
          Occupants
          <input id="occupants" name="occupants" type="number" min="1" max="20" value={form.occupants} onChange={handleChange} required className={FIELD} />
        </label>
      </div>
      {buddies.length > 0 && (
        <>
          <label className={LABEL} htmlFor="buddyId">
            Apply with a buddy
            <select id="buddyId" name="buddyId" value={form.buddyId} onChange={handleChange} className={FIELD}>
              <option value="">On my own</option>
              {buddies.map((buddy) => <option key={buddy.id} value={buddy.peer.id}>{buddy.peer.name}</option>)}
            </select>
          </label>
          {form.buddyId && (
            <div className="space-y-3 rounded-2xl border border-ink/12 bg-paper/60 p-3.5">
              <label className={LABEL} htmlFor="splitMode">
                Cost split
                <select id="splitMode" name="splitMode" value={form.splitMode} onChange={handleChange} className={FIELD}>
                  {SPLIT_MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              {form.splitMode !== 'even' && (
                <label className={LABEL} htmlFor="splitValue">
                  {form.splitMode === 'percent' ? 'Your share (%)' : 'Your share (₹)'}
                  <input
                    id="splitValue"
                    name="splitValue"
                    type="number"
                    min={form.splitMode === 'percent' ? 10 : 1}
                    max={form.splitMode === 'percent' ? 90 : undefined}
                    step="1"
                    value={form.splitValue}
                    onChange={handleChange}
                    required
                    className={FIELD}
                  />
                </label>
              )}
              {shares && (
                <p className="text-[12.5px] leading-snug text-muted">
                  You pay <span className="font-semibold">{formatAmount(shares.mine)}</span>, {buddyName} pays <span className="font-semibold">{formatAmount(shares.theirs)}</span>
                  <span className="mt-1 block text-faint">Based on today&apos;s listed costs. The landlord freezes the exact total when they accept, and your buddy covers the rest of it.</span>
                </p>
              )}
              <p className="text-[12.5px] leading-snug text-faint">Agree this in your BuddyUp chat first. Each of you pays your own share, and the agreement is issued once both have paid.</p>
            </div>
          )}
        </>
      )}
      <label className={LABEL} htmlFor="note">
        Living preferences (optional)
        <input id="note" name="note" type="text" maxLength={500} value={form.note} onChange={handleChange} placeholder="Non-smoker, works from home, no pets" className={FIELD} />
      </label>
      <label className={LABEL} htmlFor="message">
        Message to the landlord
        <textarea id="message" name="message" rows={3} minLength={10} maxLength={1000} value={form.message} onChange={handleChange} required placeholder="Introduce yourself and say why this place suits you." className={FIELD} />
      </label>
      <RequiredDocumentsPicker
        requirements={documentRequirements}
        selectedDocuments={selectedDocuments}
        onChange={setSelectedDocuments}
        disabled={isSubmitting}
        title="Documents requested by this landlord"
      />
      {error && <p role="alert" className="text-[13px] text-clay">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isSubmitting} className="flex-1 cursor-pointer rounded-full bg-ink px-5 py-3 text-[14.5px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-55">
          {isSubmitting ? 'Sending…' : 'Send request'}
        </button>
        <button type="button" onClick={() => setIsOpen(false)} className="cursor-pointer rounded-full border border-ink/20 px-4 py-3 text-[14px] font-medium transition-colors hover:border-ink hover:bg-ink hover:text-[#F7F5EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">Cancel</button>
      </div>
    </form>
  )
}

export default RentalRequestForm
