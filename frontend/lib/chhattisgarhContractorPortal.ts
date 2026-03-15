import {
  AUTHORITY_MAP_BOUNDS,
  AUTHORITY_MAP_CENTER,
  AUTHORITY_STATE,
  getCgReportsUpdateEventName,
  getSeedContractorPerformance,
  loadChhattisgarhReports,
  loadContractorAssignmentResults,
  loadContractorQueue,
  saveChhattisgarhReports,
  saveContractorAssignmentResults,
  saveContractorQueue,
  type ChhattisgarhPotholeReport,
  type ChhattisgarhQueueComplaint,
  type ContractorRepairStatus,
} from '@/lib/chhattisgarhAuthorityData'

const CONTRACTOR_TASKS_STORAGE_KEY = 'nrip_cg_contractor_portal_tasks_v1'
const CONTRACTOR_NOTIFICATIONS_STORAGE_KEY = 'nrip_cg_contractor_notifications_v1'
const DEFAULT_CONTRACTOR_NAME = 'Raipur RoadWorks Ltd'

const DISTRICT_COORDINATES: Record<string, [number, number]> = {
  Raipur: [21.251, 81.629],
  Bilaspur: [22.0797, 82.1391],
  Durg: [21.1904, 81.2849],
  Korba: [22.3595, 82.7501],
  Jagdalpur: [19.0748, 82.008],
}

export { AUTHORITY_MAP_BOUNDS, AUTHORITY_MAP_CENTER, AUTHORITY_STATE }

export interface ContractorPortalTask {
  complaintId: string
  roadName: string
  district: string
  state: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  repairDeadline: string
  status: ContractorRepairStatus
  contractorName: string
  latitude: number
  longitude: number
  progressPercentage: number
  assignedAt: string
  startedAt?: string
  completedAt?: string
  beforeRepairImageName?: string
  afterRepairImageName?: string
  repairNotes?: string
  trustScore: number
}

export interface ContractorPortalNotification {
  id: string
  contractorName: string
  title: string
  message: string
  district: string
  assignmentCount: number
  createdAt: string
  unread: boolean
}

export interface ContractorPortalSummary {
  assignedToday: number
  pendingRepairs: number
  workInProgress: number
  completedRepairs: number
  totalJobsAssigned: number
  jobsCompleted: number
  pendingJobs: number
  averageRepairTimeDays: number
  completionRate: number
}

export interface ContractorPortalSnapshot {
  contractorName: string
  region: string
  trustScore: number
  tasks: ContractorPortalTask[]
  notifications: ContractorPortalNotification[]
  summary: ContractorPortalSummary
}

interface ContractorIdentity {
  contractorName: string
  region: string
  trustScore: number
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function notifyPortalUpdate() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(getCgReportsUpdateEventName()))
}

function getContractorLookup() {
  return new Map(getSeedContractorPerformance().map((item) => [item.contractor.toLowerCase(), item]))
}

function normaliseContractorName(name: string | null | undefined) {
  return (name || '').trim().toLowerCase()
}

function readUserName() {
  if (typeof window === 'undefined') return ''

  try {
    const raw = window.localStorage.getItem('nrip_user')
    if (!raw) return ''
    const parsed = JSON.parse(raw) as { name?: string }
    return parsed.name || ''
  } catch {
    return ''
  }
}

function getTrustScore(contractorName: string) {
  const performance = getContractorLookup().get(normaliseContractorName(contractorName))
  return performance?.trust_score ?? 0
}

function inferPriorityFromSeverity(severity: ContractorPortalTask['severity']) {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'HIGH'
  if (severity === 'MEDIUM') return 'MEDIUM'
  return 'LOW'
}

function defaultProgressForStatus(status: ContractorRepairStatus) {
  if (status === 'REPAIR_COMPLETED') return 100
  if (status === 'WORK_IN_PROGRESS') return 60
  return 0
}

function districtCoordinates(district: string) {
  return DISTRICT_COORDINATES[district] || AUTHORITY_MAP_CENTER
}

function formatDate(value: Date) {
  const day = String(value.getDate()).padStart(2, '0')
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const year = value.getFullYear()
  return `${day}-${month}-${year}`
}

function addDays(days: number) {
  const value = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return formatDate(value)
}

function asTimestamp(value: string | undefined) {
  if (!value) return Number.NaN
  return new Date(value).getTime()
}

