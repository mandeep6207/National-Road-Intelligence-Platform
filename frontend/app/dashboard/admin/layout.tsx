'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminControlCenterProvider, useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'
import {
  BarChart3,
  ClipboardList,
  FileSearch,
  Home,
  MapPinned,
  RefreshCw,
  Settings,
  Shield,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: Home },
  { label: 'Road Analysis', href: '/dashboard/admin/analysis', icon: MapPinned },
  { label: 'Detected Issues', href: '/dashboard/admin/issues', icon: FileSearch },
  { label: 'AI Insights', href: '/dashboard/admin/insights', icon: BarChart3 },
  { label: 'Complaint Management', href: '/dashboard/admin/complaints', icon: ClipboardList },
  { label: 'Reports', href: '/dashboard/admin/reports', icon: Shield },
  { label: 'System Settings', href: '/dashboard/admin/settings', icon: Settings },
]

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { authLoading, error, notice, authenticate } = useAdminControlCenter()

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-[#0d3b5c] border-t-transparent" />
          <p className="text-sm text-slate-600">Connecting Super Admin control center...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800">
      <header className="bg-[#0d3b5c] text-white shadow-sm">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/75">Government of India | Ministry of Road Transport & Highways</p>
            <h1 className="mt-1 text-xl font-bold">AI Road Intelligence Control Center</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={authenticate}
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-3 py-2 font-semibold hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Reconnect
            </button>
            <Link href="/" className="rounded-lg bg-white/15 px-3 py-2 font-semibold hover:bg-white/20">
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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1f4e79]">Navigation</p>
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
        </aside>

        <main className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-5 lg:rounded-l-none lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AdminControlCenterProvider>
      <Shell>{children}</Shell>
    </AdminControlCenterProvider>
  )
}
