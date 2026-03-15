'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'
import {
  AUTHORITY_STATE,
  assignQueueComplaintsToContractors,
  getCgReportsUpdateEventName,
  getSeedContractorPerformance,
  loadContractorAssignmentResults,
  loadContractorQueue,
  resetContractorManagementDemoData,
  type ChhattisgarhAssignmentResult,
  type ChhattisgarhContractorPerformance,
  type ChhattisgarhQueueComplaint,
} from '@/lib/chhattisgarhAuthorityData'

const ASSIGNMENT_PROCESS_MESSAGES = [
  'Analyzing complaint severity...',
  'Matching contractors by district...',
  'Checking contractor availability...',
]

function formatSeverity(value: ChhattisgarhQueueComplaint['severity'] | ChhattisgarhAssignmentResult['severity']) {
  return value
}

function completionRate(item: ChhattisgarhContractorPerformance) {
  return item.assigned_jobs > 0 ? Number(((item.completed_jobs / item.assigned_jobs) * 100).toFixed(1)) : 0
}

export default function ContractorManagementPage() {
  const { setNotice } = useAdminControlCenter()

  const [queue, setQueue] = useState<ChhattisgarhQueueComplaint[]>([])
  const [assignmentResults, setAssignmentResults] = useState<ChhattisgarhAssignmentResult[]>([])
  const [assignmentProcessing, setAssignmentProcessing] = useState(false)
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)

  const contractorPerformance = useMemo(() => getSeedContractorPerformance(), [])

  useEffect(() => {
    const refresh = () => {
      setQueue(loadContractorQueue())
      setAssignmentResults(loadContractorAssignmentResults())
    }

    refresh()
    window.addEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
    return () => {
      window.removeEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
    }
  }, [])

  const assignableComplaints = useMemo(
    () => queue.filter((item) => item.status === 'ASSIGNED_TO_AUTHORITY' || item.status === 'ESCALATED'),
    [queue]
  )

  const jobDistributionData = useMemo(
    () => contractorPerformance.map((item) => ({ contractor: item.contractor, assignedJobs: item.assigned_jobs })),
    [contractorPerformance]
  )

  const repairCompletionRateData = useMemo(
    () => contractorPerformance.map((item) => ({ contractor: item.contractor, completionRate: completionRate(item) })),
    [contractorPerformance]
  )

  const delayedRepairsData = useMemo(
    () => contractorPerformance.map((item) => ({ contractor: item.contractor, delayedJobs: item.delayed_jobs })),
    [contractorPerformance]
  )

  async function handleAssignAll() {
    if (assignmentProcessing || assignableComplaints.length === 0) return

    setAssignmentProcessing(true)
    setProcessingMessageIndex(0)

    let index = 0
    const intervalId = window.setInterval(() => {
      index = (index + 1) % ASSIGNMENT_PROCESS_MESSAGES.length
      setProcessingMessageIndex(index)
    }, 900)

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 3000))
      const results = assignQueueComplaintsToContractors()
      setAssignmentResults(results)
      setQueue(loadContractorQueue())
      setShowSuccessPopup(true)
      setNotice('All complaints successfully assigned.')
    } finally {
      window.clearInterval(intervalId)
      setAssignmentProcessing(false)
      setProcessingMessageIndex(0)
    }
  }

  function handleResetDemoData() {
    resetContractorManagementDemoData()
    setQueue(loadContractorQueue())
    setAssignmentResults(loadContractorAssignmentResults())
    setShowSuccessPopup(false)
    setNotice('Contractor management demo data reset.')
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Module 3</p>
            <h2 className="text-base font-bold text-[#0d3b5c]">Contractor Management System</h2>
            <p className="mt-1 text-sm text-slate-600">Demonstration workflow for {AUTHORITY_STATE} complaint queue, assignment, and contractor analytics.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetDemoData}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset Demo Data
            </button>
            <Link
              href="/dashboard/government"
              className="rounded-lg border border-[#1f4e79] px-3 py-1.5 text-xs font-semibold text-[#1f4e79] hover:bg-blue-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Step 1</p>
            <h3 className="text-base font-bold text-[#0d3b5c]">Complaint Queue</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            State: {AUTHORITY_STATE}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Complaint ID', 'Road Name', 'District', 'Severity', 'Priority', 'Status', 'Assigned Contractor', 'Deadline'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{row.id}</td>
                  <td className="px-4 py-3">{row.road}</td>
                  <td className="px-4 py-3">{row.district}</td>
                  <td className="px-4 py-3">{formatSeverity(row.severity)}</td>
                  <td className="px-4 py-3">{row.priority}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">{row.status}</td>
                  <td className="px-4 py-3">{row.contractor || 'Unassigned'}</td>
                  <td className="px-4 py-3">{row.deadline || 'Not set'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Step 2</p>
          <h3 className="mt-1 text-base font-bold text-[#0d3b5c]">One Click Contractor Assignment</h3>

          <div className="mt-3 space-y-3">
            <button
              type="button"
              onClick={handleAssignAll}
              disabled={assignmentProcessing || assignableComplaints.length === 0}
              className="w-full rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a] disabled:opacity-60"
            >
              Assign All To Contractor
            </button>

            {assignmentProcessing && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Processing...</p>
                <p className="mt-1 text-sm font-semibold text-amber-900">{ASSIGNMENT_PROCESS_MESSAGES[processingMessageIndex]}</p>
              </div>
            )}

            {!assignmentProcessing && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                Assignable complaints in queue: <span className="font-semibold">{assignableComplaints.length}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4" id="assigned-results">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Step 3</p>
          <h3 className="mt-1 text-base font-bold text-[#0d3b5c]">Assignment Result Data</h3>

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {['Complaint ID', 'Contractor Name', 'District', 'Severity', 'Repair Deadline', 'Status'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignmentResults.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                      Click Assign All To Contractor to generate assignment results.
                    </td>
                  </tr>
                )}

                {assignmentResults.map((row) => (
                  <tr key={row.complaint_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{row.complaint_id}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/government/contractors/${encodeURIComponent(row.contractor)}`}
                        className="font-semibold text-[#1f4e79] hover:text-[#0d3b5c]"
                      >
                        {row.contractor}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.district}</td>
                    <td className="px-4 py-3">{formatSeverity(row.severity)}</td>
                    <td className="px-4 py-3">{row.deadline}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-[#0d3b5c]">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Step 4</p>
        <h3 className="mt-1 text-base font-bold text-[#0d3b5c]">Contractor Performance Analytics</h3>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Contractor', 'Assigned Jobs', 'Completed Jobs', 'Delayed Jobs', 'Trust Score'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contractorPerformance.map((row) => (
                <tr key={row.contractor} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-[#1f4e79]">{row.contractor}</td>
                  <td className="px-4 py-3">{row.assigned_jobs}</td>
                  <td className="px-4 py-3">{row.completed_jobs}</td>
                  <td className="px-4 py-3">{row.delayed_jobs}</td>
                  <td className="px-4 py-3">{row.trust_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-6 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h4 className="mb-2 text-sm font-semibold text-[#0d3b5c]">Contractor Job Distribution</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={jobDistributionData}>
                <XAxis dataKey="contractor" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => `${value} jobs`} />
                <Bar dataKey="assignedJobs" fill="#1f4e79" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h4 className="mb-2 text-sm font-semibold text-[#0d3b5c]">Repair Completion Rate</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={repairCompletionRateData}>
                <XAxis dataKey="contractor" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="completionRate" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h4 className="mb-2 text-sm font-semibold text-[#0d3b5c]">Delayed Repairs Comparison</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={delayedRepairsData}>
                <XAxis dataKey="contractor" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => `${value} delayed`} />
                <Bar dataKey="delayedJobs" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {showSuccessPopup && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/65 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h4 className="text-lg font-bold text-[#0d3b5c]">Assignment Complete</h4>
            <p className="mt-2 text-sm text-slate-700">All complaints successfully assigned.</p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSuccessPopup(false)}
                className="rounded-lg bg-[#0d3b5c] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0a304a]"
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
