'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import { BarChart, Bar, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AUTHORITY_STATE, getSeedContractorPerformance } from '@/lib/chhattisgarhAuthorityData'

const PIE_COLORS = ['#1f4e79', '#16a34a', '#f59e0b', '#dc2626']

export default function ContractorProfilePage() {
  const params = useParams<{ contractorName: string }>()
  const decodedContractorName = decodeURIComponent(params.contractorName || '')

  const performance = useMemo(() => getSeedContractorPerformance(), [])

  const stats = useMemo(() => {
    const contractor = performance.find(
      (item) => item.contractor.toLowerCase() === decodedContractorName.toLowerCase()
    )

    const assignedJobs = contractor?.assigned_jobs ?? 0
    const completedJobs = contractor?.completed_jobs ?? 0
    const delayedJobs = contractor?.delayed_jobs ?? 0
    const pendingJobs = Math.max(assignedJobs - completedJobs, 0)
    const completionRate = assignedJobs > 0 ? (completedJobs / assignedJobs) * 100 : 0
    const averageRepairTime = contractor?.average_repair_time_hours ?? 0
    const stateAverageRepairTime = performance.length > 0
      ? performance.reduce((sum, item) => sum + item.average_repair_time_hours, 0) / performance.length
      : 0
    const trustScore = contractor?.trust_score ?? 0

    return {
      assignedJobs,
      completedJobs,
      pendingJobs,
      delayedJobs,
      completionRate,
      averageRepairTime,
      stateAverageRepairTime,
      trustScore,
    }
  }, [decodedContractorName, performance])

  const completionRateChartData = useMemo(
    () => [
      { name: 'Completed', value: stats.completedJobs },
      { name: 'Pending', value: stats.pendingJobs },
      { name: 'Delayed', value: stats.delayedJobs },
    ],
    [stats.completedJobs, stats.pendingJobs, stats.delayedJobs]
  )

  const averageRepairTimeChartData = useMemo(
    () => [
      { label: 'Contractor', hours: Number(stats.averageRepairTime.toFixed(1)) },
      { label: 'State Avg', hours: Number(stats.stateAverageRepairTime.toFixed(1)) },
    ],
    [stats.averageRepairTime, stats.stateAverageRepairTime]
  )

  const jobDistributionChartData = useMemo(
    () => [
      { name: 'Assigned', value: stats.assignedJobs },
      { name: 'Completed', value: stats.completedJobs },
      { name: 'Pending', value: stats.pendingJobs },
      { name: 'Delayed', value: stats.delayedJobs },
    ],
    [stats.assignedJobs, stats.completedJobs, stats.pendingJobs, stats.delayedJobs]
  )

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Section 6</p>
            <h2 className="text-base font-bold text-[#0d3b5c]">Contractor Profile</h2>
            <p className="mt-1 text-sm text-slate-600">{AUTHORITY_STATE} contractor performance summary for assignment demonstrations.</p>
          </div>
          <Link
            href="/dashboard/government"
            className="rounded-lg border border-[#1f4e79] px-3 py-1.5 text-xs font-semibold text-[#1f4e79] hover:bg-blue-50"
          >
            Back to Command Center
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Contractor Name</p>
          <p className="mt-1 text-base font-bold text-[#0d3b5c]">{decodedContractorName}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Trust Score</p>
          <p className="mt-1 text-2xl font-extrabold text-[#1f4e79]">{stats.trustScore}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Average Repair Time</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{stats.averageRepairTime.toFixed(1)} hrs</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Assigned Jobs</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{stats.assignedJobs}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Completed Jobs</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">{stats.completedJobs}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pending Jobs</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-700">{stats.pendingJobs}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Delayed Jobs</p>
          <p className="mt-1 text-2xl font-extrabold text-red-700">{stats.delayedJobs}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-base font-bold text-[#0d3b5c]">Repair Completion Rate</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={completionRateChartData} dataKey="value" nameKey="name" outerRadius={85}>
                {completionRateChartData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-base font-bold text-[#0d3b5c]">Average Repair Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={averageRepairTimeChartData}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => `${value} hrs`} />
              <Bar dataKey="hours" fill="#1f4e79" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-base font-bold text-[#0d3b5c]">Job Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={jobDistributionChartData} dataKey="value" nameKey="name" outerRadius={85}>
                {jobDistributionChartData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
