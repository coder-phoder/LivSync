import axios from 'axios'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL

const LINKS = [
  ['/user', 'Home', true],
  ['/user/listings', 'Listings'],
  ['/buddies', 'BuddyUp'],
  ['/rentals', 'Rentals'],
  ['/messages', 'Messages'],
  ['/calls', 'Calls'],
  ['/user/profile', 'Profile'],
]

function UserNavbar() {
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
      const response = await axios.post(`${BASE_URL}/auth/logout`, {}, { withCredentials: true })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to log out')
      }

      clearSession()
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to log out')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const linkClass = ({ isActive }) => [
    'rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
    isActive ? 'bg-ink text-[#F7F5EF]' : 'text-ink-soft hover:bg-ink/6 hover:text-ink',
  ].join(' ')

  const panelLinkClass = ({ isActive }) => [
    'rounded-xl px-4 py-3 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
    isActive ? 'bg-ink text-[#F7F5EF]' : 'bg-ink/4 text-ink-soft hover:bg-ink/8 hover:text-ink',
  ].join(' ')

  const logoutClass = 'cursor-pointer rounded-full border border-ink/20 px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-ink/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-progress disabled:opacity-60'

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/85 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-[1240px] items-center gap-4 px-5 py-3 sm:px-10 lg:px-16" aria-label="User navigation">
        <NavLink to="/user" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
          <span className="grid size-6.5 place-items-center rounded-[7px] border-[1.5px] border-ink">
            <span className="size-2 rounded-[2px] bg-clay" />
          </span>
          <span className="font-display text-[19px] font-bold tracking-[-.035em]">LivSync</span>
        </NavLink>

        {/* The main destinations fold into the panel below laptop width. */}
        <div className="hidden flex-1 items-center gap-0.5 lg:flex">
          {LINKS.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>{label}</NavLink>
          ))}
        </div>

        <button type="button" onClick={handleLogout} disabled={isLoggingOut} className={`ml-auto hidden shrink-0 lg:block ${logoutClass}`}>
          {isLoggingOut ? 'Logging out' : 'Log out'}
        </button>

        <button
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          aria-expanded={isMenuOpen}
          aria-controls="user-menu-panel"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          className="ml-auto grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-ink/20 text-ink transition-colors hover:bg-ink/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:hidden"
        >
          {isMenuOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </nav>

      <div id="user-menu-panel" hidden={!isMenuOpen} className="border-t border-ink/10 bg-paper lg:hidden">
        {/* A destination reached is a menu that has served its purpose. */}
        <div onClick={() => setIsMenuOpen(false)} className="mx-auto grid w-full max-w-[1240px] gap-1.5 px-5 py-4 sm:grid-cols-2 sm:px-10">
          {LINKS.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} className={panelLinkClass}>{label}</NavLink>
          ))}
          <button type="button" onClick={handleLogout} disabled={isLoggingOut} className={`mt-1.5 sm:col-span-2 ${logoutClass}`}>
            {isLoggingOut ? 'Logging out' : 'Log out'}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mx-auto max-w-[1240px] px-5 pb-3 text-sm text-clay sm:px-10 lg:px-16">{error}</p>}
    </header>
  )
}

export default UserNavbar
