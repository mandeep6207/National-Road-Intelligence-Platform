'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'

export default function AuditorPerformancePage() {
  const { complaints } = useAdminControlCenter()

  const contractorRows = useMemo(() => {
    const grouped: Record<string, { total: number; verified: number; suspicious: number; avgRepairTime: number[] }> = {}

    complaints.forEach((item) => {
      if (!item.contractorName) return
      if (!grouped[item.contractorName]) {
        grouped[item.contractorName] = { total: 0, verified: 0, suspicious: 0, avgRepairTime: [] }
      }

      const row = grouped[item.contractorName]
      row.total += 1
      if (item.auditDecision === 'verified' || item.status === 'VERIFIED_BY_CITIZEN_AUDITOR') row.verified += 1
      if (item.auditDecision === 'suspicious' || item.status === 'ESCALATED') row.suspicious += 1

      if (item.repairStartedAt && item.completedAt) {
        const duration = (new Date(item.completedAt).getTime() - new Date(item.repairStartedAt).getTime()) / (1000 * 60 * 60 * 24)
        row.avgRepairTime.push(Math.max(duration, 0))
      }
    })

    return Object.entries(grouped).map(([contractor, row]) => {
      const completionRate = row.total === 0 ? 0 : Math.round((row.verified / row.total) * 100)
      const repairFailureRate = row.total === 0 ? 0 : Math.round((row.suspicious / row.total) * 100)
      const averageRepairTime = row.avgRepairTime.length === 0 ? 0 : row.avgRepairTime.reduce((a, b) => a + b, 0) / row.avgRepairTime.length
      return {
        contractor,
        completionRate,
        repairFailureRate,
        averageRepairTime: Number(averageRepairTime.toFixed(1)),
      }
    })
  }, [complaints])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f4e79]">Contractor Performance Audit</p>
        <h2 className="mt-2 text-lg font-bold text-[#0d3b5c]">Completion, Failure, and Repair Time Metrics</h2>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={contractorRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="contractor" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="completionRate" fill="#16a34a" name="Completion Rate (%)" />
            <Bar dataKey="repairFailureRate" fill="#dc2626" name="Repair Failure Rate (%)" />
            <Bar dataKey="averageRepairTime" fill="#1f4e79" name="Avg Repair Time (days)" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Contractor', 'Completion Rate', 'Repair Failure Rate', 'Average Repair Time'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contractorRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">No contractor metrics available yet.</td>
                </tr>
              )}
              {contractorRows.map((row) => (
                <tr key={row.contractor} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{row.contractor}</td>
                  <td className="px-4 py-3 text-green-700">{row.completionRate}%</td>
                  <td className="px-4 py-3 text-red-700">{row.repairFailureRate}%</td>
                  <td className="px-4 py-3">{row.averageRepairTime} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}