function completedDurationDays(task: ContractorPortalTask) {
  if (!task.completedAt) return null
  const end = asTimestamp(task.completedAt)
  const start = asTimestamp(task.startedAt || task.assignedAt)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return (end - start) / (1000 * 60 * 60 * 24)
}

function loadStoredTasks() {
  return readStorage<ContractorPortalTask[]>(CONTRACTOR_TASKS_STORAGE_KEY, [])
}

function loadStoredNotifications() {
  return readStorage<ContractorPortalNotification[]>(CONTRACTOR_NOTIFICATIONS_STORAGE_KEY, [])
}

function savePortalState(tasks: ContractorPortalTask[], notifications: ContractorPortalNotification[]) {
  writeStorage(CONTRACTOR_TASKS_STORAGE_KEY, tasks)
  writeStorage(CONTRACTOR_NOTIFICATIONS_STORAGE_KEY, notifications)
}

function mergeTask(base: ContractorPortalTask, existing?: ContractorPortalTask): ContractorPortalTask {
  const completed = base.status === 'REPAIR_COMPLETED' || existing?.status === 'REPAIR_COMPLETED'
  const status = completed
    ? 'REPAIR_COMPLETED'
    : existing?.status === 'WORK_IN_PROGRESS'
      ? 'WORK_IN_PROGRESS'
      : base.status

  return {
    ...base,
    status,
    progressPercentage: completed
      ? 100
      : Math.max(existing?.progressPercentage ?? 0, defaultProgressForStatus(status)),
    assignedAt: existing?.assignedAt || base.assignedAt,
    startedAt: existing?.startedAt,
    completedAt: completed ? existing?.completedAt || base.completedAt : undefined,
    beforeRepairImageName: existing?.beforeRepairImageName,
    afterRepairImageName: existing?.afterRepairImageName,
    repairNotes: existing?.repairNotes,
  }
}

function taskFromQueueAssignment(
  complaint: ChhattisgarhQueueComplaint | undefined,
  contractorName: string,
  complaintId: string,
  status: ContractorRepairStatus,
  deadline: string
): ContractorPortalTask {
  const [latitude, longitude] = districtCoordinates(complaint?.district || 'Raipur')
  return {
    complaintId,
    roadName: complaint?.road || 'Priority Road Segment',
    district: complaint?.district || 'Raipur',
    state: AUTHORITY_STATE,
    severity: complaint?.severity || 'HIGH',
    priority: complaint?.priority || inferPriorityFromSeverity(complaint?.severity || 'HIGH'),
    repairDeadline: deadline || addDays(2),
    status,
    contractorName,
    latitude,
    longitude,
    progressPercentage: defaultProgressForStatus(status),
    assignedAt: new Date().toISOString(),
    trustScore: getTrustScore(contractorName),
  }
}

function taskFromReport(report: ChhattisgarhPotholeReport): ContractorPortalTask {
  const status: ContractorRepairStatus = report.status === 'REPAIR_COMPLETED'
    ? 'REPAIR_COMPLETED'
    : 'ASSIGNED_TO_CONTRACTOR'

  return {
    complaintId: report.complaint_id,
    roadName: report.road_name,
    district: report.district,
    state: report.state,
    severity: report.severity,
    priority: inferPriorityFromSeverity(report.severity),
    repairDeadline: addDays(report.status === 'REPAIR_COMPLETED' ? -1 : 2),
    status,
    contractorName: report.contractor_name || DEFAULT_CONTRACTOR_NAME,
    latitude: report.latitude,
    longitude: report.longitude,
    progressPercentage: defaultProgressForStatus(status),
    assignedAt: report.timestamp,
    completedAt: report.status === 'REPAIR_COMPLETED' ? report.timestamp : undefined,
    trustScore: getTrustScore(report.contractor_name || DEFAULT_CONTRACTOR_NAME),
  }
}

