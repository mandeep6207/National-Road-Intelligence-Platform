'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import DetectedRoadIssuesSection from '@/components/government/DetectedRoadIssuesSection'
import type { GovernmentWorkflowMapComplaint } from '@/components/map/GovernmentWorkflowMap'
import {
  AUTHORITY_MAP_BOUNDS,
  AUTHORITY_MAP_CENTER,
  AUTHORITY_STATE,
  getCgReportsUpdateEventName,
  loadChhattisgarhReports,
  type ChhattisgarhPotholeReport,
} from '@/lib/chhattisgarhAuthorityData'

const GovernmentWorkflowMap = dynamic(() => import('@/components/map/GovernmentWorkflowMap'), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
})

type AuthorityMapStatus =
  | 'ASSIGNED_TO_AUTHORITY'
  | 'VERIFIED_BY_AUTHORITY'
  | 'ASSIGNED_TO_CONTRACTOR'
  | 'REPAIR_IN_PROGRESS'
  | 'REPAIR_COMPLETED'
  | 'VERIFIED_BY_CITIZEN_AUDITOR'
  | 'ESCALATED'
  | 'CLOSED'

function toMapStatus(value?: string): AuthorityMapStatus {
  if (value === 'ASSIGNED_TO_CONTRACTOR') return 'ASSIGNED_TO_CONTRACTOR'
  if (value === 'REPAIR_COMPLETED') return 'REPAIR_COMPLETED'
  return 'ASSIGNED_TO_AUTHORITY'
}

function toPriority(severity: ChhattisgarhPotholeReport['severity']) {
  if (severity === 'HIGH') return 'HIGH'
  if (severity === 'MEDIUM') return 'MEDIUM'
  return 'LOW'
}

function toMapSeverity(severity: ChhattisgarhPotholeReport['severity']): GovernmentWorkflowMapComplaint['severity'] {
  if (severity === 'HIGH') return 'critical'
  if (severity === 'MEDIUM') return 'medium'
  return 'minor'
}

export default function GovernmentDashboardPage() {
  const [reports, setReports] = useState<ChhattisgarhPotholeReport[]>([])

  useEffect(() => {
    const refresh = () => {
      setReports(loadChhattisgarhReports())
    }

    refresh()
    window.addEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
    return () => {
      window.removeEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
    }
  }, [])

  const mapIssues = useMemo<GovernmentWorkflowMapComplaint[]>(
    () =>
      reports.map((report) => ({
        complaintId: report.complaint_id,
        roadName: report.road_name,
        district: report.district,
        state: report.state,
        severity: toMapSeverity(report.severity),
        priority: toPriority(report.severity),
        status: toMapStatus(report.status),
        latitude: report.latitude,
        longitude: report.longitude,
      })),
    [reports]
  )

  const activePotholes = useMemo(
    () => reports.filter((report) => report.status === 'ASSIGNED_TO_AUTHORITY').length,
    [reports]
  )

  const assignedRepairs = useMemo(
    () => reports.filter((report) => report.status === 'ASSIGNED_TO_CONTRACTOR').length,
    [reports]
  )

  const completedRepairs = useMemo(
    () => reports.filter((report) => report.status === 'REPAIR_COMPLETED').length,
    [reports]
  )

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">State</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{AUTHORITY_STATE}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Active Potholes</p>
          <p className="mt-1 text-2xl font-extrabold text-[#dc2626]">{activePotholes}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Assigned Repair</p>
          <p className="mt-1 text-2xl font-extrabold text-[#f59e0b]">{assignedRepairs}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Completed Repair</p>
          <p className="mt-1 text-2xl font-extrabold text-[#16a34a]">{completedRepairs}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Module 1</p>
            <h2 className="text-base font-bold text-[#0d3b5c]">District Monitoring Map</h2>
            <p className="mt-1 text-sm text-slate-600">Chhattisgarh-only monitoring map with status markers and pothole density heatmap.</p>
          </div>
        </div>

        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          Marker Stages: <span className="font-semibold text-red-600">Red Active Pothole</span> | <span className="font-semibold text-orange-600">Orange Assigned Repair</span> | <span className="font-semibold text-green-700">Green Completed Repair</span>
        </div>

        <GovernmentWorkflowMap
          center={AUTHORITY_MAP_CENTER}
          focusToken={1}
          complaints={mapIssues}
          onViewImage={() => {}}
          zoom={7}
          showHeatmap
          maxBounds={AUTHORITY_MAP_BOUNDS}
        />
      </section>

      <DetectedRoadIssuesSection
        selectedState={AUTHORITY_STATE}
        sectionLabel="Module 2"
        title="Detected Road Issues"
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Module 3</p>
            <h2 className="text-lg font-bold text-[#0d3b5c]">Contractor Management System</h2>
            <p className="mt-1 text-sm text-slate-600">Assign complaints and monitor contractor performance for Chhattisgarh.</p>
          </div>
          <Link
            href="/dashboard/government/contractor-management"
            className="rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a]"
          >
            Open Contractor Management
          </Link>
        </div>
      </section>
    </div>
  )
}
