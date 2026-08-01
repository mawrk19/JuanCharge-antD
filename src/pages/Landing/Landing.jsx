import React, { useEffect, useState } from 'react';
import { Collapse } from 'antd';
import { Link } from 'react-router-dom';
import {
  getDefaultRouteForRole,
  getStoredRole,
  isAuthenticated,
} from '../../services/authStorage';

const faqs = [
  {
    key: '1',
    label: 'What is JuanCharge?',
    children:
      'JuanCharge is a smart recycling platform for Philippine LGUs. Citizens drop PET bottles, tin, and aluminum into reverse-vending kiosks, earn reward points, and local governments get live visibility into collections, maintenance, and environmental impact.',
  },
  {
    key: '2',
    label: 'Who is JuanCharge for?',
    children:
      'It is built for LGU administrators, staff, and technicians who run recycling programs — plus the patrons (“Juans”) who use the kiosks every day. Super admins can oversee the full network across localities.',
  },
  {
    key: '3',
    label: 'What materials can kiosks accept?',
    children:
      'Kiosks are set up for common recyclables: PET/plastic bottles, tin cans, and aluminum cans. Weight and material breakdowns feed into analytics so LGUs can see what communities recycle most.',
  },
  {
    key: '4',
    label: 'How do patrons earn rewards?',
    children:
      'Each accepted deposit converts into points. Patrons can climb seasonal leaderboards and unlock bonuses — turning everyday recycling into a habit people actually want to keep.',
  },
  {
    key: '5',
    label: 'What can LGU teams manage in the dashboard?',
    children:
      'Teams monitor kiosk health, field reports, and missed collections; schedule pickups; map kiosk locations; track CO₂ saved and materials recycled; and manage staff access with an audit trail.',
  },
  {
    key: '6',
    label: 'How do I get access?',
    children:
      'Access is provisioned by your LGU or JuanCharge administrator. Once your account is ready, sign in from this site to open the operations dashboard.',
  },
];

const features = [
  {
    title: 'Smart recycling kiosks',
    description:
      'Reverse-vending machines accept bottles and cans on-site, so recycling happens where people already are.',
    accent: '#22c55e',
  },
  {
    title: 'Rewards that stick',
    description:
      'Patrons earn points and compete on leaderboards — giving every Juan a reason to come back.',
    accent: '#eab308',
  },
  {
    title: 'Live operations control',
    description:
      'Track kiosk status, field reports, and missed collections before small issues become public ones.',
    accent: '#38bdf8',
  },
  {
    title: 'Impact you can prove',
    description:
      'Measure weight recycled, material mix, and CO₂ saved with analytics built for LGU reporting.',
    accent: '#4ade80',
  },
];