function syncPortalState() {
  const storedTasks = loadStoredTasks()
  const storedNotifications = loadStoredNotifications()
  const storedTaskById = new Map(storedTasks.map((item) => [item.complaintId, item]))
  const queueById = new Map(loadContractorQueue().map((item) => [item.id, item]))

  const baseTasksMap = new Map<string, ContractorPortalTask>()

  loadChhattisgarhReports()
    .filter((report) => report.contractor_name && report.state === AUTHORITY_STATE && report.status !== 'ASSIGNED_TO_AUTHORITY')
    .forEach((report) => {
      baseTasksMap.set(report.complaint_id, taskFromReport(report))
    })

  loadContractorAssignmentResults().forEach((result) => {
    baseTasksMap.set(
      result.complaint_id,
      taskFromQueueAssignment(
        queueById.get(result.complaint_id),
        result.contractor,
        result.complaint_id,
        result.status,
        result.deadline
      )
    )
  })

  const nextTasks = Array.from(baseTasksMap.values())
    .map((task) => mergeTask(task, storedTaskById.get(task.complaintId)))
    .sort((left, right) => asTimestamp(right.assignedAt) - asTimestamp(left.assignedAt))

  const storedIds = new Set(storedTasks.map((task) => task.complaintId))
  const newAssignments = loadContractorAssignmentResults().filter((result) => !storedIds.has(result.complaint_id))
  const nextNotifications = [...storedNotifications]

  if (newAssignments.length > 0) {
    const grouped = new Map<string, { districts: Set<string>; count: number }>()

    newAssignments.forEach((assignment) => {
      const existing = grouped.get(assignment.contractor) || { districts: new Set<string>(), count: 0 }
      existing.districts.add(assignment.district)
      existing.count += 1
      grouped.set(assignment.contractor, existing)
    })

    grouped.forEach((value, contractorName) => {
      const district = Array.from(value.districts).join(', ')
      nextNotifications.unshift({
        id: `${contractorName}-${Date.now()}-${value.count}`,
        contractorName,
        title: 'New Repair Tasks Assigned',
        message: `Today you received ${value.count} repair assignment${value.count === 1 ? '' : 's'} from Road Authority.`,
        district,
        assignmentCount: value.count,
        createdAt: new Date().toISOString(),
        unread: true,
      })
    })
  }

  savePortalState(nextTasks, nextNotifications)
  return { tasks: nextTasks, notifications: nextNotifications }
}

function syncAuthorityStores(tasks: ContractorPortalTask[]) {
  const taskById = new Map(tasks.map((item) => [item.complaintId, item]))

  const nextQueue = loadContractorQueue().map((item) => {
    const task = taskById.get(item.id)
    if (!task) return item
    return {
      ...item,
      contractor: task.contractorName,
      deadline: task.repairDeadline,
      status: task.status,
    }
  })

  const nextAssignments = loadContractorAssignmentResults().map((item) => {
    const task = taskById.get(item.complaint_id)
    if (!task) return item
    return {
      ...item,
      contractor: task.contractorName,
      district: task.district,
      deadline: task.repairDeadline,
      status: task.status,
    }
  })

  const nextReports = loadChhattisgarhReports().map((item) => {
    const task = taskById.get(item.complaint_id)
    if (!task) return item
    const reportStatus: 'ASSIGNED_TO_CONTRACTOR' | 'REPAIR_COMPLETED' =
      task.status === 'REPAIR_COMPLETED' ? 'REPAIR_COMPLETED' : 'ASSIGNED_TO_CONTRACTOR'
    return {
      ...item,
      contractor_name: task.contractorName,
      status: reportStatus,
    }
  })

  saveContractorQueue(nextQueue)
  saveContractorAssignmentResults(nextAssignments)
  saveChhattisgarhReports(nextReports)
}

function summaryFromTasks(contractorName: string, tasks: ContractorPortalTask[]): ContractorPortalSummary {
  const filtered = tasks.filter((item) => normaliseContractorName(item.contractorName) === normaliseContractorName(contractorName))
  const today = new Date().toLocaleDateString('en-CA')
  const assignedToday = filtered.filter((item) => new Date(item.assignedAt).toLocaleDateString('en-CA') === today).length
  const pendingRepairs = filtered.filter((item) => item.status === 'ASSIGNED_TO_CONTRACTOR').length
  const workInProgress = filtered.filter((item) => item.status === 'WORK_IN_PROGRESS').length
  const completedRepairs = filtered.filter((item) => item.status === 'REPAIR_COMPLETED').length
  const durations = filtered
    .map((item) => completedDurationDays(item))
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)

  const fallbackAverage = (() => {
    const performance = getContractorLookup().get(normaliseContractorName(contractorName))
    return performance ? performance.average_repair_time_hours / 24 : 0
  })()

  const averageRepairTimeDays = durations.length > 0
    ? durations.reduce((sum, value) => sum + value, 0) / durations.length
    : fallbackAverage

  return {
    assignedToday,
    pendingRepairs,
    workInProgress,
    completedRepairs,
    totalJobsAssigned: filtered.length,
    jobsCompleted: completedRepairs,
    pendingJobs: pendingRepairs + workInProgress,
    averageRepairTimeDays,
    completionRate: filtered.length > 0 ? Math.round((completedRepairs / filtered.length) * 100) : 0,
  }
}

