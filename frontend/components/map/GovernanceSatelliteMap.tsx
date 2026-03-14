'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'

export type GovernanceSeverity = 'critical' | 'high' | 'moderate' | 'low' | 'safe' | 'repaired'

export interface GovernanceMapIssue {
  issueId: string
  roadName: string
  district: string
  state: string
  severity: GovernanceSeverity
  priority: string
  status: string
  latitude: number
  longitude: number
}

interface MapAction {
  label: string
  onClick: (issueId: string) => void
  variant?: 'primary' | 'secondary' | 'danger'
}

interface GovernanceSatelliteMapProps {
  center: [number, number]
  focusToken: number
  issues: GovernanceMapIssue[]
  actions?: MapAction[]
  heightClassName?: string
}

const INDIA_CENTER: [number, number] = [22.9734, 78.6569]

const SEVERITY_ORDER: GovernanceSeverity[] = ['critical', 'high', 'moderate', 'low', 'safe', 'repaired']

const SEVERITY_LABELS: Record<GovernanceSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  safe: 'Safe',
  repaired: 'Repaired',
}

const SEVERITY_COLORS: Record<GovernanceSeverity, string> = {
  critical: '#dc2626',
  high: '#f97316',
  moderate: '#f59e0b',
  low: '#2563eb',
  safe: '#0ea5a4',
  repaired: '#16a34a',
}

function RecenterMap({ center, focusToken }: { center: [number, number]; focusToken: number }) {
  const map = useMap()

  useEffect(() => {
    if (focusToken > 0) {
      map.flyTo(center, 11, { animate: true, duration: 1 })
    }
  }, [center, focusToken, map])

  return null
}

function actionClassName(variant: MapAction['variant']) {
  if (variant === 'danger') return 'border-red-300 text-red-700 hover:bg-red-50'
  if (variant === 'secondary') return 'border-slate-300 text-slate-700 hover:bg-slate-100'
  return 'bg-[#0d3b5c] text-white border border-[#0d3b5c] hover:bg-[#0a304a]'
}

export default function GovernanceSatelliteMap({
  center,
  focusToken,
  issues,
  actions = [],
  heightClassName = 'h-[420px]',
}: GovernanceSatelliteMapProps) {
  const [severityFilters, setSeverityFilters] = useState<Record<GovernanceSeverity, boolean>>({
    critical: true,
    high: true,
    moderate: true,
    low: true,
    safe: true,
    repaired: true,
  })

  const severityCounts = useMemo(() => {
    const base = {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      safe: 0,
      repaired: 0,
    }

    issues.forEach((issue) => {
      base[issue.severity] += 1
    })

    return {
      ...base,
      total: issues.length,
    }
  }, [issues])

  const visibleIssues = useMemo(
    () => issues.filter((issue) => severityFilters[issue.severity]),
    [issues, severityFilters]
  )

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {SEVERITY_ORDER.map((severity) => (
          <div key={severity} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{SEVERITY_LABELS[severity]}</p>
            <p className="mt-1 text-lg font-extrabold" style={{ color: SEVERITY_COLORS[severity] }}>{severityCounts[severity]}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#0d3b5c]">
        Total: {severityCounts.total}
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        {SEVERITY_ORDER.map((severity) => (
          <label key={severity} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={severityFilters[severity]}
              onChange={() =>
                setSeverityFilters((previous) => ({
                  ...previous,
                  [severity]: !previous[severity],
                }))
              }
              className="accent-[#1f4e79]"
            />
            <span style={{ color: SEVERITY_COLORS[severity] }}>{SEVERITY_LABELS[severity]}</span>
          </label>
        ))}
      </div>

      <div className={`${heightClassName} relative w-full overflow-hidden rounded-2xl border border-slate-200`}>
        <MapContainer center={INDIA_CENTER} zoom={5} className="h-full w-full" scrollWheelZoom zoomControl>
          <RecenterMap center={center} focusToken={focusToken} />
          <TileLayer
            attribution="Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            attribution="Map data © OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            opacity={0.2}
          />
          <TileLayer
            attribution="Road layer © Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
            opacity={0.85}
          />

          {visibleIssues.map((issue) => (
            <CircleMarker
              key={issue.issueId}
              center={[issue.latitude, issue.longitude]}
              radius={issue.severity === 'critical' ? 9 : issue.severity === 'high' ? 8 : 7}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: SEVERITY_COLORS[issue.severity],
                fillOpacity: 0.92,
              }}
            >
              <Popup>
                <div className="min-w-[230px] space-y-2 text-sm">
                  <div className="rounded-lg bg-[#0d3b5c] px-3 py-2 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em]">Issue ID</p>
                    <p className="font-mono text-xs">{issue.issueId}</p>
                  </div>
                  <p><span className="font-semibold">Road:</span> {issue.roadName}</p>
                  <p><span className="font-semibold">Severity:</span> {SEVERITY_LABELS[issue.severity]}</p>
                  <p><span className="font-semibold">Priority:</span> {issue.priority}</p>
                  <p><span className="font-semibold">Status:</span> {issue.status}</p>
                  <p className="text-xs text-slate-500">{issue.district}, {issue.state}</p>

                  {actions.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {actions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => action.onClick(issue.issueId)}
                          className={`rounded-md px-2 py-1.5 text-xs font-semibold ${actionClassName(action.variant)}`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-sm">
          <p className="font-semibold text-[#0d3b5c]">Legend</p>
          {SEVERITY_ORDER.map((severity) => (
            <div key={severity} className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SEVERITY_COLORS[severity] }} />
              <span>{SEVERITY_LABELS[severity]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
