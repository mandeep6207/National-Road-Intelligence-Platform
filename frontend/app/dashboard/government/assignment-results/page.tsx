'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const ASSIGNMENT_RESULTS_STORAGE_KEY = 'nrip_authority_assignment_results_v1'

interface AssignmentResultRow {
  complaintId: string
  contractorName: string
  district: string
  severity: string
  repairDeadline: string
  status: string
  assignedAt: string
}

export default function AssignmentResultsPage() {
  const [rows, setRows] = useState<AssignmentResultRow[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(ASSIGNMENT_RESULTS_STORAGE_KEY)
      if (!raw) {
        setRows([])
        return
      }

      const parsed = JSON.parse(raw) as AssignmentResultRow[]
      setRows(Array.isArray(parsed) ? parsed : [])
    } catch {
      setRows([])
    }
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Section 5</p>
            <h2 className="text-base font-bold text-[#0d3b5c]">Assignment Result Page</h2>
          </div>
          <Link
            href="/dashboard/government"
            className="rounded-lg border border-[#1f4e79] px-3 py-1.5 text-xs font-semibold text-[#1f4e79] hover:bg-blue-50"
          >
            Back to Command Center
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No assignment results available. Assign complaints from the command center first.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    'Assigned Complaint ID',
                    'Contractor Name',
                    'District',
                    'Severity',
                    'Repair Deadline',
                    'Status',
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={`${row.complaintId}-${row.assignedAt}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{row.complaintId}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/government/contractors/${encodeURIComponent(row.contractorName)}`}
                        className="font-semibold text-[#1f4e79] hover:text-[#0d3b5c]"
                      >
                        {row.contractorName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.district}</td>
                    <td className="px-4 py-3">{row.severity}</td>
                    <td className="px-4 py-3">{new Date(row.repairDeadline).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-[#0d3b5c]">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
