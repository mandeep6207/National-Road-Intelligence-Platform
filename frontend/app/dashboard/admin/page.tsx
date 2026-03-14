'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, BarChart3, MapPinned, ShieldCheck } from 'lucide-react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'

const AdminSimulationMap = dynamic(() => import('@/components/map/AdminSimulationMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
  ),
})

function MetricCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-2xl font-extrabold text-[#0d3b5c]">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    </Link>
  )
}

export default function AdminDashboardPage() {
  const [imagePreviewId, setImagePreviewId] = useState('')

  const {
    selectedState,
    selectedDistrict,
    selectedPincode,
    availableStates,
    availableDistricts,
    availablePincodes,
    setSelectedState,
    setSelectedDistrict,
    setSelectedPincode,
    runRoadAnalysis,
    simulationRunning,
    simulationProgress,
    simulationStep,
    simulationSteps,
    issues,
    complaints,
    roadsScanned,
    mapFocusToken,
    districtCenter,
    runHistory,
  } = useAdminControlCenter()

  const highPriorityRepairs = complaints.filter((item) => item.priority === 'HIGH').length

  const insightText = useMemo(() => {
    if (issues.length === 0) {
      return {
        headline: 'Run a simulation to detect road issues in the selected district.',
        recommendation: 'Select state, district and pincode, then run analysis.',
      }
    }

    return {
      headline:
        issues.length > 13
          ? 'High pothole density detected in selected district.'
          : 'Localized road damage clusters detected in selected district.',
      recommendation:
        highPriorityRepairs > 0
          ? 'Prioritize repair allocation in high traffic highway corridors.'
          : 'Schedule preventive maintenance for medium and low severity roads.',
    }
  }, [issues.length, highPriorityRepairs])

  const recentRun = runHistory[runHistory.length - 1]

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
        <div className="mb-4 flex items-center gap-2">
          <MapPinned className="h-5 w-5 text-[#1f4e79]" />
          <h2 className="text-lg font-bold text-[#0d3b5c]">Area Selection Panel</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">State</label>
            <select
              value={selectedState}
              onChange={(event) => setSelectedState(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f4e79] focus:ring-2 focus:ring-[#1f4e79]/20"
            >
              {availableStates.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">District</label>
            <select
              value={selectedDistrict}
              onChange={(event) => setSelectedDistrict(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f4e79] focus:ring-2 focus:ring-[#1f4e79]/20"
            >
              {availableDistricts.map((district) => (
                <option key={district.name} value={district.name}>{district.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pincode</label>
            <select
              value={selectedPincode}
              onChange={(event) => setSelectedPincode(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f4e79] focus:ring-2 focus:ring-[#1f4e79]/20"
            >
              {availablePincodes.map((pincode) => (
                <option key={pincode} value={pincode}>{pincode}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={runRoadAnalysis}
              disabled={simulationRunning}
              className="inline-flex w-full items-center justify-center rounded-lg bg-[#0d3b5c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a304a] disabled:opacity-60"
            >
              {simulationRunning ? 'Running Analysis...' : 'Run Road Analysis'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Road Segments Scanned" value={roadsScanned} href="/dashboard/admin/analysis" />
        <MetricCard label="Potholes Detected" value={issues.length} href="/dashboard/admin/issues" />
        <MetricCard label="Complaints Generated" value={complaints.length} href="/dashboard/admin/complaints" />
        <MetricCard label="High Priority Repairs" value={highPriorityRepairs} href="/dashboard/admin/insights" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#1f4e79]" />
          <h3 className="text-base font-bold text-[#0d3b5c]">Simulation Progress</h3>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-[#f59e0b] transition-all" style={{ width: `${simulationProgress}%` }} />
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {simulationSteps.map((step, index) => (
            <div
              key={step}
              className={`rounded-lg border px-3 py-2 text-sm ${
                index < simulationStep
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : index === simulationStep
                    ? 'border-[#f59e0b] bg-amber-50 text-amber-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-[#0d3b5c]">Satellite Road Analysis Map</h3>
            <Link href="/dashboard/admin/analysis" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
              Open full analysis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <AdminSimulationMap
            focusCenter={districtCenter}
            focusToken={mapFocusToken}
            issues={issues}
            complaints={complaints}
            onViewImage={setImagePreviewId}
          />
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#1f4e79]" />
            <h3 className="text-base font-bold text-[#0d3b5c]">AI Insights</h3>
          </div>

          <div className="mt-4 space-y-4 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="font-semibold text-[#0d3b5c]">Insight</p>
              <p className="mt-1">{insightText.headline}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="font-semibold text-[#0d3b5c]">Recommendation</p>
              <p className="mt-1">{insightText.recommendation}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="font-semibold text-[#0d3b5c]">Latest Run</p>
              <p className="mt-1">{recentRun ? `${recentRun.state} - ${recentRun.district}` : 'No runs available'}</p>
              <p className="mt-1">Pincode: {selectedPincode}</p>
            </div>
            <Link href="/dashboard/admin/insights" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
              Explore AI Insights
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-[#0d3b5c]">Detected Issues Snapshot</h3>
          <Link href="/dashboard/admin/issues" className="text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">View all</Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Complaint ID', 'State', 'District', 'Road', 'Severity', 'Priority'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issues.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    Run road analysis to populate detected issues.
                  </td>
                </tr>
              )}
              {issues.slice(0, 6).map((issue) => (
                <tr key={issue.complaintId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{issue.complaintId}</td>
                  <td className="px-4 py-3">{issue.state}</td>
                  <td className="px-4 py-3">{issue.district}</td>
                  <td className="px-4 py-3">{issue.roadName}</td>
                  <td className="px-4 py-3 capitalize">{issue.severity}</td>
                  <td className="px-4 py-3">{issue.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {imagePreviewId && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/65 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <h4 className="text-lg font-bold text-[#0d3b5c]">Captured Image Preview</h4>
            <p className="mt-1 text-sm text-slate-600">Complaint ID: {imagePreviewId}</p>
            <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
              Satellite capture placeholder for road damage evidence
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setImagePreviewId('')}
                className="rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
