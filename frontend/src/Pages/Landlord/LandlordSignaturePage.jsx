import axios from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LandlordNavbar from '../../Components/Landlord/LandlordNavbar'
import SignaturePad from '../../Components/Landlord/SignaturePad'
import { loginPathFor, useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL

function LandlordSignaturePage() {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const [profile, setProfile] = useState(null)
  const [dataUrl, setDataUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState('')

  useEffect(() => {
    let isCurrent = true

    const loadProfile = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/landlord/profile`, { withCredentials: true })

        if (!response.data?.success) throw new Error(response.data?.message || 'Unable to load your profile')
        if (isCurrent) setProfile(response.data.data.landlord)
      } catch (requestError) {
        if (!isCurrent) return

        if (requestError.response?.status === 401) {
          clearSession()
          navigate(loginPathFor('landlord'), { replace: true })
          return
        }

        setError(requestError.response?.data?.message || requestError.message || 'Unable to load your profile')
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadProfile()

    return () => {
      isCurrent = false
    }
  }, [clearSession, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!dataUrl) {
      setError('Draw your signature before saving')
      return
    }

    setIsSaving(true)

    try {
      const response = await axios.post(`${BASE_URL}/landlord/signature`, { dataUrl }, { withCredentials: true })

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to save your signature')

      setProfile(response.data.data.landlord)
      setSavedAt(new Date().toLocaleString())
      navigate('/landlord', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to save your signature')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <LandlordNavbar />
      <main className="mx-auto w-full max-w-2xl px-5 py-10">
        <p className="text-sm font-medium text-slate-500">One-time setup</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your e-signature</h1>
        <p className="mt-3 text-slate-600">
          LivSync stamps this signature onto every rental agreement issued for your listings. You can redraw it at any time.
        </p>

        {isLoading && <p className="mt-8 text-slate-600">Loading your profile…</p>}

        {!isLoading && (
          <form onSubmit={handleSubmit} className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {profile?.hasSignature && (
              <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                A signature is already on file{profile.signedAt ? ` from ${new Date(profile.signedAt).toLocaleDateString()}` : ''}. Drawing a new one replaces it.
              </p>
            )}
            <SignaturePad onChange={setDataUrl} disabled={isSaving} />
            {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
            {savedAt && <p className="mt-4 text-sm text-green-700">Signature saved at {savedAt}.</p>}
            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving…' : 'Save signature'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/landlord')}
                className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {profile?.hasSignature ? 'Back to dashboard' : 'Do this later'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

export default LandlordSignaturePage
