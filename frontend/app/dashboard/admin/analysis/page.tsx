'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Activity, Radar } from 'lucide-react'
import { useAdminControlCenter } from '@/components/admin/AdminControlCenterContext'

const AdminSimulationMap = dynamic(() => import('@/components/map/AdminSimulationMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[560px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
  ),
})

export default function RoadAnalysisPage() {
  const [imagePreviewId, setImagePreviewId] = useState('')

  const {
    selectedState,
    selectedDistrict,
    selectedPincode,
    availableStates,
    availableDistricts,
    availablePincodes,
    setSelectedState,
    setSelectedDistrict,
    setSelectedPincode,
    runRoadAnalysis,
    simulationRunning,
    simulationStep,
    simulationSteps,
    mapFocusToken,
    districtCenter,
    issues,
    complaints,
  } = useAdminControlCenter()

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
        <div className="mb-4 flex items-center gap-2">
          <Radar className="h-5 w-5 text-[#1f4e79]" />
          <h2 className="text-lg font-bold text-[#0d3b5c]">Road Analysis Simulation Control</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <select
            value={selectedState}
            onChange={(event) => setSelectedState(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f4e79]"
          >
            {availableStates.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          <select
            value={selectedDistrict}
            onChange={(event) => setSelectedDistrict(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f4e79]"
          >
            {availableDistricts.map((district) => (
              <option key={district.name} value={district.name}>{district.name}</option>
            ))}
          </select>

          <select
            value={selectedPincode}
            onChange={(event) => setSelectedPincode(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f4e79]"
          >
            {availablePincodes.map((pincode) => (
              <option key={pincode} value={pincode}>{pincode}</option>
            ))}
          </select>

          <button
            onClick={runRoadAnalysis}
            disabled={simulationRunning}
            className="rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a] disabled:opacity-60"
          >
            {simulationRunning ? 'Running Analysis...' : 'Run Road Analysis'}
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {simulationSteps.map((step, index) => (
            <div
              key={step}
              className={`rounded-lg border px-3 py-2 text-sm ${
                index < simulationStep
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : index === simulationStep
                    ? 'border-[#f59e0b] bg-amber-50 text-amber-700'
                    : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-[#0d3b5c]">Satellite Analysis Map (India)</h3>
          <div className="flex gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-600" />Critical</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" />Medium</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-600" />Minor</span>
          </div>
        </div>

        <AdminSimulationMap
          focusCenter={districtCenter}
          focusToken={mapFocusToken}
          issues={issues}
          complaints={complaints}
          onViewImage={setImagePreviewId}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#1f4e79]" />
          <h3 className="text-base font-bold text-[#0d3b5c]">Current Detection Summary</h3>
        </div>
        <p className="text-sm text-slate-600">
          Active district: {selectedDistrict}, {selectedState} - {selectedPincode}. Total markers in current analysis: {complaints.length}.
        </p>
      </section>

      {imagePreviewId && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/65 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <h4 className="text-lg font-bold text-[#0d3b5c]">Captured Image Preview</h4>
            <p className="mt-1 text-sm text-slate-600">Complaint ID: {imagePreviewId}</p>
            <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
              Satellite capture placeholder for road damage evidence
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setImagePreviewId('')}
                className="rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a]"
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
