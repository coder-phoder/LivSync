import { Bath, BedDouble, Building2, MapPin, Maximize2, Pencil, Trash2 } from 'lucide-react'

const STATUS = {
  published: 'bg-landlord-cyan text-landlord-ink',
  rented: 'bg-landlord-amber text-landlord-ink',
  archived: 'bg-landlord-ink/10 text-landlord-ink-soft',
}

const money = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

function monthlyRent(listing) {
  const value = listing.totalMonthlyRent
    ?? (Number(listing.rent?.coldRent || 0) + Number(listing.rent?.utilities || 0) + Number(listing.rent?.otherMonthlyCharges || 0))
  return money.format(value)
}

function readable(value) {
  return String(value || '').replaceAll('-', ' ') || '—'
}

function LandlordListingCard({ listing, onEdit, onDelete, isDeleting }) {
  const photo = listing.photos?.[0]

  return (
    <article className={`group overflow-hidden rounded-[24px] border border-landlord-ink/14 bg-landlord-card shadow-[0_20px_42px_-34px_rgba(16,53,83,.5)] transition-all hover:-translate-y-0.5 hover:border-landlord-ink/30 hover:shadow-[0_28px_52px_-38px_rgba(16,53,83,.72)] ${listing.status === 'archived' ? 'opacity-75' : ''}`}>
      <div className="relative aspect-[16/9] overflow-hidden bg-landlord-paper">
        {photo ? <img src={photo} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" /> : <span className="grid size-full place-items-center text-landlord-blue"><Building2 aria-hidden className="size-8" /></span>}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[.13em] ${STATUS[listing.status] || STATUS.archived}`}>{readable(listing.status)}</span>
        <span className="absolute bottom-3 left-3 rounded-full bg-landlord-navy/88 px-3 py-1.5 font-display text-[16px] font-bold tracking-[-.03em] text-landlord-card backdrop-blur-sm">₹{monthlyRent(listing)}<span className="ml-1 font-sans text-[11px] font-normal tracking-normal text-landlord-card/70">/ mo</span></span>
      </div>

      <div className="p-4.5 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="truncate font-display text-[19px] font-bold tracking-[-.035em]">{listing.title}</h2><p className="mt-1 flex items-center gap-1.5 truncate text-[13px] text-landlord-muted"><MapPin aria-hidden className="size-3.5 shrink-0" />{listing.location?.city || 'Location pending'}{listing.location?.state ? `, ${listing.location.state}` : ''}</p></div>
          <span className="rounded-lg bg-landlord-paper px-2 py-1 font-mono text-[10px] uppercase tracking-[.12em] text-landlord-ink-soft">{readable(listing.propertyType)}</span>
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-3.5 gap-y-2 border-y border-landlord-ink/10 py-3 text-[12.5px] text-landlord-ink-soft">
          <li className="flex items-center gap-1.5"><BedDouble aria-hidden className="size-3.5 text-landlord-blue" />{listing.bedrooms} bed</li>
          <li className="flex items-center gap-1.5"><Bath aria-hidden className="size-3.5 text-landlord-blue" />{listing.bathrooms} bath</li>
          <li className="flex items-center gap-1.5"><Maximize2 aria-hidden className="size-3.5 text-landlord-blue" />{money.format(listing.areaSqFt || 0)} sq ft</li>
        </ul>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-landlord-muted">{listing.furnished ? 'Furnished' : 'Unfurnished'} · {readable(listing.roomType)}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onEdit(listing)} disabled={isDeleting} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-landlord-ink/18 px-3 py-2 text-[12.5px] font-medium text-landlord-ink-soft transition-colors hover:border-landlord-navy hover:bg-landlord-navy hover:text-landlord-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy disabled:cursor-not-allowed disabled:opacity-50"><Pencil aria-hidden className="size-3.5" />Edit</button>
            <button type="button" onClick={() => onDelete(listing._id)} disabled={isDeleting} aria-label={`Delete ${listing.title}`} className="grid size-8 cursor-pointer place-items-center rounded-full border border-landlord-alert/25 text-landlord-alert transition-colors hover:bg-landlord-alert hover:text-landlord-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-alert disabled:cursor-wait disabled:opacity-50"><Trash2 aria-hidden className="size-3.5" /></button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default LandlordListingCard
