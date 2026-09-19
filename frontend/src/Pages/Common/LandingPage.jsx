import { Link } from 'react-router-dom'
import BuddyDeck from '../../Components/Landing/BuddyDeck'
import TrueCostCard from '../../Components/Landing/TrueCostCard'
import {
  CITIES, COST_ROWS, EYEBROW, FEATURE_TILES, FOOTER_COLUMNS, H2, LANDLORD_POINTS, Reveal, SCORE_BARS, SHELL,
} from '../../Components/Landing/landingContent'

const NAV_LINKS = [
  ['Transparency', '#transparency'],
  ['BuddyUp', '#buddyup'],
  ['Platform', '#platform'],
  ['For landlords', '#landlords'],
]

function LandingPage() {
  return (
    <div className="relative overflow-x-hidden bg-paper text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[1100px] bg-[linear-gradient(to_right,rgba(21,19,15,.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(21,19,15,.055)_1px,transparent_1px)] bg-[size:74px_74px]"
        style={{ maskImage: 'radial-gradient(120% 70% at 60% 0%, #000 20%, transparent 78%)', WebkitMaskImage: 'radial-gradient(120% 70% at 60% 0%, #000 20%, transparent 78%)' }}
      />

      <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/85 backdrop-blur-md">
        <nav aria-label="Main navigation" className={`${SHELL} flex items-center justify-between gap-6 py-3.5`}>
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-6.5 place-items-center rounded-[7px] border-[1.5px] border-ink">
              <span className="size-2 rounded-[2px] bg-clay" />
            </span>
            <span className="font-display text-[19px] font-bold tracking-[-.035em]">LivSync</span>
          </Link>
          <div className="hidden items-center gap-7.5 text-sm text-ink-soft lg:flex">
            {NAV_LINKS.map(([label, href]) => (
              <a key={href} href={href} className="transition-colors hover:text-ink">{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/user/login" className="rounded-full px-3.5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/6 hover:text-ink">Tenant log in</Link>
            <Link to="/landlord/login" className="hidden rounded-full px-3.5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/6 hover:text-ink sm:inline-flex">Landlord log in</Link>
            <Link to="/user/register" className="rounded-full bg-ink px-4.5 py-2.5 text-sm font-medium text-[#F7F5EF] transition-all hover:-translate-y-px hover:bg-clay">Find a home</Link>
          </div>
        </nav>
      </header>

      <main>
        <section className={`${SHELL} grid items-center gap-10 py-14 lg:grid-cols-2 lg:gap-18 lg:py-24`}>
          <Reveal className="min-w-0">
            <div className={`flex items-center gap-2.5 ${EYEBROW}`}>
              <span className="size-1.5 rounded-full bg-clay" />
              Rentals without the blanks
            </div>
            <h1 className="mt-5.5 font-display text-[42px] font-bold leading-[.96] tracking-[-.042em] text-balance sm:text-6xl lg:text-[88px]">
              Every rupee<span className="text-clay">.</span> Every roommate<span className="text-clay">.</span> Before you say yes.
            </h1>
            <p className="mt-6.5 max-w-[33em] text-base leading-relaxed text-muted text-pretty sm:text-lg">
              LivSync publishes the whole monthly cost, verifies who is behind the listing, and scores how well you would
              actually live together — all before the first message is sent.
            </p>
            <div className="mt-8.5 flex flex-wrap gap-3">
              <Link to="/user/register" className="inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3.5 text-[15px] font-medium text-[#F7F5EF] shadow-[0_14px_30px_-18px_rgba(21,19,15,.9)] transition-all hover:-translate-y-0.5 hover:bg-clay">
                Find a room <span className="font-mono text-[13px]">&rarr;</span>
              </Link>
              <Link to="/landlord/register" className="inline-flex items-center rounded-full border border-ink/20 px-6 py-3.5 text-[15px] font-medium transition-all hover:-translate-y-0.5 hover:bg-ink/5">
                List a property
              </Link>
            </div>
            <dl className="mt-11 grid gap-5 border-t border-ink/15 pt-5.5 sm:grid-cols-3">
              {[
                ['Cost', 'Cold rent, utilities and charges — all three, up front.'],
                ['Trust', 'Verified landlords, reportable listings.'],
                ['Fit', 'A compatibility score before contact.'],
              ].map(([term, copy]) => (
                <div key={term}>
                  <dt className="font-mono text-[11px] uppercase tracking-[.14em] text-faint">{term}</dt>
                  <dd className="mt-2 text-[14.5px] leading-snug text-ink-soft">{copy}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal className="min-w-0"><TrueCostCard /></Reveal>
        </section>

        <div className="overflow-hidden bg-ink text-paper">
          <div className="flex w-max animate-marquee py-3.5 font-mono text-xs uppercase tracking-[.2em]">
            {[0, 1].map((copy) => (
              <span key={copy} aria-hidden={copy === 1} className="flex gap-10 pr-10">
                {CITIES.map((city) => (
                  <span key={city} className="flex gap-10">{city}<span className="text-lime">◆</span></span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <section id="transparency" className={`${SHELL} grid items-start gap-10 py-20 lg:grid-cols-2 lg:gap-20 lg:py-35`}>
          <Reveal className="min-w-0 lg:sticky lg:top-27">
            <p className={EYEBROW}>02 / Transparency</p>
            <h2 className={`mt-5 ${H2}`}>A listing with three numbers missing isn&apos;t a listing.</h2>
            <p className="mt-5.5 max-w-[30em] text-[15px] leading-relaxed text-muted text-pretty sm:text-lg">
              Every LivSync listing carries its full cost structure in the same four fields — so two flats can finally be
              compared without a phone call.
            </p>
          </Reveal>
          <Reveal className="min-w-0">
            <ol className="grid">
              {COST_ROWS.map((row, i) => (
                <li key={row.n} className={`grid grid-cols-[54px_1fr] gap-4.5 border-t border-ink/15 py-6.5 ${i === COST_ROWS.length - 1 ? 'border-b' : ''}`}>
                  <span className="pt-1 font-mono text-xs text-clay">{row.n}</span>
                  <div>
                    <h3 className="font-display text-xl font-semibold tracking-[-.02em] sm:text-2xl">{row.title}</h3>
                    <p className="mt-2 text-[15.5px] leading-relaxed text-muted">{row.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-7 flex items-start gap-3.5 rounded-2xl border border-dashed border-ink/20 bg-ink/4 px-5 py-4.5">
              <svg viewBox="0 0 20 20" aria-hidden className="mt-0.5 size-4.5 shrink-0 fill-amber-600">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm.9 12H9.1v-1.8h1.8V14zm0-3.1H9.1V5.5h1.8v5.4z" />
              </svg>
              <p className="text-[14.5px] leading-snug text-ink-soft">
                Something looks off? Report the listing in one tap. Verification is a signal, never a guarantee — and we say so.
              </p>
            </div>
          </Reveal>
        </section>

        <section id="buddyup" className="relative overflow-hidden bg-forest text-paper">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_82%_18%,rgba(207,240,74,.12),transparent_70%)]" />
          <div className={`${SHELL} relative grid items-center gap-10 py-20 lg:grid-cols-2 lg:gap-18 lg:py-35`}>
            <Reveal className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-[.16em] text-lime">03 / BuddyUp</p>
              <h2 className={`mt-5 ${H2}`}>Meet the person, not just the rent.</h2>
              <p className="mt-5.5 max-w-[30em] text-[15px] leading-relaxed text-forest-mute text-pretty sm:text-lg">
                Answer the lifestyle questionnaire once — sleep, cleanliness, noise, food, guests, budget — and every profile
                arrives with an explainable score instead of a vibe.
              </p>
              <ul className="mt-7.5 grid max-w-105 gap-3.5">
                {SCORE_BARS.map((bar) => (
                  <li key={bar.label}>
                    <div className="flex justify-between font-mono text-[11.5px] uppercase tracking-[.1em] text-[#9FB3A2]">
                      <span>{bar.label}</span><span>{bar.pct}%</span>
                    </div>
                    <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-paper/15">
                      <div className="h-full rounded-full bg-lime transition-[width] duration-700" style={{ width: `${bar.pct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-6 font-mono text-[11.5px] uppercase tracking-[.1em] text-[#7E9282]">Drag the card, or use the buttons</p>
            </Reveal>
            <Reveal className="flex min-w-0 justify-center"><BuddyDeck /></Reveal>
          </div>
        </section>

        <section id="platform" className={`${SHELL} py-20 lg:py-35`}>
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className={EYEBROW}>04 / Platform</p>
              <h2 className={`mt-5 max-w-[16em] ${H2}`}>Everything that happens after &ldquo;I&apos;m interested&rdquo;.</h2>
            </div>
            <p className="max-w-[26em] text-[15.5px] leading-relaxed text-muted">
              Search, tour, talk, apply and sign — in one thread tied to one listing, for both sides of the deal.
            </p>
          </Reveal>
          <Reveal className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:mt-14">
            {FEATURE_TILES.map((tile) => (
              <article key={tile.title} className="rounded-[20px] border border-ink/15 bg-card p-6.5 transition-all hover:-translate-y-1 hover:border-ink/30 hover:shadow-[0_28px_50px_-34px_rgba(21,19,15,.6)]">
                {tile.art}
                <h3 className="mt-5 font-display text-xl font-semibold tracking-[-.025em]">{tile.title}</h3>
                <p className="mt-2 text-[14.5px] leading-snug text-muted">{tile.copy}</p>
              </article>
            ))}
          </Reveal>
        </section>

        <section id="landlords" className={`${SHELL} pb-20 lg:pb-35`}>
          <Reveal className="grid overflow-hidden rounded-[26px] border border-ink/15 bg-card lg:grid-cols-2">
            <div className="border-b border-ink/12 p-7 sm:p-10 lg:border-b-0 lg:border-r lg:p-14">
              <p className={EYEBROW}>05 / For landlords</p>
              <h2 className="mt-4.5 font-display text-3xl font-bold leading-[1.02] tracking-[-.035em] text-balance lg:text-[44px]">Fewer enquiries. Far better ones.</h2>
              <p className="mt-4.5 max-w-[32em] text-[15.5px] leading-relaxed text-muted">
                Publishing the full cost filters out everyone who was never going to sign. The tenants who message you have
                already seen the real number.
              </p>
              <Link to="/landlord/register" className="mt-7 inline-flex items-center gap-2.5 rounded-full bg-ink px-5.5 py-3.5 text-[15px] font-medium text-[#F7F5EF] transition-all hover:-translate-y-0.5 hover:bg-clay">
                Post a listing <span className="font-mono text-[13px]">&rarr;</span>
              </Link>
            </div>
            <ul className="grid">
              {LANDLORD_POINTS.map((point, i) => (
                <li key={point.title} className={`grid gap-1.5 px-6 py-5 sm:px-10 sm:py-7 ${i === LANDLORD_POINTS.length - 1 ? '' : 'border-b border-ink/12'}`}>
                  <span className="font-display text-[17px] font-semibold tracking-[-.02em]">{point.title}</span>
                  <span className="text-[14.5px] leading-snug text-muted">{point.copy}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        <section className="relative overflow-hidden bg-forest text-paper">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(244,241,234,.06)_1px,transparent_1px)] bg-[size:74px_100%]" />
          <div className={`${SHELL} relative flex flex-col items-center py-20 text-center lg:py-37`}>
            <Reveal><p className="font-mono text-xs uppercase tracking-[.16em] text-lime">06 / Move in</p></Reveal>
            <Reveal><h2 className="mt-5.5 max-w-[14em] font-display text-[38px] font-bold leading-[.98] tracking-[-.042em] text-balance sm:text-6xl lg:text-[84px]">Sign the lease knowing everything.</h2></Reveal>
            <Reveal><p className="mt-6 max-w-[34em] text-[15px] leading-relaxed text-forest-mute text-pretty sm:text-lg">
              Create an account as a tenant or a landlord — the full cost, the verified profile and the compatibility score
              come as standard.
            </p></Reveal>
            <Reveal className="mt-9 flex flex-wrap justify-center gap-3">
              <Link to="/user/register" className="inline-flex items-center gap-2.5 rounded-full bg-lime px-7 py-4 text-[15.5px] font-semibold text-forest transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_36px_-20px_rgba(207,240,74,.8)]">
                Find a home <span className="font-mono text-[13px]">&rarr;</span>
              </Link>
              <Link to="/landlord/register" className="inline-flex items-center rounded-full border border-paper/30 px-7 py-4 text-[15.5px] font-medium transition-all hover:-translate-y-0.5 hover:bg-paper/10">List a property</Link>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-[#CFCABC]">
        <div className={`${SHELL} grid gap-10 pb-8 pt-12 sm:grid-cols-2 lg:grid-cols-4 lg:pt-19`}>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-6.5 place-items-center rounded-[7px] border-[1.5px] border-paper">
                <span className="size-2 rounded-[2px] bg-clay" />
              </span>
              <span className="font-display text-[19px] font-bold tracking-[-.035em] text-paper">LivSync</span>
            </div>
            <p className="mt-4 max-w-[24em] text-sm leading-snug">
              A PropTech rental and roommate platform for people who would rather read the whole number.
            </p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="mb-3.5 font-mono text-[11px] uppercase tracking-[.16em] text-[#8C8678]">{column.heading}</p>
              <ul className="grid gap-2.5 text-sm">
                {column.links.map((link) => (
                  <li key={link}><a href="#top" className="transition-colors hover:text-paper">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={`${SHELL} flex flex-wrap justify-between gap-3 border-t border-paper/12 pb-10 pt-5 font-mono text-[11px] uppercase tracking-[.1em] text-[#8C8678]`}>
          <span>© 2026 LivSync</span>
          <span>Figures shown are illustrative</span>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
