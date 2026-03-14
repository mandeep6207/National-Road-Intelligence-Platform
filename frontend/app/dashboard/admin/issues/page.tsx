'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileSearch } from 'lucide-react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'

const SEVERITY_BADGE = {
  critical: 'bg-red-100 text-red-700',
  medium: 'bg-orange-100 text-orange-700',
  minor: 'bg-green-100 text-green-700',
}

const PRIORITY_BADGE = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-orange-100 text-orange-700',
  LOW: 'bg-green-100 text-green-700',
}

export default function DetectedIssuesPage() {
  const router = useRouter()
  const { issues, prepareComplaintDraft } = useAdminControlCenter()
  const [selectedId, setSelectedId] = useState('')

  const selectedIssue = useMemo(
    () => issues.find((issue) => issue.complaintId === selectedId) || null,
    [issues, selectedId]
  )

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <FileSearch className="h-5 w-5 text-[#1f4e79]" />
          <h2 className="text-lg font-bold text-[#0d3b5c]">Detected Road Issues</h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Complaint ID', 'State', 'District', 'Road', 'Severity', 'Priority', 'Status'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issues.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Run Road Analysis from Dashboard or Road Analysis page to detect issues.
                  </td>
                </tr>
              )}

              {issues.map((issue) => (
                <tr
                  key={issue.complaintId}
                  onClick={() => setSelectedId(issue.complaintId)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{issue.complaintId}</td>
                  <td className="px-4 py-3">{issue.state}</td>
                  <td className="px-4 py-3">{issue.district}</td>
                  <td className="px-4 py-3">{issue.roadName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${SEVERITY_BADGE[issue.severity]}`}>
                      {issue.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_BADGE[issue.priority]}`}>
                      {issue.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-blue-700">{issue.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedIssue && (
        <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
          <h3 className="text-base font-bold text-[#0d3b5c]">Issue Details</h3>
          <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <p><span className="font-semibold">Complaint ID:</span> {selectedIssue.complaintId}</p>
            <p><span className="font-semibold">State:</span> {selectedIssue.state}</p>
            <p><span className="font-semibold">District:</span> {selectedIssue.district}</p>
            <p><span className="font-semibold">Pincode:</span> {selectedIssue.pincode}</p>
            <p><span className="font-semibold">Road:</span> {selectedIssue.roadName}</p>
            <p><span className="font-semibold">Priority:</span> {selectedIssue.priority}</p>
            <p><span className="font-semibold">Latitude:</span> {selectedIssue.latitude.toFixed(5)}</p>
            <p><span className="font-semibold">Longitude:</span> {selectedIssue.longitude.toFixed(5)}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => {
                prepareComplaintDraft(selectedIssue.complaintId)
                router.push('/dashboard/admin/complaints')
              }}
              className="rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a]"
            >
              Open Complaint Form
            </button>
            <button
              onClick={() => setSelectedId('')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Close Details
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
