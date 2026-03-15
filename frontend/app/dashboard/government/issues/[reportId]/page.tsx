'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'
import {
  applyAssignmentOverridesToReports,
  assignCitizenReportToContractor,
  AUTHORITY_STATE,
  assignChhattisgarhReportToContractor,
  getContractorsForDistrict,
  loadChhattisgarhReports,
  type ChhattisgarhPotholeReport,
} from '@/lib/chhattisgarhAuthorityData'
import { fetchAuthorityDetectedRoadIssues, type PotholeReportEntry } from '@/lib/api'

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return '—'
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return timestamp
  return parsed.toLocaleString()
}

export default function GovernmentIssueDetailPage() {
  const params = useParams<{ reportId: string }>()
  const searchParams = useSearchParams()
  const source = (searchParams.get('source') || 'satellite').toLowerCase()
  const reportId = decodeURIComponent(params.reportId || '')

  const { setNotice } = useAdminControlCenter()

  const [report, setReport] = useState<PotholeReportEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const contractors = useMemo(() => getContractorsForDistrict(report?.district || 'Raipur'), [report?.district])
  const [selectedContractor, setSelectedContractor] = useState('')

  useEffect(() => {
    if (!report) return
    if (!selectedContractor) {
      setSelectedContractor(contractors[0])
    }
  }, [contractors, report, selectedContractor])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    if (source === 'satellite') {
      const found = loadChhattisgarhReports().find((item) => item.complaint_id === reportId || item.id === reportId)
      if (!active) return
      if (!found) {
        setError('Issue not found in Chhattisgarh satellite dataset.')
        setReport(null)
      } else {
        setReport(found)
      }
      setLoading(false)
      return () => {
        active = false
      }
    }

    fetchAuthorityDetectedRoadIssues(AUTHORITY_STATE, 'citizen')
      .then((items) => {
        if (!active) return
        const scoped = items.filter((item) => item.state === AUTHORITY_STATE)
        const withOverrides = applyAssignmentOverridesToReports(scoped)
        const found = withOverrides.find((item) => item.complaint_id === reportId || item.id === reportId)
        if (!found) {
          setError('Issue not found in Chhattisgarh citizen reports.')
          setReport(null)
          return
        }
        setReport(found)
      })
      .catch((nextError: unknown) => {
        if (!active) return
        const message = nextError instanceof Error ? nextError.message : 'Could not load issue details.'
        setError(message)
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [reportId, source])

  function assignToContractor() {
    if (!report || !selectedContractor) return
    const reportKey = report.complaint_id || report.id

    if (source === 'satellite') {
      const nextReports = assignChhattisgarhReportToContractor(reportKey, selectedContractor)
      const refreshed = nextReports.find((item) => item.complaint_id === reportKey)
      if (refreshed) {
        setReport(refreshed as ChhattisgarhPotholeReport)
      }
    } else {
      assignCitizenReportToContractor(reportKey, selectedContractor)
      setReport((previous) => (previous ? { ...previous, status: 'ASSIGNED_TO_CONTRACTOR' } : previous))
    }

    setNotice(`Complaint ${reportKey} assigned to ${selectedContractor}.`)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Issue Detail</p>
            <h2 className="text-base font-bold text-[#0d3b5c]">Chhattisgarh Pothole Report</h2>
          </div>
          <Link
            href="/dashboard/government/issues"
            className="rounded-lg border border-[#1f4e79] px-3 py-1.5 text-xs font-semibold text-[#1f4e79] hover:bg-blue-50"
          >
            Back to Detected Road Issues
          </Link>
        </div>
      </section>

      {loading ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          Loading issue details...
        </section>
      ) : error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : !report ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          Report not found.
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {report.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={report.image} alt={`Snapshot ${report.complaint_id || report.id}`} className="h-[320px] w-full object-cover" />
              ) : (
                <div className="flex h-[320px] items-center justify-center text-sm text-slate-500">No snapshot available</div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-base font-bold text-[#0d3b5c]">Full Report</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p><span className="font-semibold">Complaint ID:</span> {report.complaint_id || report.id}</p>
              <p><span className="font-semibold">Severity:</span> {report.severity}</p>
              <p><span className="font-semibold">Risk Score:</span> {report.risk_score ?? '—'}</p>
              <p><span className="font-semibold">Latitude:</span> {report.latitude}</p>
              <p><span className="font-semibold">Longitude:</span> {report.longitude}</p>
              <p><span className="font-semibold">State:</span> {report.state || AUTHORITY_STATE}</p>
              <p><span className="font-semibold">District:</span> {report.district}</p>
              <p><span className="font-semibold">Timestamp:</span> {formatTimestamp(report.timestamp)}</p>
              <p><span className="font-semibold">Status:</span> {report.status || 'ASSIGNED_TO_AUTHORITY'}</p>
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Contractor</label>
              <select
                value={selectedContractor}
                onChange={(event) => setSelectedContractor(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {contractors.map((contractor) => (
                  <option key={contractor} value={contractor}>{contractor}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={assignToContractor}
                className="w-full rounded-lg border border-[#1f4e79] px-3 py-2 text-xs font-semibold text-[#1f4e79] hover:bg-blue-50"
              >
                Assign To Contractor
              </button>
            </div>
          </article>
        </section>
      )}
    </div>
  )
}
