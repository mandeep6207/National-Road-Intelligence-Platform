'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, ClipboardList, MapPinned } from 'lucide-react'
import { useAdminControlCenter, type ComplaintRecord } from '@/components/admin/AdminControlCenterContext'
import CitizenAchievements from '@/components/citizen/CitizenAchievements'
import CitizenLeaderboard from '@/components/citizen/CitizenLeaderboard'
import CitizenNotifications from '@/components/citizen/CitizenNotifications'
import CitizenStatsCards from '@/components/citizen/CitizenStatsCards'
import {
  fetchCitizenLeaderboard,
  fetchCitizenNotifications,
  fetchCitizenStats,
  type CitizenLeaderboardEntry,
  type CitizenNotificationEntry,
  type CitizenStatsResponse,
} from '@/lib/api'

const CitizenIssuesMap = dynamic(() => import('@/components/map/CitizenIssuesMap'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
})

function isCompletedStatus(status: ComplaintRecord['status']) {
  return status === 'REPAIR_COMPLETED' || status === 'VERIFIED_BY_CITIZEN_AUDITOR' || status === 'CLOSED'
}

export default function CitizenDashboardPage() {
  const { complaints, districtCenter, mapFocusToken } = useAdminControlCenter()
  const [userEmail, setUserEmail] = useState('citizen@nrip.gov.in')
  const [stats, setStats] = useState<CitizenStatsResponse | null>(null)
  const [leaderboard, setLeaderboard] = useState<CitizenLeaderboardEntry[]>([])
  const [notifications, setNotifications] = useState<CitizenNotificationEntry[]>([])
  const [loadingGamification, setLoadingGamification] = useState(true)
  const [gamificationError, setGamificationError] = useState('')

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
    let mounted = true

    async function loadGamification() {
      setLoadingGamification(true)
      setGamificationError('')
      try {
        const [nextStats, nextLeaderboard, nextNotifications] = await Promise.all([
          fetchCitizenStats(),
          fetchCitizenLeaderboard(8),
          fetchCitizenNotifications(8),
        ])
        if (!mounted) return
        setStats(nextStats)
        setLeaderboard(nextLeaderboard)
        setNotifications(nextNotifications)
      } catch (error: any) {
        if (!mounted) return
        setGamificationError(error?.message || 'Unable to load citizen rewards right now.')
      } finally {
        if (mounted) setLoadingGamification(false)
      }
    }

    loadGamification()
    return () => {
      mounted = false
    }
  }, [])

  const citizenComplaints = useMemo(
    () => complaints.filter((item) => item.reporterEmail === userEmail || (item.reportSource === 'citizen' && !item.reporterEmail)),
    [complaints, userEmail]
  )

  const issuesReported = stats?.reports_submitted ?? citizenComplaints.length
  const repairsCompleted = citizenComplaints.filter((item) => item.status === 'REPAIR_COMPLETED').length
  const repairsPending = citizenComplaints.filter((item) => !isCompletedStatus(item.status)).length
  const verifiedRepairs = stats?.solved_complaints ?? citizenComplaints.filter((item) => item.status === 'VERIFIED_BY_CITIZEN_AUDITOR').length

  return (
    <div className="space-y-6">
      {gamificationError && (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {gamificationError}
        </section>
      )}

      <CitizenStatsCards stats={stats} loading={loadingGamification} />

      <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPinned className="h-5 w-5 text-[#1f4e79]" />
              <h2 className="text-base font-bold text-[#0d3b5c]">Nearby Issues Map</h2>
            </div>
            <Link href="/dashboard/citizen/nearby" className="text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
              Open full map
            </Link>
          </div>
          <CitizenIssuesMap center={districtCenter} complaints={complaints} focusToken={mapFocusToken} />
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
            <h3 className="text-base font-bold text-[#0d3b5c]">Report an Issue</h3>
            <p className="mt-2 text-sm text-slate-600">
              Help your city by reporting potholes and verifying completed repairs to earn tokens and badges.
            </p>
            <Link
              href="/dashboard/citizen/report"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#0d3b5c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a304a]"
            >
              Report Issue
            </Link>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <Link href="/dashboard/citizen/complaints" className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold hover:bg-slate-50">
                Track complaint status
              </Link>
              <Link href="/dashboard/citizen/verify" className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold hover:bg-slate-50">
                Verify completed repairs
              </Link>
            </div>
          </section>

          <CitizenAchievements stats={stats} />
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <CitizenLeaderboard entries={leaderboard} loading={loadingGamification} />
        <CitizenNotifications notifications={notifications} loading={loadingGamification} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#1f4e79]" />
            <h3 className="text-base font-bold text-[#0d3b5c]">My Complaint Snapshot</h3>
          </div>
          <Link href="/dashboard/citizen/complaints" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
            View all complaints
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mb-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-3">
          <p><span className="font-semibold">Reports Submitted:</span> {issuesReported}</p>
          <p><span className="font-semibold">Repairs Completed:</span> {repairsCompleted}</p>
          <p><span className="font-semibold">Solved Complaints:</span> {verifiedRepairs}</p>
          <p><span className="font-semibold">Repairs Pending:</span> {repairsPending}</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Complaint ID', 'Road', 'District', 'Status', 'Verify'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {citizenComplaints.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    No citizen complaints submitted yet.
                  </td>
                </tr>
              )}
              {citizenComplaints.slice(0, 6).map((complaint) => (
                <tr key={complaint.complaintId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{complaint.complaintId}</td>
                  <td className="px-4 py-3">{complaint.roadName}</td>
                  <td className="px-4 py-3">{complaint.district}</td>
                  <td className="px-4 py-3">{complaint.status}</td>
                  <td className="px-4 py-3">
                    {(complaint.status === 'REPAIR_COMPLETED' || complaint.status === 'VERIFIED_BY_CITIZEN_AUDITOR') ? (
                      <Link href="/dashboard/citizen/verify" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
                        <CheckCircle2 className="h-4 w-4" />
                        Review
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Pending repair</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

