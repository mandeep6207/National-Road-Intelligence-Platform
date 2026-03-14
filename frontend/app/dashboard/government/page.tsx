'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAdminControlCenter, type ComplaintRecord, type PriorityLevel } from '@/components/admin/AdminControlCenterContext'
import { fetchContractorSuggestions } from '@/lib/api'

const GovernmentWorkflowMap = dynamic(() => import('@/components/map/GovernmentWorkflowMap'), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
})

const PRIORITY_OPTIONS: PriorityLevel[] = ['HIGH', 'MEDIUM', 'LOW']

function isCompletedStatus(status: ComplaintRecord['status']) {
  return status === 'REPAIR_COMPLETED' || status === 'VERIFIED_BY_CITIZEN_AUDITOR' || status === 'CLOSED'
}

export default function GovernmentDashboardPage() {
  const {
    selectedDistrict,
    setSelectedDistrict,
    availableDistricts,
    districtCenter,
    mapFocusToken,
    complaints,
    verifyComplaint,
    assignContractorToComplaint,
    escalateComplaint,
    markRepairCompleted,
    markCitizenAuditorVerified,
  } = useAdminControlCenter()

  const [selectedComplaintId, setSelectedComplaintId] = useState('')
  const [contractorName, setContractorName] = useState('')
  const [repairDeadline, setRepairDeadline] = useState('')
  const [priorityLevel, setPriorityLevel] = useState<PriorityLevel>('MEDIUM')
  const [imagePreviewId, setImagePreviewId] = useState('')
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestionError, setSuggestionError] = useState('')
  const [recommendedContractors, setRecommendedContractors] = useState<Array<{
    contractor_id: string
    company_name: string
    district_match: boolean
    availability_score: number
    performance_score: number
    recommendation_score: number
  }>>([])

  const districtComplaints = useMemo(
    () => complaints.filter((complaint) => complaint.district === selectedDistrict),
    [complaints, selectedDistrict]
  )

  const selectedComplaint = useMemo(
    () => districtComplaints.find((complaint) => complaint.complaintId === selectedComplaintId) || null,
    [districtComplaints, selectedComplaintId]
  )

  const contractorStats = useMemo(() => {
    const stats: Record<string, { assigned: number; completed: number; delayed: number }> = {}
    const today = new Date()

    districtComplaints.forEach((complaint) => {
      if (!complaint.contractorName) return
      if (!stats[complaint.contractorName]) {
        stats[complaint.contractorName] = { assigned: 0, completed: 0, delayed: 0 }
      }

      const status = complaint.status
      if (status === 'ASSIGNED_TO_CONTRACTOR' || status === 'REPAIR_IN_PROGRESS' || status === 'VERIFIED_BY_AUTHORITY') {
        stats[complaint.contractorName].assigned += 1
      }
      if (isCompletedStatus(status)) {
        stats[complaint.contractorName].completed += 1
      }
      if (complaint.repairDeadline && !isCompletedStatus(status) && new Date(complaint.repairDeadline) < today) {
        stats[complaint.contractorName].delayed += 1
      }
    })

    return Object.entries(stats).map(([contractor, value]) => ({ contractor, ...value }))
  }, [districtComplaints])

  const performanceChartData = useMemo(
    () => contractorStats.map((item) => ({
      contractor: item.contractor,
      completed: item.completed,
      delayed: item.delayed,
      assigned: item.assigned,
    })),
    [contractorStats]
  )

  const queueRows = districtComplaints

  useEffect(() => {
    if (!selectedComplaint) {
      setRecommendedContractors([])
      setSuggestionError('')
      return
    }

    const severityForApi = selectedComplaint.severity === 'critical'
      ? 'critical'
      : selectedComplaint.severity === 'medium'
        ? 'moderate'
        : 'low'

    let active = true
    setLoadingSuggestions(true)
    setSuggestionError('')

    fetchContractorSuggestions(selectedComplaint.district, selectedComplaint.state, severityForApi)
      .then((response) => {
        if (!active) return
        setRecommendedContractors(response.suggestions || [])
      })
      .catch((error: any) => {
        if (!active) return
        setSuggestionError(error?.message || 'Could not load contractor recommendations.')
        setRecommendedContractors([])
      })
      .finally(() => {
        if (!active) return
        setLoadingSuggestions(false)
      })

    return () => {
      active = false
    }
  }, [selectedComplaint])

  function openAssignment(complaint: ComplaintRecord) {
    setSelectedComplaintId(complaint.complaintId)
    setContractorName(complaint.contractorName || '')
    setRepairDeadline(complaint.repairDeadline || '')
    setPriorityLevel(complaint.priority)
  }

  function handleAssignContractor() {
    if (!selectedComplaintId || !contractorName || !repairDeadline) return
    assignContractorToComplaint(selectedComplaintId, contractorName, repairDeadline, priorityLevel)
  }

  function useRecommendation(companyName: string) {
    setContractorName(companyName)
    if (!repairDeadline) {
      const defaultDue = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      setRepairDeadline(defaultDue)
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Complaint Queue</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{queueRows.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Assigned To Contractor</p>
          <p className="mt-1 text-2xl font-extrabold text-[#1f4e79]">
            {queueRows.filter((item) => item.status === 'ASSIGNED_TO_CONTRACTOR').length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Repair Completed</p>
          <p className="mt-1 text-2xl font-extrabold text-[#16a34a]">
            {queueRows.filter((item) => isCompletedStatus(item.status)).length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Escalated Issues</p>
          <p className="mt-1 text-2xl font-extrabold text-[#f59e0b]">
            {queueRows.filter((item) => item.status === 'ESCALATED').length}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">District Monitoring Map</label>
            <select
              value={selectedDistrict}
              onChange={(event) => setSelectedDistrict(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {availableDistricts.map((district) => (
                <option key={district.name} value={district.name}>{district.name}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-slate-600">
            Marker legend: <span className="font-semibold text-red-600">Red Active Potholes</span> | <span className="font-semibold text-orange-600">Orange Assigned Repairs</span> | <span className="font-semibold text-green-600">Green Completed Repairs</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <GovernmentWorkflowMap
          center={districtCenter}
          focusToken={mapFocusToken}
          complaints={districtComplaints}
          onViewImage={setImagePreviewId}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-bold text-[#0d3b5c]">Complaint Queue</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {['Complaint ID', 'Road', 'District', 'Severity', 'Priority', 'Status', 'Actions'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queueRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                      No issues assigned. Run analysis in Super Admin dashboard.
                    </td>
                  </tr>
                )}

                {queueRows.map((row) => (
                  <tr key={row.complaintId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{row.complaintId}</td>
                    <td className="px-4 py-3">{row.roadName}</td>
                    <td className="px-4 py-3">{row.district}</td>
                    <td className="px-4 py-3 capitalize">{row.severity}</td>
                    <td className="px-4 py-3">{row.priority}</td>
                    <td className="px-4 py-3 text-xs">{row.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setImagePreviewId(row.complaintId)} className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">View pothole image</button>
                        <button onClick={() => verifyComplaint(row.complaintId)} className="rounded border border-[#1f4e79] px-2 py-1 text-xs text-[#1f4e79] hover:bg-blue-50">Verify issue</button>
                        <button onClick={() => openAssignment(row)} className="rounded border border-[#0d3b5c] px-2 py-1 text-xs text-[#0d3b5c] hover:bg-slate-100">Assign contractor</button>
                        <button onClick={() => openAssignment(row)} className="rounded border border-[#f59e0b] px-2 py-1 text-xs text-[#9a5b00] hover:bg-amber-50">Set repair deadline</button>
                        <button onClick={() => escalateComplaint(row.complaintId)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50">Escalate issue</button>
                        <button onClick={() => markRepairCompleted(row.complaintId)} className="rounded border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50">Mark repair complete</button>
                        <button onClick={() => markCitizenAuditorVerified(row.complaintId)} className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50">Citizen/Auditor verify</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-base font-bold text-[#0d3b5c]">Contractor Assignment Panel</h3>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Complaint ID</label>
                <select
                  value={selectedComplaintId}
                  onChange={(event) => {
                    const selected = districtComplaints.find((item) => item.complaintId === event.target.value)
                    if (selected) openAssignment(selected)
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select complaint</option>
                  {districtComplaints.map((complaint) => (
                    <option key={complaint.complaintId} value={complaint.complaintId}>{complaint.complaintId}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Contractor Name</label>
                <input
                  value={contractorName}
                  onChange={(event) => setContractorName(event.target.value)}
                  placeholder="Enter contractor name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Repair Deadline</label>
                <input
                  type="date"
                  value={repairDeadline}
                  onChange={(event) => setRepairDeadline(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Priority Level</label>
                <select
                  value={priorityLevel}
                  onChange={(event) => setPriorityLevel(event.target.value as PriorityLevel)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAssignContractor}
                disabled={!selectedComplaintId || !contractorName || !repairDeadline}
                className="w-full rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a] disabled:opacity-60"
              >
                Assign to Contractor
              </button>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">AI Contractor Suggestions</p>
                {loadingSuggestions && <p className="mt-2 text-sm text-slate-600">Loading recommendations...</p>}
                {!loadingSuggestions && suggestionError && <p className="mt-2 text-sm text-red-700">{suggestionError}</p>}
                {!loadingSuggestions && !suggestionError && recommendedContractors.length === 0 && (
                  <p className="mt-2 text-sm text-slate-600">Select a complaint to get automated recommendations.</p>
                )}
                <div className="mt-2 space-y-2">
                  {recommendedContractors.map((suggestion) => (
                    <div key={suggestion.contractor_id} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs">
                      <p className="font-semibold text-slate-800">{suggestion.company_name}</p>
                      <p className="mt-1 text-slate-600">
                        Score: {suggestion.recommendation_score} | Availability: {suggestion.availability_score}% | Performance: {suggestion.performance_score}
                      </p>
                      <button
                        onClick={() => useRecommendation(suggestion.company_name)}
                        className="mt-2 rounded border border-[#1f4e79] px-2 py-1 font-semibold text-[#1f4e79] hover:bg-blue-50"
                      >
                        Use Suggestion
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-base font-bold text-[#0d3b5c]">Repair Monitoring Table</h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {['Contractor', 'Assigned Jobs', 'Completed Jobs', 'Delayed Jobs'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contractorStats.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">Assign contractors to view monitoring performance.</td>
                    </tr>
                  )}
                  {contractorStats.map((item) => (
                    <tr key={item.contractor} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{item.contractor}</td>
                      <td className="px-4 py-3">{item.assigned}</td>
                      <td className="px-4 py-3 text-green-700">{item.completed}</td>
                      <td className="px-4 py-3 text-red-700">{item.delayed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-base font-bold text-[#0d3b5c]">Performance Analytics</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={performanceChartData}>
            <XAxis dataKey="contractor" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="assigned" fill="#1f4e79" name="Assigned Jobs" />
            <Bar dataKey="completed" fill="#16a34a" name="Completed Jobs" />
            <Bar dataKey="delayed" fill="#dc2626" name="Delayed Jobs" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {imagePreviewId && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/65 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <h4 className="text-lg font-bold text-[#0d3b5c]">Pothole Image Viewer</h4>
            <p className="mt-1 text-sm text-slate-600">Complaint ID: {imagePreviewId}</p>
            <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
              Captured image placeholder for governance review
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setImagePreviewId('')}
                className="rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
