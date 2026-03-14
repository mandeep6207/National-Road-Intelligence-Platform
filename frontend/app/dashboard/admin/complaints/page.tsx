'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilePlus2 } from 'lucide-react'
import { useAdminControlCenter, type ComplaintRecord, type PriorityLevel, type SimulationSeverity } from '@/components/admin/AdminControlCenterContext'

interface ComplaintFormState {
  complaintId: string
  state: string
  district: string
  pincode: string
  roadName: string
  severity: SimulationSeverity
  priority: PriorityLevel
  description: string
}

function toFormState(record: ComplaintRecord): ComplaintFormState {
  return {
    complaintId: record.complaintId,
    state: record.state,
    district: record.district,
    pincode: record.pincode,
    roadName: record.roadName,
    severity: record.severity,
    priority: record.priority,
    description: record.description,
  }
}

export default function ComplaintManagementPage() {
  const {
    selectedState,
    selectedDistrict,
    selectedPincode,
    complaintDraft,
    clearComplaintDraft,
    complaints,
    submitComplaint,
  } = useAdminControlCenter()

  const initialForm = useMemo<ComplaintFormState>(
    () => ({
      complaintId: `CMP-MANUAL-${Date.now().toString().slice(-6)}`,
      state: selectedState,
      district: selectedDistrict,
      pincode: selectedPincode,
      roadName: '',
      severity: 'medium',
      priority: 'MEDIUM',
      description: '',
    }),
    [selectedState, selectedDistrict, selectedPincode]
  )

  const [form, setForm] = useState<ComplaintFormState>(initialForm)

  useEffect(() => {
    if (!complaintDraft) return
    setForm(toFormState(complaintDraft))
  }, [complaintDraft])

  function updatePriority(severity: SimulationSeverity, roadName: string) {
    const isHighway = /NH|SH|Expressway|Highway/i.test(roadName)
    if (severity === 'critical' && isHighway) return 'HIGH'
    if (severity === 'medium') return 'MEDIUM'
    return 'LOW'
  }

  function resetToDefault() {
    setForm({
      complaintId: `CMP-MANUAL-${Date.now().toString().slice(-6)}`,
      state: selectedState,
      district: selectedDistrict,
      pincode: selectedPincode,
      roadName: '',
      severity: 'medium',
      priority: 'MEDIUM',
      description: '',
    })
    clearComplaintDraft()
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!form.complaintId || !form.state || !form.district || !form.roadName || !form.description) {
      return
    }

    submitComplaint({
      complaintId: form.complaintId,
      state: form.state,
      district: form.district,
      pincode: form.pincode,
      roadName: form.roadName,
      severity: form.severity,
      priority: form.priority,
      latitude: 0,
      longitude: 0,
      description: form.description,
      assignedAuthority: `${form.district} District Authority`,
      contractorName: '',
      repairDeadline: '',
      authorityVerified: false,
      citizenAuditorVerified: false,
      escalated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ASSIGNED_TO_AUTHORITY',
    })

    resetToDefault()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <FilePlus2 className="h-5 w-5 text-[#1f4e79]" />
          <h2 className="text-lg font-bold text-[#0d3b5c]">Complaint Management</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Complaint ID</label>
            <input
              value={form.complaintId}
              onChange={(event) => setForm((prev) => ({ ...prev, complaintId: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">State</label>
            <input
              value={form.state}
              onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">District</label>
            <input
              value={form.district}
              onChange={(event) => setForm((prev) => ({ ...prev, district: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pincode</label>
            <input
              value={form.pincode}
              onChange={(event) => setForm((prev) => ({ ...prev, pincode: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Road</label>
            <input
              value={form.roadName}
              onChange={(event) => {
                const roadName = event.target.value
                setForm((prev) => ({
                  ...prev,
                  roadName,
                  priority: updatePriority(prev.severity, roadName),
                }))
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Severity</label>
            <select
              value={form.severity}
              onChange={(event) => {
                const severity = event.target.value as SimulationSeverity
                setForm((prev) => ({
                  ...prev,
                  severity,
                  priority: updatePriority(severity, prev.roadName),
                }))
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="critical">Critical</option>
              <option value="medium">Medium</option>
              <option value="minor">Minor</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Priority</label>
            <input value={form.priority} readOnly className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm" />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Description</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button type="submit" className="rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a]">
              Submit Complaint
            </button>
            <button type="button" onClick={resetToDefault} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Reset Form
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-[#0d3b5c]">Complaint Register</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Complaint ID', 'State', 'District', 'Road', 'Severity', 'Priority', 'Status'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No complaints registered yet.
                  </td>
                </tr>
              )}
              {complaints.map((complaint) => (
                <tr key={complaint.complaintId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{complaint.complaintId}</td>
                  <td className="px-4 py-3">{complaint.state}</td>
                  <td className="px-4 py-3">{complaint.district}</td>
                  <td className="px-4 py-3">{complaint.roadName}</td>
                  <td className="px-4 py-3 capitalize">{complaint.severity}</td>
                  <td className="px-4 py-3">{complaint.priority}</td>
                  <td className="px-4 py-3 text-blue-700">{complaint.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
