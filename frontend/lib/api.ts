/**
 * NRIP API Helper — shared utilities for all dashboard pages
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
export const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('nrip_token')
}

export function getUser(): { id: string; name: string; role: string; email: string } | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('nrip_user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers as Record<string, string> || {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function apiFormDataFetch<T = any>(
  path: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`
  const res = await fetch(url, {
    ...options,
    method: options.method || 'POST',
    headers: {
      ...authHeaders(),
      ...(options.headers as Record<string, string> || {}),
    },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  return res.json()
}

async function aiFormDataFetch<T = any>(path: string, formData: FormData): Promise<T> {
  const base = AI_ENGINE_URL.replace(/\/$/, '')
  const url = `${base}${path}`
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  return res.json()
}

function resolveAiUrl(pathOrUrl?: string): string | undefined {
  if (!pathOrUrl) return undefined
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl
  const base = AI_ENGINE_URL.replace(/\/$/, '')
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${base}${path}`
}

export function resolveStoredImageUrl(pathOrUrl?: string): string | null {
  if (!pathOrUrl) return null
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl
  if (!pathOrUrl.startsWith('/uploads/')) return null
  return resolveAiUrl(pathOrUrl) || null
}

export interface MonitoringCapturePayload {
  imageFile: File
  sourceType: 'satellite' | 'dashcam' | 'cctv' | 'citizen_mobile'
  latitude: number
  longitude: number
  state?: string
  district?: string
  pincode?: string
  roadName?: string
}

export interface MonitoringCaptureResult {
  issue_id: string
  complaint_id: string
  source_type: string
  severity: 'critical' | 'high' | 'moderate' | 'low'
  risk_score?: number
  confidence: number
  latitude: number
  longitude: number
  road_name: string
  district: string
  state: string
  pincode?: string
  assigned_authority: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  status: string
  source?: string
  image_url?: string
  high_risk_alert?: {
    alert_id: string
    title: string
    message: string
    district: string
    road_name: string
    severity: string
    recipients: string[]
    created_at: string
  } | null
  contractor_suggestions: Array<{
    contractor_id: string
    company_name: string
    district_match: boolean
    availability_score: number
    performance_score: number
    recommendation_score: number
  }>
  lifecycle: Array<{ stage: string; status: string; timestamp?: string | null }>
}

export interface AiImageDetectionResult {
  pothole_detected: boolean
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  confidence: number
  detections: Array<{
    label: string
    confidence: number
  }>
  original_image_url?: string
  detected_image_url?: string
}

export interface AiDashcamDetectionResult {
  pothole_detected: boolean
  sample_every_seconds: number
  total_frames: number
  sampled_frames: number
  detections: Array<{
    frame_number: number
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    confidence: number
    annotated_frame_url: string
  }>
}

function mapAiSeverityToMonitoringSeverity(value: 'HIGH' | 'MEDIUM' | 'LOW'): MonitoringCaptureResult['severity'] {
  if (value === 'HIGH') return 'high'
  if (value === 'MEDIUM') return 'moderate'
  return 'low'
}

function mapAiSeverityToPriority(value: 'HIGH' | 'MEDIUM' | 'LOW'): MonitoringCaptureResult['priority'] {
  if (value === 'HIGH') return 'HIGH'
  if (value === 'MEDIUM') return 'MEDIUM'
  return 'LOW'
}

function mapAiSeverityToReportSeverity(value: 'HIGH' | 'MEDIUM' | 'LOW'): PotholeReportEntry['severity'] {
  if (value === 'HIGH') return 'HIGH'
  if (value === 'MEDIUM') return 'MEDIUM'
  return 'LOW'
}

function mapStoredSeverityToMonitoringSeverity(value?: string): MonitoringCaptureResult['severity'] {
  const normalized = String(value || 'LOW').trim().toUpperCase()
  if (normalized === 'HIGH') return 'high'
  if (normalized === 'MEDIUM') return 'moderate'
  return 'low'
}

function buildAssignedAuthority(district: string, state: string): string {
  if (district && !district.toLowerCase().startsWith('unknown')) {
    return `${district} District Authority`
  }
  if (state && !state.toLowerCase().startsWith('unknown')) {
    return `${state} Road Authority`
  }
  return 'Municipal Road Maintenance'
}

export async function detectImageWithAi(imageFile: File): Promise<AiImageDetectionResult> {
  const body = new FormData()
  body.append('file', imageFile)
  const result = await aiFormDataFetch<AiImageDetectionResult>('/detect-image', body)
  return {
    ...result,
    original_image_url: resolveAiUrl(result.original_image_url),
    detected_image_url: resolveAiUrl(result.detected_image_url),
  }
}

export async function detectDashcamWithAi(videoFile: File): Promise<AiDashcamDetectionResult> {
  const body = new FormData()
  body.append('file', videoFile)
  const result = await aiFormDataFetch<AiDashcamDetectionResult>('/detect-dashcam', body)
  return {
    ...result,
    detections: result.detections.map((item) => ({
      ...item,
      annotated_frame_url: resolveAiUrl(item.annotated_frame_url) || item.annotated_frame_url,
    })),
  }
}

export function getWebcamStreamUrl(): string {
  const base = AI_ENGINE_URL.replace(/\/$/, '')
  return `${base}/detect-webcam`
}

export interface AiWebcamDetectionStatus {
  pothole_detected: boolean
  complaint_id?: string
  severity?: 'HIGH' | 'MEDIUM' | 'LOW'
  risk_score?: number
  confidence?: number
  latitude?: number
  longitude?: number
  state?: string
  district?: string
  pincode?: string
  timestamp?: string
  image?: string
  source?: string
}

export async function getWebcamDetectionStatus(): Promise<AiWebcamDetectionStatus> {
  const base = AI_ENGINE_URL.replace(/\/$/, '')
  const res = await fetch(`${base}/detect-webcam-status`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const result = await res.json() as AiWebcamDetectionStatus
  return {
    ...result,
    image: resolveStoredImageUrl(result.image) || undefined,
  }
}

export interface PotholeReportEntry {
  id: string
  complaint_id?: string
  type: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  risk_score?: number
  confidence?: number
  latitude: number
  longitude: number
  state: string
  district: string
  pincode?: string
  road_name?: string
  timestamp: string
  status?: string
  source?: string
  image?: string
}

export interface PotholeReportDetail extends PotholeReportEntry {}
export type ReportSourceFilter = 'citizen' | 'satellite'

function normalizePotholeReport<T extends PotholeReportEntry>(report: T): T {
  return {
    ...report,
    image: resolveStoredImageUrl(report.image) || undefined,
  }
}

export async function fetchPotholeReports(limit = 20): Promise<PotholeReportEntry[]> {
  const reports = await apiFetch<PotholeReportEntry[]>(`/reports?limit=${limit}`)
  return reports.map((report) => normalizePotholeReport(report))
}

export async function fetchAdminDetectedIssues(source?: ReportSourceFilter): Promise<PotholeReportEntry[]> {
  const query = source ? `?source=${encodeURIComponent(source)}` : ''
  const reports = await apiFetch<PotholeReportEntry[]>(`/admin/detected-issues${query}`)
  return reports.map((report) => normalizePotholeReport(report))
}

export async function fetchAuthorityDetectedRoadIssues(
  state: string,
  source?: ReportSourceFilter
): Promise<PotholeReportEntry[]> {
  const params = new URLSearchParams({ state })
  if (source) params.set('source', source)
  const reports = await apiFetch<PotholeReportEntry[]>(`/authority/detected-road-issues?${params.toString()}`)
  return reports.map((report) => normalizePotholeReport(report))
}

export async function fetchPotholeReportDetail(reportId: string): Promise<PotholeReportDetail> {
  const report = await apiFetch<PotholeReportDetail>(`/reports/${encodeURIComponent(reportId)}`)
  return normalizePotholeReport(report)
}

interface CitizenReportCreatePayload {
  id: string
  type: string
  source: string
  severity: PotholeReportEntry['severity']
  risk_score: number
  confidence: number
  latitude: number
  longitude: number
  state: string
  district: string
  pincode?: string
  road_name: string
  timestamp: string
  status: string
  image?: string
}

async function createCitizenReport(payload: CitizenReportCreatePayload): Promise<PotholeReportEntry> {
  const report = await apiFetch<PotholeReportEntry>('/citizen/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return normalizePotholeReport(report)
}

export async function captureRoadIssue(payload: MonitoringCapturePayload): Promise<MonitoringCaptureResult> {
  const aiResult = await detectImageWithAi(payload.imageFile)

  if (!aiResult.pothole_detected) {
    throw new Error('No pothole detected. Please capture again.')
  }

  const now = new Date().toISOString()
  const complaintId = `AI-${Date.now()}`
  const savedReport = await createCitizenReport({
    id: complaintId,
    type: 'pothole',
    source: 'citizen',
    severity: mapAiSeverityToReportSeverity(aiResult.severity),
    risk_score: Math.round(aiResult.confidence * 100),
    confidence: aiResult.confidence,
    latitude: payload.latitude,
    longitude: payload.longitude,
    state: payload.state || 'Unknown State',
    district: payload.district || 'Unknown District',
    pincode: payload.pincode,
    road_name: payload.roadName || 'Road segment from citizen capture',
    timestamp: now,
    status: 'ASSIGNED_TO_AUTHORITY',
    image: aiResult.detected_image_url || aiResult.original_image_url,
  })

  return {
    issue_id: savedReport.id,
    complaint_id: savedReport.complaint_id || savedReport.id,
    source_type: payload.sourceType,
    severity: mapStoredSeverityToMonitoringSeverity(savedReport.severity),
    risk_score: savedReport.risk_score,
    confidence: savedReport.confidence ?? aiResult.confidence,
    latitude: savedReport.latitude,
    longitude: savedReport.longitude,
    road_name: savedReport.road_name || payload.roadName || 'Road segment from citizen capture',
    district: savedReport.district,
    state: savedReport.state,
    pincode: savedReport.pincode,
    assigned_authority: buildAssignedAuthority(savedReport.district, savedReport.state),
    priority: mapAiSeverityToPriority(aiResult.severity),
    status: savedReport.status || 'ASSIGNED_TO_AUTHORITY',
    source: savedReport.source,
    image_url: savedReport.image,
    high_risk_alert:
      aiResult.severity === 'HIGH'
        ? {
            alert_id: `ALERT-${Date.now()}`,
            title: 'High Risk Alert',
            message: 'High severity pothole detected by AI engine.',
            district: savedReport.district,
            road_name: savedReport.road_name || 'Road segment from citizen capture',
            severity: 'HIGH',
            recipients: [buildAssignedAuthority(savedReport.district, savedReport.state)],
            created_at: now,
          }
        : null,
    contractor_suggestions: [],
    lifecycle: [
      { stage: 'DETECTED', status: 'COMPLETE', timestamp: now },
      { stage: 'ROUTING', status: 'QUEUED', timestamp: now },
    ],
  }
}

export async function fetchContractorSuggestions(
  district: string,
  state: string,
  severity: string
): Promise<{
  district: string
  state: string
  severity: string
  suggestions: Array<{
    contractor_id: string
    company_name: string
    district_match: boolean
    availability_score: number
    performance_score: number
    recommendation_score: number
  }>
}> {
  const params = new URLSearchParams({ district, state, severity })
  return apiFetch(`/monitoring/contractor-suggestions?${params.toString()}`)
}

export async function fetchHighRiskAlerts(limit = 20): Promise<Array<{
  id: string
  alert_id: string
  title: string
  message: string
  district: string
  state: string
  road_name: string
  severity: string
  recipients: string[]
  created_at: string
}>> {
  return apiFetch(`/monitoring/alerts?limit=${limit}`)
}

export interface CitizenStatsResponse {
  solved_complaints: number
  reports_submitted: number
  reports_verified: number
  tokens_earned: number
  current_streak: number
  last_report_date: string | null
  rank: string
  badges: string[]
  certificates: string[]
  new_badges?: string[]
  streak_updated?: boolean
  reward_granted?: boolean
  awarded_tokens?: number
  certificate_unlocked?: boolean
}

export interface CitizenLeaderboardEntry {
  rank: number
  name: string
  reports: number
  tokens: number
}

export interface CitizenNotificationEntry {
  id: string
  title: string
  message: string
  created_at: string
  is_read: boolean
}

export interface StateAdminStatusBreakdown {
  ASSIGNED_TO_AUTHORITY: number
  UNDER_PROGRESS: number
  VERIFIED_BY_CITIZEN_AUDITOR: number
  ESCALATED: number
  CLOSED: number
}

export interface StateAdminBucketMetrics {
  total_complaints: number
  received_today: number
  assigned: number
  pending: number
  under_progress: number
  completed: number
  road_health_score: number
  pothole_count: number
  scanned_segments: number
  density_level: 'good' | 'moderate' | 'critical'
  status_breakdown: StateAdminStatusBreakdown
}

export interface StateAdminStateStats extends StateAdminBucketMetrics {
  state: string
}

export interface StateAdminStatsResponse {
  generated_at: string
  states: StateAdminStateStats[]
  totals: StateAdminBucketMetrics
}

export interface StateAdminDistrictStats extends StateAdminBucketMetrics {
  district: string
}

export interface StateAdminDistrictStatsResponse {
  generated_at: string
  state: string
  districts: StateAdminDistrictStats[]
  summary: StateAdminBucketMetrics
}

export interface StateAdminReminderNotification {
  id: string
  type: string
  title: string
  message: string
  state: string
  district: string
  pending_repairs: number
  authority: string
  created_at: string
  is_read: boolean
}

export interface SendStateAdminReminderPayload {
  state: string
  district: string
  pending_repairs?: number
  authority?: string
}

export interface SendStateAdminReminderResponse {
  success: boolean
  message: string
  notification: StateAdminReminderNotification
}

interface DemoDistrictSeed {
  district: string
  pending: number
  under_progress: number
  completed: number
  assigned: number
  pothole_count: number
  scanned_segments: number
}

const STATE_ADMIN_DEMO_DISTRICTS: Record<string, DemoDistrictSeed[]> = {
  Chhattisgarh: [
    { district: 'Raipur', pending: 3, under_progress: 2, completed: 1, assigned: 1, pothole_count: 7, scanned_segments: 58 },
    { district: 'Bilaspur', pending: 2, under_progress: 1, completed: 1, assigned: 1, pothole_count: 5, scanned_segments: 46 },
    { district: 'Durg', pending: 2, under_progress: 2, completed: 1, assigned: 1, pothole_count: 6, scanned_segments: 46 },
  ],
  Maharashtra: [
    { district: 'Mumbai', pending: 1, under_progress: 1, completed: 1, assigned: 1, pothole_count: 4, scanned_segments: 80 },
    { district: 'Pune', pending: 2, under_progress: 1, completed: 1, assigned: 1, pothole_count: 5, scanned_segments: 70 },
    { district: 'Nagpur', pending: 1, under_progress: 1, completed: 1, assigned: 0, pothole_count: 3, scanned_segments: 50 },
  ],
  'Andhra Pradesh': [
    { district: 'Visakhapatnam', pending: 1, under_progress: 1, completed: 1, assigned: 1, pothole_count: 4, scanned_segments: 70 },
    { district: 'Vijayawada', pending: 1, under_progress: 1, completed: 1, assigned: 0, pothole_count: 3, scanned_segments: 55 },
    { district: 'Guntur', pending: 1, under_progress: 1, completed: 0, assigned: 1, pothole_count: 3, scanned_segments: 55 },
  ],
  Karnataka: [
    { district: 'Bengaluru', pending: 1, under_progress: 1, completed: 1, assigned: 0, pothole_count: 3, scanned_segments: 80 },
    { district: 'Mysuru', pending: 1, under_progress: 0, completed: 1, assigned: 0, pothole_count: 2, scanned_segments: 45 },
    { district: 'Hubballi', pending: 1, under_progress: 1, completed: 1, assigned: 0, pothole_count: 3, scanned_segments: 45 },
  ],
  'Tamil Nadu': [
    { district: 'Chennai', pending: 1, under_progress: 0, completed: 1, assigned: 0, pothole_count: 2, scanned_segments: 70 },
    { district: 'Coimbatore', pending: 1, under_progress: 0, completed: 1, assigned: 0, pothole_count: 2, scanned_segments: 50 },
    { district: 'Madurai', pending: 1, under_progress: 0, completed: 1, assigned: 0, pothole_count: 2, scanned_segments: 40 },
  ],
  'Uttar Pradesh': [
    { district: 'Lucknow', pending: 2, under_progress: 2, completed: 1, assigned: 1, pothole_count: 6, scanned_segments: 90 },
    { district: 'Kanpur', pending: 2, under_progress: 1, completed: 1, assigned: 0, pothole_count: 4, scanned_segments: 70 },
    { district: 'Varanasi', pending: 2, under_progress: 1, completed: 1, assigned: 0, pothole_count: 4, scanned_segments: 60 },
  ],
}

const STATE_ADMIN_DEMO_ORDER = [
  'Chhattisgarh',
  'Maharashtra',
  'Andhra Pradesh',
  'Karnataka',
  'Tamil Nadu',
  'Uttar Pradesh',
]

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function calculateRoadHealthScore(potholeCount: number, scannedSegments: number): number {
  if (scannedSegments <= 0) return 100
  const score = 100 - (potholeCount / scannedSegments) * 100
  return roundToOneDecimal(Math.max(0, score))
}

function resolveDensityLevel(potholeCount: number): StateAdminBucketMetrics['density_level'] {
  if (potholeCount > 12) return 'critical'
  if (potholeCount > 8) return 'moderate'
  return 'good'
}

function emptyStatusBreakdown(): StateAdminStatusBreakdown {
  return {
    ASSIGNED_TO_AUTHORITY: 0,
    UNDER_PROGRESS: 0,
    VERIFIED_BY_CITIZEN_AUDITOR: 0,
    ESCALATED: 0,
    CLOSED: 0,
  }
}

function toDistrictMetrics(seed: DemoDistrictSeed): StateAdminDistrictStats {
  const totalComplaints = seed.pending + seed.under_progress + seed.completed + seed.assigned
  const escalated = seed.pothole_count > 5 ? 1 : 0
  const verified = Math.min(seed.completed, Math.max(0, Math.floor(seed.completed / 2) + escalated))
  const districtName = seed.pothole_count > 5 ? `${seed.district} (High Priority Repair Zone)` : seed.district

  return {
    district: districtName,
    total_complaints: totalComplaints,
    received_today: totalComplaints,
    assigned: seed.assigned,
    pending: seed.pending,
    under_progress: seed.under_progress,
    completed: seed.completed,
    road_health_score: calculateRoadHealthScore(seed.pothole_count, seed.scanned_segments),
    pothole_count: seed.pothole_count,
    scanned_segments: seed.scanned_segments,
    density_level: resolveDensityLevel(seed.pothole_count),
    status_breakdown: {
      ASSIGNED_TO_AUTHORITY: seed.assigned,
      UNDER_PROGRESS: seed.under_progress,
      VERIFIED_BY_CITIZEN_AUDITOR: verified,
      ESCALATED: escalated,
      CLOSED: seed.completed,
    },
  }
}

function summarizeBuckets<T extends StateAdminBucketMetrics>(items: T[]): StateAdminBucketMetrics {
  const summary = items.reduce(
    (acc, item) => {
      acc.total_complaints += item.total_complaints
      acc.received_today += item.received_today
      acc.assigned += item.assigned
      acc.pending += item.pending
      acc.under_progress += item.under_progress
      acc.completed += item.completed
      acc.pothole_count += item.pothole_count
      acc.scanned_segments += item.scanned_segments
      acc.status_breakdown.ASSIGNED_TO_AUTHORITY += item.status_breakdown.ASSIGNED_TO_AUTHORITY
      acc.status_breakdown.UNDER_PROGRESS += item.status_breakdown.UNDER_PROGRESS
      acc.status_breakdown.VERIFIED_BY_CITIZEN_AUDITOR += item.status_breakdown.VERIFIED_BY_CITIZEN_AUDITOR
      acc.status_breakdown.ESCALATED += item.status_breakdown.ESCALATED
      acc.status_breakdown.CLOSED += item.status_breakdown.CLOSED
      return acc
    },
    {
      total_complaints: 0,
      received_today: 0,
      assigned: 0,
      pending: 0,
      under_progress: 0,
      completed: 0,
      pothole_count: 0,
      scanned_segments: 0,
      road_health_score: 100,
      density_level: 'good' as StateAdminBucketMetrics['density_level'],
      status_breakdown: emptyStatusBreakdown(),
    }
  )

  summary.road_health_score = calculateRoadHealthScore(summary.pothole_count, summary.scanned_segments)
  summary.density_level = resolveDensityLevel(summary.pothole_count)
  return summary
}

function buildDemoStateStats(): StateAdminStateStats[] {
  return STATE_ADMIN_DEMO_ORDER.map((state) => {
    const districtSeeds = STATE_ADMIN_DEMO_DISTRICTS[state] || []
    const districtMetrics = districtSeeds.map(toDistrictMetrics)
    const summary = summarizeBuckets(districtMetrics)
    return {
      state,
      ...summary,
    }
  })
}

function buildDemoStateAdminStatsResponse(): StateAdminStatsResponse {
  const states = buildDemoStateStats()
  return {
    generated_at: new Date().toISOString(),
    states,
    totals: summarizeBuckets(states),
  }
}

function buildDemoStateAdminDistrictResponse(state: string): StateAdminDistrictStatsResponse {
  const normalizedInput = state.trim().toLowerCase()
  const resolvedState =
    STATE_ADMIN_DEMO_ORDER.find((item) => item.toLowerCase() === normalizedInput) || STATE_ADMIN_DEMO_ORDER[0]
  const districtSeeds = STATE_ADMIN_DEMO_DISTRICTS[resolvedState] || []
  const districts = districtSeeds.map(toDistrictMetrics)

  return {
    generated_at: new Date().toISOString(),
    state: resolvedState,
    districts,
    summary: summarizeBuckets(districts),
  }
}

function buildDemoReminderNotification(payload: SendStateAdminReminderPayload): StateAdminReminderNotification {
  const now = new Date().toISOString()
  const stateName = payload.state || 'Unknown State'
  const districtName = payload.district || 'Unknown District'
  const pendingRepairs = payload.pending_repairs ?? 0

  return {
    id: `demo-reminder-${Date.now()}`,
    type: 'reminder',
    title: 'Authority Notified',
    message: `Road Authority acknowledged ${districtName}. Repair assignment initiated for ${pendingRepairs} pending repairs.`,
    state: stateName,
    district: districtName,
    pending_repairs: pendingRepairs,
    authority: payload.authority || `${stateName} Road Authority`,
    created_at: now,
    is_read: false,
  }
}

export async function fetchCitizenStats(): Promise<CitizenStatsResponse> {
  return apiFetch('/citizen/stats')
}

export async function recordCitizenReportEvent(
  complaintId: string,
  occurredAt?: string
): Promise<CitizenStatsResponse> {
  return apiFetch('/citizen/report', {
    method: 'POST',
    body: JSON.stringify({ complaint_id: complaintId, occurred_at: occurredAt }),
  })
}

export async function recordCitizenVerificationEvent(
  complaintId: string,
  occurredAt?: string
): Promise<CitizenStatsResponse> {
  return apiFetch('/citizen/verify', {
    method: 'POST',
    body: JSON.stringify({ complaint_id: complaintId, occurred_at: occurredAt }),
  })
}

export async function fetchCitizenLeaderboard(limit = 10): Promise<CitizenLeaderboardEntry[]> {
  return apiFetch(`/citizen/leaderboard?limit=${limit}`)
}

export async function fetchCitizenNotifications(limit = 20): Promise<CitizenNotificationEntry[]> {
  return apiFetch(`/citizen/notifications?limit=${limit}`)
}

export async function fetchStateAdminStats(): Promise<StateAdminStatsResponse> {
  return buildDemoStateAdminStatsResponse()
}

export async function fetchStateAdminDistrictStats(state: string): Promise<StateAdminDistrictStatsResponse> {
  return buildDemoStateAdminDistrictResponse(state)
}

export async function sendStateAdminReminder(
  payload: SendStateAdminReminderPayload
): Promise<SendStateAdminReminderResponse> {
  const workflowMessage = 'Send Reminder -> Authority Notified -> Repair Assignment'

  try {
    const liveResponse = await apiFetch<SendStateAdminReminderResponse>('/state-admin/send-reminder', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return {
      ...liveResponse,
      message: liveResponse.message || workflowMessage,
    }
  } catch {
    return {
      success: true,
      message: workflowMessage,
      notification: buildDemoReminderNotification(payload),
    }
  }
}

export async function fetchAuthorityNotifications(limit = 20): Promise<StateAdminReminderNotification[]> {
  return apiFetch(`/authority/notifications?limit=${limit}`)
}

export async function downloadCitizenCertificate(): Promise<Blob> {
  const res = await fetch(`${API_URL}/citizen/certificate`, {
    headers: {
      ...authHeaders(),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  return res.blob()
}

export function logout() {
  localStorage.removeItem('nrip_token')
  localStorage.removeItem('nrip_role')
  localStorage.removeItem('nrip_user')
  window.location.href = '/login'
}
