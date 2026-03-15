'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BarChart3, MapPinned, ShieldCheck } from 'lucide-react'
import ReportDetailModal, { type ReportDetailFallback } from '@/components/ReportDetailModal'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'
import { fetchAdminDetectedIssues, resolveStoredImageUrl, type PotholeReportEntry, type ReportSourceFilter } from '@/lib/api'

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

function simulationSeverityToReportSeverity(value: string) {
  if (value === 'critical') return 'HIGH'
  if (value === 'medium') return 'MEDIUM'
  return 'LOW'
}

function priorityFromReport(report: PotholeReportEntry) {
  return report.severity === 'HIGH' ? 'HIGH' : report.severity === 'MEDIUM' ? 'MEDIUM' : 'LOW'
}

export default function AdminDashboardPage() {
  const [previewReportId, setPreviewReportId] = useState<string | null>(null)
  const [previewFallback, setPreviewFallback] = useState<ReportDetailFallback | null>(null)
  const [snapshotReports, setSnapshotReports] = useState<PotholeReportEntry[]>([])
  const [reportSourceFilter, setReportSourceFilter] = useState<ReportSourceFilter>('satellite')
  const [snapshotError, setSnapshotError] = useState('')

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

  const simulationReports = useMemo<(PotholeReportEntry & { priority: string })[]>(
    () =>
      complaints
        .filter((complaint) => complaint.reportSource === 'ai')
        .map((complaint) => ({
          id: complaint.complaintId,
          complaint_id: complaint.complaintId,
          type: 'pothole',
          severity: simulationSeverityToReportSeverity(complaint.severity),
          latitude: complaint.latitude,
          longitude: complaint.longitude,
          state: complaint.state,
          district: complaint.district,
          pincode: complaint.pincode,
          road_name: complaint.roadName,
          timestamp: complaint.createdAt,
          status: complaint.status,
          source: 'satellite',
          image: resolveStoredImageUrl(complaint.issueImageName) || undefined,
          priority: complaint.priority,
        })),
    [complaints]
  )

  const displayedSnapshotReports = reportSourceFilter === 'citizen' ? snapshotReports : simulationReports

  const displayedTableRows = useMemo(
    () =>
      reportSourceFilter === 'citizen'
        ? snapshotReports.map((report) => ({
            id: report.id,
            complaintId: report.complaint_id || report.id,
            state: report.state,
            district: report.district,
            roadName: report.road_name || '—',
            severity: report.severity,
            priority: priorityFromReport(report),
            fallback: report,
          }))
        : simulationReports.slice(0, 6).map((report) => ({
            id: report.id,
            complaintId: report.complaint_id || report.id,
            state: report.state,
            district: report.district,
            roadName: report.road_name || '—',
            severity: report.severity,
            priority: report.priority,
            fallback: report,
          })),
    [reportSourceFilter, simulationReports, snapshotReports]
  )

  useEffect(() => {
    if (reportSourceFilter !== 'citizen') {
      setSnapshotReports([])
      setSnapshotError('')
      return
    }

    let active = true
    setSnapshotError('')

    fetchAdminDetectedIssues('citizen')
      .then((reports) => {
        if (!active) return
        setSnapshotReports(reports)
      })
      .catch((error: any) => {
        if (!active) return
        setSnapshotError(error?.message || 'Could not load saved pothole snapshots.')
        setSnapshotReports([])
      })

    return () => {
      active = false
    }
  }, [reportSourceFilter])

  function openReportPreview(reportId: string, fallback: ReportDetailFallback | null = null) {
    setPreviewReportId(reportId)
    setPreviewFallback(fallback)
  }

  function openComplaintPreview(complaintId: string) {
    const complaint = complaints.find((item) => item.complaintId === complaintId) || null
    openReportPreview(
      complaintId,
      complaint
        ? {
            id: complaint.complaintId,
            complaint_id: complaint.complaintId,
            type: 'pothole',
            severity: complaint.severity,
            latitude: complaint.latitude,
            longitude: complaint.longitude,
            state: complaint.state,
            district: complaint.district,
            pincode: complaint.pincode,
            road_name: complaint.roadName,
            timestamp: complaint.createdAt,
            status: complaint.status,
            source: complaint.reportSource,
            image: resolveStoredImageUrl(complaint.issueImageName),
          }
        : { id: complaintId, complaint_id: complaintId }
    )
  }

  function closeReportPreview() {
    setPreviewReportId(null)
    setPreviewFallback(null)
  }

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

      {snapshotError && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {snapshotError}
        </section>
      )}

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
            onViewImage={openComplaintPreview}
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[#0d3b5c]">Super Admin Snapshot Feed</h3>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {reportSourceFilter === 'citizen' ? 'Saved pothole images from backend reports' : 'Satellite simulation results from the analysis engine'}
          </span>
        </div>

        <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setReportSourceFilter('satellite')}
            className={`rounded-lg px-3 py-1.5 ${reportSourceFilter === 'satellite' ? 'bg-[#0d3b5c] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            Detected by Satellite
          </button>
          <button
            type="button"
            onClick={() => setReportSourceFilter('citizen')}
            className={`rounded-lg px-3 py-1.5 ${reportSourceFilter === 'citizen' ? 'bg-[#0d3b5c] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            Detected by Citizens
          </button>
        </div>

        {displayedSnapshotReports.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            {reportSourceFilter === 'citizen'
              ? 'No saved citizen pothole snapshots are available yet.'
              : 'Run road analysis to populate satellite simulation results.'}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedSnapshotReports.map((report) => (
              <article key={report.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="h-44 bg-slate-200">
                  {report.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={report.image} alt={`Snapshot ${report.id}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">No snapshot available</div>
                  )}
                </div>
                <div className="space-y-1 p-4 text-sm text-slate-700">
                  <p className="font-mono text-xs text-[#1f4e79]">Complaint ID : {report.id}</p>
                  <p><span className="font-semibold">Severity :</span> {report.severity}</p>
                  <p><span className="font-semibold">Risk Score :</span> {report.risk_score ?? '—'}</p>
                  <p><span className="font-semibold">Latitude :</span> {report.latitude}</p>
                  <p><span className="font-semibold">Longitude :</span> {report.longitude}</p>
                  <p><span className="font-semibold">State :</span> {report.state}</p>
                  <p><span className="font-semibold">District :</span> {report.district}</p>
                  <p><span className="font-semibold">Timestamp :</span> {new Date(report.timestamp).toLocaleString()}</p>
                  <button
                    type="button"
                    onClick={() => openReportPreview(report.id, report)}
                    className="mt-2 inline-flex rounded-lg border border-[#1f4e79] px-3 py-1.5 text-xs font-semibold text-[#1f4e79] hover:bg-blue-50"
                  >
                    Open full report
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-[#0d3b5c]">
            {reportSourceFilter === 'citizen' ? 'Citizen Reports Snapshot' : 'Detected Issues Snapshot'}
          </h3>
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
              {displayedTableRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    {reportSourceFilter === 'citizen'
                      ? 'No citizen pothole reports were returned by the backend.'
                      : 'Run road analysis to populate detected issues.'}
                  </td>
                </tr>
              )}
              {displayedTableRows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => {
                    if (row.fallback) {
                      openReportPreview(row.complaintId, row.fallback)
                      return
                    }
                    openComplaintPreview(row.complaintId)
                  }}
                >
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{row.complaintId}</td>
                  <td className="px-4 py-3">{row.state}</td>
                  <td className="px-4 py-3">{row.district}</td>
                  <td className="px-4 py-3">{row.roadName}</td>
                  <td className="px-4 py-3">{row.severity}</td>
                  <td className="px-4 py-3">{row.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ReportDetailModal
        reportId={previewReportId}
        title="Captured Image Preview"
        fallback={previewFallback}
        onClose={closeReportPreview}
      />
    </div>
  )
}
