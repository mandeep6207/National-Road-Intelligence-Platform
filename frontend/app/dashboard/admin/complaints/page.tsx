'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, BellRing, MapPinned } from 'lucide-react'
import {
  fetchStateAdminDistrictStats,
  fetchStateAdminStats,
  sendStateAdminReminder,
  type StateAdminDistrictStats,
  type StateAdminDistrictStatsResponse,
  type StateAdminStateStats,
  type StateAdminStatsResponse,
} from '@/lib/api'

const STATUS_LABELS: Array<{ key: keyof StateAdminStateStats['status_breakdown']; label: string; tone: string }> = [
  { key: 'ASSIGNED_TO_AUTHORITY', label: 'Assigned', tone: 'text-blue-700' },
  { key: 'UNDER_PROGRESS', label: 'Under Progress', tone: 'text-orange-700' },
  { key: 'VERIFIED_BY_CITIZEN_AUDITOR', label: 'Verified', tone: 'text-emerald-700' },
  { key: 'ESCALATED', label: 'Escalated', tone: 'text-red-700' },
  { key: 'CLOSED', label: 'Closed', tone: 'text-slate-700' },
]

function healthTheme(level: 'good' | 'moderate' | 'critical') {
  if (level === 'critical') {
    return {
      dot: 'bg-red-500',
      cardBorder: 'border-red-200',
      mapBox: 'border-red-300 bg-red-50 text-red-700',
      label: 'Critical Damage',
    }
  }
  if (level === 'moderate') {
    return {
      dot: 'bg-amber-500',
      cardBorder: 'border-amber-200',
      mapBox: 'border-amber-300 bg-amber-50 text-amber-700',
      label: 'Moderate Damage',
    }
  }
  return {
    dot: 'bg-emerald-500',
    cardBorder: 'border-emerald-200',
    mapBox: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    label: 'Good Roads',
  }
}