const steps = [
  {
    num: '01',
    title: 'Deposit',
    text: 'Juans drop accepted recyclables into a JuanCharge kiosk near them.',
  },
  {
    num: '02',
    title: 'Reward',
    text: 'Points are credited instantly, feeding personal totals and seasonal leaderboards.',
  },
  {
    num: '03',
    title: 'Operate',
    text: 'LGUs schedule collections, maintain kiosks, and report real environmental impact.',
  },
];

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(false);
  const authenticated = isAuthenticated();
  const dashboardPath = getDefaultRouteForRole(getStoredRole());

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="landing min-h-screen text-slate-800 antialiased">
      {/* Nav */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#0f2920]/90 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/10'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:h-[72px] sm:px-8">
          <a href="#top" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt=""
              className="h-9 w-9 object-contain drop-shadow-sm sm:h-10 sm:w-10"
            />
            <span className="text-[17px] font-extrabold tracking-tight text-white sm:text-lg">
              JuanCharge
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-white/80 md:flex">
            <button type="button" onClick={() => scrollTo('how')} className="hover:text-white transition-colors">
              How it works
            </button>
            <button type="button" onClick={() => scrollTo('platform')} className="hover:text-white transition-colors">
              Platform
            </button>
            <button type="button" onClick={() => scrollTo('faq')} className="hover:text-white transition-colors">
              FAQ
            </button>
          </nav>

          <Link
            to={authenticated ? dashboardPath : '/login'}
            className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-bold text-[#15803d] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            {authenticated ? 'Open dashboard' : 'Sign in'}
          </Link>
        </div>
      </header>

      {/* Hero — full-bleed visual plane */}
      <section
        id="top"
        className="relative min-h-[100svh] overflow-hidden bg-[#0c211a] text-white"
      >
        {/* Atmospheric background / dominant visual */}
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,#1a4a35_0%,transparent_55%),radial-gradient(ellipse_at_90%_20%,#14532d_0%,transparent_45%),radial-gradient(ellipse_at_70%_100%,#0f3d2e_0%,#0c211a_60%)]" />
          <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="landing-orb landing-orb-a absolute -left-24 top-16 h-[420px] w-[420px] rounded-full bg-green-500/25 blur-3xl" />
          <div className="landing-orb landing-orb-b absolute -right-16 bottom-10 h-[380px] w-[380px] rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="landing-orb landing-orb-c absolute left-1/2 top-1/3 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />

          {/* Product visual: stylized kiosk scene, edge-to-edge on large screens */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[58%]">
            <svg
              viewBox="0 0 720 900"
              className="h-full w-full object-cover opacity-[0.55] sm:opacity-70"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <linearGradient id="kioskBody" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1f6b4a" />
                  <stop offset="100%" stopColor="#134e37" />
                </linearGradient>
                <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#86efac" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
                <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#bbf7d0" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              {/* Ground plane */}
              <ellipse cx="420" cy="780" rx="260" ry="36" fill="#052e1f" opacity="0.55" />
              {/* Kiosk body */}
              <rect x="290" y="220" width="220" height="520" rx="28" fill="url(#kioskBody)" />
              <rect x="290" y="220" width="220" height="520" rx="28" fill="none" stroke="#4ade80" strokeOpacity="0.25" />
              {/* Top badge */}
              <rect x="340" y="185" width="120" height="42" rx="12" fill="#166534" />
              <rect x="355" y="198" width="28" height="16" rx="3" fill="#22c55e" />
              <rect x="390" y="200" width="52" height="12" rx="3" fill="#86efac" opacity="0.7" />
              {/* Screen */}
              <rect x="318" y="260" width="164" height="210" rx="16" fill="#052e1f" />
              <rect x="330" y="274" width="140" height="182" rx="10" fill="url(#screen)" opacity="0.85" />
              <path d="M360 330 h80 M360 355 h56 M360 380 h68" stroke="#052e1f" strokeWidth="8" strokeLinecap="round" opacity="0.25" />
              {/* Intake slot */}
              <rect x="340" y="500" width="120" height="28" rx="8" fill="#052e1f" />
              <rect x="352" y="508" width="96" height="12" rx="4" fill="#4ade80" opacity="0.55" />
              {/* Bottle cue */}
              <g className="landing-float">
                <rect x="520" y="430" width="36" height="90" rx="12" fill="#38bdf8" opacity="0.85" />
                <rect x="528" y="410" width="20" height="28" rx="6" fill="#7dd3fc" opacity="0.9" />
                <ellipse cx="538" cy="410" rx="10" ry="5" fill="#bae6fd" />
              </g>
              <g className="landing-float-delay">
                <ellipse cx="200" cy="520" rx="28" ry="28" fill="#eab308" opacity="0.75" />
                <ellipse cx="200" cy="520" rx="18" ry="18" fill="#facc15" opacity="0.5" />
              </g>
              {/* Leaf accents from brand palette */}
              <path d="M150 280 C190 220 250 240 250 300 C210 290 170 320 150 280Z" fill="#22c55e" opacity="0.45" />
              <path d="M580 300 C620 250 680 270 670 330 C630 320 600 350 580 300Z" fill="#eab308" opacity="0.35" />
              <path d="M170 640 C210 600 250 620 245 670 C215 655 185 680 170 640Z" fill="#38bdf8" opacity="0.35" />
              {/* Soft light column */}
              <rect x="360" y="120" width="80" height="100" fill="url(#glow)" opacity="0.35" />
            </svg>
          </div>

          {/* Readability scrim */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c211a] via-[#0c211a]/85 to-transparent sm:via-[#0c211a]/70" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0c211a] to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 sm:justify-center sm:px-8 sm:pb-24 sm:pt-32">
          <div
            className={`max-w-xl transition-all duration-1000 ease-out ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <div className="mb-6 flex items-center gap-3 sm:mb-8">
              <img
                src="/logo.png"
                alt="JuanCharge"
                className="h-14 w-14 object-contain sm:h-16 sm:w-16"
              />
            </div>

            <h1 className="font-extrabold tracking-tight text-white text-[clamp(2.75rem,8vw,4.75rem)] leading-[0.95]">
              JuanCharge
            </h1>

            <p className="mt-4 text-[clamp(1.35rem,3.5vw,1.85rem)] font-semibold tracking-tight text-green-300">
              Powering Every Juan.
            </p>

            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
              Smart recycling kiosks and an LGU platform that reward citizens for every bottle —
              and give local governments the data to keep communities cleaner.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to={authenticated ? dashboardPath : '/login'}
                className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-700 px-7 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(22,163,74,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(22,163,74,0.45)]"
              >
                {authenticated ? 'Go to dashboard' : 'Sign in to dashboard'}
              </Link>
              <button
                type="button"
                onClick={() => scrollTo('how')}
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 text-[15px] font-semibold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10"
              >
                See how it works
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative scroll-mt-20 bg-[#f4faf6] px-5 py-20 sm:px-8 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#dcfce7_0%,_transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-[#0f2920] sm:text-4xl">
            From street-side deposit to citywide impact
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            One loop connects patrons, kiosks, and LGU teams — simple for citizens, powerful for operators.
          </p>

          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step, i) => (
              <li key={step.num} className="relative">
                {i < steps.length - 1 && (
                  <div
                    className="pointer-events-none absolute left-[calc(100%+0.25rem)] top-8 hidden h-px w-[calc(100%-2rem)] bg-gradient-to-r from-green-300 to-transparent md:block"
                    aria-hidden="true"
                  />
                )}
                <div className="text-5xl font-extrabold tracking-tighter text-green-600/25">
                  {step.num}
                </div>
                <h3 className="mt-3 text-xl font-bold text-[#0f2920]">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Platform / features */}
      <section id="platform" className="scroll-mt-20 bg-white px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">The platform</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-[#0f2920] sm:text-4xl">
            Built for LGUs running real recycling programs
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            JuanCharge ties physical kiosks to an operations dashboard — so rewards, maintenance, maps,
            and impact reporting live in one place.
          </p>

          <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="relative pl-5">
                <span
                  className="absolute left-0 top-1.5 h-8 w-1 rounded-full"
                  style={{ backgroundColor: feature.accent }}
                  aria-hidden="true"
                />
                <h3 className="text-lg font-bold text-[#0f2920]">{feature.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact strip */}
      <section className="relative overflow-hidden bg-[#18392b] px-5 py-16 text-white sm:px-8 sm:py-20">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-green-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 sm:grid-cols-3 sm:gap-8">
          {[
            { label: 'Materials tracked', value: 'Plastic · Tin · Aluminum' },
            { label: 'Outcomes measured', value: 'Weight · Points · CO₂ saved' },
            { label: 'Teams supported', value: 'Admins · Staff · Technicians' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-300/80">
                {item.label}
              </p>
              <p className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 bg-[#f8fafc] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">FAQ</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f2920] sm:text-4xl">
            Questions, answered
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            Everything you need to know before signing in to the JuanCharge dashboard.
          </p>

          <Collapse
            accordion
            bordered={false}
            items={faqs}
            className="landing-faq mt-10 bg-transparent"
            expandIconPosition="end"
          />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative overflow-hidden bg-[#0c211a] px-5 py-20 text-white sm:px-8 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#166534_0%,_transparent_60%)] opacity-60" />
        <div className="relative mx-auto max-w-3xl text-center">
          <img src="/logo.png" alt="" className="mx-auto h-14 w-14 object-contain" />
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to power your Juan?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
            Sign in to manage kiosks, reward recyclers, and turn every deposit into measurable community impact.
          </p>
          <Link
            to={authenticated ? dashboardPath : '/login'}
            className="mt-9 inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-700 px-8 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(22,163,74,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(22,163,74,0.45)]"
          >
            {authenticated ? 'Open dashboard' : 'Sign in'}
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0a1c16] px-5 py-8 text-center text-sm text-white/45 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} JuanCharge. All rights reserved.</p>
          <p className="font-medium text-white/55">Powering Every Juan.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
