'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
export const STORAGE_KEY = 'nrip_admin_control_center_v1'

export type SimulationSeverity = 'critical' | 'medium' | 'minor'
export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW'
export type ComplaintStatus =
  | 'ASSIGNED_TO_AUTHORITY'
  | 'VERIFIED_BY_AUTHORITY'
  | 'ASSIGNED_TO_CONTRACTOR'
  | 'REPAIR_IN_PROGRESS'
  | 'REPAIR_COMPLETED'
  | 'VERIFIED_BY_CITIZEN_AUDITOR'
  | 'ESCALATED'
  | 'CLOSED'

export type AuditDecision = 'pending' | 'verified' | 'suspicious' | 'reopened'

export interface DistrictOption {
  name: string
  center: [number, number]
  roads: string[]
  pincodes: string[]
}

export interface SimulationIssue {
  complaintId: string
  state: string
  district: string
  pincode: string
  roadName: string
  severity: SimulationSeverity
  priority: PriorityLevel
  latitude: number
  longitude: number
  status: 'REPORTED'
}

export interface ComplaintRecord {
  complaintId: string
  state: string
  district: string
  pincode: string
  issueLocation: string
  roadName: string
  severity: SimulationSeverity
  priority: PriorityLevel
  latitude: number
  longitude: number
  description: string
  reportSource: 'ai' | 'citizen'
  issueImageName: string
  reporterName: string
  reporterEmail: string
  assignedAuthority: string
  contractorName: string
  repairDeadline: string
  progressPercentage: number
  authorityVerified: boolean
  citizenAuditorVerified: boolean
  escalated: boolean
  repairStartedAt: string
  completedAt: string
  beforeRepairImageName: string
  afterRepairImageName: string
  repairNotes: string
  citizenRepairQuality: number
  citizenCompletionTime: number
  citizenOverallRating: number
  citizenFeedbackComment: string
  citizenFeedbackSubmitted: boolean
  feedbackSubmittedAt: string
  auditDecision: AuditDecision
  auditorName: string
  auditorNotes: string
  auditedAt: string
  createdAt: string
  updatedAt: string
  status: ComplaintStatus
}

export interface RepairEvidencePayload {
  beforeRepairImageName: string
  afterRepairImageName: string
  repairNotes: string
}

export interface CitizenFeedbackPayload {
  repairQuality: number
  completionTime: number
  overallRating: number
  comments: string
}

export interface AuditorReviewPayload {
  auditorName: string
  notes: string
}

export interface RunHistoryPoint {
  runAt: string
  state: string
  district: string
  critical: number
  medium: number
  minor: number
}

export interface StoredAdminState {
  selectedState: string
  selectedDistrict: string
  selectedPincode: string
  roadsScanned: number
  issues: SimulationIssue[]
  complaints: ComplaintRecord[]
  runHistory: RunHistoryPoint[]
  districtStats: Record<string, number>
}

