import axios from 'axios'
import { ChevronDown, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LandlordNavbar from '../../Components/Landlord/LandlordNavbar'
import ApplicationTracker from '../../Components/Rentals/ApplicationTracker'
import RequiredDocumentsPicker from '../../Components/Rentals/RequiredDocumentsPicker'
import UserNavbar from '../../Components/User/UserNavbar'
import { useAuth } from '../../Context/AuthContext'
import { downloadFile, openFile } from '../../download'

const BASE_URL = import.meta.env.VITE_BASE_URL
const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
const SHELL = 'mx-auto w-full max-w-[1240px] px-5 sm:px-10 lg:px-16'

const SOLID = 'inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14.5px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-55'
const GHOST = 'inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/20 bg-card px-5 py-2.5 text-[14.5px] font-medium transition-colors hover:border-ink hover:bg-ink hover:text-[#F7F5EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-55'
const EYEBROW = 'font-mono text-[10.5px] uppercase tracking-[.16em] text-faint'
const NOTE = 'basis-full text-[13px] leading-snug text-faint'

const STATUS = {
  pending: { label: 'Awaiting decision', chip: 'border-sand bg-sand/25 text-ink-soft' },
  accepted: { label: 'Accepted', chip: 'border-forest/30 bg-forest/10 text-forest' },
  paid: { label: 'Settled', chip: 'border-forest bg-forest text-lime' },
  rejected: { label: 'Declined', chip: 'border-clay/35 bg-clay/10 text-clay' },
}

const FILTERS = [['all', 'All'], ['pending', 'Pending'], ['accepted', 'Accepted'], ['paid', 'Settled'], ['rejected', 'Declined']]

function formatAmount(value) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value) || 0)}`
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

const labelOf = (value) => String(value || '').replaceAll('-', ' ')

// The lifestyle answers a landlord is deciding on, flattened into chips.
function lifestyleChips(lifestyle) {
  if (!lifestyle) return []

  return [
    lifestyle.occupation,
    lifestyle.city && `City: ${lifestyle.city}`,
    (lifestyle.budget?.min || lifestyle.budget?.max) && `Budget ${formatAmount(lifestyle.budget.min)}–${formatAmount(lifestyle.budget.max)}`,
    `Sleep: ${labelOf(lifestyle.sleepSchedule)}`,
    `Schedule: ${labelOf(lifestyle.workSchedule)}`,
    `Cleanliness ${lifestyle.cleanliness}/5`,
    `Noise ${lifestyle.noiseTolerance}/5`,
    `Food: ${labelOf(lifestyle.foodHabits)}`,
    labelOf(lifestyle.smoking),
    `Drinks ${labelOf(lifestyle.drinking)}`,
    labelOf(lifestyle.pets),
    `Guests ${labelOf(lifestyle.guests)}`,
    ...(lifestyle.interests || []),
  ].filter(Boolean)
}

// Once the landlord accepts, the frozen shares are the truth; before that it is what was asked for.
function splitLabel(rental) {
  const shares = rental.tenants.map((tenant) => tenant.payment?.share).filter(Boolean)

  if (shares.length === 2) return `${shares[0]} / ${shares[1]}`
  if (rental.split?.mode === 'amount') return `${formatAmount(rental.split.value)} + the rest`

  return `${rental.split?.value ?? 50} / ${100 - (rental.split?.value ?? 50)}`
}

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true)

  return new Promise((resolve) => {
    const script = document.createElement('script')

    script.src = CHECKOUT_SRC
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function Row({ label, value, strong = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-ink/10 pt-2.5 first:border-0 first:pt-0">
      <dt className="text-[13.5px] text-muted">{label}</dt>
      <dd className={`text-right tabular-nums ${strong ? 'font-display text-[17px] font-bold tracking-[-.03em]' : 'text-[14px] font-medium text-ink-soft'}`}>{value}</dd>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="rounded-2xl border border-ink/12 bg-paper/60 p-4">
      <h3 className={EYEBROW}>{title}</h3>
      <dl className="mt-3 grid gap-2.5">{children}</dl>
    </div>
  )
}

// Everything heavy on a card folds away behind the native disclosure; no state, no library.
function Fold({ summary, hint, children }) {
  return (
    <details className="group rounded-2xl border border-ink/12 bg-paper/50 open:bg-paper/70">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
        <span className="font-display text-[15.5px] font-semibold tracking-[-.02em]">{summary}</span>
        {hint && <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{hint}</span>}
        <ChevronDown aria-hidden className="ml-auto size-4 shrink-0 text-faint transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-ink/10 p-4">{children}</div>
    </details>
  )
}

function TenantPanel({ tenant, isLandlord, showContact }) {
  const chips = lifestyleChips(tenant.lifestyle)

  return (
    <div className="rounded-xl border border-ink/12 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-[15.5px] font-semibold tracking-[-.02em]">
          {tenant.name}
          {tenant.mine && <span className="ml-2 font-sans text-[12px] font-normal text-faint">(you)</span>}
        </p>
        {tenant.payment && (
          <span className={`rounded-full border px-3 py-1 text-[12px] font-medium tabular-nums ${tenant.payment.paid ? 'border-forest/30 bg-forest/10 text-forest' : 'border-ink/15 bg-ink/4 text-muted'}`}>
            {tenant.payment.share}% · {formatAmount(tenant.payment.amount)} · {tenant.payment.paid ? `paid ${labelOf(tenant.payment.mode)}` : 'unpaid'}
          </span>
        )}
      </div>
      {showContact && <p className="mt-1.5 text-[13.5px] break-words text-muted">{tenant.email} · {tenant.phone} · {labelOf(tenant.gender)}</p>}
      {tenant.lifestyle?.bio && <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{tenant.lifestyle.bio}</p>}
      {isLandlord && chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip) => <li key={chip} className="rounded-full border border-ink/12 bg-ink/4 px-2.5 py-1 text-[12px] capitalize text-ink-soft">{chip}</li>)}
        </ul>
      )}
    </div>
  )
}

function TenantDocumentEditor({ rental, tenantDocuments, isBusy, onSave }) {
  const [selections, setSelections] = useState(() => (tenantDocuments?.requirements || [])
      .filter((requirement) => requirement.document?.id)
      .map((requirement) => ({ requirementId: requirement.requirementId, documentId: requirement.document.id })))

  const saveDocuments = (event) => {
    event.preventDefault()
    onSave(selections)
  }

  return (
    <form onSubmit={saveDocuments}>
      <RequiredDocumentsPicker
        requirements={rental.documentRequirements}
        selectedDocuments={selections}
        onChange={setSelections}
        disabled={isBusy}
        title="Documents requested for this application"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isBusy} className={SOLID}>{isBusy ? 'Saving…' : 'Share selected documents'}</button>
        <p className={NOTE}>Only these selected files are visible to this landlord. You can change them until the landlord decides.</p>
      </div>
    </form>
  )
}

function SharedDocuments({ rental, isLandlord, isBusy, onSave, onDownload }) {
  if (!rental.documentRequirements?.length) return null

  if (!isLandlord) {
    const mine = rental.tenantDocuments?.find((tenant) => tenant.mine)

    if (rental.status !== 'pending') {
      return (
        <Fold summary="Requested documents" hint={mine?.complete ? 'Shared with the landlord' : 'Nothing was shared'}>
          <ul className="flex flex-wrap gap-2">
            {(mine?.requirements || []).map((requirement) => (
              <li key={requirement.requirementId} className={`rounded-full border px-3 py-1 text-[12.5px] font-medium ${requirement.document ? 'border-forest/30 bg-forest/10 text-forest' : 'border-clay/30 bg-clay/10 text-clay'}`}>
                {requirement.name}: {requirement.document ? 'shared' : 'not shared'}
              </li>
            ))}
          </ul>
        </Fold>
      )
    }

    return (
      <TenantDocumentEditor
        key={`${rental.id}-${(mine?.requirements || []).map((requirement) => requirement.document?.id || '').join('-')}`}
        rental={rental}
        tenantDocuments={mine}
        isBusy={isBusy}
        onSave={onSave}
      />
    )
  }

  const shared = (rental.tenantDocuments || [])

  return (
    <Fold summary="Requested documents" hint={shared.every((tenant) => tenant.complete) ? 'All shared' : 'Some missing'}>
      <div className="grid gap-3 md:grid-cols-2">
        {shared.map((tenant) => (
          <div key={tenant.tenantId} className="rounded-xl border border-ink/12 bg-card p-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14.5px] font-medium">{tenant.tenantName}</p>
              <span className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${tenant.complete ? 'border-forest/30 bg-forest/10 text-forest' : 'border-clay/30 bg-clay/10 text-clay'}`}>{tenant.complete ? 'Complete' : 'Missing'}</span>
            </div>
            <ul className="mt-3 grid">
              {tenant.requirements.map((requirement) => (
                <li key={requirement.requirementId} className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 py-2 text-[13.5px] first:border-0 first:pt-0">
                  <span className="text-muted">{requirement.name}</span>
                  {requirement.document ? (
                    <button type="button" onClick={() => onDownload(`/tenant-documents/${requirement.document.id}/download`, requirement.document.label)} className="cursor-pointer font-medium underline underline-offset-2 transition-colors hover:text-clay">
                      {requirement.document.label}
                    </button>
                  ) : <span className="text-[12.5px] font-medium text-clay">Not shared</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Fold>
  )
}

function RentalCard({ rental, isLandlord, isBusy, actions }) {
  const { myPayment } = rental
  const status = STATUS[rental.status] || { label: rental.status, chip: 'border-ink/15 bg-ink/5 text-muted' }
  const awaitingConfirmation = rental.tenants.filter((tenant) => tenant.payment?.mode === 'in-person' && !tenant.payment.paid)
  const unpaidOthers = rental.tenants.filter((tenant) => !tenant.mine && tenant.payment && !tenant.payment.paid)
  const counterparty = isLandlord
    ? rental.tenants.map((tenant) => tenant.name).join(' and ') || 'Tenant'
    : rental.landlord?.name || 'Landlord'

  return (
    <article className="overflow-hidden rounded-[22px] border border-ink/15 bg-card shadow-[0_28px_50px_-42px_rgba(21,19,15,.55)]">
      <div className="border-b border-ink/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h2 className="font-display text-[21px] leading-tight font-bold tracking-[-.035em] sm:text-2xl">
              {rental.listing
                ? <Link to={`/listings/${rental.listing.id}`} className="transition-colors hover:text-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">{rental.listing.title}</Link>
                : 'Listing removed'}
            </h2>
            <p className="mt-1.5 text-[13.5px] text-muted">
              {isLandlord ? 'From' : 'Listed by'} {counterparty} · sent {formatDate(rental.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {rental.isBuddyRequest && <span className="rounded-full border border-ink/15 bg-ink/4 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[.12em] text-ink-soft">BuddyUp {splitLabel(rental)}</span>}
            <span className={`rounded-full border px-3 py-1 text-[12.5px] font-medium ${status.chip}`}>{status.label}</span>
          </div>
        </div>

        <ApplicationTracker rental={rental} />
      </div>

      <div className="grid items-start gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_270px] lg:gap-7">
        <div className="grid gap-4">
          <blockquote className="border-l-2 border-clay pl-4">
            <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap text-ink-soft">{rental.message}</p>
            {rental.preferences.note && <footer className="mt-2 text-[13px] text-faint">Preferences: {rental.preferences.note}</footer>}
          </blockquote>

          <Fold summary={`Applicants (${rental.tenants.length})`} hint={rental.tenants.map((tenant) => tenant.name).join(', ')}>
            <div className="grid gap-3">
              {rental.tenants.map((tenant) => (
                <TenantPanel key={tenant.id} tenant={tenant} isLandlord={isLandlord} showContact={isLandlord} />
              ))}
            </div>
          </Fold>

          <SharedDocuments
            rental={rental}
            isLandlord={isLandlord}
            isBusy={isBusy}
            onSave={(documents) => actions.saveDocuments(rental, documents)}
            onDownload={actions.download}
          />
        </div>

        <div className="grid gap-3">
          <Panel title="The ask">
            <Row label="Move-in" value={formatDate(rental.preferences.moveInDate)} />
            <Row label="Duration" value={`${rental.preferences.durationMonths} months`} />
            <Row label="Occupants" value={rental.preferences.occupants} />
          </Panel>

          {rental.terms && (
            <Panel title="Agreed terms">
              <Row label="Monthly rent" value={formatAmount(rental.terms.monthlyRent)} />
              <Row label="Deposit" value={formatAmount(rental.terms.securityDeposit)} />
              <Row label="Brokerage" value={formatAmount(rental.terms.brokerageFee)} />
              <Row label={rental.status === 'paid' ? 'Settled' : 'Total due'} value={formatAmount(rental.terms.totalDue)} strong />
              {myPayment && <Row label={myPayment.paid ? 'Your share (paid)' : 'Your share'} value={formatAmount(myPayment.amount)} strong />}
            </Panel>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-ink/10 bg-ink/3 p-5 sm:p-6">
        {isLandlord && rental.status === 'pending' && (
          <>
            <button type="button" onClick={() => actions.decide(rental, 'accept')} disabled={isBusy} className={SOLID}>Accept request</button>
            <button type="button" onClick={() => actions.decide(rental, 'reject')} disabled={isBusy} className={GHOST}>Reject</button>
            <p className={NOTE}>
              Accepting freezes today&apos;s rent, deposit and brokerage as the agreed terms
              {rental.isBuddyRequest ? ' and splits them into each tenant’s share.' : '.'}
            </p>
          </>
        )}

        {isLandlord && awaitingConfirmation.map((tenant) => (
          <button key={tenant.id} type="button" onClick={() => actions.confirmInPerson(rental, tenant.id)} disabled={isBusy} className={SOLID}>
            Confirm {formatAmount(tenant.payment.amount)} from {tenant.name}
          </button>
        ))}

        {isLandlord && rental.status === 'accepted' && !awaitingConfirmation.length && (
          <p className="text-[14px] text-muted">Accepted. Waiting for {unpaidOthers.length > 1 ? 'the tenants' : 'the tenant'} to pay.</p>
        )}

        {!isLandlord && rental.status === 'pending' && <p className="text-[14px] text-muted">Waiting for the landlord to respond.</p>}
        {!isLandlord && rental.status === 'rejected' && <p className="text-[14px] text-muted">The landlord declined this request. You can send a new one from the listing.</p>}

        {!isLandlord && rental.status === 'accepted' && myPayment && !myPayment.paid && (
          <>
            <button type="button" onClick={() => actions.payOnline(rental)} disabled={isBusy} className={SOLID}>
              {isBusy ? 'Opening payment…' : `Pay ${formatAmount(myPayment.amount)} online`}
            </button>
            {myPayment.mode !== 'in-person' && (
              <button type="button" onClick={() => actions.chooseInPerson(rental)} disabled={isBusy} className={GHOST}>I will pay in person</button>
            )}
            <p className={NOTE}>
              {myPayment.mode === 'in-person'
                ? 'Marked as pay in person — the landlord confirms it, and no receipt is issued. Paying online instead still gets you one.'
                : 'Paying online issues a receipt. In-person payments get the agreement only.'}
            </p>
          </>
        )}

        {!isLandlord && rental.status === 'accepted' && myPayment?.paid && (
          <p className="text-[14px] text-muted">
            Your share is settled. The agreement is issued once {unpaidOthers.map((tenant) => tenant.name).join(' and ')} pays too.
          </p>
        )}

        {rental.documents?.agreement && (
          <>
            <button type="button" onClick={() => actions.openDocument(`/rentals/${rental.id}/agreement`, `livsync-agreement-${rental.id}.pdf`)} className={SOLID}>
              {rental.isBuddyRequest ? 'Joint agreement (PDF)' : 'Rental agreement (PDF)'}
            </button>
            {!isLandlord && rental.isBuddyRequest && (
              <button type="button" onClick={() => actions.openDocument(`/rentals/${rental.id}/agreement?scope=individual`, `livsync-agreement-${rental.id}.pdf`)} className={GHOST}>Your copy (PDF)</button>
            )}
            <span className="font-mono text-[11px] uppercase tracking-[.12em] text-faint">Agreement {rental.agreement?.number}</span>
          </>
        )}

        {!isLandlord && rental.documents?.receipt && (
          <button type="button" onClick={() => actions.openDocument(`/rentals/${rental.id}/receipt`, `livsync-receipt-${rental.id}.pdf`)} className={GHOST}>Payment receipt (PDF)</button>
        )}

        {isLandlord && rental.tenants.filter((tenant) => tenant.payment?.paid && tenant.payment.mode === 'online').map((tenant) => (
          <button key={tenant.id} type="button" onClick={() => actions.openDocument(`/rentals/${rental.id}/receipt?payerId=${tenant.id}`, `livsync-receipt-${tenant.id}.pdf`)} className={GHOST}>
            Receipt · {tenant.name}
          </button>
        ))}
      </div>
    </article>
  )
}

function RentalsPage() {
  const { role, clearSession } = useAuth()
  const navigate = useNavigate()
  const [rentals, setRentals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [refreshToken, setRefreshToken] = useState(0)

  const Navbar = role === 'landlord' ? LandlordNavbar : UserNavbar
  const isLandlord = role === 'landlord'

  const handleError = useCallback((requestError, fallback) => {
    if (requestError?.response?.status === 401) {
      clearSession()
      navigate('/login', { replace: true })
      return
    }

    setError(requestError?.response?.data?.message || requestError?.message || fallback)
  }, [clearSession, navigate])

  useEffect(() => {
    let isCurrent = true

    const loadRentals = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/rentals`, { withCredentials: true })

        if (!response.data?.success) throw new Error(response.data?.message || 'Unable to load requests')
        if (!isCurrent) return

        setRentals(response.data.data.rentals)
        setError('')
      } catch (requestError) {
        if (isCurrent) handleError(requestError, 'Unable to load requests')
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadRentals()

    return () => {
      isCurrent = false
    }
  }, [handleError, refreshToken])

  const refresh = () => {
    setIsLoading(true)
    setRefreshToken((token) => token + 1)
  }

  // These files sit behind the session, so they are fetched rather than linked to; a plain link
  // would reach the API with no Authorization header on it. Agreements and receipts open in their
  // own tab the way they always did; a shared document is an attachment, so it is saved.
  const fetchDocument = (open) => async (path, filename) => {
    setError('')

    try {
      await (open ? openFile : downloadFile)(`${BASE_URL}${path}`, filename)
    } catch (requestError) {
      handleError(requestError, 'Unable to open the document')
    }
  }

  const openDocument = fetchDocument(true)
  const download = fetchDocument(false)

  // Every action is a POST/PATCH followed by a reload, so the list always shows server truth.
  const runAction = async (rentalId, request, fallback) => {
    setBusyId(rentalId)
    setError('')

    try {
      const response = await request()

      if (!response.data?.success) throw new Error(response.data?.message || fallback)

      setRefreshToken((token) => token + 1)
    } catch (requestError) {
      handleError(requestError, fallback)
    } finally {
      setBusyId('')
    }
  }

  const decide = (rental, decision) => runAction(
    rental.id,
    () => axios.patch(`${BASE_URL}/rentals/${rental.id}/decision`, { decision }, { withCredentials: true }),
    'Unable to update the request',
  )

  const confirmInPerson = (rental, payerId) => runAction(
    rental.id,
    () => axios.post(`${BASE_URL}/rentals/${rental.id}/payment/confirm`, { payerId }, { withCredentials: true }),
    'Unable to confirm the payment',
  )

  const chooseInPerson = (rental) => runAction(
    rental.id,
    () => axios.post(`${BASE_URL}/rentals/${rental.id}/payment/in-person`, {}, { withCredentials: true }),
    'Unable to select in-person payment',
  )

  const saveDocuments = (rental, documents) => runAction(
    rental.id,
    () => axios.put(`${BASE_URL}/rentals/${rental.id}/documents`, { documents }, { withCredentials: true }),
    'Unable to share application documents',
  )

  const payOnline = async (rental) => {
    setBusyId(rental.id)
    setError('')

    try {
      const isCheckoutReady = await loadCheckout()

      if (!isCheckoutReady) throw new Error('Unable to load the payment window')

      const response = await axios.post(`${BASE_URL}/rentals/${rental.id}/payment/order`, {}, { withCredentials: true })

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to start the payment')

      const { order, keyId, prefill } = response.data.data
      const checkout = new window.Razorpay({
        key: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: 'LivSync',
        description: rental.listing?.title || 'Rental payment',
        prefill,
        handler: (result) => runAction(
          rental.id,
          () => axios.post(`${BASE_URL}/rentals/${rental.id}/payment/verify`, result, { withCredentials: true }),
          'Payment could not be verified',
        ),
        modal: { ondismiss: () => setBusyId('') },
      })

      checkout.open()
    } catch (requestError) {
      handleError(requestError, 'Unable to start the payment')
      setBusyId('')
    }
  }

  const counts = useMemo(
    () => rentals.reduce((tally, rental) => ({ ...tally, [rental.status]: (tally[rental.status] || 0) + 1 }), { all: rentals.length }),
    [rentals],
  )
  const visible = filter === 'all' ? rentals : rentals.filter((rental) => rental.status === filter)
  const actions = { decide, confirmInPerson, chooseInPerson, saveDocuments, payOnline, openDocument, download }

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
            <p className={EYEBROW}>{isLandlord ? 'Incoming' : 'Your applications'}</p>
            <h1 className="mt-4 font-display text-[34px] leading-[1.0] font-bold tracking-[-.04em] text-balance sm:text-5xl">
              {isLandlord ? 'Requests on your listings' : 'Rental applications'}
            </h1>
          </div>
          <button type="button" onClick={refresh} disabled={isLoading} className={GHOST}>
            <RefreshCw aria-hidden className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </header>

        {/* The counts are the filter — one control doing both jobs, and empty statuses stay out of it. */}
        {rentals.length > 0 && (
          <div className="mt-7 flex flex-wrap gap-2">
            {FILTERS.filter(([key]) => counts[key]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`cursor-pointer rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  filter === key ? 'border-ink bg-ink text-[#F7F5EF]' : 'border-ink/15 bg-card text-ink-soft hover:border-ink/40'
                }`}
              >
                {label} <span className="tabular-nums opacity-60">{counts[key]}</span>
              </button>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-7 rounded-2xl border border-clay/30 bg-clay/8 p-4 text-[14.5px] text-clay">{error}</p>
        )}

        {isLoading && (
          <div className="mt-8 grid gap-4" aria-busy="true" aria-label="Loading requests">
            {[0, 1].map((row) => <span key={row} className="h-56 animate-pulse rounded-[22px] bg-ink/6" />)}
          </div>
        )}

        {!isLoading && !rentals.length && (
          <div className="mt-8 max-w-xl rounded-[22px] border border-dashed border-ink/25 bg-ink/3 p-7">
            <p className="text-[15.5px] leading-relaxed text-muted">
              {isLandlord
                ? 'No tenant has requested one of your listings yet. Requests land here the moment one is sent.'
                : 'You have not requested a listing yet. Open a listing you like and send a request to rent.'}
            </p>
            {!isLandlord && (
              <Link to="/user/listings" className={`mt-5 ${SOLID}`}>Browse listings</Link>
            )}
          </div>
        )}

        {!isLoading && rentals.length > 0 && !visible.length && (
          <p className="mt-8 rounded-[22px] border border-dashed border-ink/25 bg-ink/3 p-6 text-[15px] text-muted">
            Nothing in this state.{' '}
            <button type="button" onClick={() => setFilter('all')} className="cursor-pointer font-medium text-ink underline underline-offset-2 hover:text-clay">Show all</button>
          </p>
        )}

        <div className="mt-8 grid gap-5">
          {!isLoading && visible.map((rental) => (
            <RentalCard key={rental.id} rental={rental} isLandlord={isLandlord} isBusy={busyId === rental.id} actions={actions} />
          ))}
        </div>
      </main>
    </div>
  )
}

export default RentalsPage
