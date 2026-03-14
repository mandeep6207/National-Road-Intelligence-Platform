'use client'

import { FileDown } from 'lucide-react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'

function downloadFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function toCsv(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]

  rows.forEach((row) => {
    const values = headers.map((header) => {
      const value = `${row[header] ?? ''}`.replace(/"/g, '""')
      return `"${value}"`
    })
    lines.push(values.join(','))
  })

  return lines.join('\n')
}

export default function ReportsPage() {
  const { issues, complaints, runHistory, districtStats } = useAdminControlCenter()

  const highPriority = complaints.filter((item) => item.priority === 'HIGH').length

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <FileDown className="h-5 w-5 text-[#1f4e79]" />
          <h2 className="text-lg font-bold text-[#0d3b5c]">Reports</h2>
        </div>
        <p className="text-sm text-slate-600">Export simulation data for hackathon presentation and audit review.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Detected Issues</p>
            <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{issues.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Complaints</p>
            <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{complaints.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">High Priority</p>
            <p className="mt-1 text-2xl font-extrabold text-red-600">{highPriority}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Simulation Runs</p>
            <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{runHistory.length}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-[#0d3b5c]">Export Center</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => downloadFile('issues.json', JSON.stringify(issues, null, 2), 'application/json')}
            className="rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a]"
          >
            Download Issues JSON
          </button>
          <button
            onClick={() => downloadFile('complaints.json', JSON.stringify(complaints, null, 2), 'application/json')}
            className="rounded-lg bg-[#1f4e79] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183f64]"
          >
            Download Complaints JSON
          </button>
          <button
            onClick={() => {
              const csv = toCsv(
                complaints.map((item) => ({
                  complaint_id: item.complaintId,
                  state: item.state,
                  district: item.district,
                  road: item.roadName,
                  severity: item.severity,
                  priority: item.priority,
                  status: item.status,
                }))
              )
              downloadFile('complaints.csv', csv, 'text/csv')
            }}
            className="rounded-lg bg-[#f59e0b] px-4 py-2 text-sm font-semibold text-[#0d3b5c] hover:bg-[#e28d08]"
          >
            Download Complaints CSV
          </button>
          <button
            onClick={() => downloadFile('district_stats.json', JSON.stringify(districtStats, null, 2), 'application/json')}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Download District Stats
          </button>
        </div>
      </section>
    </div>
  )
}
