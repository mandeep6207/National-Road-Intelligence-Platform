export const AUTHORITY_STATE = 'Chhattisgarh'
export const AUTHORITY_MAP_CENTER: [number, number] = [21.2787, 81.8661]
export const AUTHORITY_MAP_BOUNDS: [[number, number], [number, number]] = [
  [17.8, 79.2],
  [24.6, 84.7],
]

export const AUTHORITY_CONTRACTORS_BY_DISTRICT: Record<string, string[]> = {
  Raipur: ['Raipur RoadWorks Ltd', 'Durg Infrastructure Services'],
  Bilaspur: ['Bilaspur Highway Repairs', 'Raipur RoadWorks Ltd'],
  Durg: ['Durg Infrastructure Services', 'Raipur RoadWorks Ltd'],
  Korba: ['Korba Civil Engineering', 'Bilaspur Highway Repairs'],
  Jagdalpur: ['Korba Civil Engineering', 'Bilaspur Highway Repairs'],
}

export type CgReportStatus =
  | 'ASSIGNED_TO_AUTHORITY'
  | 'ASSIGNED_TO_CONTRACTOR'
  | 'REPAIR_COMPLETED'

export interface ChhattisgarhPotholeReport {
  id: string
  complaint_id: string
  type: 'pothole'
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  risk_score: number
  latitude: number
  longitude: number
  state: string
  district: string
  road_name: string
  timestamp: string
  status: CgReportStatus
  source: 'satellite'
  image: string
  contractor_name?: string
}

const STORAGE_KEY = 'nrip_cg_authority_reports_v1'
const ASSIGNMENT_OVERRIDE_STORAGE_KEY = 'nrip_cg_assignment_overrides_v1'
const CONTRACTOR_QUEUE_STORAGE_KEY = 'nrip_cg_contractor_queue_v1'
const CONTRACTOR_ASSIGNMENT_RESULTS_STORAGE_KEY = 'nrip_cg_contractor_assignment_results_v1'
const UPDATE_EVENT_NAME = 'nrip-cg-reports-updated'

interface AssignmentOverride {
  status: 'ASSIGNED_TO_CONTRACTOR'
  contractor_name: string
}

export type ContractorRepairStatus = 'ASSIGNED_TO_CONTRACTOR' | 'WORK_IN_PROGRESS' | 'REPAIR_COMPLETED'

export interface ChhattisgarhQueueComplaint {
  id: string
  road: string
  district: 'Raipur' | 'Bilaspur' | 'Durg' | 'Jagdalpur' | 'Korba'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'ASSIGNED_TO_AUTHORITY' | 'ESCALATED' | ContractorRepairStatus
  contractor?: string
  deadline?: string
}

export interface ChhattisgarhAssignmentResult {
  complaint_id: string
  contractor: string
  district: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  deadline: string
  status: ContractorRepairStatus
}

export interface ChhattisgarhContractorPerformance {
  contractor: string
  assigned_jobs: number
  completed_jobs: number
  delayed_jobs: number
  trust_score: number
  average_repair_time_hours: number
}

const now = Date.now()

