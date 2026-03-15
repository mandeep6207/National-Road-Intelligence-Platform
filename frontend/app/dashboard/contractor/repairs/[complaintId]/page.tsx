'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState, type ChangeEvent } from 'react'
import { Upload } from 'lucide-react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'
import {
  loadContractorTask,
  startContractorRepairTask,
  updateContractorRepairProgress,
  completeContractorRepairTask,
  type ContractorPortalTask,
} from '@/lib/chhattisgarhContractorPortal'
import { getCgReportsUpdateEventName } from '@/lib/chhattisgarhAuthorityData'

const ContractorRepairsMap = dynamic(() => import('@/components/map/ContractorRepairsMap'), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
})

export default function ContractorRepairDetailsPage() {
  const params = useParams<{ complaintId: string }>()
  const complaintId = Array.isArray(params.complaintId) ? params.complaintId[0] : params.complaintId
  const { setNotice } = useAdminControlCenter()

  const [repair, setRepair] = useState<ContractorPortalTask | null>(() => loadContractorTask(complaintId || ''))
  const [progressPercentage, setProgressPercentage] = useState(0)
  const [beforeImageName, setBeforeImageName] = useState('')
  const [afterImageName, setAfterImageName] = useState('')
  const [repairNotes, setRepairNotes] = useState('')

  useEffect(() => {
    const refresh = () => {
      setRepair(loadContractorTask(complaintId || ''))
    }

    refresh()
    window.addEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
    return () => {
      window.removeEventListener(getCgReportsUpdateEventName(), refresh as EventListener)
    }
  }, [complaintId])

  useEffect(() => {
    if (!repair) return
    setProgressPercentage(repair.progressPercentage)
    setBeforeImageName(repair.beforeRepairImageName || '')
    setAfterImageName(repair.afterRepairImageName || '')
    setRepairNotes(repair.repairNotes || '')
  }, [repair])

  function handleFilePick(setter: (value: string) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      setter(file?.name || '')
    }
  }

  if (!repair) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0d3b5c]">Repair task not found</h2>
        <Link href="/dashboard/contractor/assigned" className="text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
          Return to repair queue
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-bold text-[#0d3b5c]">Repair Details</h2>
          <div className="mt-4 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
            <div><span className="font-semibold">Complaint ID:</span> {repair.complaintId}</div>
            <div><span className="font-semibold">Road Name:</span> {repair.roadName}</div>
            <div><span className="font-semibold">District:</span> {repair.district}</div>
            <div><span className="font-semibold">Severity:</span> {repair.severity}</div>
            <div><span className="font-semibold">Priority:</span> {repair.priority}</div>
            <div><span className="font-semibold">Repair Deadline:</span> {repair.repairDeadline}</div>
            <div><span className="font-semibold">Assigned Contractor:</span> {repair.contractorName}</div>
            <div><span className="font-semibold">Status:</span> {repair.status}</div>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
          <h3 className="text-base font-bold text-[#0d3b5c]">Repair Status Update</h3>
          <div className="mt-4 space-y-4">
            <button
              type="button"
              onClick={() => {
                startContractorRepairTask(repair.complaintId)
                setNotice(`Repair started for ${repair.complaintId}.`)
              }}
              disabled={repair.status !== 'ASSIGNED_TO_CONTRACTOR'}
              className="w-full rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a] disabled:opacity-60"
            >
              Start Repair
            </button>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <span>Progress</span>
                <span>{progressPercentage}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={95}
                step={5}
                value={Math.min(progressPercentage, 95)}
                onChange={(event) => setProgressPercentage(Number(event.target.value))}
                disabled={repair.status === 'REPAIR_COMPLETED'}
                className="w-full accent-[#1f4e79]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                updateContractorRepairProgress(repair.complaintId, progressPercentage)
                setNotice(`Repair progress updated for ${repair.complaintId}.`)
              }}
              disabled={repair.status === 'REPAIR_COMPLETED'}
              className="w-full rounded-lg border border-[#1f4e79] px-4 py-2 text-sm font-semibold text-[#1f4e79] hover:bg-blue-50 disabled:opacity-60"
            >
              Update Repair Progress
            </button>
            <button
              type="button"
              onClick={() => {
                completeContractorRepairTask(repair.complaintId, {
                  beforeRepairImageName: beforeImageName,
                  afterRepairImageName: afterImageName,
                  repairNotes,
                })
                setNotice(`Repair completed for ${repair.complaintId}.`)
              }}
              disabled={repair.status === 'REPAIR_COMPLETED'}
              className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              Mark Repair Complete
            </button>
          </div>
        </section>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-base font-bold text-[#0d3b5c]">Pothole Location Map</h3>
        <ContractorRepairsMap
          center={[repair.latitude, repair.longitude]}
          tasks={[repair]}
          focusToken={1}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-[#0d3b5c]">Repair Evidence</h3>
        <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Before Repair Image</p>
              <label htmlFor="before-image" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#1f4e79] px-4 py-2 text-sm font-semibold text-[#1f4e79] hover:bg-blue-50">
                <Upload className="h-4 w-4" />
                Upload Image
              </label>
              <input id="before-image" type="file" accept="image/*" onChange={handleFilePick(setBeforeImageName)} className="hidden" />
              <p className="mt-2 text-sm text-slate-600">{beforeImageName || 'No file selected'}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">After Repair Image</p>
              <label htmlFor="after-image" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#1f4e79] px-4 py-2 text-sm font-semibold text-[#1f4e79] hover:bg-blue-50">
                <Upload className="h-4 w-4" />
                Upload Image
              </label>
              <input id="after-image" type="file" accept="image/*" onChange={handleFilePick(setAfterImageName)} className="hidden" />
              <p className="mt-2 text-sm text-slate-600">{afterImageName || 'No file selected'}</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Repair Notes</label>
              <textarea
                rows={4}
                value={repairNotes}
                onChange={(event) => setRepairNotes(event.target.value)}
                placeholder="Describe material used, crew size, and work completed on site."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 text-sm text-slate-700">
            <h4 className="text-base font-bold text-[#0d3b5c]">Evidence Summary</h4>
            <div className="mt-3 space-y-2">
              <p><span className="font-semibold">Before Image:</span> {repair.beforeRepairImageName || beforeImageName || 'Pending'}</p>
              <p><span className="font-semibold">After Image:</span> {repair.afterRepairImageName || afterImageName || 'Pending'}</p>
              <p><span className="font-semibold">Notes:</span> {repair.repairNotes || repairNotes || 'Pending'}</p>
              <p><span className="font-semibold">Progress:</span> {repair.progressPercentage}%</p>
              <p><span className="font-semibold">Completion Date:</span> {repair.completedAt ? new Date(repair.completedAt).toLocaleString('en-IN') : 'Pending'}</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
