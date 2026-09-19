import { Link } from 'react-router-dom'
import VerifiedBadge from '../Common/VerifiedBadge'
import SaveListingButton from './SaveListingButton'
import CompareListingButton from './CompareListingButton'

const rentFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

function formatRent(value) {
  return rentFormatter.format(Number(value) || 0)
}

function readableValue(value) {
  return value?.replaceAll('-', ' ') || '—'
}

// Tenants read availability as "can I move in?", so a past date reads as ready rather than as history.
function availability(value) {
  const date = value ? new Date(value) : null

  if (!date || Number.isNaN(date.getTime())) return ''

  return date.getTime() <= Date.now() ? 'Available now' : `From ${dateFormatter.format(date)}`
}

function ListingCard({ listing, to, footer, saved = false, onSaveToggle, isSaving = false, compared = false, compareDisabled = false, onCompareToggle }) {
  const monthlyRent = listing.totalMonthlyRent
    ?? (Number(listing.rent?.coldRent || 0) + Number(listing.rent?.utilities || 0) + Number(listing.rent?.otherMonthlyCharges || 0))
  const photo = listing.photos?.[0]
  const isSoldOut = listing.status === 'rented'
  const specs = [
    `${listing.bedrooms} bed`,
    `${listing.bathrooms} bath`,
    `${formatRent(listing.areaSqFt)} sq ft`,
    listing.furnished ? 'Furnished' : '',
  ].filter(Boolean)

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink/15 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/35 hover:shadow-[0_28px_52px_-34px_rgba(21,19,15,.62)] focus-within:border-ink/35">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#E7E2D6]">
        {photo ? (
          <img src={photo} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.045]" />
        ) : (
          <span className="grid size-full place-items-center font-mono text-[10.5px] uppercase tracking-[.16em] text-faint">No photo yet</span>
        )}

        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.14em] ${isSoldOut ? 'bg-clay text-[#F7F5EF]' : 'bg-card/90 text-ink-soft backdrop-blur-sm'}`}>
          {isSoldOut ? 'Rented' : readableValue(listing.propertyType)}
        </span>

        {onSaveToggle && (
          <SaveListingButton variant="icon" saved={saved} onToggle={onSaveToggle} isSaving={isSaving} className="absolute right-3 top-3 z-10" />
        )}
        {onCompareToggle && <CompareListingButton selected={compared} disabled={compareDisabled} onToggle={onCompareToggle} className="absolute bottom-3 left-3 z-10" />}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h2 className="font-display text-[17px] font-semibold leading-[1.25] tracking-[-.025em] sm:text-[18px]">
          {to ? (
            <Link to={to} className="line-clamp-2 rounded after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
              {listing.title}
            </Link>
          ) : (
            <span className="line-clamp-2">{listing.title}</span>
          )}
        </h2>

        <p className="mt-1.5 truncate text-[13.5px] text-muted">{listing.location?.city}, {listing.location?.state}</p>

        <p className="mt-3.5 font-display text-[23px] font-bold tracking-[-.035em] tabular-nums">
          ₹{formatRent(monthlyRent)}
          <span className="ml-1 font-sans text-[13px] font-normal tracking-normal text-muted">/ month</span>
        </p>

        <p className="mt-3 border-t border-ink/12 pt-3 font-mono text-[10.5px] uppercase tracking-[.12em] text-faint">
          {specs.join(' · ')}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-3.5">
          <VerifiedBadge verified={listing.landlord?.emailVerified} label="Verified landlord" size="xs" />
          {!isSoldOut && availability(listing.availableFrom) && (
            <span className="text-[12.5px] text-muted">{availability(listing.availableFrom)}</span>
          )}
        </div>

        {footer && <div className="relative z-10 mt-3.5 flex flex-wrap items-center gap-3 border-t border-ink/12 pt-3.5">{footer}</div>}
      </div>
    </article>
  )
}

export default ListingCard
