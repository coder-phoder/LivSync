import { Check, ChevronDown, FileText, Home, MapPin, ReceiptText } from 'lucide-react'

const STATUS = {
  pending: { label: 'Needs review', className: 'bg-landlord-cyan text-landlord-ink' },
  accepted: { label: 'Approved', className: 'bg-landlord-blue text-landlord-card' },
  paid: { label: 'Agreement issued', className: 'bg-landlord-navy text-landlord-cyan' },
  rejected: { label: 'Declined', className: 'bg-landlord-alert/12 text-landlord-alert' },
}

const money = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

function formatAmount(value) {
  return `₹${money.format(Number(value) || 0)}`
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : '—'
}

function readable(value) {
  return String(value || '').replaceAll('-', ' ') || '—'
}

function tenantChips(tenant) {
  const lifestyle = tenant.lifestyle
  if (!lifestyle) return []

  return [
    lifestyle.occupation,
    lifestyle.city,
    lifestyle.workSchedule && readable(lifestyle.workSchedule),
    lifestyle.sleepSchedule && `${readable(lifestyle.sleepSchedule)} sleeper`,
    lifestyle.cleanliness && `Cleanliness ${lifestyle.cleanliness}/5`,
    lifestyle.pets && readable(lifestyle.pets),
  ].filter(Boolean)
}

