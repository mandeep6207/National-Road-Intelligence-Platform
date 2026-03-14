'use client'

import type { ComplaintRecord } from '@/components/admin/AdminControlCenterContext'
import GovernanceSatelliteMap, { type GovernanceMapIssue, type GovernanceSeverity } from '@/components/map/GovernanceSatelliteMap'

export type SimulationSeverity = 'critical' | 'medium' | 'minor'

export interface SimulationIssue {
  complaintId: string
  state: string
  roadName: string
  district: string
  pincode: string
  severity: SimulationSeverity
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  latitude: number
  longitude: number
  status: 'REPORTED'
}

interface AdminSimulationMapProps {
  focusCenter: [number, number]
  focusToken: number
  issues: SimulationIssue[]
  complaints?: ComplaintRecord[]
  onViewImage: (complaintId: string) => void
  onGenerateComplaint?: (complaintId: string) => void
}

function mapSeverityFromIssue(issue: SimulationIssue): GovernanceSeverity {
  if (issue.severity === 'critical') return 'critical'
  if (issue.priority === 'HIGH') return 'high'
  if (issue.severity === 'medium') return 'moderate'
  return 'low'
}

export default function AdminSimulationMap({
  focusCenter,
  focusToken,
  issues,
  complaints = [],
  onViewImage,
  onGenerateComplaint,
}: AdminSimulationMapProps) {
  const sourceIssues: GovernanceMapIssue[] = complaints.length > 0
    ? complaints.map((complaint) => ({
        issueId: complaint.complaintId,
        roadName: complaint.roadName,
        district: complaint.district,
        state: complaint.state,
        severity:
          complaint.status === 'CLOSED'
            ? 'safe'
            : complaint.status === 'REPAIR_COMPLETED' || complaint.status === 'VERIFIED_BY_CITIZEN_AUDITOR'
              ? 'repaired'
              : complaint.status === 'ESCALATED'
                ? 'critical'
                : complaint.priority === 'HIGH' || complaint.severity === 'critical'
                  ? 'high'
                  : complaint.severity === 'medium' || complaint.status === 'REPAIR_IN_PROGRESS'
                    ? 'moderate'
                    : 'low',
        priority: complaint.priority,
        status: complaint.status,
        latitude: complaint.latitude,
        longitude: complaint.longitude,
      }))
    : issues.map((issue) => ({
        issueId: issue.complaintId,
        roadName: issue.roadName,
        district: issue.district,
        state: issue.state,
        severity: mapSeverityFromIssue(issue),
        priority: issue.priority,
        status: issue.status,
        latitude: issue.latitude,
        longitude: issue.longitude,
      }))

  const actions = [
    { label: 'View Image', onClick: onViewImage, variant: 'secondary' as const },
    ...(onGenerateComplaint
      ? [{ label: 'Generate Complaint', onClick: onGenerateComplaint, variant: 'primary' as const }]
      : []),
  ]

  return (
    <GovernanceSatelliteMap
      center={focusCenter}
      focusToken={focusToken}
      issues={sourceIssues}
      actions={actions}
      heightClassName="h-[460px]"
    />
  )
}