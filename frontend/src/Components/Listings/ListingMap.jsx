import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import * as mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const BASE_URL = import.meta.env.VITE_BASE_URL

function isValidCoordinates(coordinates) {
  return Array.isArray(coordinates)
    && coordinates.length === 2
    && coordinates.every(Number.isFinite)
    && coordinates[0] >= -180
    && coordinates[0] <= 180
    && coordinates[1] >= -90
    && coordinates[1] <= 90
}

function ListingMap({ listingId, title, address }) {
  const containerRef = useRef(null)
  const [mapData, setMapData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [requestError, setRequestError] = useState('')
  const [renderError, setRenderError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const coordinates = mapData?.coordinates
  const [longitude, latitude] = coordinates || []

  useEffect(() => {
    let isCurrent = true

    const loadMapData = async () => {
      setIsLoading(true)
      setRequestError('')
      setRenderError('')
      setMapData(null)

      try {
        const response = await axios.get(`${BASE_URL}/listings/${listingId}/map`, { withCredentials: true })
        const data = response.data?.data

        if (!response.data?.success || !isValidCoordinates(data?.coordinates) || !data?.accessToken) {
          throw new Error(response.data?.message || 'Unable to load the listing map')
        }

        if (isCurrent) setMapData(data)
      } catch (error) {
        if (isCurrent) {
          setRequestError(error.response?.data?.message || error.message || 'Unable to load the listing map')
        }
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadMapData()

    return () => {
      isCurrent = false
    }
  }, [listingId, retryKey])

  useEffect(() => {
    if (!mapData || !containerRef.current) return undefined

    const map = new mapboxgl.Map({
      accessToken: mapData.accessToken,
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 15,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    new mapboxgl.Marker({ color: '#D9482B' })
      .setLngLat([longitude, latitude])
      .setPopup(new mapboxgl.Popup({ offset: 24 }).setText(title))
      .addTo(map)
    map.on('error', () => setRenderError('The map could not be rendered. Please try again.'))

    return () => {
      map.remove()
    }
  }, [latitude, longitude, mapData, title])

  return (
    <section>
      <h2 className="font-mono text-[10.5px] uppercase tracking-[.16em] text-faint">Location</h2>
      <p className="mt-4 text-[14.5px] text-muted">{address}</p>
      <div className="relative mt-5 overflow-hidden rounded-[22px] border border-ink/12 bg-ink/4">
        {isLoading && <div className="grid h-80 place-items-center text-[13.5px] text-muted">Loading map…</div>}
        {requestError && (
          <div className="flex h-80 flex-col items-center justify-center gap-3 p-5 text-center text-[13.5px] text-clay">
            <p>{requestError}</p>
            <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="cursor-pointer font-medium text-ink underline underline-offset-2 hover:text-clay">Try again</button>
          </div>
        )}
        {mapData && <div ref={containerRef} className="h-80 w-full" aria-label={`Map showing ${title}`} />}
        {renderError && <p className="absolute inset-x-4 bottom-4 rounded-xl border border-clay/25 bg-card/95 px-3 py-2 text-center text-[13px] text-clay">{renderError}</p>}
      </div>
    </section>
  )
}

export default ListingMap
