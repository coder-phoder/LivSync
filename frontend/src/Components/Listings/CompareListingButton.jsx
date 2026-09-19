import { Scale } from 'lucide-react'

function CompareListingButton({ selected, disabled, onToggle, className = '' }) {
  const label = selected ? 'Remove from comparison' : disabled ? 'Comparison is full' : 'Add to comparison'

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-medium backdrop-blur-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-55 ${selected ? 'border-ink bg-ink text-[#F7F5EF]' : 'border-ink/15 bg-card/90 text-ink hover:border-ink/45'} ${className}`}
    >
      <Scale aria-hidden className="size-3.5" />
      {selected ? 'Comparing' : 'Compare'}
    </button>
  )
}

export default CompareListingButton
