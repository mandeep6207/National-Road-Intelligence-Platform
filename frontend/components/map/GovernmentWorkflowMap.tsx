'use client'

import GovernanceSatelliteMap, { type GovernanceSeverity } from '@/components/map/GovernanceSatelliteMap'

export interface GovernmentWorkflowMapComplaint {
  complaintId: string
  roadName: string
  district: string
  state: string
  severity: 'critical' | 'medium' | 'minor'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  status:
    | 'ASSIGNED_TO_AUTHORITY'
    | 'VERIFIED_BY_AUTHORITY'
    | 'ASSIGNED_TO_CONTRACTOR'
    | 'REPAIR_IN_PROGRESS'
    | 'REPAIR_COMPLETED'
    | 'VERIFIED_BY_CITIZEN_AUDITOR'
    | 'ESCALATED'
    | 'CLOSED'
  latitude: number
  longitude: number
  auditDecision?: 'pending' | 'verified' | 'suspicious' | 'reopened'
}

interface GovernmentWorkflowMapProps {
  center: [number, number]
  complaints: GovernmentWorkflowMapComplaint[]
  focusToken: number
  onViewImage: (complaintId: string) => void
  zoom?: number
  showHeatmap?: boolean
  maxBounds?: [[number, number], [number, number]]
}

function mapSeverity(complaint: GovernmentWorkflowMapComplaint): GovernanceSeverity {
  if (complaint.status === 'CLOSED') return 'safe'
  if (complaint.status === 'REPAIR_COMPLETED' || complaint.status === 'VERIFIED_BY_CITIZEN_AUDITOR') return 'repaired'
  if (complaint.status === 'ESCALATED' || complaint.auditDecision === 'suspicious') return 'critical'
  if (complaint.priority === 'HIGH' || complaint.severity === 'critical') return 'high'
  if (complaint.status === 'REPAIR_IN_PROGRESS' || complaint.severity === 'medium') return 'moderate'
  return 'low'
}

function mapMarkerStage(complaint: GovernmentWorkflowMapComplaint): 'active' | 'assigned' | 'completed' {
  if (
    complaint.status === 'REPAIR_COMPLETED' ||
    complaint.status === 'VERIFIED_BY_CITIZEN_AUDITOR' ||
    complaint.status === 'CLOSED'
  ) {
    return 'completed'
  }

  if (
    complaint.status === 'VERIFIED_BY_AUTHORITY' ||
    complaint.status === 'ASSIGNED_TO_CONTRACTOR' ||
    complaint.status === 'REPAIR_IN_PROGRESS'
  ) {
    return 'assigned'
  }

  return 'active'
}

export default function GovernmentWorkflowMap({
  center,
  complaints,
  focusToken,
  onViewImage,
  zoom = 7,
  showHeatmap = false,
  maxBounds,
}: GovernmentWorkflowMapProps) {
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
    markerStage: mapMarkerStage(complaint),
  }))

  return (
    <GovernanceSatelliteMap
      center={center}
      focusToken={focusToken}
      issues={mapIssues}
      actions={[{ label: 'View Image', onClick: onViewImage, variant: 'primary' }]}
      heightClassName="h-[420px]"
      initialZoom={zoom}
      maxBounds={maxBounds}
      showHeatmap={showHeatmap}
    />
  )
}
