'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'

export default function AuditorCasesPage() {
  const { complaints } = useAdminControlCenter()

  const completedCases = useMemo(
    () => complaints.filter((item) => ['REPAIR_COMPLETED', 'VERIFIED_BY_CITIZEN_AUDITOR', 'ESCALATED'].includes(item.status)),
    [complaints]
  )

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f4e79]">Repair Audit Cases</p>
        <h2 className="mt-2 text-lg font-bold text-[#0d3b5c]">Completed Repairs for Audit Review</h2>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Complaint ID', 'Road', 'District', 'Contractor', 'Status', 'Actions'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completedCases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No completed cases available for audit.</td>
                </tr>
              )}
              {completedCases.map((item) => (
                <tr key={item.complaintId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{item.complaintId}</td>
                  <td className="px-4 py-3">{item.roadName}</td>
                  <td className="px-4 py-3">{item.district}</td>
                  <td className="px-4 py-3">{item.contractorName || 'Unassigned'}</td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/auditor/investigations?case=${item.complaintId}`} className="rounded border border-[#0d3b5c] px-2 py-1 text-xs font-semibold text-[#0d3b5c] hover:bg-slate-100">
                        Audit Case
                      </Link>
                      <Link href={`/dashboard/auditor/investigations?case=${item.complaintId}`} className="rounded border border-[#1f4e79] px-2 py-1 text-xs font-semibold text-[#1f4e79] hover:bg-blue-50">
                        View Evidence
                      </Link>
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