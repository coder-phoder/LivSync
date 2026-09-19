import axios from 'axios'
import { Phone, RefreshCw, Video } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LandlordNavbar from '../../Components/Landlord/LandlordNavbar'
import UserNavbar from '../../Components/User/UserNavbar'
import { when } from '../../Components/User/homeSignals'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const TICK_INTERVAL = 30 * 1000
const EMPTY_SCHEDULE = { callId: '', date: '', time: '', durationMinutes: 30 }
const SHELL = 'mx-auto w-full max-w-[1240px] px-5 sm:px-10 lg:px-16'

const SOLID = 'inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14.5px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-55'
const GHOST = 'inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/20 bg-card px-4 py-2.5 text-[14px] font-medium transition-colors hover:border-ink hover:bg-ink hover:text-[#F7F5EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-55'
const ON_DARK = 'inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#F4F1EA]/30 px-4 py-2.5 text-[14px] font-medium text-[#F4F1EA] transition-colors hover:bg-[#F4F1EA]/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-55'
const EYEBROW = 'font-mono text-[10.5px] uppercase tracking-[.16em] text-faint'
const FIELD = 'mt-1.5 w-full rounded-xl border border-ink/20 bg-card px-3 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-ink'

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function formatWindow(call) {
  const startAt = new Date(call.startAt)
  const endAt = new Date(call.endAt)
  const time = (value) => value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

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

// One state per call drives its group, its pill and which actions it gets.
function stateOf(call, now) {
  if (call.status === 'cancelled') return 'cancelled'
  if (isOver(call, now)) return 'finished'
  if (call.status === 'requested') return 'requested'

  return isJoinable(call, now) ? 'live' : 'upcoming'
}

function countdown(startAt, now) {
  const minutes = Math.round((Date.parse(startAt) - now) / 60000)

  if (!Number.isFinite(minutes)) return ''

  return Math.abs(minutes) >= 60 ? relative.format(Math.round(minutes / 60), 'hour') : relative.format(minutes, 'minute')
}

const PILLS = {
  live: 'border-forest bg-forest text-lime',
  upcoming: 'border-sand bg-sand/25 text-ink-soft',
  requested: 'border-ink/20 bg-ink/5 text-muted',
  finished: 'border-ink/12 bg-ink/4 text-faint',
  cancelled: 'border-clay/35 bg-clay/10 text-clay',
}

function labelOf(call, state, role) {
  if (state === 'cancelled') return call.cancelledBy === 'landlord' ? 'Declined by landlord' : 'Cancelled by tenant'
  if (state === 'requested') return role === 'landlord' ? 'Needs a time' : 'Awaiting a time'
  if (state === 'finished') return 'Finished'

  return state === 'live' ? 'Live now' : 'Scheduled'
}

function ScheduleForm({ schedule, error, isBusy, onChange, onSubmit, onClose }) {
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 border-t border-ink/10 pt-4 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end">
      <label className="block">
        <span className={EYEBROW}>Date</span>
        <input type="date" required min={new Date().toISOString().slice(0, 10)} value={schedule.date} onChange={(event) => onChange({ ...schedule, date: event.target.value })} className={FIELD} />
      </label>
      <label className="block">
        <span className={EYEBROW}>Starts</span>
        <input type="time" required value={schedule.time} onChange={(event) => onChange({ ...schedule, time: event.target.value })} className={FIELD} />
      </label>
      <label className="block">
        <span className={EYEBROW}>Length</span>
        <select value={schedule.durationMinutes} onChange={(event) => onChange({ ...schedule, durationMinutes: event.target.value })} className={`${FIELD} cursor-pointer`}>
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={isBusy} className={SOLID}>{isBusy ? 'Saving…' : 'Confirm time'}</button>
        <button type="button" onClick={onClose} className="cursor-pointer text-[14px] font-medium text-muted underline underline-offset-2 transition-colors hover:text-clay">Cancel</button>
      </div>
      {error && <p role="alert" className="text-[13.5px] text-clay sm:col-span-4">{error}</p>}
    </form>
  )
}

