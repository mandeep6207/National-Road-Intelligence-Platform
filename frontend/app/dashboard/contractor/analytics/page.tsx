'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  loadContractorPortalSnapshot,
  resolveContractorIdentity,
  type ContractorPortalSnapshot,
} from '@/lib/chhattisgarhContractorPortal'
import { getCgReportsUpdateEventName } from '@/lib/chhattisgarhAuthorityData'

const PIE_COLORS = ['#16a34a', '#f59e0b', '#1f4e79']

export default function ContractorAnalyticsPage() {
  const [snapshot, setSnapshot] = useState<ContractorPortalSnapshot>(() => loadContractorPortalSnapshot())

  useEffect(() => {
    const refresh = () => {
      setSnapshot(loadContractorPortalSnapshot(resolveContractorIdentity().contractorName))
    }

    refresh()
    window.addEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
    return () => {
      window.removeEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
    }
  }, [])

  const completionRateData = useMemo(
    () => [
      { name: 'Completed', value: snapshot.summary.jobsCompleted },
      { name: 'Pending', value: snapshot.summary.pendingRepairs },
      { name: 'In Progress', value: snapshot.summary.workInProgress },
    ],
    [snapshot.summary.jobsCompleted, snapshot.summary.pendingRepairs, snapshot.summary.workInProgress]
  )

  const averageRepairTimeData = useMemo(
    () => [
      { name: 'Current Average', days: Number(snapshot.summary.averageRepairTimeDays.toFixed(1)) },
      { name: 'Target Window', days: 2 },
    ],
    [snapshot.summary.averageRepairTimeDays]
  )

  const districtRepairDistribution = useMemo(() => {
    const grouped = new Map<string, number>()
    snapshot.tasks.forEach((task) => {
      grouped.set(task.district, (grouped.get(task.district) || 0) + 1)
    })
    return Array.from(grouped.entries()).map(([district, jobs]) => ({ district, jobs }))
  }, [snapshot.tasks])

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Jobs Assigned</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{snapshot.summary.totalJobsAssigned}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Jobs Completed</p>
          <p className="mt-1 text-2xl font-extrabold text-[#16a34a]">{snapshot.summary.jobsCompleted}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pending Jobs</p>
          <p className="mt-1 text-2xl font-extrabold text-[#b45309]">{snapshot.summary.pendingJobs}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Average Repair Time</p>
          <p className="mt-1 text-2xl font-extrabold text-[#1f4e79]">{snapshot.summary.averageRepairTimeDays.toFixed(1)} days</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-bold text-[#0d3b5c]">Repair Completion Rate</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={completionRateData} dataKey="value" nameKey="name" outerRadius={88}>
                {completionRateData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-bold text-[#0d3b5c]">Average Repair Time</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={averageRepairTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `${value} days`} />
              <Bar dataKey="days" fill="#1f4e79" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-bold text-[#0d3b5c]">District Repair Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={districtRepairDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="district" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `${value} jobs`} />
              <Bar dataKey="jobs" fill="#16a34a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
