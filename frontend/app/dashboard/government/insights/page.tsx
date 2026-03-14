'use client'

import { useMemo } from 'react'
import { BarChart3, TrendingUp } from 'lucide-react'
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'

export default function GovernmentInsightsPage() {
  const { complaints, districtStats, selectedDistrict } = useAdminControlCenter()

  const severityData = useMemo(() => {
    const critical = complaints.filter((item) => item.severity === 'critical').length
    const medium = complaints.filter((item) => item.severity === 'medium').length
    const minor = complaints.filter((item) => item.severity === 'minor').length
    return [
      { name: 'Critical', value: critical, color: '#dc2626' },
      { name: 'Medium', value: medium, color: '#f59e0b' },
      { name: 'Minor', value: minor, color: '#16a34a' },
    ]
  }, [complaints])

  const workflowTrend = useMemo(() => {
    return [
      { stage: 'Generated', count: complaints.length },
      { stage: 'Verified', count: complaints.filter((item) => item.authorityVerified).length },
      { stage: 'Assigned', count: complaints.filter((item) => item.status === 'ASSIGNED_TO_CONTRACTOR').length },
      { stage: 'Completed', count: complaints.filter((item) => item.status === 'REPAIR_COMPLETED').length },
      { stage: 'Verified Final', count: complaints.filter((item) => item.citizenAuditorVerified).length },
    ]
  }, [complaints])

  const districtComparison = useMemo(
    () => Object.entries(districtStats).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([district, count]) => ({ district, count })),
    [districtStats]
  )

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#1f4e79]" />
          <h2 className="text-lg font-bold text-[#0d3b5c]">AI Insights</h2>
        </div>
        <p className="text-sm text-slate-700">
          {complaints.length > 12
            ? `High pothole density detected in ${selectedDistrict}.`
            : `Road condition trends are stable in ${selectedDistrict} with moderate repair load.`}
        </p>
        <p className="mt-2 text-sm text-slate-600">Recommendation: prioritize highway corridors with repeated critical detections and monitor contractor delays.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-base font-bold text-[#0d3b5c]">Pothole Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={severityData} dataKey="value" nameKey="name" outerRadius={96} label>
                {severityData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#1f4e79]" />
            <h3 className="text-base font-bold text-[#0d3b5c]">Road Damage Trends</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={workflowTrend}>
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1f4e79" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-base font-bold text-[#0d3b5c]">District Comparison</h3>
        {districtComparison.length === 0 ? (
          <p className="text-sm text-slate-600">Run simulations from Super Admin panel to populate district comparison analytics.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={districtComparison}>
              <XAxis dataKey="district" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#0d3b5c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  )
}
