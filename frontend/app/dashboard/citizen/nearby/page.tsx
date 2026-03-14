'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { useAdminControlCenter, type ComplaintRecord } from '@/components/admin/AdminControlCenterContext'

const CitizenIssuesMap = dynamic(() => import('@/components/map/CitizenIssuesMap'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
})

function isCompletedStatus(status: ComplaintRecord['status']) {
  return status === 'REPAIR_COMPLETED' || status === 'VERIFIED_BY_CITIZEN_AUDITOR' || status === 'CLOSED'
}

export default function CitizenNearbyIssuesPage() {
  const { complaints, districtCenter, mapFocusToken } = useAdminControlCenter()

  const nearbyIssues = useMemo(() => complaints, [complaints])
  const reportedCount = nearbyIssues.filter((item) => !isCompletedStatus(item.status) && item.status !== 'REPAIR_IN_PROGRESS').length
  const inProgressCount = nearbyIssues.filter((item) => item.status === 'REPAIR_IN_PROGRESS').length
  const repairedCount = nearbyIssues.filter((item) => isCompletedStatus(item.status)).length

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Reported Issues</p>
          <p className="mt-1 text-2xl font-extrabold text-red-600">{reportedCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Repair In Progress</p>
          <p className="mt-1 text-2xl font-extrabold text-[#f59e0b]">{inProgressCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Repaired</p>
          <p className="mt-1 text-2xl font-extrabold text-[#16a34a]">{repairedCount}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-bold text-[#0d3b5c]">Nearby Road Issues Map</h2>
        <CitizenIssuesMap center={districtCenter} complaints={nearbyIssues} focusToken={mapFocusToken} />
      </section>
    </div>
  )
}