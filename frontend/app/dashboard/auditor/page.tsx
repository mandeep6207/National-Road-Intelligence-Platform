'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight, ClipboardCheck, SearchCheck, ShieldAlert } from 'lucide-react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'

const AuditorReviewMap = dynamic(() => import('@/components/map/AuditorReviewMap'), {
  ssr: false,
  loading: () => <div className="h-[380px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
})

export default function AuditorDashboardPage() {
  const { complaints, districtCenter, mapFocusToken } = useAdminControlCenter()

  const completedForAudit = useMemo(
    () => complaints.filter((item) => ['REPAIR_COMPLETED', 'VERIFIED_BY_CITIZEN_AUDITOR', 'ESCALATED'].includes(item.status)),
    [complaints]
  )

  const totalCasesAudited = completedForAudit.filter((item) => item.auditDecision !== 'pending').length
  const repairsVerified = completedForAudit.filter((item) => item.auditDecision === 'verified').length
  const suspiciousRepairs = completedForAudit.filter((item) => item.auditDecision === 'suspicious' || item.status === 'ESCALATED').length
  const pendingInvestigations = completedForAudit.filter((item) => item.auditDecision === 'pending' && item.status === 'REPAIR_COMPLETED').length

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Cases Audited</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{totalCasesAudited}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Repairs Verified</p>
          <p className="mt-1 text-2xl font-extrabold text-[#16a34a]">{repairsVerified}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Suspicious Repairs</p>
          <p className="mt-1 text-2xl font-extrabold text-red-600">{suspiciousRepairs}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pending Investigations</p>
          <p className="mt-1 text-2xl font-extrabold text-[#f59e0b]">{pendingInvestigations}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-bold text-[#0d3b5c]">Audit Map Overview</h2>
          <AuditorReviewMap center={districtCenter} complaints={completedForAudit} focusToken={mapFocusToken} />
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#1f4e79]" />
              <h3 className="text-base font-bold text-[#0d3b5c]">Audit Legend</h3>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p><span className="font-semibold text-green-700">Green:</span> verified repair</p>
              <p><span className="font-semibold text-amber-700">Yellow:</span> pending audit</p>
              <p><span className="font-semibold text-red-700">Red:</span> suspicious repair</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-base font-bold text-[#0d3b5c]">Quick Actions</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <Link href="/dashboard/auditor/cases" className="block rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold hover:bg-slate-100">Review repair audit cases</Link>
              <Link href="/dashboard/auditor/investigations" className="block rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold hover:bg-slate-100">Open investigations desk</Link>
              <Link href="/dashboard/auditor/reports" className="block rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold hover:bg-slate-100">Generate compliance reports</Link>
            </div>
          </section>
        </aside>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[#1f4e79]" />
            <h3 className="text-base font-bold text-[#0d3b5c]">Repair Audit Cases</h3>
          </div>
          <Link href="/dashboard/auditor/cases" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
            Open all cases
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Complaint ID', 'Road', 'District', 'Contractor', 'Status', 'Action'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completedForAudit.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No cases ready for audit yet.</td>
                </tr>
              )}
              {completedForAudit.slice(0, 6).map((item) => (
                <tr key={item.complaintId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{item.complaintId}</td>
                  <td className="px-4 py-3">{item.roadName}</td>
                  <td className="px-4 py-3">{item.district}</td>
                  <td className="px-4 py-3">{item.contractorName || 'Unassigned'}</td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/auditor/investigations?case=${item.complaintId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
                      <SearchCheck className="h-4 w-4" />
                      Investigate
                    </Link>
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
