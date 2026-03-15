'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  BarChart3,
  Bell,
  Building2,
  FileCheck2,
  MapPinned,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const HomeMap = dynamic(() => import('@/components/map/LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#163d58]" />,
})

const NAV_ITEMS = [
  { label: 'Home', href: '/', active: true },
  { label: 'Live Map', href: '/map' },
  { label: 'Policy Dashboard', href: '/policy' },
  { label: 'Transparency Portal', href: '/transparency' },
  { label: 'Admin Console', href: '/dashboard/admin' },
]

const STATUS_RIBBON_ITEMS = [
  'Today Potholes Detected: 42',
  'Repairs Under Process: 18',
  'Assigned to Contractor: 12',
  'Completed Repairs Today: 9',
]

const ANNOUNCEMENTS = [
  { date: '14 Mar 2026', text: 'District maintenance review meeting scheduled for the western corridor at 11:00 AM.' },
  { date: '12 Mar 2026', text: 'Weekly AI road scan summary uploaded for Delhi, Jaipur and Ahmedabad monitoring zones.' },
  { date: '09 Mar 2026', text: 'Budget utilization statement for urgent repair packages published for public review.' },
  { date: '06 Mar 2026', text: 'Independent quality verification module activated for newly closed work orders.' },
]

const QUICK_ACCESS = [
  { label: 'Citizen Login', href: '/login', className: 'bg-[#0d3b5c] text-white hover:bg-[#0a304a]' },
  { label: 'Live Monitoring Map', href: '/map', className: 'bg-[#1f4e79] text-white hover:bg-[#1a4165]' },
  { label: 'Transparency Dashboard', href: '/transparency', className: 'bg-[#f59e0b] text-[#0d3b5c] hover:bg-[#e28d08]' },
  { label: 'Policy Analytics', href: '/policy', className: 'bg-[#dcfce7] text-[#166534] hover:bg-[#c8f3d5]' },
]

const SERVICES = [
  {
    title: 'Road Asset Monitoring',
    desc: 'Satellite, CCTV and field imagery consolidated into one operational monitoring view.',
    icon: MapPinned,
  },
  {
    title: 'Repair Verification',
    desc: 'Post-repair evidence and audit checks are logged before closure approval.',
    icon: FileCheck2,
  },
  {
    title: 'Citizen Coordination',
    desc: 'Public participation workflows for grievance review and repair tracking.',
    icon: Users,
  },
  {
    title: 'Contractor Oversight',
    desc: 'Assignment, execution progress and compliance visibility for field agencies.',
    icon: Wrench,
  },
  {
    title: 'Governance Analytics',
    desc: 'Administrative dashboards for budget utilization, risk scoring and backlog review.',
    icon: BarChart3,
  },
  {
    title: 'Secure Audit Trail',
    desc: 'Decision records and lifecycle events preserved through tamper-resistant logs.',
    icon: ShieldCheck,
  },
]

const DISTRICTS = [
  'New Delhi',
  'Mumbai City',
  'Bengaluru Urban',
  'Ahmedabad',
  'Lucknow',
  'Hyderabad',
  'Jaipur',
  'Chennai',
]

const HERO_SLIDES = [
  {
    title: 'Integrated Road Governance Dashboard',
    sub: 'A unified portal for live infrastructure monitoring, repair governance and public transparency.',
  },
  {
    title: 'Digital Oversight For Public Works',
    sub: 'Operational intelligence for detection, compliance tracking and district-level response coordination.',
  },
  {
    title: 'Modern Citizen-Centric Monitoring',
    sub: 'Map-based visibility, rapid notices and service access designed for governance workflows.',
  },
]

type DashboardStats = {
  active_potholes?: number
  verified_repairs?: number
  blockchain_entries?: number
}

