import { useEffect, useRef, useState } from 'react'

const BASE_URL = import.meta.env.VITE_BASE_URL

function ListingModel({ listingId, title }) {
  const viewerRef = useRef(null)
  // model-viewer is a heavy bundle, so it is only pulled in on listings that actually have a model.
  const [isViewerLoaded, setIsViewerLoaded] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true

    import('@google/model-viewer')
      .then(() => isCurrent && setIsViewerLoaded(true))
      .catch(() => isCurrent && setError('Unable to load the 3D viewer'))

    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return undefined

    const handleLoad = () => setIsModelLoaded(true)
    const handleError = () => setError('This 3D model could not be loaded. The file may no longer be shared publicly.')

    viewer.addEventListener('load', handleLoad)
    viewer.addEventListener('error', handleError)

    return () => {
      viewer.removeEventListener('load', handleLoad)
      viewer.removeEventListener('error', handleError)
    }
  }, [isViewerLoaded])

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-mono text-[10.5px] uppercase tracking-[.16em] text-faint">3D tour</h2>
        {isModelLoaded && <p className="text-[12.5px] text-faint">Drag to rotate · scroll to zoom</p>}
      </div>

      <div className="relative mt-5 h-96 overflow-hidden rounded-[22px] border border-ink/12 bg-ink/4">
        {isViewerLoaded && !error && (
          <model-viewer
            ref={viewerRef}
            src={`${BASE_URL}/listings/${listingId}/model`}
            alt={`3D model of ${title}`}
            camera-controls=""
            auto-rotate=""
            touch-action="pan-y"
            shadow-intensity="1"
            style={{ width: '100%', height: '100%', backgroundColor: '#EFEBE1' }}
          />
        )}
        {!error && !isModelLoaded && (
          <p className="absolute inset-0 grid place-items-center text-[13.5px] text-muted">Loading 3D model…</p>
        )}
        {error && (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-[13.5px] text-clay">{error}</p>
        )}
      </div>
    </section>
  )
}

export default ListingModel