function TenantSummary({ tenant, documents, onDownload }) {
  const chips = tenantChips(tenant)
  const documentState = documents?.complete ? 'Documents complete' : documents?.requirements?.length ? 'Documents incomplete' : 'No documents requested'

  return (
    <section className="rounded-2xl border border-landlord-ink/12 bg-landlord-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="font-display text-[17px] font-semibold tracking-[-.025em]">{tenant.name || 'Tenant'}</p><p className="mt-1 break-words text-[13px] text-landlord-muted">{tenant.email} · {tenant.phone}</p></div>
        {tenant.payment && <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium tabular-nums ${tenant.payment.paid ? 'bg-landlord-cyan text-landlord-ink' : 'bg-landlord-paper text-landlord-ink-soft'}`}>{tenant.payment.paid ? `${formatAmount(tenant.payment.amount)} paid` : `${tenant.payment.share}% share`}</span>}
      </div>
      {tenant.lifestyle?.bio && <p className="mt-3 text-[13.5px] leading-relaxed text-landlord-ink-soft">{tenant.lifestyle.bio}</p>}
      {chips.length > 0 && <ul className="mt-3 flex flex-wrap gap-1.5">{chips.map((chip) => <li key={chip} className="rounded-full bg-landlord-paper px-2.5 py-1 text-[11.5px] capitalize text-landlord-ink-soft">{chip}</li>)}</ul>}

      {documents?.requirements?.length > 0 && (
        <details className="group mt-4 border-t border-landlord-ink/10 pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[12.5px] font-medium text-landlord-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy"><FileText aria-hidden className="size-3.5 text-landlord-blue" />{documentState}<ChevronDown aria-hidden className="ml-auto size-3.5 transition-transform group-open:rotate-180" /></summary>
          <ul className="mt-2.5 grid gap-1.5">
            {documents.requirements.map((requirement) => <li key={requirement.requirementId} className="flex items-center justify-between gap-3 text-[12.5px]"><span className="text-landlord-muted">{requirement.name}</span>{requirement.document ? <button type="button" onClick={() => onDownload(`/tenant-documents/${requirement.document.id}/download`, requirement.document.label)} className="cursor-pointer font-medium text-landlord-blue underline underline-offset-3 hover:text-landlord-navy">Open</button> : <span className="text-landlord-alert">Missing</span>}</li>)}
          </ul>
        </details>
      )}
    </section>
  )
}

function LandlordRentalCard({ rental, isBusy, actions }) {
  const status = STATUS[rental.status] || { label: readable(rental.status), className: 'bg-landlord-paper text-landlord-ink-soft' }
  const awaitingConfirmation = rental.tenants.filter((tenant) => tenant.payment?.mode === 'in-person' && !tenant.payment.paid)
  const unpaid = rental.tenants.filter((tenant) => tenant.payment && !tenant.payment.paid)

  return (
    <article className="overflow-hidden rounded-[28px] border border-landlord-ink/14 bg-landlord-card shadow-[0_26px_52px_-40px_rgba(16,53,83,.7)]">
      <div className="border-b border-landlord-ink/11 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0"><p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[.15em] text-landlord-faint"><Home aria-hidden className="size-3.5" />Rental application</p><h2 className="mt-3 font-display text-[23px] font-bold leading-tight tracking-[-.04em] sm:text-[27px]">{rental.listing?.title || 'Listing removed'}</h2><p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-landlord-muted"><MapPin aria-hidden className="size-3.5" />{rental.listing?.city || 'Location unavailable'}<span aria-hidden>·</span>Received {formatDate(rental.createdAt)}</p></div>
          <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${status.className}`}>{status.label}</span>{rental.isBuddyRequest && <span className="rounded-full border border-landlord-ink/14 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.12em] text-landlord-ink-soft">Joint request</span>}</div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-7">
        <div>
          <blockquote className="border-l-[3px] border-landlord-cyan pl-4"><p className="text-[14.5px] leading-relaxed whitespace-pre-wrap text-landlord-ink-soft">{rental.message}</p>{rental.preferences?.note && <footer className="mt-2 text-[13px] text-landlord-muted">{rental.preferences.note}</footer>}</blockquote>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">{rental.tenants.map((tenant) => <TenantSummary key={tenant.id} tenant={tenant} documents={rental.tenantDocuments?.find((entry) => String(entry.tenantId) === String(tenant.id))} onDownload={actions.download} />)}</div>
        </div>

        <aside className="grid content-start gap-3">
          <section className="rounded-2xl bg-landlord-paper p-4"><h3 className="font-mono text-[10.5px] uppercase tracking-[.15em] text-landlord-faint">Requested stay</h3><dl className="mt-3 grid gap-2.5"><div className="flex items-center justify-between gap-3 text-[13.5px]"><dt className="text-landlord-muted">Move-in</dt><dd className="font-medium text-landlord-ink-soft">{formatDate(rental.preferences?.moveInDate)}</dd></div><div className="flex items-center justify-between gap-3 text-[13.5px]"><dt className="text-landlord-muted">Duration</dt><dd className="font-medium text-landlord-ink-soft">{rental.preferences?.durationMonths || '—'} months</dd></div><div className="flex items-center justify-between gap-3 text-[13.5px]"><dt className="text-landlord-muted">Occupants</dt><dd className="font-medium text-landlord-ink-soft">{rental.preferences?.occupants || rental.tenants.length}</dd></div></dl></section>
          {rental.terms && <section className="rounded-2xl border border-landlord-ink/12 p-4"><h3 className="font-mono text-[10.5px] uppercase tracking-[.15em] text-landlord-faint">Agreed terms</h3><dl className="mt-3 grid gap-2.5"><div className="flex justify-between gap-3 text-[13px]"><dt className="text-landlord-muted">Monthly rent</dt><dd className="font-medium">{formatAmount(rental.terms.monthlyRent)}</dd></div><div className="flex justify-between gap-3 text-[13px]"><dt className="text-landlord-muted">Deposit</dt><dd className="font-medium">{formatAmount(rental.terms.securityDeposit)}</dd></div><div className="flex justify-between gap-3 border-t border-landlord-ink/10 pt-2.5 text-[13.5px]"><dt className="font-medium text-landlord-ink-soft">Total due</dt><dd className="font-display text-[17px] font-bold tracking-[-.03em]">{formatAmount(rental.terms.totalDue)}</dd></div></dl></section>}
        </aside>
      </div>

      <footer className="flex flex-wrap items-center gap-2.5 border-t border-landlord-ink/11 bg-landlord-paper/65 p-5 sm:p-6">
        {rental.status === 'pending' && <><button type="button" onClick={() => actions.decide(rental, 'accept')} disabled={isBusy} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-landlord-navy px-5 py-2.5 text-[14px] font-medium text-landlord-card transition-colors hover:bg-landlord-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy disabled:cursor-wait disabled:opacity-55"><Check aria-hidden className="size-4" />{isBusy ? 'Saving…' : 'Approve application'}</button><button type="button" onClick={() => actions.decide(rental, 'reject')} disabled={isBusy} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-landlord-alert/30 px-4 py-2.5 text-[14px] font-medium text-landlord-alert transition-colors hover:bg-landlord-alert hover:text-landlord-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-alert disabled:cursor-wait disabled:opacity-55">Decline</button><p className="basis-full text-[12.5px] leading-snug text-landlord-muted">Approval freezes the current rent, deposit, and brokerage into the agreement.</p></>}
        {awaitingConfirmation.map((tenant) => <button key={tenant.id} type="button" onClick={() => actions.confirmInPerson(rental, tenant.id)} disabled={isBusy} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-landlord-navy px-5 py-2.5 text-[14px] font-medium text-landlord-card transition-colors hover:bg-landlord-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy disabled:cursor-wait disabled:opacity-55"><Check aria-hidden className="size-4" />Confirm {formatAmount(tenant.payment.amount)} from {tenant.name}</button>)}
        {rental.status === 'accepted' && !awaitingConfirmation.length && <p className="text-[14px] text-landlord-muted">Awaiting payment from {unpaid.map((tenant) => tenant.name).join(' and ') || 'the tenant'}.</p>}
        {rental.status === 'rejected' && <p className="text-[14px] text-landlord-muted">This application has been declined.</p>}
        {rental.documents?.agreement && <button type="button" onClick={() => actions.openDocument(`/rentals/${rental.id}/agreement`, `livsync-agreement-${rental.id}.pdf`)} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-landlord-ink/18 bg-landlord-card px-4 py-2.5 text-[13.5px] font-medium text-landlord-ink-soft transition-colors hover:border-landlord-navy hover:bg-landlord-navy hover:text-landlord-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy"><FileText aria-hidden className="size-4" />Agreement PDF</button>}
        {rental.tenants.filter((tenant) => tenant.payment?.paid && tenant.payment.mode === 'online').map((tenant) => <button key={tenant.id} type="button" onClick={() => actions.openDocument(`/rentals/${rental.id}/receipt?payerId=${tenant.id}`, `livsync-receipt-${tenant.id}.pdf`)} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-landlord-ink/18 bg-landlord-card px-4 py-2.5 text-[13.5px] font-medium text-landlord-ink-soft transition-colors hover:border-landlord-navy hover:bg-landlord-navy hover:text-landlord-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy"><ReceiptText aria-hidden className="size-4" />Receipt · {tenant.name}</button>)}
      </footer>
    </article>
  )
}

export default LandlordRentalCard
