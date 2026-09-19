import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../Components/Common/Navbar'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL

function VerifyEmailPage() {
  const navigate = useNavigate()
  const { role, clearSession } = useAuth()
  const isLandlord = role === 'landlord'
  // A landlord who has not drawn their signature yet still owes that step after verifying.
  const [home, setHome] = useState(isLandlord ? '/landlord' : '/user')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  // A second mount from React's dev double-render must not burn the resend cooldown.
  const hasRequested = useRef(false)

  const failWith = useCallback((requestError, fallback) => {
    if (requestError.response?.status === 401) {
      clearSession()
      navigate(isLandlord ? '/landlord/login' : '/user/login', { replace: true })
      return
    }

    setError(requestError.response?.data?.message || requestError.message || fallback)
  }, [clearSession, isLandlord, navigate])

  const requestCode = useCallback(async (isAutomatic) => {
    setError('')
    setNotice('')

    try {
      const response = await axios.post(`${BASE_URL}/verify/send`, {}, { withCredentials: true })
      const data = response.data?.data || {}

      if (data.email) setEmail(data.email)

      if (data.emailVerified) {
        setIsVerified(true)
        return
      }

      setCooldown(data.retryAfter || 60)
      setNotice(isAutomatic ? `We sent a 6-digit code to ${data.email}.` : response.data?.message || 'Code sent.')
    } catch (requestError) {
      // The server refuses a resend inside the cooldown and says how long is left; that is
      // the expected answer when a code was already mailed at registration, not a failure.
      const retryAfter = requestError.response?.data?.data?.retryAfter

      if (requestError.response?.status === 429 && retryAfter) {
        setCooldown(retryAfter)
        if (isAutomatic) setNotice('A code is already on its way to your inbox.')
        else setError(requestError.response.data.message)
        return
      }

      failWith(requestError, 'Unable to send a verification code')
    }
  }, [failWith])

  useEffect(() => {
    let isCurrent = true

    const start = async () => {
      try {
        const endpoint = isLandlord ? '/landlord/profile' : '/auth/profile'
        const response = await axios.get(`${BASE_URL}${endpoint}`, { withCredentials: true })
        const account = isLandlord ? response.data?.data?.landlord : response.data?.data?.user

        if (!isCurrent) return

        setEmail(account?.email || '')
        if (isLandlord && !account?.hasSignature) setHome('/landlord/signature')

        if (account?.emailVerified) {
          setIsVerified(true)
          return
        }

        if (hasRequested.current) return

        hasRequested.current = true
        await requestCode(true)
      } catch (requestError) {
        if (isCurrent) failWith(requestError, 'Unable to load your account')
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    start()

    return () => {
      isCurrent = false
    }
  }, [failWith, isLandlord, requestCode])

  useEffect(() => {
    if (cooldown <= 0) return undefined

    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)

    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      const response = await axios.post(`${BASE_URL}/verify/confirm`, { code }, { withCredentials: true })

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to verify your email')

      setIsVerified(true)
    } catch (requestError) {
      setCode('')
      failWith(requestError, 'Unable to verify your email')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-md px-5 py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {isVerified ? (
            <>
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg viewBox="0 0 20 20" aria-hidden="true" className="size-7 fill-current">
                  <path d="M8.3 14.3l-4-4 1.4-1.4 2.6 2.6 6-6L15.7 7l-7.4 7.3z" />
                </svg>
              </div>
              <h1 className="mt-4 text-2xl font-semibold">Email verified</h1>
              <p className="mt-2 text-sm text-slate-600">
                {email} is confirmed. A verified badge now shows on your profile{isLandlord ? ' and on every listing you post.' : ' and across LivSync.'}
              </p>
              <button
                type="button"
                onClick={() => navigate(home, { replace: true })}
                className="mt-6 w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Continue to your dashboard
              </button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">Verify your email</h1>
              <p className="mt-2 text-sm text-slate-600">
                {isLoading ? 'Loading your account…' : <>Enter the 6-digit code we sent to <span className="font-medium text-slate-900">{email}</span>. It expires in 10 minutes.</>}
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-slate-700" htmlFor="code">
                  Verification code
                  <input
                    id="code"
                    name="code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    required
                    className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-3 text-center text-2xl font-semibold tracking-[0.5em] outline-none focus:border-slate-700"
                  />
                </label>

                {notice && <p className="text-sm text-slate-600">{notice}</p>}
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting || code.length !== 6}
                  className="w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Verifying…' : 'Verify email'}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => requestCode(false)}
                  disabled={cooldown > 0 || isLoading}
                  className="font-semibold text-slate-900 hover:underline disabled:cursor-not-allowed disabled:font-normal disabled:text-slate-400 disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
                <button type="button" onClick={() => navigate(home, { replace: true })} className="text-slate-600 hover:underline">
                  Do this later
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default VerifyEmailPage