export const INDIA_AREA_DATA: Record<string, DistrictOption[]> = {
  'Andhra Pradesh': [
    { name: 'Visakhapatnam', center: [17.6868, 83.2185], roads: ['NH 16', 'Beach Road', 'MVP Main Road', 'Gajuwaka Road'], pincodes: ['530001', '530016', '530045'] },
    { name: 'Vijayawada', center: [16.5062, 80.648], roads: ['NH 65', 'MG Road', 'Eluru Road', 'Benz Circle Road'], pincodes: ['520001', '520010', '520013'] },
  ],
  'Arunachal Pradesh': [
    { name: 'Itanagar', center: [27.0844, 93.6053], roads: ['NH 415', 'Ganga Road', 'Naharlagun Main Road', 'Doimukh Road'], pincodes: ['791111', '791113', '791123'] },
    { name: 'Pasighat', center: [28.0667, 95.3333], roads: ['NH 515', 'Station Road', 'Market Road', 'Siang Bypass'], pincodes: ['791102', '791103', '791104'] },
  ],
  Assam: [
    { name: 'Guwahati', center: [26.1445, 91.7362], roads: ['NH 27', 'GS Road', 'Zoo Road', 'AT Road'], pincodes: ['781001', '781005', '781022'] },
    { name: 'Dibrugarh', center: [27.4728, 94.912], roads: ['NH 37', 'Convoy Road', 'Mancotta Road', 'AM Road'], pincodes: ['786001', '786003', '786005'] },
  ],
  Bihar: [
    { name: 'Patna', center: [25.5941, 85.1376], roads: ['NH 31', 'Bailey Road', 'Boring Road', 'Ashok Rajpath'], pincodes: ['800001', '800013', '800020'] },
    { name: 'Gaya', center: [24.7914, 85.0002], roads: ['NH 83', 'Gaya-Dobhi Road', 'Station Road', 'GB Road'], pincodes: ['823001', '823002', '823004'] },
  ],
  Chhattisgarh: [
    { name: 'Raipur', center: [21.2514, 81.6296], roads: ['NH 53', 'GE Road', 'VIP Road', 'Ring Road'], pincodes: ['492001', '492004', '492006'] },
    { name: 'Bilaspur', center: [22.0796, 82.1391], roads: ['NH 130', 'Link Road', 'CMD Road', 'Seepat Road'], pincodes: ['495001', '495004', '495006'] },
    { name: 'Durg', center: [21.1904, 81.2849], roads: ['NH 53', 'Station Road', 'Ganjpara Road', 'Padmanabhpur Road'], pincodes: ['491001', '491002', '491004'] },
    { name: 'Korba', center: [22.3595, 82.7501], roads: ['NH 149B', 'Kosabadi Road', 'Transport Nagar Road', 'Sitamani Road'], pincodes: ['495677', '495678', '495679'] },
    { name: 'Jagdalpur', center: [19.0748, 82.008], roads: ['NH 30', 'Dharampura Road', 'Sanjay Market Road', 'Geedam Road'], pincodes: ['494001', '494002', '494005'] },
  ],
  Goa: [
    { name: 'North Goa', center: [15.4909, 73.8278], roads: ['NH 66', 'MDR 1', 'Baga Road', 'Porvorim Road'], pincodes: ['403001', '403005', '403507'] },
    { name: 'South Goa', center: [15.2993, 74.124], roads: ['NH 66', 'Margao Bypass', 'Colva Road', 'Quepem Road'], pincodes: ['403601', '403707', '403710'] },
  ],
  Gujarat: [
    { name: 'Ahmedabad', center: [23.0225, 72.5714], roads: ['NH 48', 'SG Highway', 'Ashram Road', 'SP Ring Road'], pincodes: ['380001', '380015', '380054'] },
    { name: 'Surat', center: [21.1702, 72.8311], roads: ['NH 48', 'Dumas Road', 'Ring Road', 'Udhna Magdalla Road'], pincodes: ['395001', '395007', '395009'] },
  ],
  Haryana: [
    { name: 'Gurugram', center: [28.4595, 77.0266], roads: ['NH 48', 'Golf Course Road', 'Sohna Road', 'Dwarka Expressway'], pincodes: ['122001', '122002', '122018'] },
    { name: 'Faridabad', center: [28.4089, 77.3178], roads: ['NH 44', 'Mathura Road', 'Badkal Road', 'Bypass Road'], pincodes: ['121001', '121003', '121006'] },
  ],
  'Himachal Pradesh': [
    { name: 'Shimla', center: [31.1048, 77.1734], roads: ['NH 5', 'Cart Road', 'Circular Road', 'Bypass Tunnel Road'], pincodes: ['171001', '171002', '171003'] },
    { name: 'Dharamshala', center: [32.219, 76.3234], roads: ['NH 154', 'Kotwali Bazar Road', 'Sidhpur Road', 'McLeod Road'], pincodes: ['176215', '176216', '176218'] },
  ],
  Jharkhand: [
    { name: 'Ranchi', center: [23.3441, 85.3096], roads: ['NH 43', 'Main Road', 'Kanke Road', 'Ring Road'], pincodes: ['834001', '834002', '834008'] },
    { name: 'Jamshedpur', center: [22.8046, 86.2029], roads: ['NH 18', 'Bistupur Main Road', 'Mango Road', 'Adityapur Road'], pincodes: ['831001', '831003', '831005'] },
  ],
  Karnataka: [
    { name: 'Bengaluru Urban', center: [12.9716, 77.5946], roads: ['NH 44', 'Outer Ring Road', 'Mysuru Road', 'Old Madras Road'], pincodes: ['560001', '560034', '560078'] },
    { name: 'Mysuru', center: [12.2958, 76.6394], roads: ['NH 275', 'SH 17', 'Bannur Road', 'Hunsur Road'], pincodes: ['570001', '570010', '570017'] },
  ],
  Kerala: [
    { name: 'Thiruvananthapuram', center: [8.5241, 76.9366], roads: ['NH 66', 'MG Road', 'Kowdiar Road', 'Airport Road'], pincodes: ['695001', '695014', '695024'] },
    { name: 'Kochi', center: [9.9312, 76.2673], roads: ['NH 66', 'MG Road', 'Marine Drive', 'Seaport Airport Road'], pincodes: ['682001', '682018', '682030'] },
  ],
  'Madhya Pradesh': [
    { name: 'Bhopal', center: [23.2599, 77.4126], roads: ['NH 46', 'VIP Road', 'Hoshangabad Road', 'Kolar Road'], pincodes: ['462001', '462016', '462026'] },
    { name: 'Indore', center: [22.7196, 75.8577], roads: ['NH 52', 'AB Road', 'MR 10', 'Ring Road'], pincodes: ['452001', '452010', '452018'] },
  ],
  Maharashtra: [
    { name: 'Mumbai City', center: [19.076, 72.8777], roads: ['NH 48', 'Western Express Highway', 'Eastern Express Highway', 'LBS Marg'], pincodes: ['400001', '400050', '400104'] },
    { name: 'Pune', center: [18.5204, 73.8567], roads: ['NH 48', 'Mumbai Pune Expressway', 'Nagar Road', 'Paud Road'], pincodes: ['411001', '411014', '411045'] },
  ],
  Manipur: [
    { name: 'Imphal', center: [24.817, 93.9368], roads: ['NH 2', 'Airport Road', 'Tiddim Road', 'Uripok Road'], pincodes: ['795001', '795004', '795010'] },
    { name: 'Churachandpur', center: [24.3333, 93.6667], roads: ['NH 2', 'Tuibong Road', 'CCP Main Road', 'Mission Road'], pincodes: ['795128', '795129', '795130'] },
  ],
  Meghalaya: [
    { name: 'Shillong', center: [25.5788, 91.8933], roads: ['NH 6', 'GS Road', 'Police Bazar Road', 'Upper Shillong Road'], pincodes: ['793001', '793003', '793004'] },
    { name: 'Tura', center: [25.5142, 90.2024], roads: ['NH 217', 'Dakopgre Road', 'Ringrey Road', 'Chandmari Road'], pincodes: ['794001', '794002', '794005'] },
  ],
  Mizoram: [
    { name: 'Aizawl', center: [23.7271, 92.7176], roads: ['NH 306', 'Mission Veng Road', 'Dawrpui Road', 'Bawngkawn Road'], pincodes: ['796001', '796005', '796007'] },
    { name: 'Lunglei', center: [22.8671, 92.765], roads: ['NH 54', 'Main Market Road', 'Zobawk Road', 'Electric Veng Road'], pincodes: ['796701', '796751', '796770'] },
  ],
  Nagaland: [
    { name: 'Kohima', center: [25.6751, 94.1086], roads: ['NH 29', 'Jail Colony Road', 'PR Hill Road', 'Lerie Road'], pincodes: ['797001', '797002', '797003'] },
    { name: 'Dimapur', center: [25.9091, 93.7266], roads: ['NH 29', 'Circular Road', 'Signal Basti Road', 'Airport Road'], pincodes: ['797112', '797113', '797115'] },
  ],
  Odisha: [
    { name: 'Bhubaneswar', center: [20.2961, 85.8245], roads: ['NH 16', 'Janpath Road', 'Nandankanan Road', 'Cuttack Road'], pincodes: ['751001', '751013', '751024'] },
    { name: 'Cuttack', center: [20.4625, 85.883], roads: ['NH 16', 'Ring Road', 'Link Road', 'Badambadi Road'], pincodes: ['753001', '753003', '753008'] },
  ],
  Punjab: [
    { name: 'Amritsar', center: [31.634, 74.8723], roads: ['NH 3', 'GT Road', 'Majitha Road', 'Airport Road'], pincodes: ['143001', '143002', '143006'] },
    { name: 'Ludhiana', center: [30.9009, 75.8573], roads: ['NH 44', 'Ferozepur Road', 'Gill Road', 'Pakhowal Road'], pincodes: ['141001', '141003', '141013'] },
  ],
  Rajasthan: [
    { name: 'Jaipur', center: [26.9124, 75.7873], roads: ['NH 48', 'Ajmer Road', 'Tonk Road', 'JLN Marg'], pincodes: ['302001', '302017', '302021'] },
    { name: 'Udaipur', center: [24.5854, 73.7125], roads: ['NH 27', 'Airport Road', 'Sukher Road', 'University Road'], pincodes: ['313001', '313002', '313004'] },
  ],
  Sikkim: [
    { name: 'Gangtok', center: [27.3389, 88.6065], roads: ['NH 10', 'MG Marg', 'Deorali Road', 'Tadong Road'], pincodes: ['737101', '737102', '737103'] },
    { name: 'Namchi', center: [27.1642, 88.3639], roads: ['NH 10', 'Ravangla Road', 'Central Park Road', 'Sadar Road'], pincodes: ['737126', '737134', '737139'] },
  ],
  'Tamil Nadu': [
    { name: 'Chennai', center: [13.0827, 80.2707], roads: ['NH 32', 'OMR', 'GST Road', 'Anna Salai'], pincodes: ['600001', '600028', '600100'] },
    { name: 'Coimbatore', center: [11.0168, 76.9558], roads: ['NH 544', 'Avinashi Road', 'Trichy Road', 'Mettupalayam Road'], pincodes: ['641001', '641018', '641045'] },
  ],
  Telangana: [
    { name: 'Hyderabad', center: [17.385, 78.4867], roads: ['NH 44', 'Outer Ring Road', 'Hitec City Road', 'Banjara Hills Road'], pincodes: ['500001', '500081', '500100'] },
    { name: 'Warangal', center: [17.9689, 79.5941], roads: ['NH 163', 'Hanamkonda Road', 'Kazipet Road', 'Hunter Road'], pincodes: ['506001', '506002', '506007'] },
  ],
  Tripura: [
    { name: 'Agartala', center: [23.8315, 91.2868], roads: ['NH 8', 'Airport Road', 'Central Road', 'MBB Road'], pincodes: ['799001', '799003', '799006'] },
    { name: 'Udaipur', center: [23.5333, 91.4833], roads: ['NH 8', 'Matabari Road', 'Ramesh Chowmuhani Road', 'Old Motor Stand Road'], pincodes: ['799120', '799121', '799125'] },
  ],
  'Uttar Pradesh': [
    { name: 'Lucknow', center: [26.8467, 80.9462], roads: ['NH 27', 'Shaheed Path', 'Gomti Nagar Extension Road', 'Sitapur Road'], pincodes: ['226001', '226010', '226016'] },
    { name: 'Varanasi', center: [25.3176, 82.9739], roads: ['NH 19', 'Lahartara Road', 'DLW Road', 'Rathyatra Road'], pincodes: ['221001', '221005', '221010'] },
  ],
  Uttarakhand: [
    { name: 'Dehradun', center: [30.3165, 78.0322], roads: ['NH 7', 'Rajpur Road', 'Saharanpur Road', 'Ring Road'], pincodes: ['248001', '248003', '248007'] },
    { name: 'Haridwar', center: [29.9457, 78.1642], roads: ['NH 334', 'Delhi Haridwar Road', 'Ranipur More Road', 'BHEL Road'], pincodes: ['249401', '249402', '249404'] },
  ],
  'West Bengal': [
    { name: 'Kolkata', center: [22.5726, 88.3639], roads: ['NH 12', 'EM Bypass', 'VIP Road', 'AJC Bose Road'], pincodes: ['700001', '700091', '700107'] },
    { name: 'Siliguri', center: [26.7271, 88.3953], roads: ['NH 27', 'Sevoke Road', 'Hill Cart Road', 'Bidhan Road'], pincodes: ['734001', '734003', '734008'] },
  ],
}

