import axios from 'axios'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const BASE_URL = import.meta.env.VITE_BASE_URL

const LABEL = 'block font-mono text-[10.5px] uppercase tracking-[.14em] text-faint'
const FIELD = 'mt-1.5 w-full rounded-xl border border-ink/20 bg-card px-3 py-2.5 font-sans text-[14px] tracking-normal text-ink normal-case outline-none transition-colors focus:border-ink disabled:opacity-55'

function RequestCallForm({ listingId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ mode: 'video', note: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isSent, setIsSent] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await axios.post(
        `${BASE_URL}/calls`,
        { listingId, mode: form.mode, note: form.note },
        { withCredentials: true },
      )

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to request the call')

      setIsSent(true)
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to request the call')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSent) {
    return (
      <div className="mt-3 rounded-2xl border border-forest/25 bg-forest/8 p-4">
        <p className="font-display text-[15px] font-semibold tracking-[-.02em] text-forest">Call requested</p>
        <p className="mt-1.5 text-[13.5px] leading-snug text-muted">The landlord will pick a date and time. You can join from your calls once they do.</p>
        <Link to="/calls" className="mt-2.5 inline-block text-[13.5px] font-medium underline underline-offset-2 transition-colors hover:text-clay">See your calls</Link>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-2.5 w-full cursor-pointer rounded-full border border-ink/20 px-5 py-3 text-[14.5px] font-medium transition-colors hover:border-ink hover:bg-ink hover:text-[#F7F5EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Request a call
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-ink/12 pt-4">
      <p className="font-display text-[15.5px] font-semibold tracking-[-.02em]">Request a call</p>
      <p className="mt-1 text-[12.5px] leading-snug text-muted">Ask for an appointment and the landlord will set a date and time of up to 30 minutes.</p>

      <label className={`mt-3.5 ${LABEL}`} htmlFor="mode">
        Call type
        <select id="mode" value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })} className={`${FIELD} cursor-pointer`}>
          <option value="video">Video call</option>
          <option value="voice">Voice call</option>
        </select>
      </label>
      <label className={`mt-3 ${LABEL}`} htmlFor="note">
        Note (optional)
        <textarea
          id="note"
          rows="2"
          maxLength="300"
          value={form.note}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
          placeholder="What would you like to discuss, and when are you free?"
          className={FIELD}
        />
      </label>

      {error && <p role="alert" className="mt-3 text-[13px] text-clay">{error}</p>}

      <button type="submit" disabled={isSubmitting} className="mt-4 w-full cursor-pointer rounded-full bg-ink px-5 py-3 text-[14.5px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-55">
        {isSubmitting ? 'Sending…' : 'Send request'}
      </button>
      <button type="button" onClick={() => setIsOpen(false)} className="mt-2.5 w-full cursor-pointer text-[13px] font-medium text-muted underline underline-offset-2 transition-colors hover:text-clay">Cancel</button>
    </form>
  )
}

export default RequestCallForm
