'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { useAdminControlCenter, type ComplaintRecord } from '@/components/admin/AdminControlCenterContext'
import type { CitizenMapIssue } from '@/components/map/CitizenIssuesMap'

const CitizenIssuesMap = dynamic(() => import('@/components/map/CitizenIssuesMap'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
})

function isCompletedStatus(status: string) {
  return status === 'REPAIR_COMPLETED' || status === 'VERIFIED_BY_CITIZEN_AUDITOR' || status === 'CLOSED'
}

const RAIPUR_CENTER: [number, number] = [21.2514, 81.6296]
const RAIPUR_ZOOM = 11

function isRaipurChhattisgarh(state?: string, district?: string) {
  return (state || '').trim().toLowerCase() === 'chhattisgarh' && (district || '').trim().toLowerCase() === 'raipur'
}

const DEMO_NEARBY_ISSUES: CitizenMapIssue[] = [
  { issueId: 'RP-NB-001', roadName: 'GE Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'critical', priority: 'HIGH', status: 'ASSIGNED_TO_AUTHORITY', latitude: 21.2556, longitude: 81.6409 },
  { issueId: 'RP-NB-002', roadName: 'Station Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'critical', priority: 'HIGH', status: 'ASSIGNED_TO_AUTHORITY', latitude: 21.2476, longitude: 81.6328 },
  { issueId: 'RP-NB-003', roadName: 'Telibandha Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'medium', priority: 'MEDIUM', status: 'VERIFIED_BY_AUTHORITY', latitude: 21.2391, longitude: 81.6567 },
  { issueId: 'RP-NB-004', roadName: 'VIP Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'minor', priority: 'LOW', status: 'ASSIGNED_TO_AUTHORITY', latitude: 21.2441, longitude: 81.6648 },
  { issueId: 'RP-NB-005', roadName: 'Shankar Nagar', district: 'Raipur', state: 'Chhattisgarh', severity: 'minor', priority: 'LOW', status: 'VERIFIED_BY_AUTHORITY', latitude: 21.2358, longitude: 81.6504 },
  { issueId: 'RP-NB-006', roadName: 'GE Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'medium', priority: 'MEDIUM', status: 'REPAIR_IN_PROGRESS', latitude: 21.2522, longitude: 81.6374 },
  { issueId: 'RP-NB-007', roadName: 'VIP Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'medium', priority: 'MEDIUM', status: 'REPAIR_IN_PROGRESS', latitude: 21.2422, longitude: 81.6621 },
  { issueId: 'RP-NB-008', roadName: 'Station Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'medium', priority: 'MEDIUM', status: 'REPAIR_COMPLETED', latitude: 21.2461, longitude: 81.6298 },
  { issueId: 'RP-NB-009', roadName: 'Telibandha Road', district: 'Raipur', state: 'Chhattisgarh', severity: 'medium', priority: 'MEDIUM', status: 'REPAIR_COMPLETED', latitude: 21.2407, longitude: 81.6589 },
  { issueId: 'RP-NB-010', roadName: 'Shankar Nagar', district: 'Raipur', state: 'Chhattisgarh', severity: 'minor', priority: 'LOW', status: 'REPAIR_COMPLETED', latitude: 21.2346, longitude: 81.6481 },
]

export default function CitizenNearbyIssuesPage() {
  const { complaints, mapFocusToken } = useAdminControlCenter()

  const liveNearbyIssues = useMemo<CitizenMapIssue[]>(
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

  const nearbyIssues = liveNearbyIssues.length > 0 ? liveNearbyIssues : DEMO_NEARBY_ISSUES
  const reportedCount = nearbyIssues.filter((item) => !isCompletedStatus(item.status) && item.status !== 'REPAIR_IN_PROGRESS').length
  const inProgressCount = nearbyIssues.filter((item) => item.status === 'REPAIR_IN_PROGRESS').length
  const repairedCount = nearbyIssues.filter((item) => isCompletedStatus(item.status)).length

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Reported Issues</p>
          <p className="mt-1 text-2xl font-extrabold text-red-600">{reportedCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Repair In Progress</p>
          <p className="mt-1 text-2xl font-extrabold text-[#f59e0b]">{inProgressCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Repaired</p>
          <p className="mt-1 text-2xl font-extrabold text-[#16a34a]">{repairedCount}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-bold text-[#0d3b5c]">Nearby Road Issues Map</h2>
        <CitizenIssuesMap center={RAIPUR_CENTER} issues={nearbyIssues} focusToken={mapFocusToken} initialZoom={RAIPUR_ZOOM} />
      </section>
    </div>
  )
}