import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useId, useState } from 'react'

// Both auth pages sit on forest, so there is exactly one control style. The only light surface
// in the flow is the profile card — the document being filled in.
const CONTROL =
  'mt-2 w-full rounded-xl border border-paper/20 bg-paper/6 px-3.5 py-3 text-[15px] text-paper outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[#7E9282] focus:border-lime focus:bg-paper/10 focus:ring-3 focus:ring-lime/25'

export const LABEL = 'font-mono text-[11px] uppercase tracking-[.14em] text-[#9FB3A2]'

export function Field({ label, hint, children, className = '', ...props }) {
  const fallbackId = useId()
  const id = props.id || fallbackId

  return (
    <label htmlFor={id} className={`block ${className}`}>
      <span className={LABEL}>{label}</span>
      {hint ? <span className="ml-1.5 font-mono text-[11px] normal-case tracking-normal text-[#7E9282]">{hint}</span> : null}
      {children || <input id={id} className={CONTROL} {...props} />}
    </label>
  )
}

export function Textarea(props) {
  return <textarea className={`${CONTROL} resize-y`} {...props} />
}

export function Select({ label, children, ...props }) {
  const fallbackId = useId()
  const id = props.id || fallbackId

  return (
    <Field label={label} id={id}>
      <select id={id} className={`${CONTROL} appearance-none bg-[length:11px] bg-[right_1rem_center] bg-no-repeat pr-10 bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" fill="none" stroke="%239FB3A2" stroke-width="1.6"/></svg>')] [&>option]:bg-forest-deep [&>option]:text-paper`} {...props}>
        {children}
      </select>
    </Field>
  )
}

export function PasswordField({ hint, ...props }) {
  const [revealed, setRevealed] = useState(false)
  const fallbackId = useId()
  const id = props.id || fallbackId

  return (
    <Field label="Password" hint={hint} id={id}>
      <div className="relative">
        <input id={id} type={revealed ? 'text' : 'password'} className={`${CONTROL} pr-16`} {...props} />
        <button
          type="button"
          onClick={() => setRevealed((shown) => !shown)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[.1em] text-[#9FB3A2] transition-colors hover:bg-paper/10 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
        >
          {revealed ? 'Hide' : 'Show'}
        </button>
      </div>
    </Field>
  )
}

const ROLES = [
  { value: 'user', title: 'Renting a place', copy: 'Search listings, match with roommates, apply and sign.', short: 'Renting' },
  { value: 'landlord', title: 'Listing a property', copy: 'Publish the full cost, screen applicants, issue agreements.', short: 'Listing' },
]

// The account type decides the endpoint, so it is a real fork in the flow — not a settings toggle.
export function AccountSwitch({ value, onChange, compact = false }) {
  const reduce = useReducedMotion()
  const spring = reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38 }

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-full bg-paper/10 p-1">
        {ROLES.map((role) => {
          const active = value === role.value
          return (
            <button
              key={role.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(role.value)}
              className={`relative cursor-pointer rounded-full px-3 py-2.5 text-[13.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${active ? 'text-forest' : 'text-forest-mute hover:text-paper'}`}
            >
              {active && <motion.span layoutId="role-pill" transition={spring} className="absolute inset-0 rounded-full bg-paper" />}
              <span className="relative">{role.short}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {ROLES.map((role) => {
        const active = value === role.value
        return (
          <button
            key={role.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(role.value)}
            className={`relative cursor-pointer rounded-2xl border p-4.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${active ? 'border-lime bg-paper/8' : 'border-paper/18 hover:border-paper/40'}`}
          >
            <span className="flex items-center gap-2.5">
              <span className={`grid size-4.5 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors ${active ? 'border-lime' : 'border-paper/35'}`}>
                {active && <motion.span layoutId="role-dot" transition={spring} className="size-2 rounded-full bg-lime" />}
              </span>
              <span className="font-display text-[17px] font-semibold tracking-[-.02em] text-paper">{role.title}</span>
            </span>
            <span className="mt-2 block pl-7 text-[13.5px] leading-snug text-forest-mute">{role.copy}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ErrorNote({ children }) {
  if (!children) return null

  return (
    <p role="alert" className="flex items-start gap-2.5 rounded-xl border border-clay/50 bg-clay/18 px-4 py-3 text-[14px] leading-snug text-[#F8C5B7]">
      <svg viewBox="0 0 20 20" aria-hidden className="mt-px size-4.5 shrink-0 fill-current">
        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm.9 12H9.1v-1.8h1.8V14zm0-3.1H9.1V5.5h1.8v5.4z" />
      </svg>
      {children}
    </p>
  )
}

export function SubmitButton({ busy, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-lime px-6 py-3.5 text-[15px] font-semibold text-forest transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_36px_-20px_rgba(207,240,74,.8)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:translate-y-0 disabled:cursor-progress disabled:opacity-65 disabled:shadow-none"
    >
      {busy && <span aria-hidden className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />}
      {children}
    </button>
  )
}

export function AuthHeader({ to, children }) {
  return (
    <header className="flex items-center justify-between gap-6">
      <Link to="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime">
        <span className="grid size-6.5 place-items-center rounded-[7px] border-[1.5px] border-paper">
          <span className="size-2 rounded-[2px] bg-clay" />
        </span>
        <span className="font-display text-[19px] font-bold tracking-[-.035em] text-paper">LivSync</span>
      </Link>
      <Link
        to={to}
        className="rounded-full px-3.5 py-2 text-sm font-medium text-forest-mute transition-colors hover:bg-paper/10 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
      >
        {children}
      </Link>
    </header>
  )
}
