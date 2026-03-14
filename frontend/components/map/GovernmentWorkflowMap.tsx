'use client'

import type { ComplaintRecord } from '@/components/admin/AdminControlCenterContext'
import GovernanceSatelliteMap, { type GovernanceSeverity } from '@/components/map/GovernanceSatelliteMap'

interface GovernmentWorkflowMapProps {
  center: [number, number]
  complaints: ComplaintRecord[]
  focusToken: number
  onViewImage: (complaintId: string) => void
}

function mapSeverity(complaint: ComplaintRecord): GovernanceSeverity {
  if (complaint.status === 'CLOSED') return 'safe'
  if (complaint.status === 'REPAIR_COMPLETED' || complaint.status === 'VERIFIED_BY_CITIZEN_AUDITOR') return 'repaired'
  if (complaint.status === 'ESCALATED' || complaint.auditDecision === 'suspicious') return 'critical'
  if (complaint.priority === 'HIGH' || complaint.severity === 'critical') return 'high'
  if (complaint.status === 'REPAIR_IN_PROGRESS' || complaint.severity === 'medium') return 'moderate'
  return 'low'
}

export default function GovernmentWorkflowMap({ center, complaints, focusToken, onViewImage }: GovernmentWorkflowMapProps) {
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
      actions={[{ label: 'View Image', onClick: onViewImage, variant: 'primary' }]}
      heightClassName="h-[420px]"
    />
  )
}
