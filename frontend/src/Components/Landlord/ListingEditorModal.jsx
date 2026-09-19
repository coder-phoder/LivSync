import { X } from 'lucide-react'
import { useEffect } from 'react'
import ListingForm from '../Listings/ListingForm'

function ListingEditorModal({ listing, onSave, onClose, isSubmitting, error }) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isSubmitting, onClose])

  const closeOnBackdrop = (event) => {
    if (event.target === event.currentTarget && !isSubmitting) onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-landlord-ink/55 p-3 backdrop-blur-sm sm:p-6" onMouseDown={closeOnBackdrop}>
      <section role="dialog" aria-modal="true" aria-labelledby="listing-editor-title" className="flex max-h-[calc(100svh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-landlord-ink/15 bg-white shadow-[0_32px_90px_-28px_rgba(16,37,61,.68)] sm:max-h-[calc(100svh-3rem)]">
        <div className="flex items-center justify-between gap-4 border-b border-landlord-ink/12 bg-landlord-card px-5 py-4 sm:px-6">
          <div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-landlord-faint">Portfolio editor</p><h2 id="listing-editor-title" className="mt-1 font-display text-[21px] font-bold tracking-[-.035em]">{listing ? 'Edit listing' : 'Create a listing'}</h2></div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close listing editor" className="grid size-9 cursor-pointer place-items-center rounded-full border border-landlord-ink/16 text-landlord-ink-soft transition-colors hover:bg-landlord-navy hover:text-landlord-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy disabled:cursor-not-allowed disabled:opacity-50"><X aria-hidden className="size-4" /></button>
        </div>
        <div className="min-h-0 overflow-y-auto">
          <ListingForm key={listing?._id || 'new-listing'} listing={listing} onSave={onSave} onCancel={onClose} isSubmitting={isSubmitting} error={error} inModal />
        </div>
      </section>
    </div>
  )
}

export default ListingEditorModal
