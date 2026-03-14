/**
 * NRIP API Helper — shared utilities for all dashboard pages
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

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

export interface MonitoringCapturePayload {
  imageFile: File
  sourceType: 'satellite' | 'dashcam' | 'cctv' | 'citizen_mobile'
  latitude: number
  longitude: number
  district?: string
  roadName?: string
}

export interface MonitoringCaptureResult {
  issue_id: string
  complaint_id: string
  source_type: string
  severity: 'critical' | 'high' | 'moderate' | 'low'
  confidence: number
  latitude: number
  longitude: number
  road_name: string
  district: string
  state: string
  assigned_authority: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  status: string
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

export async function captureRoadIssue(payload: MonitoringCapturePayload): Promise<MonitoringCaptureResult> {
  const body = new FormData()
  body.append('file', payload.imageFile)
  body.append('source_type', payload.sourceType)
  body.append('latitude', String(payload.latitude))
  body.append('longitude', String(payload.longitude))
  if (payload.district) body.append('district', payload.district)
  if (payload.roadName) body.append('road_name', payload.roadName)
  return apiFormDataFetch<MonitoringCaptureResult>('/monitoring/capture', body)
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
