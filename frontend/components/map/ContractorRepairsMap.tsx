'use client'

import type { ComplaintRecord } from '@/components/admin/AdminControlCenterContext'
import GovernanceSatelliteMap, { type GovernanceSeverity } from '@/components/map/GovernanceSatelliteMap'

interface ContractorRepairsMapProps {
  center: [number, number]
  tasks: ComplaintRecord[]
  focusToken: number
}

function mapSeverity(task: ComplaintRecord): GovernanceSeverity {
  if (task.status === 'CLOSED') return 'safe'
  if (task.status === 'REPAIR_COMPLETED' || task.status === 'VERIFIED_BY_CITIZEN_AUDITOR') return 'repaired'
  if (task.status === 'ESCALATED' || task.auditDecision === 'suspicious') return 'critical'
  if (task.severity === 'critical' || task.priority === 'HIGH') return 'high'
  if (task.status === 'REPAIR_IN_PROGRESS' || task.severity === 'medium') return 'moderate'
  return 'low'
}

export default function ContractorRepairsMap({ center, tasks, focusToken }: ContractorRepairsMapProps) {
  const mapIssues = tasks.map((task) => ({
    issueId: task.complaintId,
    roadName: task.roadName,
    district: task.district,
    state: task.state,
    severity: mapSeverity(task),
    priority: task.priority,
    status: task.status,
    latitude: task.latitude,
    longitude: task.longitude,
  }))

  return (
    <GovernanceSatelliteMap
      center={center}
      focusToken={focusToken}
      issues={mapIssues}
      heightClassName="h-[360px]"
    />
  )
}