export default function ComplaintManagementPage() {
  const [stats, setStats] = useState<StateAdminStatsResponse | null>(null)
  const [selectedState, setSelectedState] = useState('')
  const [districtStats, setDistrictStats] = useState<StateAdminDistrictStatsResponse | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [sendingReminderDistrict, setSendingReminderDistrict] = useState('')

  useEffect(() => {
    let active = true
    setLoadingStats(true)
    setError('')

    fetchStateAdminStats()
      .then((response) => {
        if (!active) return
        setStats(response)
        setSelectedState((previous) => {
          if (previous && response.states.some((item) => item.state === previous)) return previous
          return response.states[0]?.state || ''
        })
      })
      .catch((nextError: any) => {
        if (!active) return
        setError(nextError?.message || 'Unable to load state complaint statistics.')
        setStats(null)
      })
      .finally(() => {
        if (!active) return
        setLoadingStats(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedState) {
      setDistrictStats(null)
      return
    }

    let active = true
    setLoadingDistricts(true)

    fetchStateAdminDistrictStats(selectedState)
      .then((response) => {
        if (!active) return
        setDistrictStats(response)
      })
      .catch((nextError: any) => {
        if (!active) return
        setError(nextError?.message || 'Unable to load district complaint breakdown.')
        setDistrictStats(null)
      })
      .finally(() => {
        if (!active) return
        setLoadingDistricts(false)
      })

    return () => {
      active = false
    }
  }, [selectedState])

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(''), 2800)
    return () => clearTimeout(timer)
  }, [toastMessage])

  const selectedStateCard = useMemo(
    () => stats?.states.find((item) => item.state === selectedState) || null,
    [selectedState, stats]
  )

  async function handleSendReminder(district: StateAdminDistrictStats) {
    if (!selectedState) return
    setSendingReminderDistrict(district.district)
    setError('')

    try {
      const response = await sendStateAdminReminder({
        state: selectedState,
        district: district.district,
        pending_repairs: district.pending,
      })
      setToastMessage(response.message || 'Reminder Sent Successfully')
    } catch (nextError: any) {
      setError(nextError?.message || 'Unable to send reminder to authority.')
    } finally {
      setSendingReminderDistrict('')
    }
  }

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-[1200] rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg">
          {toastMessage}
        </div>
      )}

      {error && (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#1f4e79]" />
          <h2 className="text-lg font-bold text-[#0d3b5c]">State Complaint Monitoring Dashboard</h2>
        </div>

        {loadingStats ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Loading automated complaint analytics...
          </div>
        ) : !stats || stats.states.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No backend complaints are available yet.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">States Monitored</p>
                <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{stats.states.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Complaints Today</p>
                <p className="mt-1 text-2xl font-extrabold text-[#1f4e79]">{stats.totals.received_today}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pending</p>
                <p className="mt-1 text-2xl font-extrabold text-red-700">{stats.totals.pending}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Under Progress</p>
                <p className="mt-1 text-2xl font-extrabold text-orange-700">{stats.totals.under_progress}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Completed</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-700">{stats.totals.completed}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Road Health</p>
                <p className="mt-1 text-2xl font-extrabold text-[#0d3b5c]">{stats.totals.road_health_score.toFixed(1)}%</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4">
              <div className="mb-3 flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-[#1f4e79]" />
                <h3 className="text-sm font-bold text-[#0d3b5c]">State Map View (Pothole Density)</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.states.map((item) => {
                  const theme = healthTheme(item.density_level)
                  const isActive = item.state === selectedState
                  return (
                    <button
                      key={item.state}
                      type="button"
                      onClick={() => setSelectedState(item.state)}
                      className={`rounded-xl border p-3 text-left transition ${theme.mapBox} ${isActive ? 'ring-2 ring-[#1f4e79]/30' : ''}`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.12em]">{item.state}</p>
                      <p className="mt-1 text-sm font-semibold">Density: {theme.label}</p>
                      <p className="mt-1 text-xs">Complaints: {item.total_complaints}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stats.states.map((item) => {
                const theme = healthTheme(item.density_level)
                const isActive = item.state === selectedState

                return (
                  <button
                    type="button"
                    key={item.state}
                    onClick={() => setSelectedState(item.state)}
                    className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${theme.cardBorder} ${isActive ? 'ring-2 ring-[#1f4e79]/20' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-bold text-[#0d3b5c]">{item.state}</h3>
                      <span className={`h-3 w-3 rounded-full ${theme.dot}`} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
                      <p><span className="font-semibold">Received Today:</span> {item.received_today}</p>
                      <p><span className="font-semibold">Assigned:</span> {item.assigned}</p>
                      <p><span className="font-semibold">Pending:</span> {item.pending}</p>
                      <p><span className="font-semibold">Under Progress:</span> {item.under_progress}</p>
                      <p><span className="font-semibold">Completed:</span> {item.completed}</p>
                      <p><span className="font-semibold">Road Health:</span> {item.road_health_score.toFixed(1)}%</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[#0d3b5c]">District Breakdown - {selectedState || 'Select state'}</h3>
          {selectedStateCard && (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Road Health Score Formula: 100 - (pothole_count / scanned_segments * 100)
            </p>
          )}
        </div>

        {loadingDistricts ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Loading district analytics...
          </div>
        ) : !districtStats || districtStats.districts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No district stats available for this state.
          </div>
        ) : (
          <div className="space-y-4">
            {selectedStateCard && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">State Status Overview</p>
                <div className="mt-2 grid gap-2 md:grid-cols-5 text-sm">
                  {STATUS_LABELS.map((item) => (
                    <p key={item.key} className={item.tone}>
                      <span className="font-semibold">{item.label}:</span> {selectedStateCard.status_breakdown[item.key]}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                    {[
                      'District',
                      'Pending',
                      'Under Progress',
                      'Completed',
                      'Assigned',
                      'Road Health',
                      'Send Reminder',
                    ].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                  {districtStats.districts.map((district) => (
                    <tr key={district.district} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-[#0d3b5c]">{district.district}</td>
                      <td className="px-4 py-3 text-red-700">{district.pending}</td>
                      <td className="px-4 py-3 text-orange-700">{district.under_progress}</td>
                      <td className="px-4 py-3 text-emerald-700">{district.completed}</td>
                      <td className="px-4 py-3">{district.assigned}</td>
                      <td className="px-4 py-3">{district.road_health_score.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleSendReminder(district)}
                          disabled={sendingReminderDistrict === district.district}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#1f4e79] px-3 py-1.5 text-xs font-semibold text-[#1f4e79] hover:bg-blue-50 disabled:opacity-60"
                        >
                          <BellRing className="h-3.5 w-3.5" />
                          {sendingReminderDistrict === district.district ? 'Sending...' : 'Send Reminder'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-[#0d3b5c]">Selected State Summary</p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <p><span className="font-semibold">Total Complaints:</span> {districtStats.summary.total_complaints}</p>
                <p><span className="font-semibold">Potholes Detected:</span> {districtStats.summary.pothole_count}</p>
                <p><span className="font-semibold">Road Segments Scanned:</span> {districtStats.summary.scanned_segments}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-base font-bold text-[#0d3b5c]">Automated Complaint Status Register</h3>
        {!selectedStateCard ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Select a state to view status distribution.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {STATUS_LABELS.map((status) => (
              <div key={status.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{status.label}</p>
                <p className={`mt-1 text-2xl font-extrabold ${status.tone}`}>
                  {selectedStateCard.status_breakdown[status.key]}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-base font-bold text-[#0d3b5c]">Workflow</h3>
        <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-5">
          {['Citizen Detection', 'Report Stored', 'Backend Aggregation', 'State Admin Dashboard', 'Authority Reminder Notification'].map((step) => (
            <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center font-semibold">
              {step}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
