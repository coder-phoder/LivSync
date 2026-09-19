// The landlord home is a decision desk. It uses the data already loaded by the
// dedicated listings, rentals, calls, and messages pages, so it needs no new API.

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function since(value) {
  const days = Math.round((Date.parse(value) - Date.now()) / 86400000)
  return Number.isFinite(days) ? relative.format(days, 'day') : ''
}

function when(value) {
  const at = new Date(value)
  if (Number.isNaN(at.getTime())) return ''

  const hours = (at.getTime() - Date.now()) / 3600000
  const clock = at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

  if (hours < 0) return `started ${clock}`
  if (hours < 12) return `today at ${clock}`
  if (hours < 36) return `tomorrow at ${clock}`
  return `${at.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${clock}`
}

function tenantNames(rental) {
  return rental.tenants?.map((tenant) => tenant.name).filter(Boolean).join(' and ') || 'A tenant'
}

function outstandingPayments(rental) {
  return rental.tenants?.filter((tenant) => tenant.payment?.mode === 'in-person' && !tenant.payment.paid) || []
}

function actions({ landlord, rentals, calls, conversations }) {
  const found = []

  calls.filter((call) => call.joinable).forEach((call) => {
    found.push({
      id: `call-live-${call.id}`,
      rank: 0,
      tone: 'cyan',
      title: `Your call with ${call.counterpart?.name || 'a tenant'} is live`,
      detail: `${call.listing?.title || 'A listing'} is ready for the viewing.`,
      to: `/calls/${call.id}/room`,
      cta: 'Join now',
    })
  })

  if (landlord && !landlord.emailVerified) {
    found.push({
      id: 'verify',
      rank: 1,
      tone: 'amber',
      title: 'Verify your email',
      detail: 'Give tenants a clear trust signal on every listing you publish.',
      to: '/verify-email',
      cta: 'Verify',
    })
  }

  if (landlord && !landlord.hasSignature) {
    found.push({
      id: 'signature',
      rank: 2,
      tone: 'blue',
      title: 'Add your e-signature',
      detail: 'Agreements can be issued as soon as a tenant completes payment.',
      to: '/landlord/signature',
      cta: 'Add signature',
    })
  }

  rentals.filter((rental) => rental.status === 'pending').forEach((rental) => {
    found.push({
      id: `application-${rental.id}`,
      rank: 3,
      tone: 'amber',
      title: `Review ${tenantNames(rental)}’s application`,
      detail: `${rental.listing?.title || 'Listing removed'} · received ${since(rental.createdAt)}`,
      to: '/rentals',
      cta: 'Review',
    })
  })

  calls.filter((call) => call.status === 'requested').forEach((call) => {
    found.push({
      id: `schedule-${call.id}`,
      rank: 4,
      tone: 'cyan',
      title: `Set a viewing time for ${call.counterpart?.name || 'a tenant'}`,
      detail: `${call.mode === 'voice' ? 'Voice' : 'Video'} call · ${call.listing?.title || 'Listing removed'}`,
      to: '/calls',
      cta: 'Set a time',
    })
  })

  const unread = conversations.filter((conversation) => conversation.unreadCount > 0)
  if (unread.length) {
    const total = unread.reduce((sum, conversation) => sum + conversation.unreadCount, 0)
    found.push({
      id: 'messages',
      rank: 5,
      tone: 'blue',
      title: `${total} unread tenant message${total === 1 ? '' : 's'}`,
      detail: unread.length === 1
        ? `${unread[0].counterpart?.name || 'A tenant'} asked about ${unread[0].listing?.title || 'your listing'}.`
        : `Across ${unread.length} tenant conversations.`,
      to: '/messages',
      cta: 'Open inbox',
    })
  }

  rentals.forEach((rental) => {
    outstandingPayments(rental).forEach((tenant) => {
      found.push({
        id: `payment-${rental.id}-${tenant.name}`,
        rank: 6,
        tone: 'blue',
        title: `Confirm ${tenant.name || 'a tenant'}’s in-person payment`,
        detail: `${rental.listing?.title || 'Listing removed'} · the agreement follows once the payment is confirmed.`,
        to: '/rentals',
        cta: 'Confirm',
      })
    })
  })

  return found.sort((a, b) => a.rank - b.rank)
}

function waiting({ rentals, calls }) {
  const open = []

  rentals.filter((rental) => rental.status === 'accepted').forEach((rental) => {
    // In-person payments need the landlord's confirmation, so they belong in the
    // decision queue rather than appearing as a passive wait state as well.
    const unpaid = rental.tenants?.filter((tenant) => tenant.payment && !tenant.payment.paid && tenant.payment.mode !== 'in-person') || []
    if (!unpaid.length) return

    open.push({
      id: `payment-wait-${rental.id}`,
      title: rental.listing?.title || 'Listing removed',
      detail: `${unpaid.map((tenant) => tenant.name).filter(Boolean).join(' and ') || 'Your tenant'} ${unpaid.length === 1 ? 'has' : 'have'} not settled yet.`,
      state: 'Awaiting payment',
    })
  })

  calls
    .filter((call) => call.status === 'scheduled' && !call.joinable && call.startAt)
    .forEach((call) => {
      open.push({
        id: `call-${call.id}`,
        title: call.counterpart?.name || 'Tenant viewing',
        detail: `${call.listing?.title || 'Listing removed'} · ${when(call.startAt)}`,
        state: 'Viewing scheduled',
      })
    })

  return open
}

export function buildLandlordSignals({ landlord, listings = [], rentals = [], calls = [], conversations = [] }) {
  return {
    needsYou: actions({ landlord, rentals, calls, conversations }),
    inMotion: waiting({ rentals, calls }),
    counts: {
      published: listings.filter((listing) => listing.status === 'published').length,
      pending: rentals.filter((rental) => rental.status === 'pending').length,
      unread: conversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0),
      scheduled: calls.filter((call) => call.status === 'scheduled' && !call.joinable).length,
    },
    listings: listings.filter((listing) => listing.status !== 'archived').slice(0, 3),
  }
}
