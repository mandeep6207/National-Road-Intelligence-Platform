'use client'

import GovernanceSatelliteMap, { type GovernanceSeverity } from '@/components/map/GovernanceSatelliteMap'

export interface CitizenMapIssue {
  issueId: string
  roadName: string
  district: string
  state: string
  severity?: string
  priority?: string
  status: string
  latitude: number
  longitude: number
  auditDecision?: string
}

interface CitizenIssuesMapProps {
  center: [number, number]
  issues: CitizenMapIssue[]
  focusToken: number
  initialZoom?: number
}

function mapSeverity(issue: CitizenMapIssue): GovernanceSeverity {
  if (issue.status === 'CLOSED') return 'safe'
  if (issue.status === 'REPAIR_COMPLETED' || issue.status === 'VERIFIED_BY_CITIZEN_AUDITOR') return 'repaired'
  if (issue.status === 'ESCALATED' || issue.auditDecision === 'suspicious') return 'critical'
  if (issue.priority === 'HIGH' || issue.severity === 'critical') return 'high'
  if (issue.status === 'REPAIR_IN_PROGRESS' || issue.severity === 'medium') return 'moderate'
  return 'low'
}

export default function CitizenIssuesMap({ center, issues, focusToken, initialZoom = 7 }: CitizenIssuesMapProps) {
  const mapIssues = issues.map((issue) => ({
    issueId: issue.issueId,
    roadName: issue.roadName,
    district: issue.district,
    state: issue.state,
    severity: mapSeverity(issue),
    priority: issue.priority || 'LOW',
    status: issue.status,
    latitude: issue.latitude,
    longitude: issue.longitude,
  }))

  return (
    <GovernanceSatelliteMap
      center={center}
      focusToken={focusToken}
      issues={mapIssues}
      heightClassName="h-[400px]"
      initialZoom={initialZoom}
      severityColors={{
        critical: '#dc2626',
        high: '#f97316',
        moderate: '#facc15',
        low: '#fde68a',
        safe: '#fde68a',
        repaired: '#16a34a',
      }}
    />
  )
}