'use client'

import { useMemo } from 'react'
import { BarChart3, TrendingUp } from 'lucide-react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'

function DistributionBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function AIInsightsPage() {
  const { issues, runHistory, districtStats, selectedDistrict } = useAdminControlCenter()

  const severityCounts = useMemo(() => {
    const critical = issues.filter((issue) => issue.severity === 'critical').length
    const medium = issues.filter((issue) => issue.severity === 'medium').length
    const minor = issues.filter((issue) => issue.severity === 'minor').length
    return { critical, medium, minor, total: issues.length }
  }, [issues])

  const latestRuns = runHistory.slice(-6)
  const districtRanking = Object.entries(districtStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#1f4e79]" />
          <h2 className="text-lg font-bold text-[#0d3b5c]">AI Insights</h2>
        </div>
        <p className="text-sm text-slate-700">
          {severityCounts.total === 0
            ? 'Run road analysis to generate district analytics.'
            : severityCounts.total > 13
              ? `High pothole density detected in ${selectedDistrict}.`
              : `Moderate road damage trend observed in ${selectedDistrict}.`}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Recommendation: prioritize repair allocation in high traffic zones and monitor recurrence through weekly scans.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-[#0d3b5c]">Pothole Severity Distribution</h3>
        <div className="mt-4 space-y-4">
          <DistributionBar label="Critical" value={severityCounts.critical} total={severityCounts.total} color="#dc2626" />
          <DistributionBar label="Medium" value={severityCounts.medium} total={severityCounts.total} color="#f59e0b" />
          <DistributionBar label="Minor" value={severityCounts.minor} total={severityCounts.total} color="#16a34a" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#1f4e79]" />
          <h3 className="text-base font-bold text-[#0d3b5c]">Road Damage Trends</h3>
        </div>

        {latestRuns.length === 0 ? (
          <p className="text-sm text-slate-600">No trend data available. Run analysis multiple times to view trends.</p>
        ) : (
          <div className="space-y-3">
            {latestRuns.map((run) => {
              const total = run.critical + run.medium + run.minor
              return (
                <div key={run.runAt} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{run.state} - {run.district}</span>
                    <span>{run.runAt}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                    <div className="flex h-full w-full">
                      <div style={{ width: `${total ? (run.critical / total) * 100 : 0}%`, backgroundColor: '#dc2626' }} />
                      <div style={{ width: `${total ? (run.medium / total) * 100 : 0}%`, backgroundColor: '#f59e0b' }} />
                      <div style={{ width: `${total ? (run.minor / total) * 100 : 0}%`, backgroundColor: '#16a34a' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-[#0d3b5c]">District Comparison</h3>
        {districtRanking.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">District comparison will appear after running simulations.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {districtRanking.map(([district, count]) => (
              <div key={district} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                  <span className="font-semibold">{district}</span>
                  <span>{count} issues</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[#1f4e79]"
                    style={{ width: `${Math.min(100, (count / Math.max(districtRanking[0][1], 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
