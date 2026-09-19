import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LandlordNavbar from '../../Components/Landlord/LandlordNavbar'
import UserNavbar from '../../Components/User/UserNavbar'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const TICK_INTERVAL = 30 * 1000
const EMPTY_SCHEDULE = { callId: '', date: '', time: '', durationMinutes: 30 }

function formatWindow(call) {
  const startAt = new Date(call.startAt)
  const endAt = new Date(call.endAt)
  const time = (value) => value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return `${startAt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${time(startAt)} – ${time(endAt)}`
}

// A call with no time set yet is never over; once its window passes, nothing can be done with it.
function isOver(call, now) {
  return Boolean(call.endAt) && new Date(call.endAt).getTime() <= now
}

// Mirrors the server rule so the button turns live on its own; the token endpoint is the real gate.
function isJoinable(call, now) {
  return call.status === 'scheduled' && now >= new Date(call.startAt).getTime() && now < new Date(call.endAt).getTime()
}

function CallsPage() {
  const { role, clearSession } = useAuth()
  const navigate = useNavigate()

  const [calls, setCalls] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  // Only one call is being given a time at a time, so one form serves the whole list.
  const [schedule, setSchedule] = useState(EMPTY_SCHEDULE)

  const Navbar = role === 'landlord' ? LandlordNavbar : UserNavbar

  const handleError = useCallback((requestError, fallback) => {
    if (requestError.response?.status === 401) {
      clearSession()
      navigate('/login', { replace: true })
    }

    return requestError.response?.data?.message || requestError.message || fallback
  }, [clearSession, navigate])

  useEffect(() => {
    let isCurrent = true

    const loadCalls = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/calls`, { withCredentials: true })

        if (!response.data?.success) throw new Error(response.data?.message || 'Unable to load calls')
        if (!isCurrent) return

        setCalls(response.data.data.calls)
        setError('')
      } catch (requestError) {
        if (isCurrent) setError(handleError(requestError, 'Unable to load calls'))
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadCalls()

    return () => {
      isCurrent = false
    }
  }, [handleError, refreshToken])

  // Keeps the join buttons in step with the clock without polling the server.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_INTERVAL)

    return () => clearInterval(timer)
  }, [])

  const refresh = () => setRefreshToken((token) => token + 1)

  const submitSchedule = async (event) => {
    event.preventDefault()
    setFormError('')

    const startAt = new Date(`${schedule.date}T${schedule.time}`)

    if (Number.isNaN(startAt.getTime())) {
      setFormError('Pick a date and a start time')
      return
    }

    setBusyId(schedule.callId)

    try {
      const response = await axios.patch(
        `${BASE_URL}/calls/${schedule.callId}/schedule`,
        { startAt: startAt.toISOString(), durationMinutes: Number(schedule.durationMinutes) },
        { withCredentials: true },
      )

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to schedule the call')

      setSchedule(EMPTY_SCHEDULE)
      refresh()
    } catch (requestError) {
      setFormError(handleError(requestError, 'Unable to schedule the call'))
    } finally {
      setBusyId('')
    }
  }

  const cancelCall = async (call) => {
    setError('')
    setBusyId(call.id)

    try {
      const response = await axios.post(`${BASE_URL}/calls/${call.id}/cancel`, {}, { withCredentials: true })

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to cancel the call')

      refresh()
    } catch (requestError) {
      setError(handleError(requestError, 'Unable to cancel the call'))
    } finally {
      setBusyId('')
    }
  }

  const openSchedule = (call) => {
    const startAt = call.startAt ? new Date(call.startAt) : null

    setFormError('')
    setSchedule({
      callId: call.id,
      // Rescheduling starts from the time already set, in the landlord's own timezone.
      date: startAt ? new Date(startAt.getTime() - startAt.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '',
      time: startAt ? startAt.toTimeString().slice(0, 5) : '',
      durationMinutes: startAt ? Math.round((new Date(call.endAt) - startAt) / 60000) : 30,
    })
  }

  const statusLabel = (call) => {
    if (call.status === 'cancelled') return call.cancelledBy === 'landlord' ? 'Declined by landlord' : 'Cancelled by tenant'
    if (call.status === 'requested') return role === 'landlord' ? 'Waiting for you to set a time' : 'Waiting for the landlord to set a time'
    if (isOver(call, now)) return 'Finished'

    return isJoinable(call, now) ? 'Live now' : 'Scheduled'
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Video and voice</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600">
          {role === 'landlord'
            ? 'Tenants ask for a call and you set the date and time. A call lasts at most 30 minutes and the room is open only between its start and end.'
            : 'Ask for a call from a listing. Once the landlord sets a time you can join any moment between its start and end.'}
        </p>

        {error && <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <section className="mt-8 rounded-xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-5 py-3 font-semibold">Your calls</h2>
          {isLoading && <p className="px-5 py-5 text-sm text-slate-600">Loading calls…</p>}
          {!isLoading && !calls.length && (
            <p className="px-5 py-5 text-sm text-slate-600">
              {role === 'landlord' ? 'No tenant has asked for a call yet.' : 'Open a listing and request a call with the landlord.'}
            </p>
          )}
          <ul className="divide-y divide-slate-200">
            {calls.map((call) => (
              <li key={call.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-semibold">{call.counterpart?.name || 'Unknown'}</p>
                    <p className="mt-1 text-slate-600">
                      {call.mode === 'voice' ? 'Voice call' : 'Video call'} · {call.startAt ? formatWindow(call) : 'No time set yet'}
                    </p>
                    <p className="mt-1 text-slate-500">{call.listing?.title || 'Listing removed'}</p>
                    {call.note && <p className="mt-1 text-slate-500">“{call.note}”</p>}
                    <p className="mt-1 font-medium text-slate-700">{statusLabel(call)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {isJoinable(call, now) && (
                      <button
                        type="button"
                        onClick={() => navigate(`/calls/${call.id}/room`)}
                        className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
                      >
                        Join now
                      </button>
                    )}
                    {role === 'landlord' && call.status !== 'cancelled' && !isOver(call, now) && (
                      <button
                        type="button"
                        onClick={() => openSchedule(call)}
                        className="rounded-md border border-slate-900 px-3 py-2 font-medium text-slate-900 hover:bg-slate-100"
                      >
                        {call.status === 'requested' ? 'Set a time' : 'Reschedule'}
                      </button>
                    )}
                    {call.status !== 'cancelled' && !isOver(call, now) && (
                      <button
                        type="button"
                        onClick={() => cancelCall(call)}
                        disabled={busyId === call.id}
                        className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {role === 'landlord' && call.status === 'requested' ? 'Decline' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>

                {schedule.callId === call.id && (
                  <form onSubmit={submitSchedule} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-200 pt-4">
                    <label className="text-sm">
                      <span className="block font-medium text-slate-700">Date</span>
                      <input
                        type="date"
                        required
                        value={schedule.date}
                        onChange={(event) => setSchedule({ ...schedule, date: event.target.value })}
                        className="mt-1 rounded-md border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="block font-medium text-slate-700">Starts</span>
                      <input
                        type="time"
                        required
                        value={schedule.time}
                        onChange={(event) => setSchedule({ ...schedule, time: event.target.value })}
                        className="mt-1 rounded-md border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="block font-medium text-slate-700">Length</span>
                      <select
                        value={schedule.durationMinutes}
                        onChange={(event) => setSchedule({ ...schedule, durationMinutes: event.target.value })}
                        className="mt-1 rounded-md border border-slate-300 px-3 py-2"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                      </select>
                    </label>
                    <button
                      type="submit"
                      disabled={busyId === call.id}
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyId === call.id ? 'Saving…' : 'Confirm time'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedule(EMPTY_SCHEDULE)}
                      className="text-sm font-medium text-slate-600 underline"
                    >
                      Cancel
                    </button>
                    {formError && <p className="w-full text-sm text-red-600">{formError}</p>}
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

export default CallsPage
