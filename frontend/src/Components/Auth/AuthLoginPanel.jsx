import axios from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthHeader, ErrorNote, Field, PasswordField, SubmitButton } from './AuthKit'
import { CITIES } from '../Landing/landingContent'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL

const COPY = {
  user: {
    heading: 'Everything you left open is still open.',
    register: 'Need a tenant account? Create one',
    title: 'Tenant log in',
    waiting: [
      'Saved listings and the searches you set alerts on',
      'Applications, with whatever the landlord has done to them since',
      'Your BuddyUp matches and every thread attached to a listing',
    ],
  },
  landlord: {
    heading: 'Your listings are ready when you are.',
    register: 'Need a landlord account? Create one',
    title: 'Landlord log in',
    waiting: [
      'Your listings and the full cost tenants see before they enquire',
      'Applications, viewings and messages in one place',
      'Rental agreements ready for your saved signature',
    ],
  },
}

function AuthLoginPanel({ role }) {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const isLandlord = role === 'landlord'
  const copy = COPY[role]
  const registerPath = isLandlord ? '/landlord/register' : '/user/register'

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await axios.post(`${BASE_URL}${isLandlord ? '/landlord/login' : '/auth/login'}`, form, { withCredentials: true })
      const account = isLandlord ? response.data?.data?.landlord : response.data?.data?.user

      if (!response.data?.success || !account) throw new Error(response.data?.message || 'Unable to log in')

      setSession({ role, token: response.data?.data?.token || null, phone: account.phone })

      if (!account.emailVerified) {
        navigate('/verify-email', { replace: true })
        return
      }

      if (isLandlord) {
        navigate(account.hasSignature ? '/landlord' : '/landlord/signature', { replace: true })
        return
      }

      navigate('/user', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to log in')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-forest text-paper">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(244,241,234,.055)_1px,transparent_1px)] bg-[size:74px_100%]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_78%_12%,rgba(207,240,74,.12),transparent_70%)]" />

      <div className="relative mx-auto w-full max-w-[1180px] px-5 py-6 sm:px-10 lg:px-14">
        <AuthHeader to={registerPath}>{copy.register}</AuthHeader>
      </div>

      <main className="relative mx-auto grid w-full max-w-[1180px] flex-1 items-center gap-12 px-5 pb-16 pt-6 sm:px-10 lg:grid-cols-[minmax(0,1fr)_432px] lg:gap-20 lg:px-14 lg:pb-24">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[.16em] text-lime">{isLandlord ? 'Landlord space' : 'Tenant space'}</p>
          <h1 className="mt-4 max-w-[11em] font-display text-[40px] font-bold leading-[.97] tracking-[-.042em] text-balance sm:text-6xl">{copy.heading}</h1>
          <ul className="mt-9 grid max-w-[34em] gap-3.5 border-t border-paper/15 pt-6">
            {copy.waiting.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] leading-snug text-forest-mute"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-lime" />{item}</li>
            ))}
          </ul>
        </div>

        <div className="relative min-w-0">
          <div aria-hidden className="absolute -left-4 right-6 -bottom-6 top-6 rounded-[22px] border border-paper/20" />
          <div className="relative rounded-[22px] border border-paper/15 bg-paper/7 p-6 shadow-[0_50px_80px_-46px_rgba(0,0,0,.85)] backdrop-blur-sm sm:p-8">
            <h2 className="font-display text-[26px] font-bold tracking-[-.032em]">{copy.title}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-forest-mute">Use the account you created for {isLandlord ? 'your properties.' : 'your home search.'}</p>

            <form className="mt-6" onSubmit={handleSubmit}>
              <div className="grid gap-4.5">
                <Field label="Email or phone" id="identifier" name="identifier" type="text" value={form.identifier} onChange={handleChange} autoComplete="username" inputMode="email" required placeholder="you@example.com" />
                <PasswordField id="password" name="password" value={form.password} onChange={handleChange} autoComplete="current-password" required />
              </div>
              <div className="mt-6 grid gap-3.5"><ErrorNote>{error}</ErrorNote><SubmitButton busy={isSubmitting}>{isSubmitting ? 'Logging in' : 'Log in'}</SubmitButton></div>
            </form>
          </div>
        </div>
      </main>

      <div className="relative overflow-hidden border-t border-paper/12"><div className="flex w-max animate-marquee py-3.5 font-mono text-xs uppercase tracking-[.2em] text-forest-mute motion-reduce:animate-none">{[0, 1].map((copyIndex) => <span key={copyIndex} aria-hidden={copyIndex === 1} className="flex gap-10 pr-10">{CITIES.map((city) => <span key={city} className="flex gap-10">{city}<span className="text-lime">◆</span></span>)}</span>)}</div></div>
    </div>
  )
}

export default AuthLoginPanel
