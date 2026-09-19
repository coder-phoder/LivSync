import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { CalendarDays, Cigarette, MapPin, Moon, PawPrint, Sparkles, Sun, Users, Utensils, Volume2, Wallet, Wine } from 'lucide-react'
import { useImperativeHandle, useRef } from 'react'
import VerifiedBadge from '../Common/VerifiedBadge'

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

// A swipe counts once the card has gone far enough or left fast enough — either alone decides.
const SWIPE_DISTANCE = 110
const SWIPE_VELOCITY = 450
const FLING = 900

const words = (value) => String(value || '').replaceAll('-', ' ')

function budgetLabel(budget = {}) {
  if (!budget.min && !budget.max) return 'Open'
  if (!budget.min) return `Up to ₹${inr.format(budget.max)}`
  if (!budget.max) return `₹${inr.format(budget.min)}+`

  return `₹${inr.format(budget.min)}–${inr.format(budget.max)}`
}

function moveInLabel(date) {
  return date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Flexible'
}

// The icon does the labelling, so each pill stays one short phrase wide.
function pillsOf(preferences) {
  return [
    [preferences.sleepSchedule === 'night-owl' ? Moon : Sun, words(preferences.sleepSchedule)],
    [Sparkles, preferences.cleanliness ? `tidy ${preferences.cleanliness}/5` : ''],
    [Volume2, preferences.noiseTolerance ? `noise ${preferences.noiseTolerance}/5` : ''],
    [Utensils, words(preferences.foodHabits === 'no-preference' ? 'eats anything' : preferences.foodHabits)],
    [Cigarette, words(preferences.smoking)],
    [Wine, words(preferences.drinking)],
    [PawPrint, words(preferences.pets)],
    [Users, preferences.guests ? `guests ${words(preferences.guests)}` : ''],
  ].filter(([, label]) => label.trim())
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[.14em] text-faint">
        <Icon aria-hidden className="size-3" />
        {label}
      </p>
      <p className="mt-1 truncate text-[13.5px] font-medium capitalize">{value}</p>
    </div>
  )
}

// The deck's top card. It owns the drag, the stamps and the fling animation; the parent only
// hears the verdict once the card has left the screen, so the stack never jumps mid-flight.
function BuddyCard({ profile, onSwipe, isTop = false, depth = 0, ref }) {
  const preferences = profile.preferences || {}
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-260, 0, 260], [-13, 0, 13])
  const likeOpacity = useTransform(x, [30, 120], [0, 1])
  const passOpacity = useTransform(x, [-120, -30], [1, 0])
  const hasLeft = useRef(false)

  const fling = (direction) => {
    if (hasLeft.current) return

    hasLeft.current = true
    animate(x, direction * FLING, {
      duration: 0.27,
      ease: [0.22, 0.8, 0.36, 1],
      onComplete: () => onSwipe(direction > 0 ? 'like' : 'pass'),
    })
  }

  useImperativeHandle(ref, () => ({ fling }))

  const handleDragEnd = (event, info) => {
    const decided = Math.abs(info.offset.x) > SWIPE_DISTANCE || Math.abs(info.velocity.x) > SWIPE_VELOCITY

    if (decided) fling(Math.sign(Math.abs(info.offset.x) > SWIPE_DISTANCE ? info.offset.x : info.velocity.x))
  }

  return (
    <motion.article
      aria-hidden={!isTop}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      style={{ x, rotate, zIndex: 10 - depth }}
      initial={{ scale: 0.88, y: -28, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.045, y: depth * -14, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 30 }}
      className={`absolute inset-0 flex flex-col overflow-hidden rounded-[28px] border border-ink/10 bg-card shadow-[0_34px_60px_-34px_rgba(21,19,15,.62)] ${isTop ? 'cursor-grab touch-none active:cursor-grabbing' : 'pointer-events-none'}`}
    >
      <div className="relative min-h-[8.5rem] flex-1 overflow-hidden bg-forest">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(244,241,234,.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,241,234,.08)_1px,transparent_1px)] bg-[size:38px_38px]"
        />
        <span aria-hidden className="absolute -top-8 right-1 font-display text-[9.5rem] font-extrabold leading-none text-paper/8 select-none">
          {profile.name?.trim()?.[0]?.toUpperCase() || '?'}
        </span>

        <div className="absolute top-4 right-4 rounded-2xl bg-lime px-3 py-2 text-center shadow-[0_10px_24px_-14px_rgba(0,0,0,.8)]">
          <p className="font-display text-[22px] leading-none font-extrabold text-ink">{profile.score}%</p>
          <p className="mt-1 font-mono text-[9px] tracking-[.16em] text-ink/65 uppercase">match</p>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-deep via-forest-deep/88 to-transparent px-5 pt-12 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[26px] leading-none font-bold tracking-[-.035em] text-paper">{profile.name}</h2>
            <VerifiedBadge verified={profile.emailVerified} label="Verified" size="xs" />
          </div>
          <p className="mt-2 truncate text-[13px] text-forest-mute capitalize">
            {[profile.age && `${profile.age}`, words(profile.gender), preferences.occupation].filter(Boolean).join(' · ') || 'Tenant'}
          </p>
        </div>
      </div>

      <div className="px-5 pt-4 pb-5">
        <p className="line-clamp-2 min-h-[2.5rem] text-[13.5px] leading-relaxed text-ink-soft">
          {preferences.bio || 'No note yet — say hello and find out.'}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-ink/10 pt-4">
          <Fact icon={Wallet} label="Budget" value={budgetLabel(preferences.budget)} />
          <Fact icon={MapPin} label="City" value={preferences.city || 'Anywhere'} />
          <Fact icon={CalendarDays} label="Move in" value={moveInLabel(preferences.moveInDate)} />
        </div>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {pillsOf(preferences).map(([Icon, label]) => (
            <li key={label} className="inline-flex items-center gap-1.5 rounded-full bg-ink/6 px-2.5 py-1 text-[11.5px] text-ink-soft capitalize">
              <Icon aria-hidden className="size-3 text-faint" />
              {label}
            </li>
          ))}
          {preferences.interests?.slice(0, 3).map((interest) => (
            <li key={interest} className="rounded-full border border-sand/70 bg-sand/15 px-2.5 py-1 text-[11.5px] text-ink-soft">{interest}</li>
          ))}
        </ul>
      </div>

      <motion.div aria-hidden style={{ opacity: likeOpacity }} className="pointer-events-none absolute inset-0 bg-lime/25" />
      <motion.div aria-hidden style={{ opacity: passOpacity }} className="pointer-events-none absolute inset-0 bg-clay/22" />
      <motion.span
        aria-hidden
        style={{ opacity: likeOpacity, rotate: -11 }}
        className="pointer-events-none absolute top-6 left-6 rounded-xl border-[3px] border-lime bg-forest-deep/85 px-3 py-1.5 font-display text-[18px] font-extrabold tracking-[.06em] text-lime uppercase"
      >
        Buddy up
      </motion.span>
      <motion.span
        aria-hidden
        style={{ opacity: passOpacity, rotate: 11 }}
        className="pointer-events-none absolute top-6 right-6 rounded-xl border-[3px] border-clay bg-paper/90 px-3 py-1.5 font-display text-[18px] font-extrabold tracking-[.06em] text-clay uppercase"
      >
        Pass
      </motion.span>
    </motion.article>
  )
}

export default BuddyCard
