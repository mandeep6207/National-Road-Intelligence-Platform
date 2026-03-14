'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Upload } from 'lucide-react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'

const ContractorRepairsMap = dynamic(() => import('@/components/map/ContractorRepairsMap'), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />,
})

export default function ContractorRepairDetailsPage() {
  const params = useParams<{ complaintId: string }>()
  const complaintId = Array.isArray(params.complaintId) ? params.complaintId[0] : params.complaintId

  const { complaints, startRepair, updateRepairProgress, submitRepairEvidence } = useAdminControlCenter()

  const repair = useMemo(
    () => complaints.find((item) => item.complaintId === complaintId) || null,
    [complaints, complaintId]
  )

  const [progressPercentage, setProgressPercentage] = useState(0)
  const [beforeImageName, setBeforeImageName] = useState('')
  const [afterImageName, setAfterImageName] = useState('')
  const [repairNotes, setRepairNotes] = useState('')

  useEffect(() => {
    if (!repair) return
    setProgressPercentage(repair.progressPercentage)
    setBeforeImageName(repair.beforeRepairImageName)
    setAfterImageName(repair.afterRepairImageName)
    setRepairNotes(repair.repairNotes)
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
          Return to assigned repairs
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-bold text-[#0d3b5c]">Repair Details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm text-slate-700">
            <div><span className="font-semibold">Complaint ID:</span> {repair.complaintId}</div>
            <div><span className="font-semibold">Road Name:</span> {repair.roadName}</div>
            <div><span className="font-semibold">District:</span> {repair.district}</div>
            <div><span className="font-semibold">Severity:</span> <span className="capitalize">{repair.severity}</span></div>
            <div><span className="font-semibold">Priority:</span> {repair.priority}</div>
            <div><span className="font-semibold">Repair Deadline:</span> {repair.repairDeadline || 'Pending'}</div>
            <div><span className="font-semibold">Assigned Contractor:</span> {repair.contractorName || 'Unassigned'}</div>
            <div><span className="font-semibold">Status:</span> {repair.status}</div>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
          <h3 className="text-base font-bold text-[#0d3b5c]">Repair Progress</h3>
          <div className="mt-4 space-y-4">
            <button
              type="button"
              onClick={() => startRepair(repair.complaintId)}
              className="w-full rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a]"
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
                max={99}
                step={5}
                value={progressPercentage}
                onChange={(event) => setProgressPercentage(Number(event.target.value))}
                className="w-full accent-[#1f4e79]"
              />
            </div>
            <button
              type="button"
              onClick={() => updateRepairProgress(repair.complaintId, progressPercentage)}
              className="w-full rounded-lg border border-[#1f4e79] px-4 py-2 text-sm font-semibold text-[#1f4e79] hover:bg-blue-50"
            >
              Update Repair Progress
            </button>
          </div>
        </section>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-base font-bold text-[#0d3b5c]">Repair Location Map</h3>
        <ContractorRepairsMap
          center={[repair.latitude, repair.longitude]}
          tasks={[repair]}
          focusToken={1}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-[#0d3b5c]">Upload Repair Evidence</h3>
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

            <button
              type="button"
              onClick={() =>
                submitRepairEvidence(repair.complaintId, {
                  beforeRepairImageName: beforeImageName,
                  afterRepairImageName: afterImageName,
                  repairNotes,
                })
              }
              disabled={!beforeImageName || !afterImageName || !repairNotes.trim()}
              className="w-full rounded-lg bg-[#0d3b5c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a304a] disabled:opacity-60"
            >
              Submit Repair Completion
            </button>
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