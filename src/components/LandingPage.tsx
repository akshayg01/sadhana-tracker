import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  const cta = (label: string, extra = "") => (
    <button
      onClick={signIn}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-200 transition-all hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-orange-300 active:translate-y-0 disabled:opacity-60 ${extra}`}
    >
      {loading ? "Opening Google…" : label}
    </button>
  );

  return (
    <div style={{ scrollBehavior: "smooth" }} className="min-h-screen bg-white text-stone-900">
      {/* ── Navbar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-stone-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-base">🪷</span>
            Sadhana<span className="text-orange-600">Tracker</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={signIn}
              className="hidden text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 sm:block"
            >
              Sign in
            </button>
            <button
              onClick={signIn}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-orange-700"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-24 pt-16 sm:pb-32 sm:pt-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 1.5px 1.5px, #fed7aa 1.5px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -top-48 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 opacity-70 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-gradient-to-tr from-amber-100 to-orange-50 opacity-60 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Copy */}
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
                For Sharanagati devotees
              </div>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
                Your daily sadhana,<br />
                <span className="text-orange-600">recorded in seconds.</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-stone-500 sm:text-xl">
                Log japa rounds, reading, and hearing from your phone — gently build
                consistency with targets, streaks, and weekly progress.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {cta("Continue with Google")}
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-6 py-3.5 text-base font-medium text-stone-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                >
                  See how it works
                </a>
              </div>
              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {[
                  ["🔒", "Private to you"],
                  ["⏱️", "Under 2 minutes"],
                  ["📿", "Japa · Reading · Hearing"],
                  ["📱", "Works on any phone"],
                ].map(([icon, label]) => (
                  <span key={label} className="flex items-center gap-1.5 text-sm font-medium text-stone-500">
                    <span className="text-base">{icon}</span>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Mock phone card */}
            <div className="hidden justify-end lg:flex">
              <div className="relative w-72">
                <div className="absolute -left-3 -top-3 h-full w-full rotate-3 rounded-[2rem] bg-orange-100" />
                <div className="absolute -bottom-3 -right-3 h-full w-full -rotate-2 rounded-[2rem] bg-amber-100" />
                <div className="relative overflow-hidden rounded-[2rem] border border-stone-100 bg-white shadow-2xl shadow-stone-200">
                  <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-5 py-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Today's Sadhana</span>
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">🔥 12 days</span>
                    </div>
                    <p className="text-xs text-orange-100">Wednesday, 3 November</p>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="rounded-2xl bg-orange-50 p-4 text-center">
                      <p className="text-xs uppercase tracking-widest text-orange-400">Japa rounds</p>
                      <p className="mt-1 text-4xl font-black tabular-nums text-orange-700">16</p>
                      <p className="text-xs font-medium text-emerald-600">Target met ✓</p>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { icon: "📖", label: "Nectar of Devotion", meta: "24 min" },
                        { icon: "🎧", label: "SB 1.2.6 lecture", meta: "38 min" },
                      ].map((r) => (
                        <div key={r.label} className="flex items-center justify-between rounded-xl border border-stone-100 px-3 py-2.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="text-lg">{r.icon}</span>
                            <span className="truncate text-xs font-semibold text-stone-800">{r.label}</span>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-stone-400">{r.meta}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                      <span className="text-base">✓</span>
                      <p className="text-xs font-medium text-emerald-700">Saved — see you tomorrow 🙏</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-8 -top-4 flex rotate-6 items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-200">
                  Logged in 40s!
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-stone-50 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-orange-600">How it works</p>
            <h2 className="text-3xl font-bold text-stone-900 sm:text-4xl">Three taps, and you're done</h2>
            <p className="mx-auto mt-3 max-w-md text-stone-500">No forms to fill. Open the app, log your practice, and watch your streak grow.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { n: "01", icon: "📿", title: "Count your rounds", desc: "Tap + for each round, or pick 16 in one touch." },
              { n: "02", icon: "📖", title: "Add reading & hearing", desc: "Book or lecture title with minutes — one line each." },
              { n: "03", icon: "🔥", title: "Build your streak", desc: "See daily and weekly progress against your target." },
            ].map((step) => (
              <div key={step.n} className="group relative rounded-2xl border border-stone-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-3xl transition-colors group-hover:bg-orange-100">
                  {step.icon}
                </div>
                <div className="absolute right-4 top-4 font-mono text-sm font-bold text-stone-200 transition-colors group-hover:text-orange-200">{step.n}</div>
                <h3 className="font-semibold text-stone-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-snug text-stone-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-orange-600">Features</p>
            <h2 className="text-3xl font-bold text-stone-900 sm:text-4xl">Everything your practice needs</h2>
            <p className="mx-auto mt-3 max-w-md text-stone-500">Simple on the surface, thoughtful underneath.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "📿", bg: "bg-orange-50", title: "Japa Rounds", desc: "A big, thumb-friendly counter with one-tap presets for 16, 25, 32, and 64 rounds." },
              { icon: "📖", bg: "bg-amber-50", title: "Reading Log", desc: "Record one or more sessions a day with the book title and minutes read." },
              { icon: "🎧", bg: "bg-sky-50", title: "Hearing Log", desc: "Capture lectures you heard — title, speaker, and minutes — as many as you like." },
              { icon: "🎯", bg: "bg-emerald-50", title: "Personal Targets", desc: "Adopt the congregation-recommended target or set your own, with effective dates." },
              { icon: "🔥", bg: "bg-rose-50", title: "Streaks & Consistency", desc: "Gentle nudges and a running streak to keep your sadhana steady, day after day." },
              { icon: "📊", bg: "bg-violet-50", title: "Weekly Progress", desc: "A clear weekly summary and full personal history — see how far you've come." },
              { icon: "🔒", bg: "bg-stone-100", title: "Private & Secure", desc: "Your records are yours. Only you and authorized coordinators can ever see them." },
              { icon: "📱", bg: "bg-orange-50", title: "Works on Your Phone", desc: "Mobile-first and installable like an app. Offline entry and reminders coming soon." },
              { icon: "🙏", bg: "bg-amber-50", title: "Made for Devotees", desc: "Built around japa, reading, and hearing — the practice, not the paperwork." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-stone-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg">
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${f.bg}`}>{f.icon}</div>
                <h3 className="mb-2 font-semibold text-stone-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-stone-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Devotional band ──────────────────────────────────────── */}
      <section className="bg-stone-50 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-2xl font-medium leading-relaxed text-stone-700 sm:text-3xl">
            “A little practice, done faithfully every single day,<br className="hidden sm:block" />
            is the surest path to steadiness.”
          </p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-orange-600">The spirit of sadhana</p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-orange-600">FAQ</p>
            <h2 className="text-3xl font-bold text-stone-900 sm:text-4xl">Common questions</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {[
              { q: "How long does recording a day take?", a: "Under two minutes — usually less. Japa is a single tap for common round counts, and reading and hearing are one line each." },
              { q: "Who can see my records?", a: "Only you. Records are private by design. Authorized coordinators can view congregation-level reports, and individual entries only where permissions explicitly allow it." },
              { q: "Can I set my own targets?", a: "Yes. You can follow the congregation-recommended target or set a personal one. Target changes are dated, so your past reports always reflect the target that was active then." },
              { q: "Does it work on my phone?", a: "It's built mobile-first and can be installed to your home screen like an app. Offline entry and reminders are on the way." },
              { q: "Is it free?", a: "Yes — Sadhana Tracker is free for devotees of the congregation." },
            ].map((faq, i) => (
              <details key={i} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-medium text-stone-900 sm:text-base">{faq.q}</span>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-400 transition-transform duration-200 group-open:rotate-45">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 pr-12 text-sm leading-relaxed text-stone-500">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-orange-600 py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl lg:text-4xl">Begin your daily record today</h2>
          <p className="mb-8 text-lg text-orange-100">It takes seconds. Your consistency does the rest. 🙏</p>
          {cta("Continue with Google", "!bg-white !text-orange-700 !shadow-orange-900/20 hover:!bg-orange-50")}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-stone-950 py-12 text-stone-400">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <p className="text-xl font-bold text-white">
                Sadhana<span className="text-orange-400">Tracker</span>
              </p>
              <p className="mt-1 text-sm text-stone-500">Consistency in practice, one day at a time.</p>
            </div>
            <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <button onClick={signIn} className="transition-colors hover:text-white">Sign in</button>
              <a href="#how-it-works" className="transition-colors hover:text-white">How it works</a>
            </nav>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-stone-800 pt-6 text-xs text-stone-600 sm:flex-row">
            <span>© {new Date().getFullYear()} Sadhana Tracker</span>
            <span>Hare Krishna 🙏</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
