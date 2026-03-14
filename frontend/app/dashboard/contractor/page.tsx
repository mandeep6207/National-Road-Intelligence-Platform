'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight, ClipboardCheck, MapPinned, Wrench } from 'lucide-react'
import { useAdminControlCenter, type ComplaintRecord } from '@/components/admin/AdminControlCenterContext'

const ContractorRepairsMap = dynamic(() => import('@/components/map/ContractorRepairsMap'), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
})

function isCompletedStatus(status: ComplaintRecord['status']) {
  return status === 'REPAIR_COMPLETED' || status === 'VERIFIED_BY_CITIZEN_AUDITOR' || status === 'CLOSED'
}

export default function ContractorDashboardPage() {
  const { complaints, startRepair } = useAdminControlCenter()

  const contractorRepairs = useMemo(() => complaints.filter((item) => item.contractorName), [complaints])
  const completedRepairs = useMemo(() => contractorRepairs.filter((item) => isCompletedStatus(item.status)), [contractorRepairs])
  const inProgressRepairs = useMemo(() => contractorRepairs.filter((item) => item.status === 'REPAIR_IN_PROGRESS'), [contractorRepairs])
  const criticalRepairs = useMemo(() => contractorRepairs.filter((item) => item.severity === 'critical' && !isCompletedStatus(item.status)), [contractorRepairs])
  const nextRepair = contractorRepairs[0] || null
  const mapCenter: [number, number] = nextRepair ? [nextRepair.latitude, nextRepair.longitude] : [22.9734, 78.6569]

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Repairs Assigned</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{contractorRepairs.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Repairs In Progress</p>
          <p className="mt-1 text-2xl font-extrabold text-[#1f4e79]">{inProgressRepairs.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Repairs Completed</p>
          <p className="mt-1 text-2xl font-extrabold text-[#16a34a]">{completedRepairs.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Critical Repairs</p>
          <p className="mt-1 text-2xl font-extrabold text-[#f59e0b]">{criticalRepairs.length}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPinned className="h-5 w-5 text-[#1f4e79]" />
              <h2 className="text-base font-bold text-[#0d3b5c]">Repair Location Map</h2>
            </div>
            <Link href="/dashboard/contractor/assigned" className="text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
              Open assigned repairs
            </Link>
          </div>
          <ContractorRepairsMap center={mapCenter} tasks={contractorRepairs} focusToken={contractorRepairs.length > 0 ? 1 : 0} />
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-[#1f4e79]" />
            <h3 className="text-base font-bold text-[#0d3b5c]">Execution Workflow</h3>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-white p-3">Authority assigns repair</div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">Contractor reviews task and starts field execution</div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">Evidence is uploaded with repair notes</div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">Repair is marked complete for authority review</div>
          </div>
        </aside>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[#1f4e79]" />
            <h3 className="text-base font-bold text-[#0d3b5c]">Assigned Repairs Snapshot</h3>
          </div>
          <Link href="/dashboard/contractor/history" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
            View repair history
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Complaint ID', 'Road', 'District', 'Priority', 'Deadline', 'Status', 'Action'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contractorRepairs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No contractor repair tasks available yet.
                  </td>
                </tr>
              )}

              {contractorRepairs.slice(0, 6).map((repair) => (
                <tr key={repair.complaintId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{repair.complaintId}</td>
                  <td className="px-4 py-3">{repair.roadName}</td>
                  <td className="px-4 py-3">{repair.district}</td>
                  <td className="px-4 py-3">{repair.priority}</td>
                  <td className="px-4 py-3">{repair.repairDeadline || 'Pending'}</td>
                  <td className="px-4 py-3 text-xs">{repair.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/contractor/repairs/${repair.complaintId}`} className="rounded border border-[#1f4e79] px-2 py-1 text-xs font-semibold text-[#1f4e79] hover:bg-blue-50">
                        View Details
                      </Link>
                      {!isCompletedStatus(repair.status) && (
                        <button
                          type="button"
                          onClick={() => startRepair(repair.complaintId)}
                          className="rounded border border-[#0d3b5c] px-2 py-1 text-xs font-semibold text-[#0d3b5c] hover:bg-slate-100"
                        >
                          Start Repair
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