interface AdminControlCenterContextValue {
  token: string | null
  authLoading: boolean
  error: string
  notice: string
  selectedState: string
  selectedDistrict: string
  selectedPincode: string
  availableStates: string[]
  availableDistricts: DistrictOption[]
  availablePincodes: string[]
  districtCenter: [number, number]
  simulationRunning: boolean
  simulationProgress: number
  simulationStep: number
  mapFocusToken: number
  simulationSteps: string[]
  issues: SimulationIssue[]
  complaints: ComplaintRecord[]
  roadsScanned: number
  lastRunAt: string
  runHistory: RunHistoryPoint[]
  districtStats: Record<string, number>
  setError: (message: string) => void
  setNotice: (message: string) => void
  setSelectedState: (state: string) => void
  setSelectedDistrict: (district: string) => void
  setSelectedPincode: (pincode: string) => void
  authenticate: () => Promise<void>
  runRoadAnalysis: () => Promise<void>
  prepareComplaintDraft: (complaintId: string) => void
  complaintDraft: ComplaintRecord | null
  clearComplaintDraft: () => void
  submitComplaint: (payload: Partial<ComplaintRecord>) => void
  verifyComplaint: (complaintId: string) => void
  assignContractorToComplaint: (complaintId: string, contractorName: string, repairDeadline: string, priority: PriorityLevel) => void
  startRepair: (complaintId: string) => void
  updateRepairProgress: (complaintId: string, progressPercentage: number) => void
  submitRepairEvidence: (complaintId: string, evidence: RepairEvidencePayload) => void
  submitCitizenFeedback: (complaintId: string, feedback: CitizenFeedbackPayload) => void
  reportRepairProblem: (complaintId: string, feedback: CitizenFeedbackPayload) => void
  flagSuspiciousCase: (complaintId: string, payload: AuditorReviewPayload) => void
  reopenComplaintForAudit: (complaintId: string, payload: AuditorReviewPayload) => void
  escalateComplaint: (complaintId: string) => void
  markRepairCompleted: (complaintId: string) => void
  markCitizenAuditorVerified: (complaintId: string) => void
}

