import axios from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AccountSwitch, AuthHeader, ErrorNote, Field, LABEL, PasswordField, SubmitButton } from '../../Components/Auth/AuthKit'
import { CITIES } from '../../Components/Landing/landingContent'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL

const WAITING = [
  'Saved listings and the searches you set alerts on',
  'Applications, with whatever the landlord has done to them since',
  'Your BuddyUp matches and every thread attached to a listing',
]

function LoginPage() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [accountType, setAccountType] = useState('user')
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const endpoint = accountType === 'landlord' ? '/landlord/login' : '/auth/login'
      const response = await axios.post(`${BASE_URL}${endpoint}`, form, { withCredentials: true })
      const account = accountType === 'landlord' ? response.data?.data?.landlord : response.data?.data?.user

      if (!response.data?.success || !account) {
        throw new Error(response.data?.message || 'Unable to log in')
      }

      setSession({
        role: accountType,
        token: response.data?.data?.token || null,
        phone: account.phone,
      })
      if (!account.emailVerified) {
        navigate('/verify-email', { replace: true })
        return
      }

      // A landlord signs once; every rental agreement is stamped with it, so collect it up front.
      if (accountType === 'landlord') {
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
        <AuthHeader to="/register">Need an account? Create one</AuthHeader>
      </div>

      <main className="relative mx-auto grid w-full max-w-[1180px] flex-1 items-center gap-12 px-5 pb-16 pt-6 sm:px-10 lg:grid-cols-[minmax(0,1fr)_432px] lg:gap-20 lg:px-14 lg:pb-24">
        <div className="min-w-0">
          <h1 className="max-w-[11em] font-display text-[40px] font-bold leading-[.97] tracking-[-.042em] text-balance sm:text-6xl">
            Everything you left open is still open.
          </h1>
          <ul className="mt-9 grid max-w-[34em] gap-3.5 border-t border-paper/15 pt-6">
            {WAITING.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] leading-snug text-forest-mute">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-lime" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative min-w-0">
          <div aria-hidden className="absolute -left-4 right-6 -bottom-6 top-6 rounded-[22px] border border-paper/20" />
          <div className="relative rounded-[22px] border border-paper/15 bg-paper/7 p-6 shadow-[0_50px_80px_-46px_rgba(0,0,0,.85)] backdrop-blur-sm sm:p-8">
            <h2 className="font-display text-[26px] font-bold tracking-[-.032em]">Log in</h2>

            <form className="mt-6" onSubmit={handleSubmit}>
              <fieldset>
                <legend className={`${LABEL} mb-2.5`}>Log in as</legend>
                <AccountSwitch value={accountType} onChange={setAccountType} compact />
              </fieldset>

              <div className="mt-6 grid gap-4.5">
                <Field
                  label="Email or phone"
                  id="identifier"
                  name="identifier"
                  type="text"
                  value={form.identifier}
                  onChange={handleChange}
                  autoComplete="username"
                  inputMode="email"
                  required
                  placeholder="you@example.com"
                />
                <PasswordField
                  id="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="mt-6 grid gap-3.5">
                <ErrorNote>{error}</ErrorNote>
                <SubmitButton busy={isSubmitting}>
                  {isSubmitting ? 'Logging in' : 'Log in'}
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      </main>

      <div className="relative overflow-hidden border-t border-paper/12">
        <div className="flex w-max animate-marquee py-3.5 font-mono text-xs uppercase tracking-[.2em] text-forest-mute motion-reduce:animate-none">
          {[0, 1].map((copy) => (
            <span key={copy} aria-hidden={copy === 1} className="flex gap-10 pr-10">
              {CITIES.map((city) => (
                <span key={city} className="flex gap-10">{city}<span className="text-lime">◆</span></span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LoginPage
