'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminControlCenterProvider, useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'
import { resolveContractorIdentity } from '@/lib/chhattisgarhContractorPortal'
import { BarChart3, ClipboardCheck, History, Home, MapPinned, Wrench } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard/contractor', icon: Home },
  { label: 'Repair Queue', href: '/dashboard/contractor/assigned', icon: ClipboardCheck },
  { label: 'Repair History', href: '/dashboard/contractor/history', icon: History },
  { label: 'Performance Analytics', href: '/dashboard/contractor/analytics', icon: BarChart3 },
]

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { error, notice } = useAdminControlCenter()
  const [contractorName, setContractorName] = useState('Raipur RoadWorks Ltd')
  const [region, setRegion] = useState('Chhattisgarh')

  useEffect(() => {
    const identity = resolveContractorIdentity()
    setContractorName(identity.contractorName)
    setRegion(identity.region)
  }, [])

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800">
      <header className="bg-[#0d3b5c] text-white shadow-sm">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/75">Chhattisgarh | Contractor Execution Workspace</p>
            <h1 className="mt-1 text-xl font-bold">Smart Road Monitoring Contractor Portal</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="rounded-lg bg-white/10 px-3 py-2 font-semibold">{contractorName}</div>
            <div className="rounded-lg bg-white/10 px-3 py-2 font-semibold">Region: {region}</div>
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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1f4e79]">Contractor Navigation</p>
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
              <Wrench className="h-4 w-4 text-[#1f4e79]" />
              <p className="font-semibold text-slate-700">Execution Workflow</p>
            </div>
            <p>Authority assigns repair</p>
            <p>Contractor starts work</p>
            <p>Repair progress updated</p>
            <p>Repair marked complete</p>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="mb-1 flex items-center gap-2">
              <MapPinned className="h-4 w-4 text-[#1f4e79]" />
              <p className="font-semibold text-slate-700">Map Legend</p>
            </div>
            <p>Red: active repair tasks</p>
            <p>Orange: assigned repairs</p>
            <p>Green: completed repairs</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-5 lg:rounded-l-none lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function ContractorLayout({ children }: { children: ReactNode }) {
  return (
    <AdminControlCenterProvider skipAuth>
      <Shell>{children}</Shell>
    </AdminControlCenterProvider>
  )
}