function StatisticsSection() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/dashboard/stats`).then(response => response.json()).then(setStats).catch(() => {})
  }, [])

  const metricCards = [
    { value: stats?.active_potholes?.toLocaleString() || '1,284', label: 'Active Cases' },
    { value: stats?.verified_repairs?.toLocaleString() || '892', label: 'Repairs Verified' },
    { value: stats?.blockchain_entries?.toLocaleString() || '15,643', label: 'Audit Entries' },
    { value: '42', label: 'District Cells Live' },
    { value: 'INR 89 Cr', label: 'Budget Tracked' },
    { value: '99.2%', label: 'System Availability' },
  ]

  return (
    <section className="bg-[#f3f4f6] py-8 md:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {metricCards.map(card => (
            <div key={card.label} className="rounded-2xl border border-[#d9e2ea] bg-white px-4 py-5 text-center shadow-sm">
              <div className="text-2xl font-extrabold tracking-tight text-[#16a34a] md:text-3xl">{card.value}</div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#516273]">{card.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  const [heroIdx, setHeroIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setHeroIdx(index => (index + 1) % HERO_SLIDES.length), 5000)
    return () => clearInterval(timer)
  }, [])

  const currentSlide = HERO_SLIDES[heroIdx]

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900">
      <div className="bg-[#0d3b5c] text-[11px] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-white/85">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">Government Of Chhattisgarh</span>
            <span className="hidden h-3 w-px bg-white/25 sm:inline-block" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">National Road Intelligence Platform</span>
          </div>
        </div>
      </div>

      <header className="border-b border-[#d7e0e8] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-4 border-[#d6e2eb] bg-[#f3f4f6] shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://img.favpng.com/2/0/3/chhattisgarh-logo-chhattisgarh-state-emblem-1PK4zCEk.jpg"
                alt="Chhattisgarh State Emblem"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#1f4e79]">Ministry Of Road Transport & Highways</p>
              <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight text-[#0d3b5c]">National Road Intelligence Platform</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-[#f59e0b] px-6 py-3 text-sm font-bold text-[#0d3b5c] shadow-sm transition hover:bg-[#e28d08]"
            >
              Login To Portal
            </Link>
            <div className="h-[60px] w-[190px] shrink-0 overflow-hidden rounded-lg border border-[#d6e2eb] bg-[#f3f4f6] px-2 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/Navbar.png"
                alt="National Road Intelligence Platform"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-[#0d3b5c] text-white">
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className={`border-b-4 px-5 py-4 text-sm font-semibold whitespace-nowrap transition ${
                item.active
                  ? 'border-[#f59e0b] bg-white/10 text-white'
                  : 'border-transparent text-white/85 hover:border-[#f59e0b] hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <main>
        <section className="relative isolate overflow-hidden border-b border-[#d7e0e8] bg-[#0d3b5c]">
          <div className="portal-hero-map pointer-events-none absolute inset-0">
            <HomeMap filter="all" onStatsUpdate={() => {}} onPotholeSelect={() => {}} />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(7,24,39,0.88)_0%,rgba(13,59,92,0.72)_45%,rgba(13,59,92,0.4)_100%)]" />

          <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="grid min-h-[56vh] max-h-[70vh] items-center gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="text-left text-white">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
                  <Building2 className="h-3.5 w-3.5" />
                  Smart Governance Interface
                </div>
                <h2 className="mt-5 max-w-3xl text-4xl font-black leading-tight md:text-6xl">{currentSlide.title}</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/85 md:text-lg">{currentSlide.sub}</p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    href="/map"
                    className="inline-flex min-w-48 items-center justify-center rounded-xl bg-[#f59e0b] px-6 py-3.5 text-sm font-bold text-[#0d3b5c] shadow-lg shadow-black/10 transition hover:bg-[#e28d08]"
                  >
                    Open Live Map
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex min-w-48 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15"
                  >
                    Access Dashboard
                  </Link>
                </div>

                <div className="mt-10 flex items-center gap-3">
                  {HERO_SLIDES.map((slide, index) => (
                    <button
                      key={slide.title}
                      type="button"
                      aria-label={`Show slide ${index + 1}`}
                      onClick={() => setHeroIdx(index)}
                      className={`h-3 rounded-full transition-all ${index === heroIdx ? 'w-10 bg-[#f59e0b]' : 'w-3 bg-white/45 hover:bg-white/70'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="hidden items-center justify-end md:flex lg:hidden">
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-b border-[#d7e0e8] bg-[#072b45] text-white">
          <div
            className="inline-flex min-w-full items-center gap-10 py-3 text-sm font-semibold"
            style={{ animation: 'tickerScroll 32s linear infinite' }}
          >
            {[...STATUS_RIBBON_ITEMS, ...STATUS_RIBBON_ITEMS].map((item, index) => (
              <div key={`${item}-${index}`} className="inline-flex items-center gap-3 whitespace-nowrap">
                <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <style>{`
          @keyframes tickerScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>

        <StatisticsSection />

        <section className="py-10 md:py-14">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.4fr_0.9fr] lg:px-8">
            <div className="rounded-3xl border border-[#d7e0e8] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#e6edf2] px-6 py-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#1f4e79]">Latest Announcements</p>
                  <h3 className="mt-1 text-2xl font-bold text-[#0d3b5c]">Notice Board</h3>
                </div>
                <Bell className="h-5 w-5 text-[#f59e0b]" />
              </div>
              <div className="divide-y divide-[#eef3f6] px-6">
                {ANNOUNCEMENTS.map(item => (
                  <div key={item.text} className="grid gap-3 py-4 md:grid-cols-[120px_1fr] md:items-start">
                    <div className="inline-flex w-fit rounded-full bg-[#edf4fb] px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#1f4e79]">
                      {item.date}
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[#d7e0e8] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#1f4e79]">Quick Access Portal</p>
              <h3 className="mt-1 text-2xl font-bold text-[#0d3b5c]">Department Links</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Access frequently used dashboards and public services through the portal shortcuts below.</p>

              <div className="mt-6 space-y-3">
                {QUICK_ACCESS.map(item => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${item.className}`}
                  >
                    <span>{item.label}</span>
                    <span aria-hidden="true">-&gt;</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-10 md:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#1f4e79]">Services</p>
              <h3 className="mt-1 text-3xl font-bold text-[#0d3b5c]">Integrated Governance Services</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">Core platform modules presented in a modern dashboard layout with service-first access patterns.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {SERVICES.map(service => {
                const Icon = service.icon

                return (
                  <article
                    key={service.title}
                    className="group rounded-3xl border border-[#dde7ee] bg-[#f8fafc] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#c5d5e2] hover:shadow-lg"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8eff5] text-[#1f4e79] transition group-hover:bg-[#0d3b5c] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h4 className="mt-5 text-xl font-bold text-[#0d3b5c]">{service.title}</h4>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{service.desc}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#1f4e79]">District Monitoring</p>
              <h3 className="mt-1 text-3xl font-bold text-[#0d3b5c]">Live District Status</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">Regional monitoring cells with current operational status indicators for portal review.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {DISTRICTS.map(district => (
                <div key={district} className="rounded-2xl border border-[#d8e4ec] bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-[#0d3b5c]">{district}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">Monitoring Cell</div>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-bold text-[#15803d]">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                      Active
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0d3b5c] py-8 text-white/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <div className="font-bold text-white">National Road Intelligence Platform</div>
            <div className="mt-1 text-white/70">Government portal interface for map monitoring, service access and governance dashboards.</div>
          </div>
          <div className="flex gap-5 text-white/80">
            <Link href="/map" className="transition hover:text-white">Live Map</Link>
            <Link href="/transparency" className="transition hover:text-white">Transparency</Link>
            <Link href="/login" className="transition hover:text-white">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

