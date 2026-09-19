import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ComparisonContext = createContext(null)
const STORAGE_KEY = 'livsync-comparison'
const MAX_LISTINGS = 4

function storedIds() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === 'string'))].slice(0, MAX_LISTINGS) : []
  } catch {
    return []
  }
}

export function ComparisonProvider({ children }) {
  const [listingIds, setListingIds] = useState(storedIds)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listingIds))
  }, [listingIds])

  const value = useMemo(() => ({
    listingIds,
    maxListings: MAX_LISTINGS,
    toggleListing: (listingId) => setListingIds((current) => (
      current.includes(listingId)
        ? current.filter((id) => id !== listingId)
        : current.length < MAX_LISTINGS ? [...current, listingId] : current
    )),
    removeListing: (listingId) => setListingIds((current) => current.filter((id) => id !== listingId)),
    clearComparison: () => setListingIds([]),
  }), [listingIds])

  return <ComparisonContext.Provider value={value}>{children}</ComparisonContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useComparison() {
  const context = useContext(ComparisonContext)
  if (!context) throw new Error('useComparison must be used inside ComparisonProvider')
  return context
}
