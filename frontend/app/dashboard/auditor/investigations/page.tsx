'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'

function AuditorInvestigationsContent() {
  const searchParams = useSearchParams()
  const caseFromQuery = searchParams.get('case') || ''

  const {
    complaints,
    markCitizenAuditorVerified,
    flagSuspiciousCase,
    reopenComplaintForAudit,
  } = useAdminControlCenter()

  const [selectedComplaintId, setSelectedComplaintId] = useState(caseFromQuery)
  const [auditorName, setAuditorName] = useState('Auditor Authority')
  const [auditorNotes, setAuditorNotes] = useState('')

  const auditCases = useMemo(
    () => complaints.filter((item) => ['REPAIR_COMPLETED', 'VERIFIED_BY_CITIZEN_AUDITOR', 'ESCALATED'].includes(item.status)),
    [complaints]
  )

  const selectedCase = useMemo(
    () => auditCases.find((item) => item.complaintId === selectedComplaintId) || auditCases[0] || null,
    [auditCases, selectedComplaintId]
  )

  const timeline = selectedCase
    ? [
        { label: 'Reported', value: selectedCase.createdAt },
        { label: 'Repair Started', value: selectedCase.repairStartedAt },
        { label: 'Repair Completed', value: selectedCase.completedAt },
        { label: 'Citizen Feedback', value: selectedCase.feedbackSubmittedAt },
        { label: 'Audited At', value: selectedCase.auditedAt },
      ]
    : []

  if (!selectedCase) {
    return <div className="text-sm text-slate-500">No cases available for investigation.</div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f4e79]">Complaint Investigation</p>
        <h2 className="mt-2 text-lg font-bold text-[#0d3b5c]">Evidence & Timeline Investigation</h2>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Select Audit Case</label>
        <select
          value={selectedCase.complaintId}
          onChange={(event) => setSelectedComplaintId(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {auditCases.map((item) => (
            <option key={item.complaintId} value={item.complaintId}>{item.complaintId} - {item.roadName}</option>
          ))}
        </select>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-base font-bold text-[#0d3b5c]">Complaint Investigation Details</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <p><span className="font-semibold">Complaint ID:</span> {selectedCase.complaintId}</p>
            <p><span className="font-semibold">Road:</span> {selectedCase.roadName}</p>
            <p><span className="font-semibold">District:</span> {selectedCase.district}</p>
            <p><span className="font-semibold">Severity:</span> <span className="capitalize">{selectedCase.severity}</span></p>
            <p><span className="font-semibold">Contractor:</span> {selectedCase.contractorName || 'Unassigned'}</p>
            <p><span className="font-semibold">Status:</span> {selectedCase.status}</p>
          </div>

          <h4 className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-[#1f4e79]">Repair Timeline</h4>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            {timeline.map((event) => (
              <div key={event.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="font-semibold text-slate-700">{event.label}:</span> {event.value ? new Date(event.value).toLocaleString('en-IN') : 'Pending'}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-base font-bold text-[#0d3b5c]">Repair Evidence Review</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Before Repair Image</p>
              <div className="mt-2 flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-500">
                {selectedCase.beforeRepairImageName || selectedCase.issueImageName || 'No image'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">After Repair Image</p>
              <div className="mt-2 flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-500">
                {selectedCase.afterRepairImageName || 'Awaiting evidence'}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">Citizen Feedback</p>
            <p className="mt-1">Rating: {selectedCase.citizenOverallRating || 0}/5</p>
            <p>Comment: {selectedCase.citizenFeedbackComment || 'No feedback submitted'}</p>
          </div>

          <div className="mt-4 space-y-3">
            <input
              value={auditorName}
              onChange={(event) => setAuditorName(event.target.value)}
              placeholder="Auditor name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              value={auditorNotes}
              onChange={(event) => setAuditorNotes(event.target.value)}
              rows={3}
              placeholder="Audit notes"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => markCitizenAuditorVerified(selectedCase.complaintId)}
                className="rounded-lg bg-[#0d3b5c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0a304a]"
              >
                Verify Repair
              </button>
              <button
                type="button"
                onClick={() => flagSuspiciousCase(selectedCase.complaintId, { auditorName, notes: auditorNotes })}
                className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Flag Suspicious
              </button>
              <button
                type="button"
                onClick={() => reopenComplaintForAudit(selectedCase.complaintId, { auditorName, notes: auditorNotes })}
                className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              >
                Reopen Complaint
              </button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

export default function AuditorInvestigationsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading investigations...</div>}>
      <AuditorInvestigationsContent />
    </Suspense>
  )
}