'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, ClipboardList, MapPinned } from 'lucide-react'
import { useAdminControlCenter, type ComplaintRecord } from '@/components/admin/AdminControlCenterContext'
import ReportDetailModal, { type ReportDetailFallback } from '@/components/ReportDetailModal'
import CitizenAchievements from '@/components/citizen/CitizenAchievements'
import CitizenLeaderboard from '@/components/citizen/CitizenLeaderboard'
import CitizenNotifications from '@/components/citizen/CitizenNotifications'
import CitizenStatsCards from '@/components/citizen/CitizenStatsCards'
import {
  fetchPotholeReports,
  fetchCitizenLeaderboard,
  fetchCitizenNotifications,
  fetchCitizenStats,
  resolveStoredImageUrl,
  type CitizenLeaderboardEntry,
  type CitizenNotificationEntry,
  type PotholeReportEntry,
  type CitizenStatsResponse,
} from '@/lib/api'
import type { CitizenMapIssue } from '@/components/map/CitizenIssuesMap'

const CitizenIssuesMap = dynamic(() => import('@/components/map/CitizenIssuesMap'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
})

function isCompletedStatus(status: string) {
  return status === 'REPAIR_COMPLETED' || status === 'VERIFIED_BY_CITIZEN_AUDITOR' || status === 'CLOSED'
}

function getCitizenStatus(status: string) {
  if (status === 'REPAIR_IN_PROGRESS') return 'Repair In Progress'
  if (status === 'REPAIR_COMPLETED') return 'Completed'
  if (status === 'VERIFIED_BY_CITIZEN_AUDITOR' || status === 'CLOSED') return 'Verified'
  if (status === 'ASSIGNED_TO_CONTRACTOR' || status === 'VERIFIED_BY_AUTHORITY') return 'Assigned'
  return 'Reported'
}

const RAIPUR_CENTER: [number, number] = [21.2514, 81.6296]
const RAIPUR_ZOOM = 11

function isRaipurChhattisgarh(state?: string, district?: string) {
  return (state || '').trim().toLowerCase() === 'chhattisgarh' && (district || '').trim().toLowerCase() === 'raipur'
}

function toReportSeverity(value: ComplaintRecord['severity']): PotholeReportEntry['severity'] {
  if (value === 'critical') return 'HIGH'
  if (value === 'medium') return 'MEDIUM'
  return 'LOW'
}

type CitizenComplaintSnapshotRow = {
  complaintId: string
  roadName: string
  district: string
  status: string
  severity: ComplaintRecord['severity']
  latitude: number
  longitude: number
  state: string
  pincode: string
  createdAt: string
  reportSource: ComplaintRecord['reportSource']
  issueImageName: string
}

const DEMO_CITIZEN_STATS: CitizenStatsResponse = {
  solved_complaints: 3,
  reports_submitted: 3,
  reports_verified: 1,
  tokens_earned: 45,
  current_streak: 4,
  last_report_date: null,
  rank: 'Active Contributor',
  badges: ['First Reporter Badge', 'Verified Road Safety Helper'],
  certificates: [],
}

const DEMO_COMPLAINT_ROWS: CitizenComplaintSnapshotRow[] = [
  {
    complaintId: 'CMP-CG-501',
    roadName: 'GE Road',
    district: 'Raipur',
    status: 'VERIFIED_BY_AUTHORITY',
    severity: 'medium',
    latitude: 21.2518,
    longitude: 81.6389,
    state: 'Chhattisgarh',
    pincode: '492001',
    createdAt: new Date().toISOString(),
    reportSource: 'citizen',
    issueImageName: '',
  },
  {
    complaintId: 'CMP-CG-502',
    roadName: 'VIP Road',
    district: 'Raipur',
    status: 'REPAIR_IN_PROGRESS',
    severity: 'critical',
    latitude: 21.2444,
    longitude: 81.6662,
    state: 'Chhattisgarh',
    pincode: '492006',
    createdAt: new Date().toISOString(),
    reportSource: 'citizen',
    issueImageName: '',
  },
  {
    complaintId: 'CMP-CG-503',
    roadName: 'Station Road',
    district: 'Raipur',
    status: 'REPAIR_COMPLETED',
    severity: 'medium',
    latitude: 21.2472,
    longitude: 81.6315,
    state: 'Chhattisgarh',
    pincode: '492009',
    createdAt: new Date().toISOString(),
    reportSource: 'citizen',
    issueImageName: '',
  },
]