const AdminControlCenterContext = createContext<AdminControlCenterContextValue | null>(null)

function pickSeverity(): SimulationSeverity {
  const random = Math.random()
  if (random < 0.3) return 'critical'
  if (random < 0.72) return 'medium'
  return 'minor'
}

function getPriority(severity: SimulationSeverity, roadName: string): PriorityLevel {
  const isHighway = /NH|SH|Expressway|Highway/i.test(roadName)
  if (severity === 'critical' && isHighway) return 'HIGH'
  if (severity === 'medium') return 'MEDIUM'
  return 'LOW'
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getAuthorityNameByDistrict(district: string) {
  return `${district} District Authority`
}

const CONTRACTOR_POOL = [
  'RapidRoad Infra Pvt Ltd',
  'National Surface Works',
  'MetroFix Civil Contractors',
  'HighwayCare Engineering',
  'Civic Patch & Repair Co',
]

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function dateAfterDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

function normalizeComplaint(record: Partial<ComplaintRecord>): ComplaintRecord {
  const now = new Date().toISOString()

  return {
    complaintId: record.complaintId || `CMP-${Date.now()}`,
    state: record.state || '',
    district: record.district || '',
    pincode: record.pincode || '',
    issueLocation: record.issueLocation || '',
    roadName: record.roadName || '',
    severity: (record.severity as SimulationSeverity) || 'medium',
    priority: (record.priority as PriorityLevel) || 'MEDIUM',
    latitude: record.latitude || 0,
    longitude: record.longitude || 0,
    description: record.description || '',
    reportSource: record.reportSource === 'citizen' ? 'citizen' : 'ai',
    issueImageName: record.issueImageName || '',
    reporterName: record.reporterName || '',
    reporterEmail: record.reporterEmail || '',
    assignedAuthority: record.assignedAuthority || getAuthorityNameByDistrict(record.district || ''),
    contractorName: record.contractorName || '',
    repairDeadline: record.repairDeadline || '',
    progressPercentage: typeof record.progressPercentage === 'number' ? record.progressPercentage : 0,
    authorityVerified: Boolean(record.authorityVerified),
    citizenAuditorVerified: Boolean(record.citizenAuditorVerified),
    escalated: Boolean(record.escalated),
    repairStartedAt: record.repairStartedAt || '',
    completedAt: record.completedAt || '',
    beforeRepairImageName: record.beforeRepairImageName || '',
    afterRepairImageName: record.afterRepairImageName || '',
    repairNotes: record.repairNotes || '',
    citizenRepairQuality: typeof record.citizenRepairQuality === 'number' ? record.citizenRepairQuality : 0,
    citizenCompletionTime: typeof record.citizenCompletionTime === 'number' ? record.citizenCompletionTime : 0,
    citizenOverallRating: typeof record.citizenOverallRating === 'number' ? record.citizenOverallRating : 0,
    citizenFeedbackComment: record.citizenFeedbackComment || '',
    citizenFeedbackSubmitted: Boolean(record.citizenFeedbackSubmitted),
    feedbackSubmittedAt: record.feedbackSubmittedAt || '',
    auditDecision: (record.auditDecision as AuditDecision) || 'pending',
    auditorName: record.auditorName || '',
    auditorNotes: record.auditorNotes || '',
    auditedAt: record.auditedAt || '',
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
    status: (record.status as ComplaintStatus) || 'ASSIGNED_TO_AUTHORITY',
  }
}

export function loadStoredState(): Partial<StoredAdminState> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<StoredAdminState>
  } catch {
    return {}
  }
}

