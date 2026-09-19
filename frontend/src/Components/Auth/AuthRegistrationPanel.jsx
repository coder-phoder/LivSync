import axios from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthHeader, ErrorNote, Field, LABEL, PasswordField, Select, SubmitButton, Textarea } from './AuthKit'
import ProfileCard from './ProfileCard'
import { useAuth } from '../../Context/AuthContext'

const BASE_URL = import.meta.env.VITE_BASE_URL
const PROPERTY_TYPES = ['apartment', 'house', 'room', 'commercial']

const COPY = {
  user: {
    heading: 'Start with a profile that feels like you.',
    description: 'Tell future flatmates and landlords a little about yourself. You can tune your search preferences after you are in.',
    login: 'Already have a tenant account? Log in',
    preview: 'Your tenant profile',
  },
  landlord: {
    heading: 'List with the clarity tenants deserve.',
    description: 'Set up the landlord profile behind every listing. It tells tenants who is renting the home before they ever enquire.',
    login: 'Already have a landlord account? Log in',
    preview: 'Your landlord profile',
  },
}

function AuthRegistrationPanel({ role }) {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [form, setForm] = useState({
    name: '', phone: '', email: '', dob: '', gender: 'prefer-not-to-say', password: '', businessType: 'individual', companyName: '', address: '', city: '', propertyTypes: [], profileDescription: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const isLandlord = role === 'landlord'
  const copy = COPY[role]
  const loginPath = isLandlord ? '/landlord/login' : '/user/login'

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  const togglePropertyType = (event) => {
    const { value, checked } = event.target
    setForm((currentForm) => ({ ...currentForm, propertyTypes: checked ? [...currentForm.propertyTypes, value] : currentForm.propertyTypes.filter((type) => type !== value) }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const payload = isLandlord
      ? { name: form.name, phone: form.phone, email: form.email, password: form.password, businessType: form.businessType, companyName: form.companyName, address: form.address, city: form.city, propertyTypes: form.propertyTypes, profileDescription: form.profileDescription }
      : { name: form.name, phone: form.phone, email: form.email, dob: form.dob, gender: form.gender, password: form.password, role: 'tenant' }

    try {
      const response = await axios.post(`${BASE_URL}${isLandlord ? '/landlord/register' : '/auth/register'}`, payload, { withCredentials: true })
      const account = isLandlord ? response.data?.data?.landlord : response.data?.data?.user
      if (!response.data?.success || !account) throw new Error(response.data?.message || 'Unable to create your account')

      setSession({ role, token: response.data?.data?.token || null, phone: account.phone })
      navigate('/verify-email', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to create your account')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-forest text-paper">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[760px] bg-[linear-gradient(to_right,rgba(244,241,234,.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,241,234,.055)_1px,transparent_1px)] bg-[size:74px_74px]" style={{ maskImage: 'radial-gradient(110% 65% at 28% 0%, #000 18%, transparent 76%)', WebkitMaskImage: 'radial-gradient(110% 65% at 28% 0%, #000 18%, transparent 76%)' }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_78%_12%,rgba(207,240,74,.12),transparent_70%)]" />

      <div className="relative mx-auto w-full max-w-[1180px] px-5 py-6 sm:px-10 lg:px-14">
        <AuthHeader to={loginPath}>{copy.login}</AuthHeader>

        <main className="grid items-start gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 lg:py-16">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[.16em] text-lime">{isLandlord ? 'Landlord account' : 'Tenant account'}</p>
            <h1 className="mt-4 max-w-[13em] font-display text-[38px] font-bold leading-[.98] tracking-[-.042em] text-balance sm:text-5xl">{copy.heading}</h1>
            <p className="mt-5 max-w-[34em] text-[15.5px] leading-relaxed text-forest-mute text-pretty">{copy.description}</p>

            <form className="mt-9" onSubmit={handleSubmit}>
              <div className="grid gap-4.5 sm:grid-cols-2">
                <Field label="Full name" id="name" name="name" value={form.name} onChange={handleChange} autoComplete="name" required minLength="2" placeholder="Aarav Mehta" />
                <Field label="Phone number" id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} autoComplete="tel" required placeholder="+91 98765 43210" />
                <Field label="Email" id="email" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" required placeholder="you@example.com" />
                <PasswordField id="password" name="password" value={form.password} onChange={handleChange} autoComplete="new-password" required minLength="8" hint="8 characters or more" />
              </div>

              {isLandlord ? (
                <div className="mt-4.5 grid gap-4.5">
                  <div className="grid gap-4.5 sm:grid-cols-2">
                    <Select label="You rent out as" id="businessType" name="businessType" value={form.businessType} onChange={handleChange}><option value="individual">An individual</option><option value="company">A company</option></Select>
                    <Field label="Company name" hint={form.businessType === 'company' ? '' : '(optional)'} id="companyName" name="companyName" value={form.companyName} onChange={handleChange} required={form.businessType === 'company'} placeholder="Mehta Estates" />
                  </div>
                  <div className="grid gap-4.5 sm:grid-cols-2"><Field label="Address" id="address" name="address" value={form.address} onChange={handleChange} required minLength="5" placeholder="Baner Road" /><Field label="City" id="city" name="city" value={form.city} onChange={handleChange} required minLength="2" placeholder="Pune" /></div>
                  <fieldset><legend className={LABEL}>What you rent out</legend><div className="mt-2.5 flex flex-wrap gap-2">{PROPERTY_TYPES.map((type) => { const picked = form.propertyTypes.includes(type); return <label key={type} className={`cursor-pointer rounded-full border px-4 py-2 text-[14px] capitalize transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-lime ${picked ? 'border-lime bg-lime text-forest' : 'border-paper/20 text-forest-mute hover:border-paper/45 hover:text-paper'}`}><input type="checkbox" value={type} checked={picked} onChange={togglePropertyType} className="sr-only" />{type}</label> })}</div></fieldset>
                  <Field label="Profile description" hint="(optional)" id="profileDescription"><Textarea id="profileDescription" name="profileDescription" value={form.profileDescription} onChange={handleChange} rows="3" maxLength="500" placeholder="How you work with tenants, how quickly you reply, anything worth knowing." /></Field>
                </div>
              ) : (
                <div className="mt-4.5 grid gap-4.5 sm:grid-cols-2"><Field label="Date of birth" id="dob" name="dob" type="date" value={form.dob} onChange={handleChange} required /><Select label="Gender" id="gender" name="gender" value={form.gender} onChange={handleChange}><option value="prefer-not-to-say">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="non-binary">Non-binary</option><option value="other">Other</option></Select></div>
              )}

              <div className="mt-7 grid gap-3.5"><ErrorNote>{error}</ErrorNote><SubmitButton busy={isSubmitting}>{isSubmitting ? 'Creating your account' : 'Create account'}</SubmitButton><p className="text-[13px] leading-snug text-[#7E9282]">We send a code to your email straight after this. Your {isLandlord ? 'account' : 'profile'} stays unverified until you enter it.</p></div>
            </form>
          </div>

          <div className="order-first lg:order-none lg:sticky lg:top-12"><p className="mb-3 font-mono text-[10.5px] uppercase tracking-[.15em] text-[#9FB3A2] lg:hidden">{copy.preview}</p><ProfileCard accountType={role} form={form} /></div>
        </main>
      </div>
    </div>
  )
}

export default AuthRegistrationPanel
