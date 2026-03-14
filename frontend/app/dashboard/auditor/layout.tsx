'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminControlCenterProvider, useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'
import { BarChart3, ClipboardCheck, FileText, Home, SearchCheck, ShieldAlert } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard/auditor', icon: Home },
  { label: 'Repair Audit Cases', href: '/dashboard/auditor/cases', icon: ClipboardCheck },
  { label: 'Investigations', href: '/dashboard/auditor/investigations', icon: SearchCheck },
  { label: 'Contractor Performance', href: '/dashboard/auditor/performance', icon: BarChart3 },
  { label: 'Compliance Reports', href: '/dashboard/auditor/reports', icon: FileText },
]

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { error, notice } = useAdminControlCenter()
  const [userName, setUserName] = useState('Auditor Authority')

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('nrip_user')
      if (!raw) return
      const parsed = JSON.parse(raw) as { name?: string }
      if (parsed.name) setUserName(parsed.name)
    } catch {
      setUserName('Auditor Authority')
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800">
      <header className="bg-[#0d3b5c] text-white shadow-sm">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/75">Government of India | Auditor Authority Workspace</p>
            <h1 className="mt-1 text-xl font-bold">Road Repair Accountability Portal</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="rounded-lg bg-white/10 px-3 py-2 font-semibold">{userName}</div>
            <Link href="/dashboard/government" className="rounded-lg bg-white/15 px-3 py-2 font-semibold hover:bg-white/20">
              Authority View
            </Link>
            <Link href="/" className="rounded-lg border border-white/25 px-3 py-2 font-semibold hover:bg-white/10">
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-4 max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        </div>
      )}

      {notice && (
        <div className="mx-auto mt-4 max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
        </div>
      )}

      <div className="mx-auto mt-4 flex max-w-[1800px] gap-0 px-4 pb-8 sm:px-6 lg:px-8">
        <aside className="hidden w-72 shrink-0 rounded-l-2xl border border-r-0 border-slate-200 bg-white p-5 lg:block">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1f4e79]">Audit Navigation</p>
          <nav className="mt-4 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-[#0d3b5c] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#1f4e79]" />
              <p className="font-semibold text-slate-700">Audit Actions</p>
            </div>
            <p>Verify repair evidence</p>
            <p>Flag suspicious cases</p>
            <p>Reopen complaints</p>
            <p>Generate compliance reports</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-5 lg:rounded-l-none lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AuditorLayout({ children }: { children: ReactNode }) {
  return (
    <AdminControlCenterProvider skipAuth>
      <Shell>{children}</Shell>
    </AdminControlCenterProvider>
  )
}