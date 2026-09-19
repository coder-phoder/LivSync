const STAGE_TONES = {
  complete: { bar: 'bg-forest', text: 'text-ink-soft' },
  current: { bar: 'bg-clay', text: 'text-ink' },
  upcoming: { bar: 'bg-ink/12', text: 'text-faint' },
  unavailable: { bar: 'bg-ink/8', text: 'text-faint' },
  rejected: { bar: 'bg-clay', text: 'text-clay' },
}

function stageState(rental, index) {
  const { status } = rental
  const documentsRequested = rental.documentRequirements?.length > 0
  const allDocumentsComplete = rental.tenantDocuments?.every((tenant) => tenant.complete)

  if (status === 'rejected') {
    if (index === 0 || index === 2) return 'complete'
    if (index === 1) return !documentsRequested || allDocumentsComplete ? 'complete' : 'unavailable'
    if (index === 3) return 'rejected'
    return 'unavailable'
  }

  if (status === 'pending') {
    if (index === 0) return 'complete'
    if (index === 1) return !documentsRequested || allDocumentsComplete ? 'complete' : 'current'
    if (index === 2) return !documentsRequested || allDocumentsComplete ? 'current' : 'upcoming'
    return 'upcoming'
  }

  if (status === 'accepted') {
    if (index < 4) return 'complete'
    if (index === 4) return 'current'
    return 'upcoming'
  }

  if (status === 'paid') return index < 5 ? 'complete' : 'current'

  return 'upcoming'
}

function stageDetails(rental) {
  const rejected = rental.status === 'rejected'
  const documentsRequested = rental.documentRequirements?.length > 0
  const allDocumentsComplete = rental.tenantDocuments?.every((tenant) => tenant.complete)

  return [
    { title: 'Submitted', detail: 'Application sent' },
    { title: 'Documents', detail: !documentsRequested ? 'None requested' : allDocumentsComplete ? 'Shared with landlord' : 'Action needed' },
    { title: 'Under review', detail: rental.status === 'pending' ? 'Awaiting landlord' : 'Review complete' },
    {
      title: rejected ? 'Rejected' : 'Approved',
      detail: rejected ? 'Application closed' : rental.status === 'pending' ? 'Decision pending' : 'Terms confirmed',
    },
    { title: 'Payment pending', detail: rental.status === 'accepted' ? 'Awaiting payment' : rental.status === 'paid' ? 'Payment settled' : 'Opens after approval' },
    { title: 'Agreement ready', detail: rental.status === 'paid' ? 'Ready to download' : 'Issued after payment' },
  ]
}

// A six-step rail: a filled bar per stage, the label under it. No boxes, no colour blocks.
function ApplicationTracker({ rental }) {
  const stages = stageDetails(rental)

  return (
    <section className="mt-5" aria-labelledby={`application-progress-${rental.id}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`application-progress-${rental.id}`} className="font-mono text-[10.5px] uppercase tracking-[.16em] text-faint">Application progress</h3>
        <span className="font-mono text-[10.5px] uppercase tracking-[.12em] text-faint">{rental.status === 'paid' ? 'Complete' : 'Live'}</span>
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {stages.map((stage, index) => {
          const state = stageState(rental, index)
          const tone = STAGE_TONES[state]

          return (
            <li key={stage.title} aria-current={state === 'current' || state === 'rejected' ? 'step' : undefined}>
              <span aria-hidden className={`block h-1 rounded-full ${tone.bar}`} />
              <p className={`mt-2 text-[13px] leading-tight font-medium ${tone.text}`}>{stage.title}</p>
              <p className="mt-0.5 text-[12px] leading-tight text-faint">{stage.detail}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default ApplicationTracker