const SEED_REPORTS: ChhattisgarhPotholeReport[] = [
  {
    id: 'CMP-CG-001', complaint_id: 'CMP-CG-001', type: 'pothole', severity: 'HIGH', risk_score: 92,
    latitude: 21.251, longitude: 81.629, state: AUTHORITY_STATE, district: 'Raipur', road_name: 'GE Road',
    timestamp: new Date(now - 13 * 60 * 60 * 1000).toISOString(), status: 'ASSIGNED_TO_AUTHORITY', source: 'satellite', image: '/potholes/pot 1.jpg',
  },
  {
    id: 'CMP-CG-002', complaint_id: 'CMP-CG-002', type: 'pothole', severity: 'MEDIUM', risk_score: 75,
    latitude: 22.0797, longitude: 82.1391, state: AUTHORITY_STATE, district: 'Bilaspur', road_name: 'Link Road',
    timestamp: new Date(now - 12 * 60 * 60 * 1000).toISOString(), status: 'ASSIGNED_TO_AUTHORITY', source: 'satellite', image: '/potholes/pot 2.jpg',
  },
  {
    id: 'CMP-CG-003', complaint_id: 'CMP-CG-003', type: 'pothole', severity: 'HIGH', risk_score: 89,
    latitude: 21.1904, longitude: 81.2849, state: AUTHORITY_STATE, district: 'Durg', road_name: 'Station Road',
    timestamp: new Date(now - 11 * 60 * 60 * 1000).toISOString(), status: 'ASSIGNED_TO_AUTHORITY', source: 'satellite', image: '/potholes/pot 3.jpg',
  },
  {
    id: 'CMP-CG-004', complaint_id: 'CMP-CG-004', type: 'pothole', severity: 'LOW', risk_score: 48,
    latitude: 22.3595, longitude: 82.7501, state: AUTHORITY_STATE, district: 'Korba', road_name: 'Kosabadi Road',
    timestamp: new Date(now - 10 * 60 * 60 * 1000).toISOString(), status: 'ASSIGNED_TO_AUTHORITY', source: 'satellite', image: '/potholes/pot 4.jpg',
  },
  {
    id: 'CMP-CG-005', complaint_id: 'CMP-CG-005', type: 'pothole', severity: 'HIGH', risk_score: 96,
    latitude: 19.0748, longitude: 82.008, state: AUTHORITY_STATE, district: 'Jagdalpur', road_name: 'NH 30 Junction',
    timestamp: new Date(now - 9 * 60 * 60 * 1000).toISOString(), status: 'ASSIGNED_TO_AUTHORITY', source: 'satellite', image: '/potholes/pot 5.jpg',
  },
  {
    id: 'CMP-CG-006', complaint_id: 'CMP-CG-006', type: 'pothole', severity: 'MEDIUM', risk_score: 68,
    latitude: 21.2681, longitude: 81.6652, state: AUTHORITY_STATE, district: 'Raipur', road_name: 'VIP Road',
    timestamp: new Date(now - 8 * 60 * 60 * 1000).toISOString(), status: 'ASSIGNED_TO_CONTRACTOR', source: 'satellite', image: '/potholes/pot 6.jpg', contractor_name: 'Raipur RoadWorks Ltd',
  },
  {
    id: 'CMP-CG-007', complaint_id: 'CMP-CG-007', type: 'pothole', severity: 'LOW', risk_score: 43,
    latitude: 22.1064, longitude: 82.1669, state: AUTHORITY_STATE, district: 'Bilaspur', road_name: 'CMD Road',
    timestamp: new Date(now - 7 * 60 * 60 * 1000).toISOString(), status: 'REPAIR_COMPLETED', source: 'satellite', image: '/potholes/pot 7.jpg', contractor_name: 'Bilaspur Highway Repairs',
  },
  {
    id: 'CMP-CG-008', complaint_id: 'CMP-CG-008', type: 'pothole', severity: 'HIGH', risk_score: 90,
    latitude: 21.2097, longitude: 81.3393, state: AUTHORITY_STATE, district: 'Durg', road_name: 'Padmanabhpur Road',
    timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(), status: 'ASSIGNED_TO_AUTHORITY', source: 'satellite', image: '/potholes/pot 8.jpg',
  },
  {
    id: 'CMP-CG-009', complaint_id: 'CMP-CG-009', type: 'pothole', severity: 'MEDIUM', risk_score: 64,
    latitude: 22.3562, longitude: 82.7044, state: AUTHORITY_STATE, district: 'Korba', road_name: 'Transport Nagar Road',
    timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(), status: 'ASSIGNED_TO_CONTRACTOR', source: 'satellite', image: '/potholes/pot 9.jpg', contractor_name: 'Korba Civil Engineering',
  },
  {
    id: 'CMP-CG-010', complaint_id: 'CMP-CG-010', type: 'pothole', severity: 'HIGH', risk_score: 93,
    latitude: 19.0942, longitude: 82.0336, state: AUTHORITY_STATE, district: 'Jagdalpur', road_name: 'Geedam Road',
    timestamp: new Date(now - 4 * 60 * 60 * 1000).toISOString(), status: 'ASSIGNED_TO_AUTHORITY', source: 'satellite', image: '/potholes/pot 10.jpg',
  },
  {
    id: 'CMP-CG-011', complaint_id: 'CMP-CG-011', type: 'pothole', severity: 'LOW', risk_score: 39,
    latitude: 21.2367, longitude: 81.6012, state: AUTHORITY_STATE, district: 'Raipur', road_name: 'Ring Road Segment',
    timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(), status: 'REPAIR_COMPLETED', source: 'satellite', image: '/potholes/pot 11.jpg', contractor_name: 'Raipur RoadWorks Ltd',
  },
  {
    id: 'CMP-CG-012', complaint_id: 'CMP-CG-012', type: 'pothole', severity: 'MEDIUM', risk_score: 70,
    latitude: 22.1244, longitude: 82.1184, state: AUTHORITY_STATE, district: 'Bilaspur', road_name: 'Seepat Road',
    timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(), status: 'ASSIGNED_TO_AUTHORITY', source: 'satellite', image: '/potholes/pot 12.jpg',
  },
  {
    id: 'CMP-CG-013', complaint_id: 'CMP-CG-013', type: 'pothole', severity: 'HIGH', risk_score: 95,
    latitude: 21.1821, longitude: 81.3157, state: AUTHORITY_STATE, district: 'Durg', road_name: 'Ganjpara Road',
    timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString(), status: 'ASSIGNED_TO_AUTHORITY', source: 'satellite', image: '/potholes/pot 13.jpg',
  },
]