// The one call worth acting on right now, lifted out of the list and given the whole width.
function NextCall({ call, state, now, role, isBusy, actions }) {
  const Icon = call.mode === 'voice' ? Phone : Video
  const isLive = state === 'live'

  return (
    <section className="mt-8 rounded-[26px] border border-forest bg-forest p-6 text-[#F4F1EA] shadow-[0_34px_60px_-44px_rgba(19,50,42,.95)] sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[.16em] text-forest-mute">
            {isLive && <span aria-hidden className="size-2 rounded-full bg-lime animate-pulse-ring" />}
            {isLive ? 'Live now' : 'Next call'}
          </p>
          <h2 className="mt-3.5 font-display text-[28px] leading-[1.05] font-bold tracking-[-.035em] text-balance sm:text-[38px]">
            {call.mode === 'voice' ? 'Voice call' : 'Video call'} with {call.counterpart?.name || 'Unknown'}
          </h2>
          <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] text-forest-mute">
            <Icon aria-hidden className="size-4" />
            {when(call.startAt)}
            <span aria-hidden>·</span>
            {call.listing?.title || 'Listing removed'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isLive ? (
            <button type="button" onClick={() => actions.join(call)} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-lime px-6 py-3 text-[15px] font-semibold text-forest-deep transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime">
              Join now
            </button>
          ) : (
            <span className="rounded-full border border-[#F4F1EA]/25 px-4 py-2.5 text-[14px] font-medium tabular-nums">Starts {countdown(call.startAt, now)}</span>
          )}
          {role === 'landlord' && <button type="button" onClick={() => actions.openSchedule(call)} className={ON_DARK}>Reschedule</button>}
          <button type="button" onClick={() => actions.cancelCall(call)} disabled={isBusy} className={ON_DARK}>Cancel</button>
        </div>
      </div>
    </section>
  )
}

