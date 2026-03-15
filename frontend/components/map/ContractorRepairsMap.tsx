'use client'

import GovernanceSatelliteMap, { type GovernanceSeverity } from '@/components/map/GovernanceSatelliteMap'
import {
  AUTHORITY_MAP_BOUNDS,
  AUTHORITY_MAP_CENTER,
  type ContractorPortalTask,
} from '@/lib/chhattisgarhContractorPortal'

interface ContractorRepairsMapProps {
  center: [number, number]
  tasks: ContractorPortalTask[]
  focusToken: number
}

function mapSeverity(task: ContractorPortalTask): GovernanceSeverity {
  if (task.status === 'REPAIR_COMPLETED') return 'repaired'
  if (task.severity === 'CRITICAL') return 'critical'
  if (task.severity === 'HIGH') return 'high'
  if (task.severity === 'MEDIUM') return 'moderate'
  return 'low'
}

function mapMarkerStage(task: ContractorPortalTask) {
  if (task.status === 'REPAIR_COMPLETED') return 'completed' as const
  if (task.status === 'WORK_IN_PROGRESS') return 'active' as const
  return 'assigned' as const
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
    markerStage: mapMarkerStage(task),
  }))

  return (
    <GovernanceSatelliteMap
      center={center || AUTHORITY_MAP_CENTER}
      focusToken={focusToken}
      issues={mapIssues}
      heightClassName="h-[360px]"
      initialZoom={7}
      maxBounds={AUTHORITY_MAP_BOUNDS}
      showHeatmap
    />
  )
}