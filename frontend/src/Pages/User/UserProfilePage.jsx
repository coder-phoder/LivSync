import axios from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserNavbar from '../../Components/User/UserNavbar'
import DocumentVault from '../../Components/User/DocumentVault'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL

// Every single-choice preference, rendered from one list instead of eighteen hand-written selects.
const CHOICES = [
  ['sleepSchedule', 'Sleep schedule', ['early-bird', 'night-owl', 'flexible']],
  ['workSchedule', 'Work or study schedule', ['day-shift', 'night-shift', 'remote', 'student', 'flexible']],
  ['foodHabits', 'Food habits', ['vegetarian', 'vegan', 'eggetarian', 'non-vegetarian', 'no-preference']],
  ['smoking', 'Smoking', ['non-smoker', 'occasional', 'smoker']],
  ['drinking', 'Drinking', ['never', 'socially', 'regularly']],
  ['pets', 'Pets', ['no-pets', 'has-pets', 'fine-with-pets']],
  ['guests', 'Guests over', ['rarely', 'sometimes', 'often']],
  ['roommateGender', 'Preferred buddy gender', ['any', 'male', 'female', 'non-binary']],
]

const SLIDERS = [
  ['cleanliness', 'Cleanliness', 'Relaxed', 'Spotless'],
  ['noiseTolerance', 'Noise tolerance', 'Need quiet', 'Fine with noise'],
]

const EMPTY = {
  lookingForBuddy: false,
  budget: { min: 0, max: 0 },
  city: '',
  moveInDate: '',
  sleepSchedule: 'flexible',
  workSchedule: 'flexible',
  cleanliness: 3,
  noiseTolerance: 3,
  foodHabits: 'no-preference',
  smoking: 'non-smoker',
  drinking: 'never',
  pets: 'no-pets',
  guests: 'sometimes',
  roommateGender: 'any',
  occupation: '',
  interests: '',
  bio: '',
}

const labelOf = (value) => value.replaceAll('-', ' ')
const inputClass = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm capitalize outline-none focus:border-slate-900'

function UserProfilePage() {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const [user, setUser] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState('')

  useEffect(() => {
    let isCurrent = true

    const loadProfile = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/auth/profile`, { withCredentials: true })
        const profile = response.data?.data?.user

        if (!response.data?.success || !profile) throw new Error(response.data?.message || 'Unable to load your profile')
        if (!isCurrent) return

        setUser(profile)
        setForm({
          ...EMPTY,
          ...profile.preferences,
          budget: { min: profile.preferences?.budget?.min || 0, max: profile.preferences?.budget?.max || 0 },
          moveInDate: profile.preferences?.moveInDate ? profile.preferences.moveInDate.slice(0, 10) : '',
          interests: (profile.preferences?.interests || []).join(', '),
        })
      } catch (requestError) {
        if (!isCurrent) return

        if (requestError.response?.status === 401) {
          clearSession()
          navigate('/login', { replace: true })
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

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSavedAt('')
    setIsSaving(true)

    try {
      const preferences = {
        ...form,
        budget: { min: Number(form.budget.min) || 0, max: Number(form.budget.max) || 0 },
        cleanliness: Number(form.cleanliness),
        noiseTolerance: Number(form.noiseTolerance),
        interests: form.interests.split(',').map((interest) => interest.trim()).filter(Boolean),
      }

      if (!preferences.moveInDate) delete preferences.moveInDate

      const response = await axios.patch(`${BASE_URL}/auth/preferences`, { preferences }, { withCredentials: true })

      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to save your preferences')

      setSavedAt(new Date().toLocaleTimeString())
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to save your preferences')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <UserNavbar />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-sm font-medium text-slate-500">Tenant profile</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your preferences</h1>
        <p className="mt-2 text-sm text-slate-600">
          These answers match you with a BuddyUp partner and are shared with a landlord when you request a listing.
        </p>

        {isLoading && <p className="mt-8 text-slate-600">Loading your profile…</p>}

        {user && !isLoading && (
          <>
            <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Personal details</h2>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <div><dt className="text-sm text-slate-500">Name</dt><dd className="mt-1 font-medium">{user.name}</dd></div>
                <div><dt className="text-sm text-slate-500">Email</dt><dd className="mt-1 font-medium break-words">{user.email}</dd></div>
                <div><dt className="text-sm text-slate-500">Phone</dt><dd className="mt-1 font-medium">{user.phone}</dd></div>
                <div><dt className="text-sm text-slate-500">Gender</dt><dd className="mt-1 font-medium capitalize">{labelOf(user.gender || '')}</dd></div>
              </dl>
            </section>

            <div className="mt-6">
              <DocumentVault />
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.lookingForBuddy}
                    onChange={(event) => setField('lookingForBuddy', event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="font-semibold">Join BuddyUp</span>
                    <span className="mt-1 block text-sm text-slate-600">
                      Show your profile to other tenants looking for a flatmate, and see theirs.
                    </span>
                  </span>
                </label>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Budget and place</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Budget from (₹ / month)
                    <input type="number" min="0" value={form.budget.min} onChange={(event) => setField('budget', { ...form.budget, min: event.target.value })} className={inputClass} />
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
                    Budget up to (₹ / month)
                    <input type="number" min="0" value={form.budget.max} onChange={(event) => setField('budget', { ...form.budget, max: event.target.value })} className={inputClass} />
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
                    City
                    <input type="text" maxLength={80} value={form.city} onChange={(event) => setField('city', event.target.value)} placeholder="Pune" className={inputClass} />
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
                    Looking to move in
                    <input type="date" value={form.moveInDate} onChange={(event) => setField('moveInDate', event.target.value)} className={inputClass} />
                  </label>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Living habits</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {CHOICES.map(([name, label, options]) => (
                    <label key={name} className="block text-xs font-medium text-slate-700">
                      {label}
                      <select value={form[name]} onChange={(event) => setField(name, event.target.value)} className={inputClass}>
                        {options.map((option) => <option key={option} value={option}>{labelOf(option)}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {SLIDERS.map(([name, label, low, high]) => (
                    <label key={name} className="block text-xs font-medium text-slate-700">
                      {label}: <span className="font-semibold">{form[name]}/5</span>
                      <input type="range" min="1" max="5" value={form[name]} onChange={(event) => setField(name, event.target.value)} className="mt-2 w-full accent-slate-900" />
                      <span className="flex justify-between text-[11px] font-normal text-slate-500"><span>{low}</span><span>{high}</span></span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">About you</h2>
                <div className="mt-4 space-y-4">
                  <label className="block text-xs font-medium text-slate-700">
                    Occupation
                    <input type="text" maxLength={80} value={form.occupation} onChange={(event) => setField('occupation', event.target.value)} placeholder="Product designer" className={inputClass} />
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
                    Interests (comma separated)
                    <input type="text" value={form.interests} onChange={(event) => setField('interests', event.target.value)} placeholder="cooking, football, films" className={`${inputClass} normal-case`} />
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
                    Short bio
                    <textarea rows={3} maxLength={500} value={form.bio} onChange={(event) => setField('bio', event.target.value)} placeholder="A line or two about how you live." className={`${inputClass} normal-case`} />
                  </label>
                </div>
              </section>

              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

              <div className="flex items-center gap-4">
                <button type="submit" disabled={isSaving} className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving ? 'Saving…' : 'Save preferences'}
                </button>
                {savedAt && <span className="text-sm text-green-700">Saved at {savedAt}</span>}
              </div>
            </form>
          </>
        )}

        {error && !user && <p role="alert" className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      </main>
    </div>
  )
}

export default UserProfilePage