function CallRow({ call, state, role, isBusy, scheduleProps, actions }) {
  const Icon = call.mode === 'voice' ? Phone : Video
  const isClosed = state === 'finished' || state === 'cancelled'

  return (
    <li className={`rounded-[20px] border border-ink/15 bg-card p-4 transition-colors sm:p-5 ${isClosed ? 'opacity-70' : 'hover:border-ink/30'}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 gap-3.5">
          <span aria-hidden className={`grid size-11 shrink-0 place-items-center rounded-2xl ${isClosed ? 'bg-ink/6 text-faint' : 'bg-forest text-lime'}`}>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[17px] font-semibold tracking-[-.025em]">{call.counterpart?.name || 'Unknown'}</p>
            <p className="mt-1 text-[13.5px] text-muted">
              {call.mode === 'voice' ? 'Voice' : 'Video'} · {call.startAt ? formatWindow(call) : 'No time set yet'}
            </p>
            <p className="mt-0.5 truncate text-[13.5px] text-faint">
              {call.listing?.title || 'Listing removed'}{call.listing?.city ? ` · ${call.listing.city}` : ''}
            </p>
            {call.note && <p className="mt-2 border-l-2 border-ink/15 pl-3 text-[13.5px] leading-snug text-ink-soft">{call.note}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[12.5px] font-medium ${PILLS[state]}`}>{labelOf(call, state, role)}</span>
          {state === 'live' && <button type="button" onClick={() => actions.join(call)} className={SOLID}>Join now</button>}
          {role === 'landlord' && !isClosed && (
            <button type="button" onClick={() => actions.openSchedule(call)} className={GHOST}>
              {call.status === 'requested' ? 'Set a time' : 'Reschedule'}
            </button>
          )}
          {!isClosed && (
            <button type="button" onClick={() => actions.cancelCall(call)} disabled={isBusy} className={GHOST}>
              {role === 'landlord' && call.status === 'requested' ? 'Decline' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      {scheduleProps && <ScheduleForm {...scheduleProps} isBusy={isBusy} />}
    </li>
  )
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
  const isLandlord = role === 'landlord'

  const handleError = useCallback((requestError, fallback) => {
    if (requestError.response?.status === 401) {
      clearSession()
      navigate(role === 'landlord' ? '/landlord/login' : '/user/login', { replace: true })
    }

    return requestError.response?.data?.message || requestError.message || fallback
  }, [clearSession, navigate, role])

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

  const refresh = () => {
    setIsLoading(true)
    setRefreshToken((token) => token + 1)
  }

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
      setRefreshToken((token) => token + 1)
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

      setRefreshToken((token) => token + 1)
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

  const actions = { join: (call) => navigate(`/calls/${call.id}/room`), openSchedule, cancelCall }

  // The list arrives sorted by time, so grouping keeps that order inside each group for free.
  const states = calls.map((call) => [call, stateOf(call, now)])
  const next = states.find(([, state]) => state === 'live') || states.find(([, state]) => state === 'upcoming')
  const groups = [
    ['live', 'Live now'],
    ['requested', isLandlord ? 'Needs a time from you' : 'Waiting for a time'],
    ['upcoming', 'Upcoming'],
    ['finished', 'Past'],
    ['cancelled', 'Cancelled'],
  ].map(([key, title]) => [key, title, states.filter(([call, state]) => state === key && call.id !== next?.[0].id)])
    .filter(([, , rows]) => rows.length)

  const scheduleFor = (call) => (schedule.callId === call.id
    ? { schedule, error: formError, onChange: setSchedule, onSubmit: submitSchedule, onClose: () => setSchedule(EMPTY_SCHEDULE) }
    : null)

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-paper text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[linear-gradient(to_right,rgba(21,19,15,.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(21,19,15,.055)_1px,transparent_1px)] bg-[size:74px_74px]"
        style={{ maskImage: 'radial-gradient(105% 62% at 22% 0%, #000 16%, transparent 76%)', WebkitMaskImage: 'radial-gradient(105% 62% at 22% 0%, #000 16%, transparent 76%)' }}
      />
      <Navbar />

      <main className={`${SHELL} relative pb-20 pt-10 lg:pt-14`}>
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <p className={EYEBROW}>Video and voice</p>
            <h1 className="mt-4 font-display text-[34px] leading-[1.0] font-bold tracking-[-.04em] sm:text-5xl">Calls</h1>
            <p className="mt-3 max-w-[46em] text-[15px] leading-relaxed text-muted">
              {isLandlord
                ? 'Tenants ask for a call and you set the date and time. A call lasts at most 30 minutes and the room is open only between its start and end.'
                : 'Ask for a call from a listing. Once the landlord sets a time you can join any moment between its start and end.'}
            </p>
          </div>
          <button type="button" onClick={refresh} disabled={isLoading} className={GHOST}>
            <RefreshCw aria-hidden className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </header>

        {error && <p role="alert" className="mt-7 rounded-2xl border border-clay/30 bg-clay/8 p-4 text-[14.5px] text-clay">{error}</p>}

        {isLoading && (
          <div className="mt-8 grid gap-4" aria-busy="true" aria-label="Loading calls">
            <span className="h-36 animate-pulse rounded-[26px] bg-ink/6" />
            {[0, 1].map((row) => <span key={row} className="h-24 animate-pulse rounded-[20px] bg-ink/6" />)}
          </div>
        )}

        {!isLoading && !calls.length && (
          <div className="mt-8 max-w-xl rounded-[22px] border border-dashed border-ink/25 bg-ink/3 p-7">
            <p className="text-[15.5px] leading-relaxed text-muted">
              {isLandlord
                ? 'No tenant has asked for a call yet. Requests land here the moment one is sent.'
                : 'No calls yet. Open a listing you like and ask the landlord for a video or voice call.'}
            </p>
          </div>
        )}

        {!isLoading && next && (
          <NextCall call={next[0]} state={next[1]} now={now} role={role} isBusy={busyId === next[0].id} actions={actions} />
        )}

        {!isLoading && next && schedule.callId === next[0].id && (
          <div className="mt-4 rounded-[20px] border border-ink/15 bg-card px-5 pb-5">
            <ScheduleForm {...scheduleFor(next[0])} isBusy={busyId === next[0].id} />
          </div>
        )}

        {groups.map(([key, title, rows]) => (
          <section key={key} className="mt-10" aria-labelledby={`calls-${key}`}>
            <h2 id={`calls-${key}`} className={EYEBROW}>{title} <span className="tabular-nums opacity-70">({rows.length})</span></h2>
            <ul className="mt-4 grid gap-3">
              {rows.map(([call, state]) => (
                <CallRow
                  key={call.id}
                  call={call}
                  state={state}
                  role={role}
                  isBusy={busyId === call.id}
                  scheduleProps={scheduleFor(call)}
                  actions={actions}
                />
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  )
}

export default CallsPage
