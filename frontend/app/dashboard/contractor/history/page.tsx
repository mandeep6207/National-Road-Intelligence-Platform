'use client'

import { useMemo } from 'react'
import { useAdminControlCenter, type ComplaintRecord } from '@/components/admin/AdminControlCenterContext'

function isCompletedStatus(status: ComplaintRecord['status']) {
  return status === 'REPAIR_COMPLETED' || status === 'VERIFIED_BY_CITIZEN_AUDITOR' || status === 'CLOSED'
}

export default function ContractorRepairHistoryPage() {
  const { complaints } = useAdminControlCenter()

  const completedRepairs = useMemo(
    () => complaints.filter((item) => item.contractorName && isCompletedStatus(item.status)),
    [complaints]
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
                {['Complaint ID', 'Road', 'District', 'Completion Date', 'Status'].map((heading) => (
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
                  <td className="px-4 py-3 text-green-700">{repair.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}