const CONTRACTOR_QUEUE_SEED: ChhattisgarhQueueComplaint[] = [
  {
    id: 'CMP-CG-201',
    road: 'GE Road',
    district: 'Raipur',
    severity: 'HIGH',
    priority: 'HIGH',
    status: 'ASSIGNED_TO_AUTHORITY',
  },
  {
    id: 'CMP-CG-202',
    road: 'Station Road',
    district: 'Bilaspur',
    severity: 'MEDIUM',
    priority: 'MEDIUM',
    status: 'ASSIGNED_TO_AUTHORITY',
  },
  {
    id: 'CMP-CG-203',
    road: 'Durg Bypass',
    district: 'Durg',
    severity: 'CRITICAL',
    priority: 'HIGH',
    status: 'ESCALATED',
  },
  {
    id: 'CMP-CG-204',
    road: 'Jagdalpur Main Road',
    district: 'Jagdalpur',
    severity: 'MEDIUM',
    priority: 'MEDIUM',
    status: 'ASSIGNED_TO_AUTHORITY',
  },
  {
    id: 'CMP-CG-205',
    road: 'Korba Highway',
    district: 'Korba',
    severity: 'LOW',
    priority: 'LOW',
    status: 'ASSIGNED_TO_AUTHORITY',
  },
]

const CONTRACTOR_PERFORMANCE_SEED: ChhattisgarhContractorPerformance[] = [
  {
    contractor: 'Raipur RoadWorks Ltd',
    assigned_jobs: 6,
    completed_jobs: 4,
    delayed_jobs: 1,
    trust_score: 87,
    average_repair_time_hours: 18.5,
  },
  {
    contractor: 'Bilaspur Highway Repairs',
    assigned_jobs: 5,
    completed_jobs: 3,
    delayed_jobs: 1,
    trust_score: 82,
    average_repair_time_hours: 21.2,
  },
  {
    contractor: 'Durg Infrastructure Services',
    assigned_jobs: 4,
    completed_jobs: 3,
    delayed_jobs: 0,
    trust_score: 90,
    average_repair_time_hours: 16.8,
  },
  {
    contractor: 'Korba Civil Engineering',
    assigned_jobs: 3,
    completed_jobs: 2,
    delayed_jobs: 0,
    trust_score: 85,
    average_repair_time_hours: 19.4,
  },
]

function notifyUpdate() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT_NAME))
}

export function getCgReportsUpdateEventName() {
  return UPDATE_EVENT_NAME
}

export function getSeedChhattisgarhReports(): ChhattisgarhPotholeReport[] {
  return SEED_REPORTS.map((report) => ({ ...report }))
}

export function loadChhattisgarhReports(): ChhattisgarhPotholeReport[] {
  if (typeof window === 'undefined') return getSeedChhattisgarhReports()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return getSeedChhattisgarhReports()
    const parsed = JSON.parse(raw) as ChhattisgarhPotholeReport[]
    if (!Array.isArray(parsed) || parsed.length === 0) return getSeedChhattisgarhReports()
    return parsed.filter((item) => item.state === AUTHORITY_STATE)
  } catch {
    return getSeedChhattisgarhReports()
  }
}

