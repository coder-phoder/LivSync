import { Link, NavLink } from 'react-router-dom'

function Navbar() {
  const linkClass = ({ isActive }) => (
    isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
  )

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4" aria-label="Main navigation">
        <Link to="/" className="text-lg font-semibold tracking-tight text-slate-900">
          LivSync
        </Link>
        <div className="flex items-center gap-5 text-sm font-medium">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/user/login" className={linkClass}>Tenant log in</NavLink>
          <NavLink to="/user/register" className="rounded-md bg-slate-900 px-3 py-2 text-white hover:bg-slate-700">
            Find a home
          </NavLink>
        </div>
      </nav>
    </header>
  )
}

export default Navbar
