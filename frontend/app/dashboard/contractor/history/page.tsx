'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  loadContractorPortalSnapshot,
  resolveContractorIdentity,
  type ContractorPortalSnapshot,
} from '@/lib/chhattisgarhContractorPortal'
import { getCgReportsUpdateEventName } from '@/lib/chhattisgarhAuthorityData'

export default function ContractorRepairHistoryPage() {
  const [snapshot, setSnapshot] = useState<ContractorPortalSnapshot>(() => loadContractorPortalSnapshot())

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

  const completedRepairs = useMemo(
    () => snapshot.tasks.filter((item) => item.status === 'REPAIR_COMPLETED'),
    [snapshot.tasks]
  )

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f4e79]">Repair History</p>
        <h2 className="mt-2 text-lg font-bold text-[#0d3b5c]">Completed Repair Register</h2>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Complaint ID', 'Road Name', 'District', 'Completion Date', 'Status'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completedRepairs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    No completed repair history is available yet.
                  </td>
                </tr>
              )}
              {completedRepairs.map((repair) => (
                <tr key={repair.complaintId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{repair.complaintId}</td>
                  <td className="px-4 py-3">{repair.roadName}</td>
                  <td className="px-4 py-3">{repair.district}</td>
                  <td className="px-4 py-3">{repair.completedAt ? new Date(repair.completedAt).toLocaleDateString('en-IN') : 'Pending'}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{repair.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
