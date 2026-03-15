'use client'

import { useEffect, useMemo, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'

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
  markerStage?: 'active' | 'assigned' | 'completed'
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
  initialZoom?: number
  maxBounds?: [[number, number], [number, number]]
  showHeatmap?: boolean
  severityColors?: Partial<Record<GovernanceSeverity, string>>
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

const MARKER_STAGE_COLORS = {
  active: '#dc2626',
  assigned: '#f97316',
  completed: '#16a34a',
} as const

function RecenterMap({ center, focusToken, zoom }: { center: [number, number]; focusToken: number; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom, { animate: false })
  }, [map, zoom])

  useEffect(() => {
    if (focusToken > 0) {
      map.flyTo(center, zoom, { animate: true, duration: 1 })
    }
  }, [center, focusToken, map, zoom])

  return null
}

function actionClassName(variant: MapAction['variant']) {
  if (variant === 'danger') return 'border-red-300 text-red-700 hover:bg-red-50'
  if (variant === 'secondary') return 'border-slate-300 text-slate-700 hover:bg-slate-100'
  return 'bg-[#0d3b5c] text-white border border-[#0d3b5c] hover:bg-[#0a304a]'
}

interface HeatmapCell {
  key: string
  latitude: number
  longitude: number
  density: number
  color: '#16a34a' | '#eab308' | '#dc2626'
  opacity: number
  radius: number
}

function getHeatColor(density: number): '#16a34a' | '#eab308' | '#dc2626' {
  if (density >= 4) return '#dc2626'
  if (density >= 2) return '#eab308'
  return '#16a34a'
}

export default function GovernanceSatelliteMap({
  center,
  focusToken,
  issues,
  actions = [],
  heightClassName = 'h-[420px]',
  initialZoom = 7,
  maxBounds,
  showHeatmap = false,
  severityColors,
}: GovernanceSatelliteMapProps) {
  const resolvedSeverityColors = {
    ...SEVERITY_COLORS,
    ...(severityColors || {}),
  }

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

  const heatmapCells = useMemo<HeatmapCell[]>(() => {
    if (!showHeatmap) return []

    const cells: Record<string, { latSum: number; lngSum: number; count: number }> = {}

    issues.forEach((issue) => {
      const latBucket = Math.round(issue.latitude * 10) / 10
      const lngBucket = Math.round(issue.longitude * 10) / 10
      const key = `${latBucket.toFixed(1)}_${lngBucket.toFixed(1)}`

      if (!cells[key]) {
        cells[key] = { latSum: 0, lngSum: 0, count: 0 }
      }

      cells[key].latSum += issue.latitude
      cells[key].lngSum += issue.longitude
      cells[key].count += 1
    })

    return Object.entries(cells).map(([key, value]) => {
      const density = value.count
      const color = getHeatColor(density)
      const opacity = Math.min(0.2 + density * 0.14, 0.82)
      const radius = Math.min(10000 + density * 3500, 26000)
      return {
        key,
        latitude: value.latSum / value.count,
        longitude: value.lngSum / value.count,
        density,
        color,
        opacity,
        radius,
      }
    })
  }, [issues, showHeatmap])

  const useStageLegend = useMemo(
    () => issues.some((issue) => issue.markerStage),
    [issues]
  )

  function resolveMarkerColor(issue: GovernanceMapIssue) {
    if (issue.markerStage) return MARKER_STAGE_COLORS[issue.markerStage]
    return resolvedSeverityColors[issue.severity]
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {SEVERITY_ORDER.map((severity) => (
          <div key={severity} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{SEVERITY_LABELS[severity]}</p>
            <p className="mt-1 text-lg font-extrabold" style={{ color: resolvedSeverityColors[severity] }}>{severityCounts[severity]}</p>
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
            <span style={{ color: resolvedSeverityColors[severity] }}>{SEVERITY_LABELS[severity]}</span>
          </label>
        ))}
      </div>

      <div className={`${heightClassName} relative w-full overflow-hidden rounded-2xl border border-slate-200`}>
        <MapContainer
          center={center || INDIA_CENTER}
          zoom={initialZoom}
          className="h-full w-full"
          scrollWheelZoom
          zoomControl
          maxBounds={maxBounds}
          maxBoundsViscosity={maxBounds ? 1 : undefined}
        >
          <RecenterMap center={center} focusToken={focusToken} zoom={initialZoom} />
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

          {showHeatmap && heatmapCells.map((cell) => (
            <Circle
              key={cell.key}
              center={[cell.latitude, cell.longitude]}
              radius={cell.radius}
              pathOptions={{
                color: cell.color,
                weight: 0,
                fillColor: cell.color,
                fillOpacity: cell.opacity,
              }}
            />
          ))}

          {visibleIssues.map((issue) => (
            <CircleMarker
              key={issue.issueId}
              center={[issue.latitude, issue.longitude]}
              radius={issue.severity === 'critical' ? 9 : issue.severity === 'high' ? 8 : 7}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: resolveMarkerColor(issue),
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
                  {issue.markerStage && <p><span className="font-semibold">Repair Stage:</span> {issue.markerStage}</p>}
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
          {useStageLegend ? (
            <>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: MARKER_STAGE_COLORS.active }} />
                <span>Active pothole</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: MARKER_STAGE_COLORS.assigned }} />
                <span>Assigned repair</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: MARKER_STAGE_COLORS.completed }} />
                <span>Completed repair</span>
              </div>
            </>
          ) : (
            SEVERITY_ORDER.map((severity) => (
              <div key={severity} className="mt-1 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: resolvedSeverityColors[severity] }} />
                <span>{SEVERITY_LABELS[severity]}</span>
              </div>
            ))
          )}

          {showHeatmap && (
            <>
              <p className="mt-2 font-semibold text-[#0d3b5c]">Heatmap Density</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#dc2626' }} />
                <span>High density</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#eab308' }} />
                <span>Medium density</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#16a34a' }} />
                <span>Safe roads</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