export function saveChhattisgarhReports(reports: ChhattisgarhPotholeReport[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
  notifyUpdate()
}

function loadAssignmentOverrides(): Record<string, AssignmentOverride> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(ASSIGNMENT_OVERRIDE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, AssignmentOverride>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveAssignmentOverrides(payload: Record<string, AssignmentOverride>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ASSIGNMENT_OVERRIDE_STORAGE_KEY, JSON.stringify(payload))
  notifyUpdate()
}

function formatDeadline(daysFromNow: number) {
  const value = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
  const day = String(value.getDate()).padStart(2, '0')
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const year = value.getFullYear()
  return `${day}-${month}-${year}`
}

export function resetChhattisgarhReports() {
  saveChhattisgarhReports(getSeedChhattisgarhReports())
}

export function getSeedContractorQueue(): ChhattisgarhQueueComplaint[] {
  return CONTRACTOR_QUEUE_SEED.map((item) => ({ ...item }))
}

export function loadContractorQueue(): ChhattisgarhQueueComplaint[] {
  if (typeof window === 'undefined') return getSeedContractorQueue()

  try {
    const raw = window.localStorage.getItem(CONTRACTOR_QUEUE_STORAGE_KEY)
    if (!raw) return getSeedContractorQueue()
    const parsed = JSON.parse(raw) as ChhattisgarhQueueComplaint[]
    if (!Array.isArray(parsed) || parsed.length === 0) return getSeedContractorQueue()
    return parsed
  } catch {
    return getSeedContractorQueue()
  }
}

export function saveContractorQueue(queue: ChhattisgarhQueueComplaint[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CONTRACTOR_QUEUE_STORAGE_KEY, JSON.stringify(queue))
  notifyUpdate()
}

export function loadContractorAssignmentResults(): ChhattisgarhAssignmentResult[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(CONTRACTOR_ASSIGNMENT_RESULTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChhattisgarhAssignmentResult[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveContractorAssignmentResults(results: ChhattisgarhAssignmentResult[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CONTRACTOR_ASSIGNMENT_RESULTS_STORAGE_KEY, JSON.stringify(results))
  notifyUpdate()
}

export function getSeedContractorPerformance(): ChhattisgarhContractorPerformance[] {
  return CONTRACTOR_PERFORMANCE_SEED.map((item) => ({ ...item }))
}

export function assignQueueComplaintsToContractors(): ChhattisgarhAssignmentResult[] {
  const queue = loadContractorQueue()
  const assignmentMap: Record<string, { contractor: string; deadline: string }> = {
    'CMP-CG-201': { contractor: 'Raipur RoadWorks Ltd', deadline: '18-03-2026' },
    'CMP-CG-202': { contractor: 'Bilaspur Highway Repairs', deadline: '19-03-2026' },
    'CMP-CG-203': { contractor: 'Durg Infrastructure Services', deadline: '17-03-2026' },
    'CMP-CG-204': { contractor: 'Korba Civil Engineering', deadline: '19-03-2026' },
    'CMP-CG-205': { contractor: 'Korba Civil Engineering', deadline: '20-03-2026' },
  }

  const nextQueue = queue.map((item) => {
    const assigned = assignmentMap[item.id]
    if (!assigned) return item
    return {
      ...item,
      contractor: assigned.contractor,
      deadline: assigned.deadline,
      status: 'ASSIGNED_TO_CONTRACTOR' as const,
    }
  })

  const results: ChhattisgarhAssignmentResult[] = nextQueue.map((item) => ({
    complaint_id: item.id,
    contractor: item.contractor || assignmentMap[item.id]?.contractor || 'Raipur RoadWorks Ltd',
    district: item.district,
    severity: item.severity,
    deadline: item.deadline || assignmentMap[item.id]?.deadline || formatDeadline(3),
    status: 'ASSIGNED_TO_CONTRACTOR',
  }))

  saveContractorQueue(nextQueue)
  saveContractorAssignmentResults(results)
  return results
}

export function resetContractorManagementDemoData() {
  saveContractorQueue(getSeedContractorQueue())
  saveContractorAssignmentResults([])
}

export function assignChhattisgarhReportToContractor(
  reportId: string,
  contractorName: string
): ChhattisgarhPotholeReport[] {
  const next = loadChhattisgarhReports().map((report) =>
    report.complaint_id === reportId || report.id === reportId
      ? {
          ...report,
          contractor_name: contractorName,
          status: 'ASSIGNED_TO_CONTRACTOR' as CgReportStatus,
        }
      : report
  )
  saveChhattisgarhReports(next)
  return next
}

export function assignCitizenReportToContractor(reportId: string, contractorName: string) {
  const next = {
    ...loadAssignmentOverrides(),
    [reportId]: {
      status: 'ASSIGNED_TO_CONTRACTOR' as const,
      contractor_name: contractorName,
    },
  }
  saveAssignmentOverrides(next)
}

export function applyAssignmentOverridesToReports<
  T extends { id: string; complaint_id?: string; status?: string }
>(reports: T[]): T[] {
  const overrides = loadAssignmentOverrides()
  return reports.map((report) => {
    const key = report.complaint_id || report.id
    const override = overrides[key]
    if (!override) return report
    return {
      ...report,
      status: override.status,
    }
  })
}

export function getContractorsForDistrict(district: string): string[] {
  return AUTHORITY_CONTRACTORS_BY_DISTRICT[district] || [
    'Raipur RoadWorks Ltd',
    'Durg Infrastructure Services',
    'Bilaspur Highway Repairs',
    'Korba Civil Engineering',
  ]
}
