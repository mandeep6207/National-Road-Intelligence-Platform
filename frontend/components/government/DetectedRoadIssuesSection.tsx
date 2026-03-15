'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileSearch } from 'lucide-react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'
import {
  applyAssignmentOverridesToReports,
  assignCitizenReportToContractor,
  AUTHORITY_STATE,
  assignChhattisgarhReportToContractor,
  getCgReportsUpdateEventName,
  getContractorsForDistrict,
  loadChhattisgarhReports,
  type ChhattisgarhPotholeReport,
} from '@/lib/chhattisgarhAuthorityData'
import { fetchAuthorityDetectedRoadIssues, type PotholeReportEntry, type ReportSourceFilter } from '@/lib/api'

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
  ASSIGNED_TO_AUTHORITY: 'bg-red-100 text-red-700',
  ASSIGNED_TO_CONTRACTOR: 'bg-orange-100 text-orange-700',
  REPAIR_COMPLETED: 'bg-emerald-100 text-emerald-700',
}

interface DetectedRoadIssuesSectionProps {
  selectedState: string
  sectionLabel?: string
  title?: string
  description?: string
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return '—'
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return timestamp
  return parsed.toLocaleString()
}

function getStatusLabel(status?: string) {
  if (!status) return 'ASSIGNED_TO_AUTHORITY'
  return status
}

function getStatusBadge(status?: string) {
  return STATUS_BADGES[getStatusLabel(status)] || 'bg-slate-100 text-slate-700'
}

function toSatelliteReport(report: ChhattisgarhPotholeReport): PotholeReportEntry {
  return {
    ...report,
    status: report.status,
    source: 'satellite',
    confidence: undefined,
    pincode: undefined,
  }
}

export default function DetectedRoadIssuesSection({
  selectedState,
  sectionLabel = 'Section 2',
  title = 'Detected Road Issues',
  description,
}: DetectedRoadIssuesSectionProps) {
  const router = useRouter()
  const { setNotice } = useAdminControlCenter()
  const scopedStateLabel = selectedState || AUTHORITY_STATE

  const [reportSourceFilter, setReportSourceFilter] = useState<ReportSourceFilter>('satellite')
  const [reports, setReports] = useState<PotholeReportEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const effectiveState = AUTHORITY_STATE

  useEffect(() => {
    let active = true

    if (reportSourceFilter === 'satellite') {
      setLoading(true)
      setError('')
      const nextReports = loadChhattisgarhReports().map((report) => toSatelliteReport(report))
      setReports(nextReports)
      setLoading(false)

      const refresh = () => {
        if (!active) return
        setReports(loadChhattisgarhReports().map((report) => toSatelliteReport(report)))
      }

      window.addEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
      return () => {
        active = false
        window.removeEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
      }
    }

    setLoading(true)
    setError('')

    fetchAuthorityDetectedRoadIssues(effectiveState, 'citizen')
      .then((nextReports) => {
        if (!active) return
        const filtered = nextReports.filter((report) => report.state === AUTHORITY_STATE)
        const withOverrides = applyAssignmentOverridesToReports(filtered)
        setReports(withOverrides)
      })
      .catch((nextError: unknown) => {
        if (!active) return
        const message = nextError instanceof Error ? nextError.message : 'Unable to load authority reports.'
        setError(message)
        setReports([])
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [effectiveState, reportSourceFilter])

  const displayReports = useMemo(() => reports, [reports])

  function openIssueDetail(report: PotholeReportEntry) {
    const reportId = encodeURIComponent(report.complaint_id || report.id)
    router.push(`/dashboard/government/issues/${reportId}?source=${reportSourceFilter}`)
  }

  function assignToContractor(report: PotholeReportEntry) {
    const district = report.district || 'Raipur'
    const contractorName = getContractorsForDistrict(district)[0]
    const reportKey = report.complaint_id || report.id

    if (reportSourceFilter === 'satellite') {
      assignChhattisgarhReportToContractor(reportKey, contractorName)
      setReports(loadChhattisgarhReports().map((item) => toSatelliteReport(item)))
    } else {
      assignCitizenReportToContractor(reportKey, contractorName)
      setReports((previous) =>
        previous.map((item) =>
          (item.complaint_id || item.id) === reportKey
            ? { ...item, status: 'ASSIGNED_TO_CONTRACTOR' }
            : item
        )
      )
    }

    setNotice(`Complaint ${reportKey} assigned to ${contractorName}.`)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{sectionLabel}</p>
          <div className="mt-1 flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-[#1f4e79]" />
            <h2 className="text-lg font-bold text-[#0d3b5c]">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {description || `Pothole reports restricted to ${scopedStateLabel}.`}
          </p>
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
          Loading detected road issues...
        </div>
      ) : displayReports.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          No reports found for the selected source.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayReports.map((report) => {
            const reportId = report.complaint_id || report.id
            const severityBadge =
              SEVERITY_BADGES[String(report.severity || '').toUpperCase()] || 'bg-slate-100 text-slate-700'
            const statusBadge = getStatusBadge(report.status)

            return (
              <article
                key={report.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1f4e79] hover:shadow-md"
              >
                <button type="button" onClick={() => openIssueDetail(report)} className="block w-full text-left">
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
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusBadge}`}>
                        {getStatusLabel(report.status)}
                      </span>
                    </div>

                    <p>
                      <span className="font-semibold">Severity:</span>{' '}
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityBadge}`}>
                        {report.severity}
                      </span>
                    </p>
                    <p><span className="font-semibold">Latitude:</span> {report.latitude}</p>
                    <p><span className="font-semibold">Longitude:</span> {report.longitude}</p>
                    <p><span className="font-semibold">District:</span> {report.district || '—'}</p>
                    <p><span className="font-semibold">Timestamp:</span> {formatTimestamp(report.timestamp)}</p>
                  </div>
                </button>

                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => assignToContractor(report)}
                    className="w-full rounded-lg border border-[#1f4e79] px-3 py-2 text-xs font-semibold text-[#1f4e79] hover:bg-blue-50"
                  >
                    Assign To Contractor
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