export function saveStoredState(payload: StoredAdminState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function AdminControlCenterProvider({ children, skipAuth = false }: { children: React.ReactNode; skipAuth?: boolean }) {
  const stateList = Object.keys(INDIA_AREA_DATA)
  const [authLoading, setAuthLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [selectedState, setSelectedStateState] = useState(stateList[0])
  const [selectedDistrict, setSelectedDistrictState] = useState(INDIA_AREA_DATA[stateList[0]][0].name)
  const [selectedPincode, setSelectedPincodeState] = useState(INDIA_AREA_DATA[stateList[0]][0].pincodes[0])

  const [simulationRunning, setSimulationRunning] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState(0)
  const [simulationStep, setSimulationStep] = useState(-1)
  const [mapFocusToken, setMapFocusToken] = useState(0)

  const [issues, setIssues] = useState<SimulationIssue[]>([])
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([])
  const [roadsScanned, setRoadsScanned] = useState(0)
  const [lastRunAt, setLastRunAt] = useState('')
  const [runHistory, setRunHistory] = useState<RunHistoryPoint[]>([])
  const [districtStats, setDistrictStats] = useState<Record<string, number>>({})
  const [complaintDraft, setComplaintDraft] = useState<ComplaintRecord | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const lifecycleRunRef = useRef(0)
  const lifecycleTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const bootstrapTriggeredRef = useRef(false)

  const simulationSteps = [
    'Scanning road network...',
    'Analyzing satellite imagery...',
    'Detecting road damage...',
  ]

  const availableDistricts = INDIA_AREA_DATA[selectedState] || []
  const districtConfig = availableDistricts.find((district) => district.name === selectedDistrict) || availableDistricts[0]
  const districtCenter: [number, number] = districtConfig?.center || [22.9734, 78.6569]
  const availablePincodes = districtConfig?.pincodes || []

  function clearLifecycleTimers() {
    lifecycleTimersRef.current.forEach((timer) => clearTimeout(timer))
    lifecycleTimersRef.current = []
  }

  function scheduleLifecycleAction(runId: number, delayMs: number, action: () => void) {
    const timer = setTimeout(() => {
      if (lifecycleRunRef.current !== runId) return
      action()
    }, delayMs)
    lifecycleTimersRef.current.push(timer)
  }

  function scheduleAutonomousLifecycle(runId: number) {
    scheduleLifecycleAction(runId, 1000, () => {
      setComplaints((previous) =>
        previous.map((item) =>
          item.status === 'ASSIGNED_TO_AUTHORITY'
            ? {
                ...item,
                authorityVerified: true,
                status: 'VERIFIED_BY_AUTHORITY',
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      )
      setNotice('AI workflow: authority verification completed.')
    })

    scheduleLifecycleAction(runId, 2400, () => {
      setComplaints((previous) =>
        previous.map((item) =>
          item.status === 'VERIFIED_BY_AUTHORITY'
            ? {
                ...item,
                contractorName: item.contractorName || pickRandom(CONTRACTOR_POOL),
                repairDeadline: item.repairDeadline || dateAfterDays(randomInt(4, 10)),
                status: 'ASSIGNED_TO_CONTRACTOR',
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      )
      setNotice('AI workflow: contractors auto-assigned for verified complaints.')
    })

    scheduleLifecycleAction(runId, 3900, () => {
      setComplaints((previous) =>
        previous.map((item) =>
          item.status === 'ASSIGNED_TO_CONTRACTOR'
            ? {
                ...item,
                status: 'REPAIR_IN_PROGRESS',
                progressPercentage: Math.max(item.progressPercentage, randomInt(28, 62)),
                repairStartedAt: item.repairStartedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      )
      setNotice('AI workflow: field teams started repair execution.')
    })

    scheduleLifecycleAction(runId, 5300, () => {
      setComplaints((previous) =>
        previous.map((item) =>
          item.status === 'REPAIR_IN_PROGRESS'
            ? {
                ...item,
                progressPercentage: Math.max(item.progressPercentage, randomInt(65, 93)),
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      )
      setNotice('AI workflow: repair progress synced from contractor telemetry.')
    })

    scheduleLifecycleAction(runId, 6800, () => {
      setComplaints((previous) =>
        previous.map((item) =>
          item.status === 'REPAIR_IN_PROGRESS'
            ? {
                ...item,
                progressPercentage: 100,
                status: 'REPAIR_COMPLETED',
                beforeRepairImageName: item.beforeRepairImageName || `before_${item.complaintId}.jpg`,
                afterRepairImageName: item.afterRepairImageName || `after_${item.complaintId}.jpg`,
                repairNotes: item.repairNotes || 'AI validated contractor proof set and completion metrics.',
                completedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      )
      setNotice('AI workflow: completed repairs validated with before/after evidence.')
    })

    scheduleLifecycleAction(runId, 8600, () => {
      setComplaints((previous) =>
        previous.map((item) => {
          if (item.status !== 'REPAIR_COMPLETED') return item

          const escalate = item.severity === 'critical' ? Math.random() < 0.3 : Math.random() < 0.16
          if (escalate) {
            return {
              ...item,
              citizenFeedbackSubmitted: true,
              citizenRepairQuality: randomInt(1, 2),
              citizenCompletionTime: randomInt(1, 2),
              citizenOverallRating: randomInt(1, 2),
              citizenFeedbackComment: 'Citizen reported that the patch quality is inconsistent on this segment.',
              feedbackSubmittedAt: new Date().toISOString(),
              escalated: true,
              auditDecision: 'suspicious',
              status: 'ESCALATED',
              updatedAt: new Date().toISOString(),
            }
          }

          return {
            ...item,
            citizenFeedbackSubmitted: true,
            citizenRepairQuality: randomInt(4, 5),
            citizenCompletionTime: randomInt(4, 5),
            citizenOverallRating: randomInt(4, 5),
            citizenFeedbackComment: 'Citizen feedback confirms satisfactory repair quality and completion.',
            feedbackSubmittedAt: new Date().toISOString(),
            citizenAuditorVerified: true,
            auditDecision: 'verified',
            status: 'VERIFIED_BY_CITIZEN_AUDITOR',
            updatedAt: new Date().toISOString(),
          }
        })
      )
      setNotice('AI workflow: citizen verification and escalation signals processed.')
    })

    scheduleLifecycleAction(runId, 10500, () => {
      setComplaints((previous) =>
        previous.map((item) => {
          if (item.status === 'VERIFIED_BY_CITIZEN_AUDITOR') {
            const closeCase = Math.random() < 0.82
            return {
              ...item,
              auditorName: item.auditorName || 'Automated Audit Engine',
              auditorNotes: item.auditorNotes || 'Cross-validation passed for contractor evidence and citizen sentiment.',
              auditedAt: new Date().toISOString(),
              status: closeCase ? 'CLOSED' : 'VERIFIED_BY_CITIZEN_AUDITOR',
              updatedAt: new Date().toISOString(),
            }
          }

          if (item.status === 'ESCALATED') {
            const reopened = Math.random() < 0.5
            return {
              ...item,
              auditorName: item.auditorName || 'Automated Audit Engine',
              auditorNotes: reopened
                ? 'Escalated case reopened for authority re-verification cycle.'
                : 'Suspicious signal retained for manual forensic review.',
              auditedAt: new Date().toISOString(),
              auditDecision: reopened ? 'reopened' : 'suspicious',
              status: reopened ? 'ASSIGNED_TO_AUTHORITY' : 'ESCALATED',
              authorityVerified: reopened ? false : item.authorityVerified,
              updatedAt: new Date().toISOString(),
            }
          }

          return item
        })
      )
      setNotice('AI workflow: auditor review phase synchronized across all complaints.')
    })
  }

  useEffect(() => {
    const stored = loadStoredState()
    if (stored.selectedState && INDIA_AREA_DATA[stored.selectedState]) {
      const stateDistricts = INDIA_AREA_DATA[stored.selectedState]
      const district = stateDistricts.find((item) => item.name === stored.selectedDistrict) || stateDistricts[0]
      const pincode = district.pincodes.includes(stored.selectedPincode || '')
        ? (stored.selectedPincode as string)
        : district.pincodes[0]

      setSelectedStateState(stored.selectedState)
      setSelectedDistrictState(district.name)
      setSelectedPincodeState(pincode)
      setRoadsScanned(stored.roadsScanned || 0)
      setIssues(stored.issues || [])
      setComplaints((stored.complaints || []).map((item) => normalizeComplaint(item)))
      setRunHistory(stored.runHistory || [])
      setDistrictStats(stored.districtStats || {})
    }

    setHydrated(true)
  }, [])

  useEffect(() => {
    const payload: StoredAdminState = {
      selectedState,
      selectedDistrict,
      selectedPincode,
      roadsScanned,
      issues,
      complaints,
      runHistory,
      districtStats,
    }
    saveStoredState(payload)
  }, [selectedState, selectedDistrict, selectedPincode, roadsScanned, issues, complaints, runHistory, districtStats])

  useEffect(() => {
    if (skipAuth) {
      setAuthLoading(false)
      return
    }
    authenticate()
  }, [skipAuth])

  useEffect(() => {
    return () => {
      clearLifecycleTimers()
    }
  }, [])

  useEffect(() => {
    if (!hydrated || authLoading || simulationRunning || bootstrapTriggeredRef.current) return

    bootstrapTriggeredRef.current = true
    if (complaints.length === 0) {
      void runRoadAnalysis()
      return
    }

    const hasInFlightCases = complaints.some((item) =>
      [
        'ASSIGNED_TO_AUTHORITY',
        'VERIFIED_BY_AUTHORITY',
        'ASSIGNED_TO_CONTRACTOR',
        'REPAIR_IN_PROGRESS',
        'REPAIR_COMPLETED',
      ].includes(item.status)
    )
    if (!hasInFlightCases) return

    const runId = lifecycleRunRef.current + 1
    lifecycleRunRef.current = runId
    clearLifecycleTimers()
    scheduleAutonomousLifecycle(runId)
  }, [hydrated, authLoading, simulationRunning, complaints.length])

  async function authenticate() {
    setAuthLoading(true)
    setError('')

    try {
      let response = await fetch(`${API}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'superadmin@roadguardian.gov.in', password: 'SuperAdmin@2024' }),
      })

      let data = await response.json().catch(() => ({}))

      // Fallback to common auth endpoint if dedicated admin login is unavailable.
      if (!response.ok || !data.access_token) {
        response = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@test.com', password: '1234' }),
        })
        data = await response.json().catch(() => ({}))
      }

      if (!response.ok || !data.access_token) {
        setError(data?.detail || 'Could not authenticate. Is the backend running?')
        setAuthLoading(false)
        return
      }

      setToken(data.access_token)
      setNotice('Super Admin authenticated. AI simulation controls are active.')
    } catch {
      setError('Backend unreachable. Start the server and refresh.')
    }

    setAuthLoading(false)
  }

  async function runRoadAnalysis() {
    if (!selectedState || !selectedDistrict || !selectedPincode) {
      setError('Please select state, district and pincode before running analysis.')
      return
    }

    const runId = lifecycleRunRef.current + 1
    lifecycleRunRef.current = runId
    clearLifecycleTimers()

    setError('')
    setNotice('')
    setSimulationRunning(true)
    setMapFocusToken((value) => value + 1)
    setSimulationProgress(0)
    setSimulationStep(-1)

    for (let index = 0; index < simulationSteps.length; index += 1) {
      setSimulationStep(index)
      await sleep(900)
      setSimulationProgress(Math.round(((index + 1) / simulationSteps.length) * 100))
    }

    const issueCount = Math.floor(Math.random() * 9) + 9
    const seed = Date.now().toString().slice(-6)

    const generatedIssues: SimulationIssue[] = Array.from({ length: issueCount }, (_, index) => {
      const roadName = districtConfig.roads[Math.floor(Math.random() * districtConfig.roads.length)]
      const severity = pickSeverity()
      const priority = getPriority(severity, roadName)

      return {
        complaintId: `CMP-${seed}-${String(index + 1).padStart(3, '0')}`,
        state: selectedState,
        district: selectedDistrict,
        pincode: selectedPincode,
        roadName,
        severity,
        priority,
        latitude: districtConfig.center[0] + (Math.random() - 0.5) * 0.08,
        longitude: districtConfig.center[1] + (Math.random() - 0.5) * 0.08,
        status: 'REPORTED',
      }
    })

    const generatedComplaints: ComplaintRecord[] = generatedIssues.map((issue) => ({
      complaintId: issue.complaintId,
      state: issue.state,
      district: issue.district,
      pincode: issue.pincode,
      issueLocation: `${issue.roadName}, ${issue.district}`,
      roadName: issue.roadName,
      severity: issue.severity,
      priority: issue.priority,
      latitude: issue.latitude,
      longitude: issue.longitude,
      description: `AI detected ${issue.severity} road damage on ${issue.roadName}`,
      reportSource: 'ai',
      issueImageName: '',
      reporterName: '',
      reporterEmail: '',
      assignedAuthority: getAuthorityNameByDistrict(issue.district),
      contractorName: '',
      repairDeadline: '',
      progressPercentage: 0,
      authorityVerified: false,
      citizenAuditorVerified: false,
      escalated: false,
      repairStartedAt: '',
      completedAt: '',
      beforeRepairImageName: '',
      afterRepairImageName: '',
      repairNotes: '',
      citizenRepairQuality: 0,
      citizenCompletionTime: 0,
      citizenOverallRating: 0,
      citizenFeedbackComment: '',
      citizenFeedbackSubmitted: false,
      feedbackSubmittedAt: '',
      auditDecision: 'pending',
      auditorName: '',
      auditorNotes: '',
      auditedAt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ASSIGNED_TO_AUTHORITY',
    }))

    const critical = generatedIssues.filter((issue) => issue.severity === 'critical').length
    const medium = generatedIssues.filter((issue) => issue.severity === 'medium').length
    const minor = generatedIssues.filter((issue) => issue.severity === 'minor').length

    setIssues(generatedIssues)
    setComplaints(generatedComplaints)
    setRoadsScanned(generatedIssues.length * 9 + Math.floor(Math.random() * 70) + 140)
    setLastRunAt(new Date().toLocaleString('en-IN'))
    setRunHistory((previous) => [
      ...previous.slice(-7),
      {
        runAt: new Date().toLocaleString('en-IN'),
        state: selectedState,
        district: selectedDistrict,
        critical,
        medium,
        minor,
      },
    ])
    setDistrictStats((previous) => ({
      ...previous,
      [selectedDistrict]: (previous[selectedDistrict] || 0) + generatedIssues.length,
    }))

    setSimulationRunning(false)
    setNotice(`Analysis completed for ${selectedDistrict}. ${generatedComplaints.length} complaints auto-generated.`)
    scheduleAutonomousLifecycle(runId)
  }

  function setSelectedState(value: string) {
    if (!INDIA_AREA_DATA[value]) return
    setSelectedStateState(value)
    const nextDistrict = INDIA_AREA_DATA[value][0]
    setSelectedDistrictState(nextDistrict.name)
    setSelectedPincodeState(nextDistrict.pincodes[0])
  }

  function setSelectedDistrict(value: string) {
    const match = availableDistricts.find((district) => district.name === value)
    if (!match) return
    setSelectedDistrictState(match.name)
    setSelectedPincodeState(match.pincodes[0])
  }

  function setSelectedPincode(value: string) {
    if (!availablePincodes.includes(value)) return
    setSelectedPincodeState(value)
  }

  function prepareComplaintDraft(complaintId: string) {
    const issue = issues.find((item) => item.complaintId === complaintId)
    if (!issue) {
      setError(`Issue ${complaintId} is unavailable.`)
      return
    }

    setComplaintDraft({
      complaintId: issue.complaintId,
      state: issue.state,
      district: issue.district,
      pincode: issue.pincode,
      issueLocation: `${issue.roadName}, ${issue.district}`,
      roadName: issue.roadName,
      severity: issue.severity,
      priority: issue.priority,
      latitude: issue.latitude,
      longitude: issue.longitude,
      description: `AI detected ${issue.severity} road damage on ${issue.roadName}`,
      reportSource: 'ai',
      issueImageName: '',
      reporterName: '',
      reporterEmail: '',
      assignedAuthority: getAuthorityNameByDistrict(issue.district),
      contractorName: '',
      repairDeadline: '',
      progressPercentage: 0,
      authorityVerified: false,
      citizenAuditorVerified: false,
      escalated: false,
      repairStartedAt: '',
      completedAt: '',
      beforeRepairImageName: '',
      afterRepairImageName: '',
      repairNotes: '',
      citizenRepairQuality: 0,
      citizenCompletionTime: 0,
      citizenOverallRating: 0,
      citizenFeedbackComment: '',
      citizenFeedbackSubmitted: false,
      feedbackSubmittedAt: '',
      auditDecision: 'pending',
      auditorName: '',
      auditorNotes: '',
      auditedAt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ASSIGNED_TO_AUTHORITY',
    })
  }

  function clearComplaintDraft() {
    setComplaintDraft(null)
  }

  function submitComplaint(payload: Partial<ComplaintRecord>) {
    const normalized = normalizeComplaint(payload)
    setComplaints((previous) => {
      const exists = previous.some((item) => item.complaintId === normalized.complaintId)
      if (exists) {
        return previous.map((item) =>
          item.complaintId === normalized.complaintId
            ? { ...normalized, updatedAt: new Date().toISOString() }
            : item
        )
      }
      return [...previous, { ...normalized, updatedAt: new Date().toISOString() }]
    })
    setNotice(`Complaint ${normalized.complaintId} submitted with status ${normalized.status}.`)
  }

  function verifyComplaint(complaintId: string) {
    setComplaints((previous) =>
      previous.map((item) =>
        item.complaintId === complaintId
          ? {
              ...item,
              authorityVerified: true,
              status:
                item.status === 'ASSIGNED_TO_CONTRACTOR' || item.status === 'REPAIR_IN_PROGRESS'
                  ? item.status
                  : 'VERIFIED_BY_AUTHORITY',
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
    setNotice(`Complaint ${complaintId} verified by Government Authority.`)
  }

  function assignContractorToComplaint(complaintId: string, contractorName: string, repairDeadline: string, priority: PriorityLevel) {
    setComplaints((previous) =>
      previous.map((item) =>
        item.complaintId === complaintId
          ? {
              ...item,
              contractorName,
              repairDeadline,
              priority,
              progressPercentage: 0,
              repairStartedAt: '',
              completedAt: '',
              status: 'ASSIGNED_TO_CONTRACTOR',
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
    setNotice(`Complaint ${complaintId} assigned to contractor ${contractorName}.`)
  }

  function startRepair(complaintId: string) {
    setComplaints((previous) =>
      previous.map((item) =>
        item.complaintId === complaintId
          ? {
              ...item,
              status: 'REPAIR_IN_PROGRESS',
              progressPercentage: Math.max(item.progressPercentage, 20),
              repairStartedAt: item.repairStartedAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
    setNotice(`Repair work started for complaint ${complaintId}.`)
  }

  function updateRepairProgress(complaintId: string, progressPercentage: number) {
    const normalizedProgress = Math.min(Math.max(progressPercentage, 0), 99)

    setComplaints((previous) =>
      previous.map((item) =>
        item.complaintId === complaintId
          ? {
              ...item,
              status: normalizedProgress > 0 ? 'REPAIR_IN_PROGRESS' : 'ASSIGNED_TO_CONTRACTOR',
              progressPercentage: normalizedProgress,
              repairStartedAt: normalizedProgress > 0 ? item.repairStartedAt || new Date().toISOString() : item.repairStartedAt,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
    setNotice(`Repair progress updated for complaint ${complaintId}.`)
  }

  function submitRepairEvidence(complaintId: string, evidence: RepairEvidencePayload) {
    setComplaints((previous) =>
      previous.map((item) =>
        item.complaintId === complaintId
          ? {
              ...item,
              beforeRepairImageName: evidence.beforeRepairImageName,
              afterRepairImageName: evidence.afterRepairImageName,
              repairNotes: evidence.repairNotes,
              progressPercentage: 100,
              repairStartedAt: item.repairStartedAt || new Date().toISOString(),
              completedAt: new Date().toISOString(),
              status: 'REPAIR_COMPLETED',
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
    setNotice(`Repair evidence submitted for complaint ${complaintId}.`)
  }

  function submitCitizenFeedback(complaintId: string, feedback: CitizenFeedbackPayload) {
    setComplaints((previous) =>
      previous.map((item) =>
        item.complaintId === complaintId
          ? {
              ...item,
              citizenRepairQuality: feedback.repairQuality,
              citizenCompletionTime: feedback.completionTime,
              citizenOverallRating: feedback.overallRating,
              citizenFeedbackComment: feedback.comments,
              citizenFeedbackSubmitted: true,
              feedbackSubmittedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
    setNotice(`Citizen feedback submitted for complaint ${complaintId}.`)
  }

  function reportRepairProblem(complaintId: string, feedback: CitizenFeedbackPayload) {
    setComplaints((previous) =>
      previous.map((item) =>
        item.complaintId === complaintId
          ? {
              ...item,
              citizenRepairQuality: feedback.repairQuality,
              citizenCompletionTime: feedback.completionTime,
              citizenOverallRating: feedback.overallRating,
              citizenFeedbackComment: feedback.comments,
              citizenFeedbackSubmitted: true,
              feedbackSubmittedAt: new Date().toISOString(),
              citizenAuditorVerified: false,
              auditDecision: 'suspicious',
              escalated: true,
              status: 'ESCALATED',
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
    setNotice(`Citizen reported a repair problem for complaint ${complaintId}.`)
  }

  function flagSuspiciousCase(complaintId: string, payload: AuditorReviewPayload) {
    setComplaints((previous) =>
      previous.map((item) =>
        item.complaintId === complaintId
          ? {
              ...item,
              escalated: true,
              auditDecision: 'suspicious',
              auditorName: payload.auditorName,
              auditorNotes: payload.notes,
              auditedAt: new Date().toISOString(),
              status: 'ESCALATED',
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
    setNotice(`Complaint ${complaintId} flagged as suspicious by Auditor Authority.`)
  }

  function reopenComplaintForAudit(complaintId: string, payload: AuditorReviewPayload) {
    setComplaints((previous) =>
      previous.map((item) =>
        item.complaintId === complaintId
          ? {
              ...item,
              citizenAuditorVerified: false,
              authorityVerified: false,
              escalated: true,
              auditDecision: 'reopened',
              auditorName: payload.auditorName,
              auditorNotes: payload.notes,
              auditedAt: new Date().toISOString(),
              status: 'ASSIGNED_TO_AUTHORITY',
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
    setNotice(`Complaint ${complaintId} reopened for fresh authority investigation.`)
  }

  function escalateComplaint(complaintId: string) {
    setComplaints((previous) =>
      previous.map((item) =>
        item.complaintId === complaintId
          ? {
              ...item,
              escalated: true,
              status: 'ESCALATED',
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
    setNotice(`Complaint ${complaintId} escalated for urgent intervention.`)
  }

  function markRepairCompleted(complaintId: string) {
    setComplaints((previous) =>
      previous.map((item) =>
        item.complaintId === complaintId
          ? {
              ...item,
              progressPercentage: 100,
              completedAt: new Date().toISOString(),
              status: 'REPAIR_COMPLETED',
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
    setNotice(`Complaint ${complaintId} marked as repair completed.`)
  }

  function markCitizenAuditorVerified(complaintId: string) {
    setComplaints((previous) =>
      previous.map((item) =>
        item.complaintId === complaintId
          ? {
              ...item,
              citizenAuditorVerified: true,
              auditDecision: 'verified',
              auditedAt: new Date().toISOString(),
              status: 'VERIFIED_BY_CITIZEN_AUDITOR',
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    )
    setNotice(`Complaint ${complaintId} verified by citizen/auditor.`)
  }

  const value: AdminControlCenterContextValue = useMemo(
    () => ({
      token,
      authLoading,
      error,
      notice,
      selectedState,
      selectedDistrict,
      selectedPincode,
      availableStates: stateList,
      availableDistricts,
      availablePincodes,
      districtCenter,
      simulationRunning,
      simulationProgress,
      simulationStep,
      mapFocusToken,
      simulationSteps,
      issues,
      complaints,
      roadsScanned,
      lastRunAt,
      runHistory,
      districtStats,
      setError,
      setNotice,
      setSelectedState,
      setSelectedDistrict,
      setSelectedPincode,
      authenticate,
      runRoadAnalysis,
      prepareComplaintDraft,
      complaintDraft,
      clearComplaintDraft,
      submitComplaint,
      verifyComplaint,
      assignContractorToComplaint,
      startRepair,
      updateRepairProgress,
      submitRepairEvidence,
      submitCitizenFeedback,
      reportRepairProblem,
      flagSuspiciousCase,
      reopenComplaintForAudit,
      escalateComplaint,
      markRepairCompleted,
      markCitizenAuditorVerified,
    }),
    [
      token,
      authLoading,
      error,
      notice,
      selectedState,
      selectedDistrict,
      selectedPincode,
      availableDistricts,
      availablePincodes,
      districtCenter,
      simulationRunning,
      simulationProgress,
      simulationStep,
      mapFocusToken,
      simulationSteps,
      issues,
      complaints,
      roadsScanned,
      lastRunAt,
      runHistory,
      districtStats,
      complaintDraft,
      verifyComplaint,
      assignContractorToComplaint,
      startRepair,
      updateRepairProgress,
      submitRepairEvidence,
      submitCitizenFeedback,
      reportRepairProblem,
      flagSuspiciousCase,
      reopenComplaintForAudit,
      escalateComplaint,
      markRepairCompleted,
      markCitizenAuditorVerified,
    ]
  )

  return <AdminControlCenterContext.Provider value={value}>{children}</AdminControlCenterContext.Provider>
}

export function useAdminControlCenter() {
  const context = useContext(AdminControlCenterContext)
  if (!context) {
    throw new Error('useAdminControlCenter must be used within AdminControlCenterProvider')
  }
  return context
}
