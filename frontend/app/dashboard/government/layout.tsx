'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminControlCenterProvider, useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'
import { Activity, Building2, FileSearch, Home, Users } from 'lucide-react'
import { AUTHORITY_STATE } from '@/lib/chhattisgarhAuthorityData'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard/government', icon: Home },
  { label: 'Detected Road Issues', href: '/dashboard/government/issues', icon: FileSearch },
  { label: 'Contractor Management', href: '/dashboard/government/contractor-management', icon: Users },
]

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const {
    error,
    notice,
    selectedState,
    selectedDistrict,
    availableDistricts,
    setSelectedState,
    setSelectedDistrict,
  } = useAdminControlCenter()

  useEffect(() => {
    if (selectedState !== AUTHORITY_STATE) {
      setSelectedState(AUTHORITY_STATE)
      return
    }

    const districtExists = availableDistricts.some((district) => district.name === selectedDistrict)
    if (!districtExists && availableDistricts.length > 0) {
      setSelectedDistrict(availableDistricts[0].name)
    }
  }, [availableDistricts, selectedDistrict, selectedState, setSelectedDistrict, setSelectedState])

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800">
      <header className="bg-[#0d3b5c] text-white shadow-sm">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/75">Government Authority Workspace</p>
            <h1 className="mt-1 text-xl font-bold">Chhattisgarh Road Governance Monitoring Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard/admin" className="rounded-lg bg-white/15 px-3 py-2 font-semibold hover:bg-white/20">
              Open Super Admin
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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1f4e79]">Authority Navigation</p>
          <nav className="mt-4 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[#0d3b5c] text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-8 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#1f4e79]" />
              <p className="font-semibold text-slate-700">Workflow Chain</p>
            </div>
            <p>Super Admin</p>
            <p>Government Authority</p>
            <p>Contractor</p>
            <p>Citizen / Auditor Verification</p>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="mb-1 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#1f4e79]" />
              <p className="font-semibold text-slate-700">Mode</p>
            </div>
            <p>District-level governance simulation active.</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-5 lg:rounded-l-none lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function GovernmentLayout({ children }: { children: ReactNode }) {
  return (
    <AdminControlCenterProvider skipAuth>
      <Shell>{children}</Shell>
    </AdminControlCenterProvider>
  )
}
