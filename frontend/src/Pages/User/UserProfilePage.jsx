import axios from 'axios'
import { Check, HeartHandshake, Home, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserNavbar from '../../Components/User/UserNavbar'
import DocumentVault from '../../Components/User/DocumentVault'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const SHELL = 'mx-auto w-full max-w-[1240px] px-5 sm:px-10 lg:px-16'

const CHOICES = [
  ['sleepSchedule', 'Sleep schedule', ['early-bird', 'night-owl', 'flexible']],
  ['workSchedule', 'Work or study', ['day-shift', 'night-shift', 'remote', 'student', 'flexible']],
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

const inputClass = 'mt-2 w-full rounded-xl border border-ink/15 bg-card px-3.5 py-3 text-[14px] text-ink outline-none transition-colors placeholder:text-faint/80 focus:border-ink/55 focus:ring-2 focus:ring-lime/55 disabled:cursor-not-allowed disabled:bg-ink/5'
const labelClass = 'block font-mono text-[10.5px] font-medium uppercase tracking-[.12em] text-faint'

const labelOf = (value) => value.replaceAll('-', ' ')

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'Y'
}

function detail(label, value) {
  return <div key={label} className="grid gap-1.5 border-b border-ink/10 py-3.5 last:border-b-0"><dt className="font-mono text-[10px] uppercase tracking-[.13em] text-faint">{label}</dt><dd className="min-w-0 break-words text-[14px] font-medium text-ink">{value || 'Not provided'}</dd></div>
}

function ChoiceField({ name, label, options, value, onChange }) {
  return (
    <label className={labelClass}>
      {label}
      <select value={value} onChange={(event) => onChange(name, event.target.value)} className={`${inputClass} cursor-pointer capitalize`}>
        {options.map((option) => <option key={option} value={option}>{labelOf(option)}</option>)}
      </select>
    </label>
  )
}

function SectionHeading({ eyebrow, id, title, detail: description, icon: Icon }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-forest text-lime"><Icon aria-hidden className="size-[18px]" /></span>
      <div>
        <p className="font-mono text-[10.5px] uppercase tracking-[.15em] text-faint">{eyebrow}</p>
        <h2 id={id} className="mt-1.5 font-display text-[23px] font-bold leading-tight tracking-[-.035em]">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">{description}</p>}
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your profile" className="grid gap-8">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end"><div className="grid gap-4"><span className="h-3 w-28 animate-pulse rounded bg-ink/8" /><span className="h-14 w-full max-w-xl animate-pulse rounded-xl bg-ink/8" /><span className="h-5 w-full max-w-lg animate-pulse rounded bg-ink/6" /></div><span className="h-[176px] animate-pulse rounded-2xl bg-ink/6" /></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]"><div className="grid gap-6"><span className="h-[310px] animate-pulse rounded-2xl bg-ink/6" /><span className="h-[540px] animate-pulse rounded-2xl bg-ink/6" /></div><div className="grid gap-5"><span className="h-[280px] animate-pulse rounded-2xl bg-ink/6" /><span className="h-[340px] animate-pulse rounded-2xl bg-ink/6" /></div></div>
    </div>
  )
}

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

    return () => { isCurrent = false }
  }, [clearSession, navigate])

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  const profileScore = useMemo(() => {
    const completed = [form.city, form.moveInDate, form.occupation, form.interests, form.bio, form.lookingForBuddy].filter(Boolean).length
    return Math.round((completed / 6) * 100)
  }, [form])

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

      setSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to save your preferences')
    } finally {
      setIsSaving(false)
    }
  }

  const personalDetails = user && [
    ['Email', user.email],
    ['Phone', user.phone],
    ['Gender', labelOf(user.gender || '')],
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-paper text-ink">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(circle_at_87%_8%,rgba(207,240,74,.4),transparent_18rem),radial-gradient(circle_at_13%_30%,rgba(200,185,143,.24),transparent_20rem),linear-gradient(to_right,rgba(21,19,15,.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(21,19,15,.045)_1px,transparent_1px)] bg-[size:auto,auto,74px_74px,74px_74px]" style={{ maskImage: 'linear-gradient(to_bottom,#000_0%,rgba(0,0,0,.7)_50%,transparent_100%)', WebkitMaskImage: 'linear-gradient(to_bottom,#000_0%,rgba(0,0,0,.7)_50%,transparent_100%)' }} />
      <UserNavbar />

      <main className={`${SHELL} relative pb-20 pt-10 lg:pt-14`}>
        {isLoading && <ProfileSkeleton />}

        {!isLoading && !user && error && (
          <section role="alert" className="max-w-xl rounded-2xl border border-clay/30 bg-clay/8 p-6">
            <p className="font-mono text-[11px] uppercase tracking-[.16em] text-clay">Profile unavailable</p>
            <h1 className="mt-3 font-display text-2xl font-bold tracking-[-.035em]">We could not load your profile.</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-5 cursor-pointer rounded-full bg-ink px-5 py-3 text-[14.5px] font-medium text-[#F7F5EF] transition-colors hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">Try again</button>
          </section>
        )}

        {user && !isLoading && (
          <form onSubmit={handleSubmit}>
            <header className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[.17em] text-faint">Your renter profile</p>
                <h1 className="mt-4 max-w-[12ch] font-display text-[40px] font-bold leading-[.96] tracking-[-.055em] text-balance sm:text-5xl lg:text-[58px]">Make your next place feel right.</h1>
                <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-muted">Set the details that shape your search and help potential flatmates understand how you live.</p>
              </div>

              <section aria-label="Profile completion" className="rounded-2xl border border-forest/20 bg-forest p-5 text-[#F7F5EF] shadow-[0_25px_50px_-32px_rgba(19,50,42,.9)]">
                <div className="flex items-start justify-between gap-4"><span className="grid size-10 place-items-center rounded-xl bg-lime text-ink"><Sparkles aria-hidden className="size-5" /></span><span className="font-mono text-[11px] tracking-[.12em] text-lime">{profileScore}% READY</span></div>
                <h2 className="mt-5 font-display text-[22px] font-bold leading-tight tracking-[-.035em]">A clearer profile makes for better introductions.</h2>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#F7F5EF]/20"><div className="h-full rounded-full bg-lime transition-[width] duration-500" style={{ width: `${profileScore}%` }} /></div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-[#F7F5EF]/70">Add your move, routine and a little about yourself to make your BuddyUp profile more useful.</p>
              </section>
            </header>

            <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-10">
              <div className="grid gap-6">
                <section aria-labelledby="search-preferences" className="rounded-2xl border border-ink/15 bg-card/90 p-5 shadow-[0_22px_48px_-40px_rgba(21,19,15,.75)] sm:p-6">
                  <SectionHeading id="search-preferences" eyebrow="Your move" title="Start with the essentials." detail="These details help focus your search and tell a potential buddy what you have in mind." icon={Home} />
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>Budget from <span className="normal-case tracking-normal text-faint">(₹ / month)</span><input type="number" min="0" value={form.budget.min} onChange={(event) => setField('budget', { ...form.budget, min: event.target.value })} className={inputClass} /></label>
                    <label className={labelClass}>Budget up to <span className="normal-case tracking-normal text-faint">(₹ / month)</span><input type="number" min="0" value={form.budget.max} onChange={(event) => setField('budget', { ...form.budget, max: event.target.value })} className={inputClass} /></label>
                    <label className={labelClass}>Preferred city<input type="text" maxLength="80" value={form.city} onChange={(event) => setField('city', event.target.value)} placeholder="Pune" className={inputClass} /></label>
                    <label className={labelClass}>Ready to move in<input type="date" value={form.moveInDate} onChange={(event) => setField('moveInDate', event.target.value)} className={inputClass} /></label>
                  </div>
                </section>

                <section aria-labelledby="lifestyle-preferences" className="rounded-2xl border border-ink/15 bg-card/90 p-5 shadow-[0_22px_48px_-40px_rgba(21,19,15,.75)] sm:p-6">
                  <SectionHeading id="lifestyle-preferences" eyebrow="Living style" title="The everyday details." detail="A few thoughtful answers create a much more compatible BuddyUp match." icon={SlidersHorizontal} />
                  <div className="mt-6 grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    {CHOICES.map(([name, label, options]) => <ChoiceField key={name} name={name} label={label} options={options} value={form[name]} onChange={setField} />)}
                  </div>

                  <div className="mt-7 grid gap-4 border-t border-ink/12 pt-6 sm:grid-cols-2">
                    {SLIDERS.map(([name, label, low, high]) => (
                      <label key={name} className="rounded-xl bg-ink/4 p-4">
                        <span className="flex items-center justify-between gap-4 font-mono text-[10.5px] uppercase tracking-[.12em] text-faint"><span>{label}</span><span className="text-ink">{form[name]} / 5</span></span>
                        <input type="range" min="1" max="5" value={form[name]} onChange={(event) => setField(name, event.target.value)} className="mt-4 w-full cursor-pointer accent-forest" />
                        <span className="mt-1.5 flex justify-between text-[11px] text-muted"><span>{low}</span><span>{high}</span></span>
                      </label>
                    ))}
                  </div>
                </section>

                <section aria-labelledby="about-preferences" className="rounded-2xl border border-ink/15 bg-card/90 p-5 shadow-[0_22px_48px_-40px_rgba(21,19,15,.75)] sm:p-6">
                  <SectionHeading id="about-preferences" eyebrow="Your introduction" title="Give your profile a point of view." detail="A short, honest snapshot goes a long way when someone is deciding whether to reach out." icon={HeartHandshake} />
                  <div className="mt-6 grid gap-5">
                    <label className={labelClass}>Occupation<input type="text" maxLength="80" value={form.occupation} onChange={(event) => setField('occupation', event.target.value)} placeholder="Product designer" className={inputClass} /></label>
                    <label className={labelClass}>Interests <span className="normal-case tracking-normal text-faint">(comma separated)</span><input type="text" value={form.interests} onChange={(event) => setField('interests', event.target.value)} placeholder="Cooking, football, films" className={inputClass} /></label>
                    <label className={labelClass}>A little about you<textarea rows={4} maxLength="500" value={form.bio} onChange={(event) => setField('bio', event.target.value)} placeholder="A line or two about how you live and what makes a home work for you." className={`${inputClass} resize-y`} /></label>
                  </div>
                </section>
              </div>

              <aside className="grid gap-5 lg:sticky lg:top-24">
                <section aria-labelledby="account-heading" className="overflow-hidden rounded-2xl border border-ink/15 bg-card/90 shadow-[0_22px_48px_-40px_rgba(21,19,15,.75)]">
                  <div className="bg-ink px-5 pb-5 pt-6 text-[#F7F5EF]"><div className="flex items-center gap-3.5"><span className="grid size-11 place-items-center rounded-xl bg-lime font-display text-base font-bold text-ink">{initials(user.name)}</span><span className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[.13em] text-[#F7F5EF]/60">Signed in as</p><h2 id="account-heading" className="mt-1 truncate font-display text-[19px] font-bold tracking-[-.03em]">{user.name}</h2></span></div></div>
                  <dl className="px-5 py-1">{personalDetails.map(([label, value]) => detail(label, value))}</dl>
                  <p className="border-t border-ink/10 px-5 py-3.5 text-[11.5px] leading-relaxed text-faint">Your account details are protected and are not part of your public BuddyUp introduction.</p>
                </section>

                <section aria-labelledby="buddyup-heading" className={`rounded-2xl border p-5 transition-colors ${form.lookingForBuddy ? 'border-forest/25 bg-forest text-[#F7F5EF]' : 'border-ink/15 bg-card/90'}`}>
                  <div className="flex items-start justify-between gap-4"><span className={`grid size-10 place-items-center rounded-xl ${form.lookingForBuddy ? 'bg-lime text-ink' : 'bg-forest text-lime'}`}><HeartHandshake aria-hidden className="size-[19px]" /></span><span className={`font-mono text-[10px] uppercase tracking-[.13em] ${form.lookingForBuddy ? 'text-lime' : 'text-faint'}`}>{form.lookingForBuddy ? 'Active' : 'Optional'}</span></div>
                  <h2 id="buddyup-heading" className="mt-4 font-display text-[21px] font-bold tracking-[-.035em]">Open to a flatmate?</h2>
                  <p className={`mt-2 text-[13.5px] leading-relaxed ${form.lookingForBuddy ? 'text-[#F7F5EF]/72' : 'text-muted'}`}>Join BuddyUp to appear for tenants looking for someone with a similar lifestyle.</p>
                  <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-current/20 px-3.5 py-3 text-[13px] font-medium">
                    <span>{form.lookingForBuddy ? 'You are visible to matches' : 'Make my profile visible'}</span>
                    <input type="checkbox" checked={form.lookingForBuddy} onChange={(event) => setField('lookingForBuddy', event.target.checked)} className="size-4 cursor-pointer accent-lime" />
                  </label>
                </section>

                <DocumentVault />

                <div className="rounded-2xl border border-ink/15 bg-card/90 p-4 shadow-[0_18px_40px_-34px_rgba(21,19,15,.8)]">
                  {error && <p role="alert" className="mb-3 rounded-xl border border-clay/25 bg-clay/8 px-3.5 py-3 text-[13px] leading-relaxed text-clay">{error}</p>}
                  {savedAt && <p role="status" className="mb-3 flex items-center gap-2 text-[12.5px] text-forest"><Check aria-hidden className="size-4" />Saved at {savedAt}</p>}
                  <button type="submit" disabled={isSaving} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-[14px] font-medium text-[#F7F5EF] shadow-[0_14px_30px_-20px_rgba(21,19,15,.9)] transition-all hover:-translate-y-px hover:bg-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-progress disabled:opacity-60">
                    {isSaving ? 'Saving your profile…' : 'Save profile'}
                  </button>
                  <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-faint"><ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-forest" />You decide when shared profile details are included with a rental request.</p>
                </div>
              </aside>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

export default UserProfilePage
