'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Filter, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'

// Dynamically import Leaflet (no SSR)
const MapComponent = dynamic(() => import('@/components/map/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-blue-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-govBlue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-govBlue-600 font-medium">Loading Map...</p>
      </div>
    </div>
  )
})

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  moderate: '#D97706',
  low: '#65A30D',
  safe: '#16A34A'
}

export default function MapPage() {
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({ critical: 0, high: 0, moderate: 0, total: 0 })
  const [selectedPothole, setSelectedPothole] = useState<any>(null)

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-govBlue-800 text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-blue-300 hover:text-white transition text-sm">← Home</Link>
          <span className="text-blue-500">|</span>
          <MapPin className="w-5 h-5 text-saffron" />
          <h1 className="font-bold text-lg">NRIP Live Satellite Map</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-300">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Live Updates
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-govBlue-700 px-6 py-2 flex items-center gap-4 flex-shrink-0">
        <Filter className="w-4 h-4 text-blue-300" />
        <span className="text-white text-sm font-medium">Filter:</span>
        {['all', 'critical', 'high', 'moderate', 'low'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === f
                ? 'bg-white text-govBlue-700'
                : 'bg-govBlue-600 text-blue-200 hover:bg-govBlue-500'
            }`}
          >
            {f === 'all' ? '🗺️ All' : (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: SEVERITY_COLORS[f] }} />
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-4 text-xs text-blue-300">
          <span>🔴 {stats.critical} Critical</span>
          <span>🟠 {stats.high} High</span>
          <span>🟡 {stats.moderate} Moderate</span>
          <span className="text-white font-semibold">Total: {stats.total}</span>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapComponent
          filter={filter}
          onStatsUpdate={setStats}
          onPotholeSelect={setSelectedPothole}
        />

        {/* Selected Pothole Panel */}
        {selectedPothole && (
          <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-2xl p-4 w-80 z-[1000] border-l-4"
            style={{ borderColor: SEVERITY_COLORS[selectedPothole.severity] }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full badge-${selectedPothole.severity}`}>
                  {selectedPothole.severity?.toUpperCase()}
                </span>
                <div className="text-xs text-gray-500 mt-1">{selectedPothole.detection_id}</div>
              </div>
              <button onClick={() => setSelectedPothole(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Source:</span>
                <span className="font-medium capitalize">{selectedPothole.sensor_source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">AI Confidence:</span>
                <span className="font-medium">{((selectedPothole.confidence || 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Detected:</span>
                <span className="font-medium">{selectedPothole.detected_at ? new Date(selectedPothole.detected_at).toLocaleDateString('en-IN') : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`font-medium ${selectedPothole.is_repaired ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedPothole.is_repaired ? '✅ Repaired' : '⚠️ Active'}
                </span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link href="/dashboard/citizen" className="flex-1 text-center bg-govBlue-700 text-white text-xs py-2 rounded-lg hover:bg-govBlue-800 transition">
                File Complaint
              </Link>
              <Link href="/transparency" className="flex-1 text-center border border-govBlue-300 text-govBlue-700 text-xs py-2 rounded-lg hover:bg-govBlue-50 transition">
                View Details
              </Link>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 z-[1000] text-sm">
          <div className="font-bold text-govBlue-700 mb-2 text-xs">LEGEND</div>
          {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
            <div key={sev} className="flex items-center gap-2 mb-1.5">
              <div className="w-3 h-3 rounded-full border border-white shadow" style={{ backgroundColor: color }} />
              <span className="text-gray-700 capitalize text-xs font-medium">{sev}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-full bg-blue-500 opacity-50" />
              <span>Repaired</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
