import axios from 'axios'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL

// Shared landlord navigation is the anchor for the blue portfolio system across
// listings, rental decisions, conversations, calls, and this home workspace.
const LINKS = [
  ['/landlord', 'Home', true],
  ['/landlord/listings', 'Listings'],
  ['/rentals', 'Rentals'],
  ['/messages', 'Messages'],
  ['/calls', 'Calls'],
]

function LandlordNavbar() {
  const { clearSession } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isMenuOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isMenuOpen])

  const handleLogout = async () => {
    setError('')
    setIsLoggingOut(true)

    try {
      const response = await axios.post(`${BASE_URL}/landlord/logout`, {}, { withCredentials: true })
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to log out')

      clearSession()
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to log out')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const linkClass = ({ isActive }) => [
    'rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy',
    isActive ? 'bg-landlord-navy text-landlord-card shadow-[0_8px_18px_-14px_rgba(16,53,83,.95)]' : 'text-landlord-ink-soft hover:bg-landlord-navy/7 hover:text-landlord-navy',
  ].join(' ')

  const panelLinkClass = ({ isActive }) => [
    'rounded-xl px-4 py-3 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy',
    isActive ? 'bg-landlord-navy text-landlord-card' : 'bg-landlord-navy/5 text-landlord-ink-soft hover:bg-landlord-navy/10 hover:text-landlord-navy',
  ].join(' ')

  const logoutClass = 'cursor-pointer rounded-full border border-landlord-ink/20 px-3.5 py-2 text-sm font-medium whitespace-nowrap text-landlord-ink-soft transition-colors hover:border-landlord-navy hover:bg-landlord-navy hover:text-landlord-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy disabled:cursor-progress disabled:opacity-60'

  return (
    <header className="sticky top-0 z-50 border-b border-landlord-ink/10 bg-landlord-paper/88 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-[1240px] items-center gap-4 px-5 py-3 sm:px-10 lg:px-16" aria-label="Landlord navigation">
        <NavLink to="/landlord" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-landlord-navy">
          <span className="grid size-6.5 place-items-center rounded-[7px] bg-landlord-navy shadow-[0_8px_14px_-10px_rgba(16,53,83,.95)]"><span className="size-2 rounded-[2px] bg-landlord-cyan" /></span>
          <span className="font-display text-[19px] font-bold tracking-[-.035em] text-landlord-ink">LivSync</span>
          <span className="hidden rounded-full bg-landlord-navy/8 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.12em] text-landlord-ink-soft sm:inline">Landlord</span>
        </NavLink>

        <div className="hidden flex-1 items-center gap-0.5 lg:flex">
          {LINKS.map(([to, label, end]) => <NavLink key={to} to={to} end={end} className={linkClass}>{label}</NavLink>)}
        </div>

        <button type="button" onClick={handleLogout} disabled={isLoggingOut} className={`ml-auto hidden shrink-0 lg:block ${logoutClass}`}>{isLoggingOut ? 'Logging out' : 'Log out'}</button>

        <button
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          aria-expanded={isMenuOpen}
          aria-controls="landlord-menu-panel"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          className="ml-auto grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-landlord-ink/20 text-landlord-ink transition-colors hover:bg-landlord-navy/7 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landlord-navy lg:hidden"
        >
          {isMenuOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </nav>

      <div id="landlord-menu-panel" hidden={!isMenuOpen} className="border-t border-landlord-ink/10 bg-landlord-paper lg:hidden">
        <div onClick={() => setIsMenuOpen(false)} className="mx-auto grid w-full max-w-[1240px] gap-1.5 px-5 py-4 sm:grid-cols-2 sm:px-10">
          {LINKS.map(([to, label, end]) => <NavLink key={to} to={to} end={end} className={panelLinkClass}>{label}</NavLink>)}
          <button type="button" onClick={handleLogout} disabled={isLoggingOut} className={`mt-1.5 sm:col-span-2 ${logoutClass}`}>{isLoggingOut ? 'Logging out' : 'Log out'}</button>
        </div>
      </div>

      {error && <p role="alert" className="mx-auto max-w-[1240px] px-5 pb-3 text-sm text-landlord-alert sm:px-10 lg:px-16">{error}</p>}
    </header>
  )
}

export default LandlordNavbar
