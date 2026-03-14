'use client'

import { useMemo } from 'react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'

function triggerDownload(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function toCsv(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return 'No data'
  const headers = Object.keys(rows[0])
  const body = rows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(','))
  return [headers.join(','), ...body].join('\n')
}

export default function AuditorReportsPage() {
  const { complaints } = useAdminControlCenter()

  const reportRows = useMemo(
    () => complaints.map((item) => ({
      complaintId: item.complaintId,
      district: item.district,
      contractor: item.contractorName || 'Unassigned',
      status: item.status,
      auditDecision: item.auditDecision,
      citizenRating: item.citizenOverallRating,
    })),
    [complaints]
  )

  function exportReport(type: 'repair-quality' | 'district-compliance' | 'contractor-audit', format: 'pdf' | 'excel' | 'csv') {
    const today = new Date().toISOString().slice(0, 10)
    const baseName = `${type}-report-${today}`

    if (format === 'csv') {
      triggerDownload(`${baseName}.csv`, toCsv(reportRows), 'text/csv;charset=utf-8;')
      return
    }

    if (format === 'excel') {
      triggerDownload(`${baseName}.xls`, toCsv(reportRows), 'application/vnd.ms-excel')
      return
    }

    const lines = [
      `Report Type: ${type}`,
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      '',
      ...reportRows.map((row) => `${row.complaintId} | ${row.district} | ${row.contractor} | ${row.status} | ${row.auditDecision} | Citizen Rating ${row.citizenRating}`),
    ]
    triggerDownload(`${baseName}.pdf`, lines.join('\n'), 'application/pdf')
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f4e79]">Compliance Reports</p>
        <h2 className="mt-2 text-lg font-bold text-[#0d3b5c]">Governance and Accountability Export Center</h2>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { key: 'repair-quality', title: 'Repair Quality Report', desc: 'Quality outcomes based on audit decisions and citizen ratings.' },
          { key: 'district-compliance', title: 'District Compliance Report', desc: 'District-wise status of completed, verified, and escalated repairs.' },
          { key: 'contractor-audit', title: 'Contractor Audit Report', desc: 'Contractor-level performance, failure rates, and suspicious cases.' },
        ].map((report) => (
          <div key={report.key} className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-base font-bold text-[#0d3b5c]">{report.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{report.desc}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => exportReport(report.key as 'repair-quality' | 'district-compliance' | 'contractor-audit', 'pdf')} className="rounded-lg border border-[#0d3b5c] px-3 py-1.5 text-xs font-semibold text-[#0d3b5c] hover:bg-slate-100">PDF</button>
              <button type="button" onClick={() => exportReport(report.key as 'repair-quality' | 'district-compliance' | 'contractor-audit', 'excel')} className="rounded-lg border border-[#1f4e79] px-3 py-1.5 text-xs font-semibold text-[#1f4e79] hover:bg-blue-50">Excel</button>
              <button type="button" onClick={() => exportReport(report.key as 'repair-quality' | 'district-compliance' | 'contractor-audit', 'csv')} className="rounded-lg border border-[#f59e0b] px-3 py-1.5 text-xs font-semibold text-[#9a5b00] hover:bg-amber-50">CSV</button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}