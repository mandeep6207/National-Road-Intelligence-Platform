'use client'

import type { ComplaintRecord } from '@/components/admin/AdminControlCenterContext'
import GovernanceSatelliteMap, { type GovernanceSeverity } from '@/components/map/GovernanceSatelliteMap'

interface AuditorReviewMapProps {
  center: [number, number]
  complaints: ComplaintRecord[]
  focusToken: number
}

function mapSeverity(complaint: ComplaintRecord): GovernanceSeverity {
  if (complaint.status === 'CLOSED') return 'safe'
  if (complaint.status === 'VERIFIED_BY_CITIZEN_AUDITOR') return 'repaired'
  if (complaint.auditDecision === 'suspicious' || complaint.status === 'ESCALATED') return 'critical'
  if (complaint.auditDecision === 'reopened' || complaint.status === 'REPAIR_COMPLETED') return 'moderate'
  if (complaint.priority === 'HIGH' || complaint.severity === 'critical') return 'high'
  return 'low'
}

export default function AuditorReviewMap({ center, complaints, focusToken }: AuditorReviewMapProps) {
  const mapIssues = complaints.map((complaint) => ({
    issueId: complaint.complaintId,
    roadName: complaint.roadName,
    district: complaint.district,
    state: complaint.state,
    severity: mapSeverity(complaint),
    priority: complaint.priority,
    status: complaint.status,
    latitude: complaint.latitude,
    longitude: complaint.longitude,
  }))

  return (
    <GovernanceSatelliteMap
      center={center}
      focusToken={focusToken}
      issues={mapIssues}
      heightClassName="h-[380px]"
    />
  )
}