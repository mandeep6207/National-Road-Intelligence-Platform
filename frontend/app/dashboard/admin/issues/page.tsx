'use client'

import { useEffect, useState } from 'react'
import { FileSearch } from 'lucide-react'
import ReportDetailModal, { type ReportDetailFallback } from '@/components/ReportDetailModal'
import { fetchAdminDetectedIssues, type PotholeReportEntry, type ReportSourceFilter } from '@/lib/api'

const USE_DEMO_DETECTED_ISSUES = true

const SOURCE_OPTIONS: Array<{ label: string; value: ReportSourceFilter }> = [
  { label: 'Detected by Satellite', value: 'satellite' },
  { label: 'Detected by Citizens', value: 'citizen' },
]

const SEVERITY_BADGES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-orange-100 text-orange-700',
  LOW: 'bg-emerald-100 text-emerald-700',
}

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-red-100 text-red-700',
  under_review: 'bg-orange-100 text-orange-700',
  repaired: 'bg-emerald-100 text-emerald-700',
}

type DemoSeed = {
  complaintId: string
  severity: PotholeReportEntry['severity']
  riskScore: number
  status: 'pending' | 'under_review' | 'repaired'
  district: string
  state: string
  latitude: number
  longitude: number
  imageIndex: number
}

const DEMO_REPORT_SEEDS: DemoSeed[] = [
  { complaintId: 'SAT-1001', severity: 'HIGH', riskScore: 94, status: 'pending', district: 'Raipur', state: 'Chhattisgarh', latitude: 21.2514, longitude: 81.6296, imageIndex: 1 },
  { complaintId: 'SAT-1002', severity: 'HIGH', riskScore: 88, status: 'under_review', district: 'Durg', state: 'Chhattisgarh', latitude: 21.1904, longitude: 81.2849, imageIndex: 2 },
  { complaintId: 'SAT-1003', severity: 'MEDIUM', riskScore: 76, status: 'pending', district: 'Visakhapatnam', state: 'Andhra Pradesh', latitude: 17.6868, longitude: 83.2185, imageIndex: 3 },
  { complaintId: 'SAT-1004', severity: 'MEDIUM', riskScore: 71, status: 'under_review', district: 'New Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.209, imageIndex: 4 },
  { complaintId: 'SAT-1005', severity: 'LOW', riskScore: 48, status: 'repaired', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946, imageIndex: 5 },
  { complaintId: 'SAT-1006', severity: 'HIGH', riskScore: 92, status: 'pending', district: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707, imageIndex: 6 },
  { complaintId: 'SAT-1007', severity: 'MEDIUM', riskScore: 67, status: 'under_review', district: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462, imageIndex: 7 },
  { complaintId: 'SAT-1008', severity: 'MEDIUM', riskScore: 73, status: 'pending', district: 'Nagpur', state: 'Maharashtra', latitude: 21.1458, longitude: 79.0882, imageIndex: 8 },
  { complaintId: 'SAT-1009', severity: 'LOW', riskScore: 44, status: 'repaired', district: 'Bilaspur', state: 'Chhattisgarh', latitude: 22.0797, longitude: 82.14, imageIndex: 9 },
  { complaintId: 'SAT-1010', severity: 'MEDIUM', riskScore: 62, status: 'under_review', district: 'Amaravati', state: 'Andhra Pradesh', latitude: 16.5062, longitude: 80.648, imageIndex: 10 },
  { complaintId: 'SAT-1011', severity: 'LOW', riskScore: 38, status: 'pending', district: 'Kanchipuram', state: 'Tamil Nadu', latitude: 12.8342, longitude: 79.7036, imageIndex: 11 },
  { complaintId: 'SAT-1012', severity: 'LOW', riskScore: 52, status: 'repaired', district: 'Kanpur Nagar', state: 'Uttar Pradesh', latitude: 26.4499, longitude: 80.3319, imageIndex: 12 },
]

const DEMO_REPORTS: PotholeReportEntry[] = DEMO_REPORT_SEEDS.map((seed, index) => ({
  id: seed.complaintId,
  complaint_id: seed.complaintId,
  type: 'pothole',
  severity: seed.severity,
  risk_score: seed.riskScore,
  confidence: Number((0.78 + ((index % 5) * 0.04)).toFixed(2)),
  latitude: seed.latitude,
  longitude: seed.longitude,
  state: seed.state,
  district: seed.district,
  pincode: '',
  road_name: `${seed.district} Main Road`,
  timestamp: new Date(Date.now() - (index * 18 + 12) * 60 * 1000).toISOString(),
  status: seed.status,
  source: 'satellite',
  image: `/potholes/pot ${seed.imageIndex}.jpg`,
}))

function getStatusBadge(status?: string): string {
  const key = String(status || '').trim().toLowerCase()
  return STATUS_BADGES[key] || 'bg-slate-100 text-slate-700'
}

function getStatusLabel(status?: string): string {
  const key = String(status || '').trim().toLowerCase()
  if (!key) return 'Pending'
  if (key === 'under_review') return 'Under Review'
  if (key === 'repaired') return 'Repaired'
  if (key === 'pending') return 'Pending'
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return '—'
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return timestamp
  return parsed.toLocaleString()
}

function buildFallback(report: PotholeReportEntry): ReportDetailFallback {
  return {
    id: report.id,
    complaint_id: report.complaint_id,
    type: report.type,
    severity: report.severity,
    risk_score: report.risk_score,
    confidence: report.confidence,
    latitude: report.latitude,
    longitude: report.longitude,
    state: report.state,
    district: report.district,
    pincode: report.pincode,
    road_name: report.road_name,
    timestamp: report.timestamp,
    status: report.status,
    source: report.source,
    image: report.image,
  }
}

export default function DetectedIssuesPage() {
  const [reportSourceFilter, setReportSourceFilter] = useState<ReportSourceFilter>('citizen')
  const [reports, setReports] = useState<PotholeReportEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedReport, setSelectedReport] = useState<PotholeReportEntry | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    if (USE_DEMO_DETECTED_ISSUES && reportSourceFilter === 'satellite') {
      setReports(DEMO_REPORTS)
      setLoading(false)
      return () => {
        active = false
      }
    }

    fetchAdminDetectedIssues(reportSourceFilter)
      .then((nextReports) => {
        if (!active) return
        setReports(nextReports)
      })
      .catch((nextError: any) => {
        if (!active) return
        setError(nextError?.message || 'Unable to load detected issues from backend 1.')
        setReports([])
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [reportSourceFilter])

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-[#1f4e79]" />
                <h2 className="text-lg font-bold text-[#0d3b5c]">Detected Issues</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600">Citizen and satellite pothole reports from backend 1.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map((option) => {
                const isActive = option.value === reportSourceFilter
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setReportSourceFilter(option.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-[#0d3b5c] text-white shadow-sm'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Loading detected issues...
            </div>
          ) : reports.length === 0 ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No reports found for the selected source.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reports.map((report) => {
                const reportId = report.complaint_id || report.id
                const severityBadge = SEVERITY_BADGES[String(report.severity || '').toUpperCase()] || 'bg-slate-100 text-slate-700'
                const statusBadge = getStatusBadge(report.status)
                const statusLabel = getStatusLabel(report.status)

                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedReport(report)}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1f4e79] hover:shadow-md"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                      {report.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={report.image} alt={`Snapshot ${reportId}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-500">No snapshot available</div>
                      )}
                    </div>

                    <div className="space-y-2 p-4 text-sm text-slate-700">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Complaint ID</p>
                          <p className="mt-1 font-mono text-xs text-[#1f4e79]">{reportId}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-600">
                          {report.source || reportSourceFilter}
                        </span>
                      </div>

                      <p>
                        <span className="font-semibold">Severity:</span>{' '}
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityBadge}`}>
                          {report.severity}
                        </span>
                      </p>
                      <p><span className="font-semibold">Risk Score:</span> {report.risk_score ?? '—'}</p>
                      <p><span className="font-semibold">District:</span> {report.district || '—'}</p>
                      <p><span className="font-semibold">State:</span> {report.state || '—'}</p>
                      <p>
                        <span className="font-semibold">Status:</span>{' '}
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge}`}>
                          {statusLabel}
                        </span>
                      </p>
                      <p><span className="font-semibold">Timestamp:</span> {formatTimestamp(report.timestamp)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <ReportDetailModal
        reportId={selectedReport ? selectedReport.complaint_id || selectedReport.id : null}
        title="Detected Issue Detail"
        fallback={selectedReport ? buildFallback(selectedReport) : null}
        onClose={() => setSelectedReport(null)}
      />
    </>
  )
}
