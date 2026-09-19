import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LandlordNavbar from '../../Components/Landlord/LandlordNavbar'
import ApplicationTracker from '../../Components/Rentals/ApplicationTracker'
import RequiredDocumentsPicker from '../../Components/Rentals/RequiredDocumentsPicker'
import UserNavbar from '../../Components/User/UserNavbar'
import { useAuth } from '../../Context/AuthContext'
import { downloadFile, openFile } from '../../download'

const BASE_URL = import.meta.env.VITE_BASE_URL
const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-800',
}

function formatAmount(value) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value) || 0)}`
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—'
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

function TenantPanel({ tenant, isLandlord, showContact }) {
  const chips = lifestyleChips(tenant.lifestyle)

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {tenant.name}
          {tenant.mine && <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>}
        </p>
        {tenant.payment && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tenant.payment.paid ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
            {tenant.payment.share}% · {formatAmount(tenant.payment.amount)} · {tenant.payment.paid ? `paid ${labelOf(tenant.payment.mode)}` : 'unpaid'}
          </span>
        )}
      </div>
      {showContact && <p className="mt-1 text-sm text-slate-600 break-words">{tenant.email} · {tenant.phone} · {labelOf(tenant.gender)}</p>}
      {tenant.lifestyle?.bio && <p className="mt-2 text-sm text-slate-700">{tenant.lifestyle.bio}</p>}
      {isLandlord && chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => <li key={chip} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-700">{chip}</li>)}
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
    <form onSubmit={saveDocuments} className="mt-4 border-t border-slate-200 pt-4">
      <RequiredDocumentsPicker
        requirements={rental.documentRequirements}
        selectedDocuments={selections}
        onChange={setSelections}
        disabled={isBusy}
        title="Documents requested for this application"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isBusy} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
          {isBusy ? 'Saving…' : 'Share selected documents'}
        </button>
        <p className="text-xs text-slate-500">Only these selected files are visible to this landlord. You can change them until the landlord decides.</p>
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
        <section className="mt-4 border-t border-slate-200 pt-4" aria-labelledby={`application-documents-${rental.id}`}>
          <h3 id={`application-documents-${rental.id}`} className="text-sm font-semibold text-slate-800">Requested documents</h3>
          <p className="mt-1 text-sm text-slate-600">{mine?.complete ? 'Your selected documents were shared with the landlord.' : 'No documents were shared before this application was decided.'}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {(mine?.requirements || []).map((requirement) => (
              <li key={requirement.requirementId} className={`rounded-full px-3 py-1 text-xs font-medium ${requirement.document ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {requirement.name}: {requirement.document ? 'shared' : 'not shared'}
              </li>
            ))}
          </ul>
        </section>
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

  return (
    <section className="mt-4 border-t border-slate-200 pt-4" aria-labelledby={`application-documents-${rental.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`application-documents-${rental.id}`} className="text-sm font-semibold text-slate-800">Requested documents</h3>
        <p className="text-xs text-slate-500">Only files expressly shared for this application are available.</p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {(rental.tenantDocuments || []).map((tenant) => (
          <div key={tenant.tenantId} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-800">{tenant.tenantName}</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tenant.complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{tenant.complete ? 'Complete' : 'Missing documents'}</span>
            </div>
            <ul className="mt-3 space-y-2">
              {tenant.requirements.map((requirement) => (
                <li key={requirement.requirementId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-slate-600">{requirement.name}</span>
                  {requirement.document ? (
                    <button type="button" onClick={() => onDownload(`/tenant-documents/${requirement.document.id}/download`, requirement.document.label)} className="font-medium text-slate-900 underline hover:text-slate-600">
                      {requirement.document.label}
                    </button>
                  ) : <span className="text-xs font-medium text-amber-700">Not shared</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function RentalsPage() {
  const { role, clearSession } = useAuth()
  const navigate = useNavigate()
  const [rentals, setRentals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
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

  const refresh = () => setRefreshToken((token) => token + 1)

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

      refresh()
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{isLandlord ? 'Incoming' : 'Your applications'}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Rental requests</h1>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {isLoading && <p className="mt-8 text-slate-600">Loading requests…</p>}

        {!isLoading && !rentals.length && (
          <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
            {isLandlord
              ? 'No tenant has requested one of your listings yet.'
              : 'You have not requested a listing yet. Open a listing and send a request to rent.'}
          </p>
        )}

        <div className="mt-8 space-y-5">
          {rentals.map((rental) => {
            const isBusy = busyId === rental.id
            const myPayment = rental.myPayment
            const awaitingConfirmation = rental.tenants.filter((tenant) => tenant.payment?.mode === 'in-person' && !tenant.payment.paid)
            const unpaidOthers = rental.tenants.filter((tenant) => !tenant.mine && tenant.payment && !tenant.payment.paid)

            return (
              <article key={rental.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      {rental.listing ? (
                        <Link to={`/listings/${rental.listing.id}`} className="hover:underline">{rental.listing.title}</Link>
                      ) : 'Listing removed'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {isLandlord
                        ? `From ${rental.tenants.map((tenant) => tenant.name).join(' and ') || 'Tenant'}`
                        : `Listed by ${rental.landlord?.name || 'Landlord'}`}
                      {' · '}
                      sent {formatDate(rental.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {rental.isBuddyRequest && <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">BuddyUp · {splitLabel(rental)}</span>}
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[rental.status]}`}>{rental.status}</span>
                  </div>
                </div>

                <ApplicationTracker rental={rental} />

                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                  <div><dt className="text-slate-500">Move-in</dt><dd className="mt-1 font-medium">{formatDate(rental.preferences.moveInDate)}</dd></div>
                  <div><dt className="text-slate-500">Duration</dt><dd className="mt-1 font-medium">{rental.preferences.durationMonths} months</dd></div>
                  <div><dt className="text-slate-500">Occupants</dt><dd className="mt-1 font-medium">{rental.preferences.occupants}</dd></div>
                </dl>

                {rental.preferences.note && <p className="mt-3 text-sm text-slate-600"><span className="text-slate-500">Preferences: </span>{rental.preferences.note}</p>}
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{rental.message}</p>

                <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                  {rental.tenants.map((tenant) => (
                    <TenantPanel key={tenant.id} tenant={tenant} isLandlord={isLandlord} showContact={isLandlord} />
                  ))}
                </div>

                <SharedDocuments
                  rental={rental}
                  isLandlord={isLandlord}
                  isBusy={isBusy}
                  onSave={(documents) => saveDocuments(rental, documents)}
                  onDownload={download}
                />

                {rental.terms && (
                  <dl className="mt-4 grid gap-4 border-t border-slate-200 pt-4 text-sm sm:grid-cols-4">
                    <div><dt className="text-slate-500">Monthly rent</dt><dd className="mt-1 font-medium">{formatAmount(rental.terms.monthlyRent)}</dd></div>
                    <div><dt className="text-slate-500">Deposit</dt><dd className="mt-1 font-medium">{formatAmount(rental.terms.securityDeposit)}</dd></div>
                    <div><dt className="text-slate-500">Brokerage</dt><dd className="mt-1 font-medium">{formatAmount(rental.terms.brokerageFee)}</dd></div>
                    <div><dt className="text-slate-500">{rental.status === 'paid' ? 'Settled' : 'Total due'}</dt><dd className="mt-1 font-semibold">{formatAmount(rental.terms.totalDue)}</dd></div>
                  </dl>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
                  {isLandlord && rental.status === 'pending' && (
                    <>
                      <button type="button" onClick={() => decide(rental, 'accept')} disabled={isBusy} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">Accept request</button>
                      <button type="button" onClick={() => decide(rental, 'reject')} disabled={isBusy} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Reject</button>
                      <span className="text-xs text-slate-500">
                        Accepting freezes today&apos;s rent, deposit and brokerage as the agreed terms
                        {rental.isBuddyRequest ? ' and splits them into each tenant’s share.' : '.'}
                      </span>
                    </>
                  )}

                  {isLandlord && awaitingConfirmation.map((tenant) => (
                    <button key={tenant.id} type="button" onClick={() => confirmInPerson(rental, tenant.id)} disabled={isBusy} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                      Confirm {formatAmount(tenant.payment.amount)} received from {tenant.name}
                    </button>
                  ))}

                  {isLandlord && rental.status === 'accepted' && !awaitingConfirmation.length && (
                    <span className="text-sm text-slate-600">Accepted. Waiting for {unpaidOthers.length > 1 ? 'the tenants' : 'the tenant'} to pay.</span>
                  )}

                  {!isLandlord && rental.status === 'pending' && <span className="text-sm text-slate-600">Waiting for the landlord to respond.</span>}
                  {!isLandlord && rental.status === 'rejected' && <span className="text-sm text-slate-600">The landlord declined this request. You can send a new one from the listing.</span>}

                  {!isLandlord && rental.status === 'accepted' && myPayment && !myPayment.paid && (
                    <>
                      <button type="button" onClick={() => payOnline(rental)} disabled={isBusy} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                        {isBusy ? 'Opening payment…' : `Pay your share of ${formatAmount(myPayment.amount)} online`}
                      </button>
                      {myPayment.mode !== 'in-person' && (
                        <button type="button" onClick={() => chooseInPerson(rental)} disabled={isBusy} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">I will pay in person</button>
                      )}
                      <span className="text-xs text-slate-500">
                        {myPayment.mode === 'in-person'
                          ? 'Marked as pay in person — the landlord confirms it, and no receipt is issued. Paying online instead still gets you one.'
                          : 'Paying online issues a receipt. In-person payments get the agreement only.'}
                      </span>
                    </>
                  )}

                  {!isLandlord && rental.status === 'accepted' && myPayment?.paid && (
                    <span className="text-sm text-slate-600">
                      Your share is settled. The agreement is issued once {unpaidOthers.map((tenant) => tenant.name).join(' and ')} pays too.
                    </span>
                  )}

                  {rental.documents.agreement && (
                    <>
                      <button type="button" onClick={() => openDocument(`/rentals/${rental.id}/agreement`, `livsync-agreement-${rental.id}.pdf`)} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                        {rental.isBuddyRequest ? 'Joint agreement (PDF)' : 'Rental agreement (PDF)'}
                      </button>
                      {!isLandlord && rental.isBuddyRequest && (
                        <button type="button" onClick={() => openDocument(`/rentals/${rental.id}/agreement?scope=individual`, `livsync-agreement-${rental.id}.pdf`)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Your copy (PDF)</button>
                      )}
                      <span className="text-xs text-slate-500">Agreement {rental.agreement?.number}</span>
                    </>
                  )}

                  {!isLandlord && rental.documents.receipt && (
                    <button type="button" onClick={() => openDocument(`/rentals/${rental.id}/receipt`, `livsync-receipt-${rental.id}.pdf`)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Payment receipt (PDF)</button>
                  )}

                  {isLandlord && rental.tenants.filter((tenant) => tenant.payment?.paid && tenant.payment.mode === 'online').map((tenant) => (
                    <button key={tenant.id} type="button" onClick={() => openDocument(`/rentals/${rental.id}/receipt?payerId=${tenant.id}`, `livsync-receipt-${tenant.id}.pdf`)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Receipt · {tenant.name}
                    </button>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default RentalsPage
