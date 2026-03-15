'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAdminControlCenter, type ComplaintRecord } from '@/components/admin/AdminControlCenterContext'
import ReportDetailModal, { type ReportDetailFallback } from '@/components/ReportDetailModal'
import { resolveStoredImageUrl, type AiWebcamDetectionStatus } from '@/lib/api'

function getCitizenStatus(status: ComplaintRecord['status']) {
  if (status === 'REPAIR_IN_PROGRESS') return 'Repair In Progress'
  if (status === 'REPAIR_COMPLETED') return 'Completed'
  if (status === 'VERIFIED_BY_CITIZEN_AUDITOR' || status === 'CLOSED') return 'Verified'
  if (status === 'ASSIGNED_TO_CONTRACTOR' || status === 'VERIFIED_BY_AUTHORITY') return 'Assigned'
  return 'Reported'
}

export default function CitizenComplaintsPage() {
  const { complaints } = useAdminControlCenter()
  const [userEmail, setUserEmail] = useState('citizen@nrip.gov.in')
  const [aiComplaints, setAiComplaints] = useState<AiWebcamDetectionStatus[]>([])
  const [previewReportId, setPreviewReportId] = useState<string | null>(null)
  const [previewFallback, setPreviewFallback] = useState<ReportDetailFallback | null>(null)

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

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem('ai_detected_complaints') || '[]') as AiWebcamDetectionStatus[]
      setAiComplaints(stored.slice().reverse()) // most recent first
    } catch {
      setAiComplaints([])
    }
  }, [])

  const myComplaints = useMemo(
    () => complaints.filter((item) => item.reporterEmail === userEmail || (item.reportSource === 'citizen' && !item.reporterEmail)),
    [complaints, userEmail]
  )

  function buildComplaintFallback(complaint: ComplaintRecord): ReportDetailFallback {
    return {
      id: complaint.complaintId,
      complaint_id: complaint.complaintId,
      type: 'pothole',
      severity: complaint.severity,
      latitude: complaint.latitude,
      longitude: complaint.longitude,
      state: complaint.state,
      district: complaint.district,
      pincode: complaint.pincode,
      road_name: complaint.roadName,
      timestamp: complaint.createdAt,
      status: getCitizenStatus(complaint.status),
      source: complaint.reportSource,
      image: resolveStoredImageUrl(complaint.issueImageName),
    }
  }

  function buildAiFallback(complaint: AiWebcamDetectionStatus): ReportDetailFallback {
    const reportId = complaint.complaint_id || 'AI-UNKNOWN'
    return {
      id: reportId,
      complaint_id: reportId,
      type: 'pothole',
      severity: complaint.severity,
      risk_score: complaint.risk_score,
      confidence: complaint.confidence,
      latitude: complaint.latitude,
      longitude: complaint.longitude,
      state: complaint.state,
      district: complaint.district,
      pincode: complaint.pincode,
      timestamp: complaint.timestamp,
      status: 'AUTO GENERATED',
      source: complaint.source || 'webcam',
      image: resolveStoredImageUrl(complaint.image),
    }
  }

  function openReportPreview(reportId: string, fallback: ReportDetailFallback | null = null) {
    setPreviewReportId(reportId)
    setPreviewFallback(fallback)
  }

  function closeReportPreview() {
    setPreviewReportId(null)
    setPreviewFallback(null)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f4e79]">Track Complaints</p>
        <h2 className="mt-2 text-lg font-bold text-[#0d3b5c]">Citizen Complaint Register</h2>
      </section>

      {aiComplaints.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-red-700">AI Auto-Detected Road Damage ({aiComplaints.length})</p>
          <div className="overflow-x-auto rounded-xl border border-red-100">
            <table className="w-full text-sm">
              <thead className="bg-red-50 text-xs uppercase tracking-wide text-red-600">
                <tr>
                  {['Snapshot', 'Complaint ID', 'Severity', 'District', 'Status', 'Time'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {aiComplaints.map((c) => (
                  <tr key={c.complaint_id} className="hover:bg-red-50">
                    <td className="px-4 py-3">
                      {resolveStoredImageUrl(c.image) ? (
                        <button type="button" onClick={() => openReportPreview(c.complaint_id || 'AI-UNKNOWN', buildAiFallback(c))}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={resolveStoredImageUrl(c.image) || ''} alt={`Snapshot ${c.complaint_id}`} className="h-14 w-20 rounded-lg object-cover" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">No snapshot</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-red-700">
                      <button type="button" onClick={() => openReportPreview(c.complaint_id || 'AI-UNKNOWN', buildAiFallback(c))}>
                        {c.complaint_id}
                      </button>
                    </td>
                    <td className="px-4 py-3">{c.severity ?? '—'}</td>
                    <td className="px-4 py-3">{c.district ?? '—'}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-amber-600">AUTO GENERATED</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {c.timestamp ? new Date(c.timestamp).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Snapshot', 'Complaint ID', 'Road', 'District', 'Status', 'Submitted'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myComplaints.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No citizen complaints found yet. Submit a road issue to start tracking progress.
                  </td>
                </tr>
              )}
              {myComplaints.map((complaint) => (
                <tr key={complaint.complaintId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {resolveStoredImageUrl(complaint.issueImageName) ? (
                      <button type="button" onClick={() => openReportPreview(complaint.complaintId, buildComplaintFallback(complaint))}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveStoredImageUrl(complaint.issueImageName) || ''} alt={`Snapshot ${complaint.complaintId}`} className="h-14 w-20 rounded-lg object-cover" />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">No snapshot</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">
                    <button type="button" onClick={() => openReportPreview(complaint.complaintId, buildComplaintFallback(complaint))}>
                      {complaint.complaintId}
                    </button>
                  </td>
                  <td className="px-4 py-3">{complaint.roadName}</td>
                  <td className="px-4 py-3">{complaint.district}</td>
                  <td className="px-4 py-3">{getCitizenStatus(complaint.status)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {complaint.createdAt ? new Date(complaint.createdAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ReportDetailModal
        reportId={previewReportId}
        title="Citizen Complaint Details"
        fallback={previewFallback}
        onClose={closeReportPreview}
      />
    </div>
  )
}