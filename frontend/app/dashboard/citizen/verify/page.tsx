'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'
import { recordCitizenVerificationEvent, type CitizenStatsResponse } from '@/lib/api'

type FeedbackState = {
  repairQuality: number
  completionTime: number
  overallRating: number
  comments: string
}

export default function CitizenVerifyRepairsPage() {
  const { complaints, markCitizenAuditorVerified, submitCitizenFeedback, reportRepairProblem } = useAdminControlCenter()
  const [userEmail, setUserEmail] = useState('citizen@nrip.gov.in')
  const [feedbackByComplaint, setFeedbackByComplaint] = useState<Record<string, FeedbackState>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [verificationError, setVerificationError] = useState('')
  const [verificationNotice, setVerificationNotice] = useState('')

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('nrip_user')
      if (!raw) return
      const parsed = JSON.parse(raw) as { email?: string }
      if (parsed.email) setUserEmail(parsed.email)
    } catch {
      setUserEmail('citizen@nrip.gov.in')
    }
  }, [])

  const verifiableRepairs = useMemo(
    () =>
      complaints.filter(
        (item) =>
          (item.reporterEmail === userEmail || (item.reportSource === 'citizen' && !item.reporterEmail)) &&
          (item.status === 'REPAIR_COMPLETED' || item.status === 'VERIFIED_BY_CITIZEN_AUDITOR' || item.status === 'ESCALATED')
      ),
    [complaints, userEmail]
  )

  function getFeedbackState(complaintId: string): FeedbackState {
    return (
      feedbackByComplaint[complaintId] || {
        repairQuality: 4,
        completionTime: 4,
        overallRating: 4,
        comments: '',
      }
    )
  }

  function updateFeedback(complaintId: string, patch: Partial<FeedbackState>) {
    setFeedbackByComplaint((previous) => ({
      ...previous,
      [complaintId]: {
        ...getFeedbackState(complaintId),
        ...patch,
      },
    }))
  }

  async function handleVerifyRepair(complaintId: string, feedback: FeedbackState) {
    setProcessingId(complaintId)
    setVerificationError('')
    setVerificationNotice('')

    try {
      submitCitizenFeedback(complaintId, feedback)
      markCitizenAuditorVerified(complaintId)

      const rewardResult: CitizenStatsResponse = await recordCitizenVerificationEvent(complaintId)
      const newBadges = rewardResult.new_badges || []
      const badgeSuffix = newBadges.length > 0 ? ` New badges: ${newBadges.join(', ')}.` : ''
      const tokenValue = rewardResult.awarded_tokens ?? 0
      const tokenSuffix = tokenValue > 0 ? ` +${tokenValue} tokens awarded.` : ''
      setVerificationNotice(`Repair verified successfully.${tokenSuffix}${badgeSuffix}`)
    } catch (verifyError: any) {
      setVerificationError(verifyError?.message || 'Unable to update citizen rewards at this time.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f4e79]">Verify Repairs</p>
        <h2 className="mt-2 text-lg font-bold text-[#0d3b5c]">Citizen Repair Verification & Feedback</h2>
      </section>

      {verificationNotice && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {verificationNotice}
        </section>
      )}

      {verificationError && (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {verificationError}
        </section>
      )}

      {verifiableRepairs.length === 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No completed repairs are awaiting your verification yet.
        </section>
      )}

      {verifiableRepairs.map((repair) => {
        const feedback = getFeedbackState(repair.complaintId)

        return (
          <section key={repair.complaintId} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#0d3b5c]">{repair.roadName}</h3>
                <p className="mt-1 text-sm text-slate-600">{repair.complaintId} | {repair.district}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{repair.status}</span>
            </div>

            <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_1fr]">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Before Repair Image</p>
                  <div className="mt-3 flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                    {repair.beforeRepairImageName || repair.issueImageName || 'No image available'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">After Repair Image</p>
                  <div className="mt-3 flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                    {repair.afterRepairImageName || 'Awaiting contractor upload'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Repair Quality</label>
                    <select value={feedback.repairQuality} onChange={(event) => updateFeedback(repair.complaintId, { repairQuality: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Completion Time</label>
                    <select value={feedback.completionTime} onChange={(event) => updateFeedback(repair.complaintId, { completionTime: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Overall Rating</label>
                    <select value={feedback.overallRating} onChange={(event) => updateFeedback(repair.complaintId, { overallRating: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Feedback</label>
                  <textarea
                    value={feedback.comments}
                    onChange={(event) => updateFeedback(repair.complaintId, { comments: event.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Share whether the repair quality and completion time were satisfactory."
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleVerifyRepair(repair.complaintId, feedback)}
                    disabled={processingId === repair.complaintId}
                    className="rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {processingId === repair.complaintId ? 'Verifying...' : 'Verify Repair'}
                  </button>
                  <button
                    type="button"
                    onClick={() => reportRepairProblem(repair.complaintId, feedback)}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Report Problem
                  </button>
                </div>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}