export function resolveContractorIdentity(): ContractorIdentity {
  const userName = readUserName()
  const lookup = getContractorLookup()
  const direct = lookup.get(normaliseContractorName(userName))
  const contractorName = direct?.contractor || DEFAULT_CONTRACTOR_NAME
  return {
    contractorName,
    region: AUTHORITY_STATE,
    trustScore: getTrustScore(contractorName),
  }
}

export function loadContractorPortalSnapshot(contractorName = resolveContractorIdentity().contractorName): ContractorPortalSnapshot {
  const { tasks, notifications } = syncPortalState()
  const identity = resolveContractorIdentity()
  const activeContractorName = contractorName || identity.contractorName

  return {
    contractorName: activeContractorName,
    region: AUTHORITY_STATE,
    trustScore: getTrustScore(activeContractorName),
    tasks: tasks.filter((item) => normaliseContractorName(item.contractorName) === normaliseContractorName(activeContractorName)),
    notifications: notifications.filter((item) => normaliseContractorName(item.contractorName) === normaliseContractorName(activeContractorName)),
    summary: summaryFromTasks(activeContractorName, tasks),
  }
}

export function loadContractorTask(complaintId: string, contractorName = resolveContractorIdentity().contractorName) {
  return loadContractorPortalSnapshot(contractorName).tasks.find((item) => item.complaintId === complaintId) || null
}

export function markContractorNotificationsRead(contractorName = resolveContractorIdentity().contractorName) {
  const { tasks, notifications } = syncPortalState()
  const nextNotifications = notifications.map((item) =>
    normaliseContractorName(item.contractorName) === normaliseContractorName(contractorName)
      ? { ...item, unread: false }
      : item
  )
  savePortalState(tasks, nextNotifications)
  notifyPortalUpdate()
}

export function startContractorRepairTask(complaintId: string) {
  const { tasks, notifications } = syncPortalState()
  const nextTasks = tasks.map((item) =>
    item.complaintId === complaintId
      ? {
          ...item,
          status: 'WORK_IN_PROGRESS' as const,
          progressPercentage: Math.max(item.progressPercentage, 35),
          startedAt: item.startedAt || new Date().toISOString(),
        }
      : item
  )

  savePortalState(nextTasks, notifications)
  syncAuthorityStores(nextTasks)
  return nextTasks.find((item) => item.complaintId === complaintId) || null
}

export function updateContractorRepairProgress(complaintId: string, progressPercentage: number) {
  const { tasks, notifications } = syncPortalState()
  const nextTasks = tasks.map((item) => {
    if (item.complaintId !== complaintId || item.status === 'REPAIR_COMPLETED') return item
    return {
      ...item,
      status: progressPercentage > 0 ? ('WORK_IN_PROGRESS' as const) : item.status,
      progressPercentage,
      startedAt: progressPercentage > 0 ? item.startedAt || new Date().toISOString() : item.startedAt,
    }
  })

  savePortalState(nextTasks, notifications)
  syncAuthorityStores(nextTasks)
  return nextTasks.find((item) => item.complaintId === complaintId) || null
}

export function completeContractorRepairTask(
  complaintId: string,
  payload?: {
    beforeRepairImageName?: string
    afterRepairImageName?: string
    repairNotes?: string
  }
) {
  const { tasks, notifications } = syncPortalState()
  const nextTasks = tasks.map((item) => {
    if (item.complaintId !== complaintId) return item
    return {
      ...item,
      status: 'REPAIR_COMPLETED' as const,
      progressPercentage: 100,
      startedAt: item.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      beforeRepairImageName: payload?.beforeRepairImageName || item.beforeRepairImageName,
      afterRepairImageName: payload?.afterRepairImageName || item.afterRepairImageName,
      repairNotes: payload?.repairNotes || item.repairNotes,
    }
  })

  savePortalState(nextTasks, notifications)
  syncAuthorityStores(nextTasks)
  return nextTasks.find((item) => item.complaintId === complaintId) || null
}