const DEMO_RAIPUR_MAP_ISSUES: CitizenMapIssue[] = [
  { issueId: 'RP-MAP-001', roadName: 'GE Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'critical', priority: 'HIGH', status: 'ESCALATED', latitude: 21.2549, longitude: 81.6418 },
  { issueId: 'RP-MAP-002', roadName: 'Station Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'critical', priority: 'HIGH', status: 'ESCALATED', latitude: 21.2479, longitude: 81.6321 },
  { issueId: 'RP-MAP-003', roadName: 'VIP Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'critical', priority: 'HIGH', status: 'VERIFIED_BY_AUTHORITY', latitude: 21.2438, longitude: 81.6654 },
  { issueId: 'RP-MAP-004', roadName: 'Telibandha Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'medium', priority: 'MEDIUM', status: 'REPAIR_IN_PROGRESS', latitude: 21.2387, longitude: 81.6552 },
  { issueId: 'RP-MAP-005', roadName: 'Shankar Nagar', district: 'Raipur', state: 'Chhattisgarh', severity: 'minor', priority: 'LOW', status: 'ASSIGNED_TO_AUTHORITY', latitude: 21.2354, longitude: 81.6517 },
  { issueId: 'RP-MAP-006', roadName: 'GE Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'minor', priority: 'LOW', status: 'CLOSED', latitude: 21.2529, longitude: 81.6462 },
  { issueId: 'RP-MAP-007', roadName: 'Station Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'minor', priority: 'LOW', status: 'CLOSED', latitude: 21.2484, longitude: 81.6274 },
  { issueId: 'RP-MAP-008', roadName: 'VIP Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'minor', priority: 'LOW', status: 'CLOSED', latitude: 21.2418, longitude: 81.6627 },
  { issueId: 'RP-MAP-009', roadName: 'Shankar Nagar', district: 'Raipur', state: 'Chhattisgarh', severity: 'minor', priority: 'LOW', status: 'CLOSED', latitude: 21.2342, longitude: 81.6485 },
  { issueId: 'RP-MAP-010', roadName: 'Telibandha Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'medium', priority: 'MEDIUM', status: 'REPAIR_COMPLETED', latitude: 21.2398, longitude: 81.6583 },
  { issueId: 'RP-MAP-011', roadName: 'GE Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'medium', priority: 'MEDIUM', status: 'REPAIR_COMPLETED', latitude: 21.2572, longitude: 81.6395 },
  { issueId: 'RP-MAP-012', roadName: 'Station Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'medium', priority: 'MEDIUM', status: 'REPAIR_COMPLETED', latitude: 21.2458, longitude: 81.6347 },
]

export default function CitizenDashboardPage() {
  const { complaints, mapFocusToken } = useAdminControlCenter()
  const [userEmail, setUserEmail] = useState('citizen@nrip.gov.in')
  const [stats, setStats] = useState<CitizenStatsResponse | null>(null)
  const [leaderboard, setLeaderboard] = useState<CitizenLeaderboardEntry[]>([])
  const [notifications, setNotifications] = useState<CitizenNotificationEntry[]>([])
  const [snapshotReports, setSnapshotReports] = useState<PotholeReportEntry[]>([])
  const [loadingGamification, setLoadingGamification] = useState(true)
  const [gamificationError, setGamificationError] = useState('')
  const [snapshotError, setSnapshotError] = useState('')
  const [previewReportId, setPreviewReportId] = useState<string | null>(null)
  const [previewFallback, setPreviewFallback] = useState<ReportDetailFallback | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('nrip_user')
      if (!raw) return
      const parsed = JSON.parse(raw) as { email?: string }
      if (parsed.email) setUserEmail(parsed.email)
    } catch {
      setUserEmail('citizen@nrip.gov.in')
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadGamification() {
      setLoadingGamification(true)
      setGamificationError('')
      try {
        const [nextStats, nextLeaderboard, nextNotifications] = await Promise.all([
          fetchCitizenStats(),
          fetchCitizenLeaderboard(8),
          fetchCitizenNotifications(8),
        ])
        if (!mounted) return
        setStats(nextStats)
        setLeaderboard(nextLeaderboard)
        setNotifications(nextNotifications)
      } catch (error: any) {
        if (!mounted) return
        setGamificationError(error?.message || 'Unable to load citizen rewards right now.')
      } finally {
        if (mounted) setLoadingGamification(false)
      }
    }

    loadGamification()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    fetchPotholeReports(40)
      .then((reports) => {
        if (!mounted) return
        setSnapshotReports(reports)
      })
      .catch((error: any) => {
        if (!mounted) return
        setSnapshotError(error?.message || 'Unable to load live pothole snapshots right now.')
      })

    return () => {
      mounted = false
    }
  }, [])

  const citizenComplaints = useMemo(
    () => complaints.filter((item) => item.reporterEmail === userEmail || (item.reportSource === 'citizen' && !item.reporterEmail)),
    [complaints, userEmail]
  )

  const realCitizenComplaintRows = useMemo<CitizenComplaintSnapshotRow[]>(
    () =>
      citizenComplaints.map((item) => ({
        complaintId: item.complaintId,
        roadName: item.roadName,
        district: item.district,
        status: item.status,
        severity: item.severity,
        latitude: item.latitude,
        longitude: item.longitude,
        state: item.state,
        pincode: item.pincode,
        createdAt: item.createdAt,
        reportSource: item.reportSource,
        issueImageName: item.issueImageName,
      })),
    [citizenComplaints]
  )

  const hasRealCitizenReports = realCitizenComplaintRows.length > 0

  const raipurLiveIssues = useMemo<CitizenMapIssue[]>(
    () =>
      complaints
        .filter((item) => isRaipurChhattisgarh(item.state, item.district))
        .map((item) => ({
          issueId: item.complaintId,
          roadName: item.roadName,
          district: item.district,
          state: item.state,
          severity: item.severity,
          priority: item.priority,
          status: item.status,
          latitude: item.latitude,
          longitude: item.longitude,
          auditDecision: item.auditDecision,
        })),
    [complaints]
  )

  const raipurMapIssues = useMemo(
    () => (raipurLiveIssues.length > 0 ? raipurLiveIssues : DEMO_RAIPUR_MAP_ISSUES),
    [raipurLiveIssues]
  )

  const effectiveStats = hasRealCitizenReports ? stats : DEMO_CITIZEN_STATS
  const gamificationLoading = hasRealCitizenReports ? loadingGamification : false

  const tableComplaintRows = hasRealCitizenReports ? realCitizenComplaintRows : DEMO_COMPLAINT_ROWS

  const citizenReportCards = useMemo(() => {
    const sourceFiltered = snapshotReports.filter((report) => (report.source || 'citizen') === 'citizen')
    const fallbackReports = realCitizenComplaintRows.map((complaint) => ({
      id: complaint.complaintId,
      complaint_id: complaint.complaintId,
      type: 'pothole',
      severity: toReportSeverity(complaint.severity),
      latitude: complaint.latitude,
      longitude: complaint.longitude,
      state: complaint.state,
      district: complaint.district,
      pincode: complaint.pincode,
      road_name: complaint.roadName,
      timestamp: complaint.createdAt,
      status: complaint.status,
      source: complaint.reportSource,
      image: resolveStoredImageUrl(complaint.issueImageName || '') || undefined,
    }))

    const mergedReports = new Map<string, PotholeReportEntry>()
    const combinedReports = [...sourceFiltered, ...fallbackReports]

    combinedReports.forEach((report) => {
      if (!mergedReports.has(report.id)) {
        mergedReports.set(report.id, report)
      }
    })

    const allReports = Array.from(mergedReports.values())
    const complaintIds = new Set(realCitizenComplaintRows.map((item) => item.complaintId))
    if (complaintIds.size === 0) return []

    const ownReports = allReports.filter(
      (report) => complaintIds.has(report.id) || (report.complaint_id ? complaintIds.has(report.complaint_id) : false)
    )
    return (ownReports.length > 0 ? ownReports : allReports).slice(0, 6)
  }, [realCitizenComplaintRows, snapshotReports])

  const issuesReported = hasRealCitizenReports ? (stats?.reports_submitted ?? realCitizenComplaintRows.length) : 3
  const repairsCompleted = hasRealCitizenReports
    ? realCitizenComplaintRows.filter((item) => item.status === 'REPAIR_COMPLETED').length
    : 1
  const repairsPending = hasRealCitizenReports
    ? realCitizenComplaintRows.filter((item) => !isCompletedStatus(item.status)).length
    : 2
  const verifiedRepairs = hasRealCitizenReports
    ? (stats?.solved_complaints ?? realCitizenComplaintRows.filter((item) => item.status === 'VERIFIED_BY_CITIZEN_AUDITOR').length)
    : 1

  function buildComplaintFallback(complaint: CitizenComplaintSnapshotRow): ReportDetailFallback {
    return {
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
      status: getCitizenStatus(complaint.status),
      source: complaint.reportSource,
      image: resolveStoredImageUrl(complaint.issueImageName || ''),
    }
  }

  function openReportPreview(reportId: string, fallback: ReportDetailFallback | null = null) {
    setPreviewReportId(reportId)
    setPreviewFallback(fallback)
  }

  function closeReportPreview() {
    setPreviewReportId(null)
    setPreviewFallback(null)
  }

  return (
    <div className="space-y-6">
      {gamificationError && (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {gamificationError}
        </section>
      )}

      {snapshotError && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {snapshotError}
        </section>
      )}

      <CitizenStatsCards stats={effectiveStats} loading={gamificationLoading} />

      <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPinned className="h-5 w-5 text-[#1f4e79]" />
              <h2 className="text-base font-bold text-[#0d3b5c]">Nearby Issues Map</h2>
            </div>
            <Link href="/dashboard/citizen/nearby" className="text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
              Open full map
            </Link>
          </div>
          <CitizenIssuesMap
            center={RAIPUR_CENTER}
            issues={raipurMapIssues}
            focusToken={mapFocusToken}
            initialZoom={RAIPUR_ZOOM}
          />
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
            <h3 className="text-base font-bold text-[#0d3b5c]">Report an Issue</h3>
            <p className="mt-2 text-sm text-slate-600">
              Help your city by reporting potholes and verifying completed repairs to earn tokens and badges.
            </p>
            <Link
              href="/dashboard/citizen/report"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#0d3b5c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a304a]"
            >
              Report Issue
            </Link>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <Link href="/dashboard/citizen/complaints" className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold hover:bg-slate-50">
                Track complaint status
              </Link>
              <Link href="/dashboard/citizen/verify" className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold hover:bg-slate-50">
                Verify completed repairs
              </Link>
            </div>
          </section>

          <CitizenAchievements stats={effectiveStats} />
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <CitizenLeaderboard entries={leaderboard} loading={gamificationLoading} />
        <CitizenNotifications notifications={notifications} loading={gamificationLoading} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[#0d3b5c]">Live AI Snapshot Feed</h3>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Citizen + AI auto capture</span>
        </div>

        {citizenReportCards.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No live pothole snapshots available yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {citizenReportCards.map((report) => (
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#1f4e79]" />
            <h3 className="text-base font-bold text-[#0d3b5c]">My Complaint Snapshot</h3>
          </div>
          <Link href="/dashboard/citizen/complaints" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
            View all complaints
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mb-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-3">
          <p><span className="font-semibold">Reports Submitted:</span> {issuesReported}</p>
          <p><span className="font-semibold">Repairs Completed:</span> {repairsCompleted}</p>
          <p><span className="font-semibold">Solved Complaints:</span> {verifiedRepairs}</p>
          <p><span className="font-semibold">Repairs Pending:</span> {repairsPending}</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Snapshot', 'Complaint ID', 'Road', 'District', 'Status', 'Verify'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableComplaintRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No citizen complaints submitted yet.
                  </td>
                </tr>
              )}
              {tableComplaintRows.slice(0, 6).map((complaint) => (
                <tr key={complaint.complaintId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {resolveStoredImageUrl(complaint.issueImageName) ? (
                      <button type="button" onClick={() => openReportPreview(complaint.complaintId, buildComplaintFallback(complaint))}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveStoredImageUrl(complaint.issueImageName) || ''} alt={`Snapshot ${complaint.complaintId}`} className="h-14 w-20 rounded-lg object-cover" />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">No snapshot</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{complaint.complaintId}</td>
                  <td className="px-4 py-3">{complaint.roadName}</td>
                  <td className="px-4 py-3">{complaint.district}</td>
                  <td className="px-4 py-3">{complaint.status}</td>
                  <td className="px-4 py-3">
                    {(complaint.status === 'REPAIR_COMPLETED' || complaint.status === 'VERIFIED_BY_CITIZEN_AUDITOR') ? (
                      <Link href="/dashboard/citizen/verify" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
                        <CheckCircle2 className="h-4 w-4" />
                        Review
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Pending repair</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ReportDetailModal
        reportId={previewReportId}
        title="Pothole Snapshot Viewer"
        fallback={previewFallback}
        onClose={closeReportPreview}
      />
    </div>
  )
}

