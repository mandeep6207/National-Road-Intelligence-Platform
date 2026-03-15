'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'
import {
  AUTHORITY_MAP_CENTER,
  loadContractorPortalSnapshot,
  resolveContractorIdentity,
  startContractorRepairTask,
  completeContractorRepairTask,
  type ContractorPortalSnapshot,
} from '@/lib/chhattisgarhContractorPortal'
import { getCgReportsUpdateEventName } from '@/lib/chhattisgarhAuthorityData'

const ContractorRepairsMap = dynamic(() => import('@/components/map/ContractorRepairsMap'), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
})

export default function ContractorAssignedRepairsPage() {
  const { setNotice } = useAdminControlCenter()
  const [snapshot, setSnapshot] = useState<ContractorPortalSnapshot>(() => loadContractorPortalSnapshot())
  const [selectedComplaintId, setSelectedComplaintId] = useState('')
  const [focusToken, setFocusToken] = useState(0)

  useEffect(() => {
    const refresh = () => {
      setSnapshot(loadContractorPortalSnapshot(resolveContractorIdentity().contractorName))
    }

    refresh()
    window.addEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
    return () => {
      window.removeEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
    }
  }, [])

  const assignedRepairs = useMemo(
    () => snapshot.tasks.filter((item) => item.status !== 'REPAIR_COMPLETED'),
    [snapshot.tasks]
  )

  const selectedRepair = useMemo(
    () => assignedRepairs.find((item) => item.complaintId === selectedComplaintId) || assignedRepairs[0] || null,
    [assignedRepairs, selectedComplaintId]
  )

  const mapCenter: [number, number] = selectedRepair
    ? [selectedRepair.latitude, selectedRepair.longitude]
    : AUTHORITY_MAP_CENTER

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 text-sm text-slate-700">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f4e79]">Contractor Work Queue</p>
        <p className="mt-2 max-w-3xl">Assigned pothole jobs from the Chhattisgarh authority dashboard appear here automatically for field execution and live repair tracking.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#0d3b5c]">Assigned Repair Tasks</h2>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#1f4e79]">
              {assignedRepairs.length} active tasks
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {['Complaint ID', 'Road Name', 'District', 'Severity', 'Repair Deadline', 'Status', 'Actions'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignedRepairs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                      No contractor work orders are assigned yet. Use the Government Authority dashboard to assign repairs.
                    </td>
                  </tr>
                )}

                {assignedRepairs.map((repair) => (
                  <tr
                    key={repair.complaintId}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => {
                      setSelectedComplaintId(repair.complaintId)
                      setFocusToken((value) => value + 1)
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{repair.complaintId}</td>
                    <td className="px-4 py-3">{repair.roadName}</td>
                    <td className="px-4 py-3">{repair.district}</td>
                    <td className="px-4 py-3">{repair.severity}</td>
                    <td className="px-4 py-3">{repair.repairDeadline}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">{repair.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/dashboard/contractor/repairs/${repair.complaintId}`} className="rounded border border-[#1f4e79] px-2 py-1 text-xs font-semibold text-[#1f4e79] hover:bg-blue-50">
                          View Details
                        </Link>
                        {repair.status === 'ASSIGNED_TO_CONTRACTOR' && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              startContractorRepairTask(repair.complaintId)
                              setNotice(`Repair started for ${repair.complaintId}.`)
                            }}
                            className="rounded border border-[#0d3b5c] px-2 py-1 text-xs font-semibold text-[#0d3b5c] hover:bg-slate-100"
                          >
                            Start Repair
                          </button>
                        )}
                        {repair.status === 'WORK_IN_PROGRESS' && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              completeContractorRepairTask(repair.complaintId)
                              setNotice(`Repair completed for ${repair.complaintId}.`)
                            }}
                            className="rounded border border-emerald-700 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            Mark Repair Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-base font-bold text-[#0d3b5c]">Repair Location Map</h3>
            <div className="mt-3">
              <ContractorRepairsMap center={mapCenter} tasks={assignedRepairs} focusToken={focusToken} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 text-sm text-slate-700">
            <h3 className="text-base font-bold text-[#0d3b5c]">Selected Task</h3>
            {selectedRepair ? (
              <div className="mt-3 space-y-2">
                <p><span className="font-semibold">Complaint ID:</span> {selectedRepair.complaintId}</p>
                <p><span className="font-semibold">Road:</span> {selectedRepair.roadName}</p>
                <p><span className="font-semibold">District:</span> {selectedRepair.district}</p>
                <p><span className="font-semibold">Status:</span> {selectedRepair.status}</p>
                <p><span className="font-semibold">Progress:</span> {selectedRepair.progressPercentage}%</p>
                <Link href={`/dashboard/contractor/repairs/${selectedRepair.complaintId}`} className="inline-flex items-center gap-2 pt-2 font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
                  Open repair details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-slate-500">Select a repair task to inspect location and execution details.</p>
            )}
          </section>
        </aside>
      </section>
    </div>
  )
}
