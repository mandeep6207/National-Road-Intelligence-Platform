'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Bell, ClipboardCheck, MapPinned, Workflow, Wrench } from 'lucide-react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'
import {
  AUTHORITY_MAP_CENTER,
  loadContractorPortalSnapshot,
  markContractorNotificationsRead,
  resolveContractorIdentity,
  startContractorRepairTask,
  completeContractorRepairTask,
  type ContractorPortalSnapshot,
} from '@/lib/chhattisgarhContractorPortal'
import { getCgReportsUpdateEventName } from '@/lib/chhattisgarhAuthorityData'

const ContractorRepairsMap = dynamic(() => import('@/components/map/ContractorRepairsMap'), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
})

const FLOW_STEPS = [
  'Citizen Detection',
  'Authority Dashboard',
  'Contractor Assignment',
  'Contractor Portal',
  'Repair Updates',
  'Repair Completion',
]

export default function ContractorDashboardPage() {
  const { setNotice } = useAdminControlCenter()
  const [snapshot, setSnapshot] = useState<ContractorPortalSnapshot>(() => loadContractorPortalSnapshot())
  const [focusToken, setFocusToken] = useState(0)

  useEffect(() => {
    const refresh = () => {
      setSnapshot(loadContractorPortalSnapshot(resolveContractorIdentity().contractorName))
      setFocusToken((value) => value + 1)
    }

    refresh()
    window.addEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
    return () => {
      window.removeEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
    }
  }, [])

  const unreadNotifications = useMemo(
    () => snapshot.notifications.filter((item) => item.unread),
    [snapshot.notifications]
  )

  const nextTask = snapshot.tasks.find((item) => item.status !== 'REPAIR_COMPLETED') || snapshot.tasks[0] || null
  const mapCenter: [number, number] = nextTask
    ? [nextTask.latitude, nextTask.longitude]
    : AUTHORITY_MAP_CENTER

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contractor Profile</p>
              <h2 className="mt-1 text-xl font-bold text-[#0d3b5c]">{snapshot.contractorName}</h2>
              <p className="mt-1 text-sm text-slate-600">Region: {snapshot.region}</p>
              <p className="mt-1 text-sm font-semibold text-[#1f4e79]">Trust Score: {snapshot.trustScore}%</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Assigned Today</p>
                <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{snapshot.summary.assignedToday}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pending Repairs</p>
                <p className="mt-1 text-2xl font-extrabold text-[#b45309]">{snapshot.summary.pendingRepairs}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Work In Progress</p>
                <p className="mt-1 text-2xl font-extrabold text-[#1f4e79]">{snapshot.summary.workInProgress}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Completed Repairs</p>
                <p className="mt-1 text-2xl font-extrabold text-[#16a34a]">{snapshot.summary.completedRepairs}</p>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#1f4e79]" />
                <h3 className="text-base font-bold text-[#0d3b5c]">Assignment Notifications</h3>
              </div>
              {unreadNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    markContractorNotificationsRead(snapshot.contractorName)
                    setNotice('Contractor notifications marked as read.')
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Mark Read
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {snapshot.notifications.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500">
                  No new repair assignments yet. Use the authority dashboard to assign complaints.
                </div>
              )}

              {snapshot.notifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className={`rounded-xl border p-3 ${notification.unread ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                  <p className="text-sm font-bold text-[#0d3b5c]">{notification.title}</p>
                  <p className="mt-1 text-sm text-slate-700">{notification.message}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">District: {notification.district}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPinned className="h-5 w-5 text-[#1f4e79]" />
              <h2 className="text-base font-bold text-[#0d3b5c]">Chhattisgarh Repair Heatmap</h2>
            </div>
            <Link href="/dashboard/contractor/assigned" className="text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
              Open repair queue
            </Link>
          </div>
          <ContractorRepairsMap center={mapCenter} tasks={snapshot.tasks} focusToken={focusToken} />
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-[#1f4e79]" />
              <h3 className="text-base font-bold text-[#0d3b5c]">Repair Summary Dashboard</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total Jobs Assigned</p>
                <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{snapshot.summary.totalJobsAssigned}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Jobs Completed</p>
                <p className="mt-1 text-2xl font-extrabold text-[#16a34a]">{snapshot.summary.jobsCompleted}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pending Jobs</p>
                <p className="mt-1 text-2xl font-extrabold text-[#b45309]">{snapshot.summary.pendingJobs}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Average Repair Time</p>
                <p className="mt-1 text-2xl font-extrabold text-[#1f4e79]">{snapshot.summary.averageRepairTimeDays.toFixed(1)} days</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-[#1f4e79]" />
              <h3 className="text-base font-bold text-[#0d3b5c]">Data Flow</h3>
            </div>
            <div className="mt-4 grid gap-3">
              {FLOW_STEPS.map((step) => (
                <div key={step} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                  {step}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[#1f4e79]" />
            <h3 className="text-base font-bold text-[#0d3b5c]">Repair Work Queue</h3>
          </div>
          <Link href="/dashboard/contractor/analytics" className="text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
            View performance charts
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Complaint ID', 'Road Name', 'District', 'Severity', 'Repair Deadline', 'Status', 'Actions'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {snapshot.tasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No contractor tasks are assigned yet. Assign complaints from the authority dashboard to populate this queue.
                  </td>
                </tr>
              )}

              {snapshot.tasks.slice(0, 6).map((task) => (
                <tr key={task.complaintId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-[#1f4e79]">{task.complaintId}</td>
                  <td className="px-4 py-3">{task.roadName}</td>
                  <td className="px-4 py-3">{task.district}</td>
                  <td className="px-4 py-3">{task.severity}</td>
                  <td className="px-4 py-3">{task.repairDeadline}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">{task.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/contractor/repairs/${task.complaintId}`} className="rounded border border-[#1f4e79] px-2 py-1 text-xs font-semibold text-[#1f4e79] hover:bg-blue-50">
                        View Details
                      </Link>
                      {task.status === 'ASSIGNED_TO_CONTRACTOR' && (
                        <button
                          type="button"
                          onClick={() => {
                            startContractorRepairTask(task.complaintId)
                            setNotice(`Repair started for ${task.complaintId}.`)
                          }}
                          className="rounded border border-[#0d3b5c] px-2 py-1 text-xs font-semibold text-[#0d3b5c] hover:bg-slate-100"
                        >
                          Start Repair
                        </button>
                      )}
                      {task.status === 'WORK_IN_PROGRESS' && (
                        <button
                          type="button"
                          onClick={() => {
                            completeContractorRepairTask(task.complaintId)
                            setNotice(`Repair completed for ${task.complaintId}.`)
                          }}
                          className="rounded border border-emerald-700 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Mark Repair Complete
                        </button>
                      )}
                    </div>
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
