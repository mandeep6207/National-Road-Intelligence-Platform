'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAdminControlCenter, type ComplaintRecord } from '@/components/admin/AdminControlCenterContext'

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

  const myComplaints = useMemo(
    () => complaints.filter((item) => item.reporterEmail === userEmail || (item.reportSource === 'citizen' && !item.reporterEmail)),
    [complaints, userEmail]
  )

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f4e79]">Track Complaints</p>
        <h2 className="mt-2 text-lg font-bold text-[#0d3b5c]">Citizen Complaint Register</h2>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Complaint ID', 'Road', 'District', 'Status'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myComplaints.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                    No citizen complaints found yet. Submit a road issue to start tracking progress.
                  </td>
                </tr>
              )}
              {myComplaints.map((complaint) => (
                <tr key={complaint.complaintId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{complaint.complaintId}</td>
                  <td className="px-4 py-3">{complaint.roadName}</td>
                  <td className="px-4 py-3">{complaint.district}</td>
                  <td className="px-4 py-3">{getCitizenStatus(complaint.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}