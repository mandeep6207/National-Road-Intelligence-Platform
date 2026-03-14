'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAdminControlCenter, type ComplaintRecord } from '@/components/admin/AdminControlCenterContext'

function isCompletedStatus(status: ComplaintRecord['status']) {
  return status === 'REPAIR_COMPLETED' || status === 'VERIFIED_BY_CITIZEN_AUDITOR' || status === 'CLOSED'
}

function getAverageRepairTimeDays(records: ComplaintRecord[]) {
  const durations = records
    .filter((item) => item.repairStartedAt && item.completedAt)
    .map((item) => {
      const started = new Date(item.repairStartedAt).getTime()
      const completed = new Date(item.completedAt).getTime()
      return Math.max((completed - started) / (1000 * 60 * 60 * 24), 0)
    })

  if (durations.length === 0) return 0
  return durations.reduce((sum, value) => sum + value, 0) / durations.length
}

export default function ContractorAnalyticsPage() {
  const { complaints } = useAdminControlCenter()

  const contractorRepairs = useMemo(() => complaints.filter((item) => item.contractorName), [complaints])
  const completedRepairs = useMemo(() => contractorRepairs.filter((item) => isCompletedStatus(item.status)), [contractorRepairs])
  const delayedRepairs = useMemo(
    () => contractorRepairs.filter((item) => item.repairDeadline && !isCompletedStatus(item.status) && new Date(item.repairDeadline) < new Date()),
    [contractorRepairs]
  )

  const completionRate = contractorRepairs.length === 0 ? 0 : Math.round((completedRepairs.length / contractorRepairs.length) * 100)
  const averageRepairTime = getAverageRepairTimeDays(completedRepairs)
  const qualityScore = completedRepairs.length === 0 ? 0 : Math.min(100, Math.round(82 + completionRate * 0.12 - delayedRepairs.length * 2))

  const chartData = [
    { metric: 'Completion Rate', value: completionRate },
    { metric: 'Avg Repair Time', value: Number(averageRepairTime.toFixed(1)) },
    { metric: 'Delayed Repairs', value: delayedRepairs.length },
    { metric: 'Quality Score', value: qualityScore },
  ]

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Completion Rate</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{completionRate}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Average Repair Time</p>
          <p className="mt-1 text-2xl font-extrabold text-[#1f4e79]">{averageRepairTime.toFixed(1)} days</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Delayed Repairs</p>
          <p className="mt-1 text-2xl font-extrabold text-[#f59e0b]">{delayedRepairs.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quality Score</p>
          <p className="mt-1 text-2xl font-extrabold text-[#16a34a]">{qualityScore}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-bold text-[#0d3b5c]">Contractor Performance Analytics</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#1f4e79" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}