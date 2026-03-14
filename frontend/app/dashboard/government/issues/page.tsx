'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileSearch } from 'lucide-react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'

export default function GovernmentDetectedIssuesPage() {
  const router = useRouter()
  const { complaints, prepareComplaintDraft } = useAdminControlCenter()
  const [selectedId, setSelectedId] = useState('')

  const selected = useMemo(
    () => complaints.find((item) => item.complaintId === selectedId) || null,
    [complaints, selectedId]
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
              {complaints.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">No detected issues available.</td>
                </tr>
              )}
              {complaints.map((row) => (
                <tr key={row.complaintId} onClick={() => setSelectedId(row.complaintId)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{row.complaintId}</td>
                  <td className="px-4 py-3">{row.state}</td>
                  <td className="px-4 py-3">{row.district}</td>
                  <td className="px-4 py-3">{row.roadName}</td>
                  <td className="px-4 py-3 capitalize">{row.severity}</td>
                  <td className="px-4 py-3">{row.priority}</td>
                  <td className="px-4 py-3 text-xs">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
          <h3 className="text-base font-bold text-[#0d3b5c]">Issue Detail View</h3>
          <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <p><span className="font-semibold">Complaint ID:</span> {selected.complaintId}</p>
            <p><span className="font-semibold">Authority:</span> {selected.assignedAuthority}</p>
            <p><span className="font-semibold">State:</span> {selected.state}</p>
            <p><span className="font-semibold">District:</span> {selected.district}</p>
            <p><span className="font-semibold">Road:</span> {selected.roadName}</p>
            <p><span className="font-semibold">Priority:</span> {selected.priority}</p>
            <p><span className="font-semibold">Status:</span> {selected.status}</p>
            <p><span className="font-semibold">Deadline:</span> {selected.repairDeadline || 'Not set'}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => {
                prepareComplaintDraft(selected.complaintId)
                router.push('/dashboard/government')
              }}
              className="rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a]"
            >
              Open in Governance Queue
            </button>
            <button onClick={() => setSelectedId('')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Close
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
