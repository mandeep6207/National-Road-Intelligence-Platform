'use client'

import { useEffect, useRef, useCallback } from 'react'

interface Props {
  filter: string
  onStatsUpdate: (stats: any) => void
  onPotholeSelect: (pothole: any) => void
}

type LeafletContainer = HTMLDivElement & { _leaflet_id?: number }

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  moderate: '#D97706',
  low: '#65A30D',
  safe: '#16A34A',
  repaired: '#3B82F6'
}

// Simulate pothole data for demo
function generateDemoData() {
  const cities = [
    { lat: 28.6139, lng: 77.2090, name: 'Delhi' },
    { lat: 19.0760, lng: 72.8777, name: 'Mumbai' },
    { lat: 12.9716, lng: 77.5946, name: 'Bengaluru' },
    { lat: 22.5726, lng: 88.3639, name: 'Kolkata' },
    { lat: 13.0827, lng: 80.2707, name: 'Chennai' },
    { lat: 17.3850, lng: 78.4867, name: 'Hyderabad' },
    { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad' },
    { lat: 26.9124, lng: 75.7873, name: 'Jaipur' },
    { lat: 21.1458, lng: 79.0882, name: 'Nagpur' },
    { lat: 18.5204, lng: 73.8567, name: 'Pune' },
  ]
  const severities = ['critical', 'critical', 'high', 'high', 'moderate', 'moderate', 'moderate', 'low', 'safe']
  const sources = ['dashcam', 'satellite', 'cctv', 'drone', 'manual']
  const features = []

  for (const city of cities) {
    const count = Math.floor(Math.random() * 20) + 10
    for (let i = 0; i < count; i++) {
      const sev = severities[Math.floor(Math.random() * severities.length)]
      const isRepaired = Math.random() < 0.3
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            city.lng + (Math.random() - 0.5) * 0.4,
            city.lat + (Math.random() - 0.5) * 0.4
          ]
        },
        properties: {
          id: `demo-${Math.random().toString(36).substr(2, 9)}`,
          detection_id: `DET-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
          severity: isRepaired ? 'safe' : sev,
          originalSeverity: sev,
          confidence: Math.random() * 0.5 + 0.45,
          is_repaired: isRepaired,
          sensor_source: sources[Math.floor(Math.random() * sources.length)],
          detected_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
          city: city.name
        }
      })
    }
  }
  return features
}

export default function LeafletMap({ filter, onStatsUpdate, onPotholeSelect }: Props) {
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const initTokenRef = useRef(0)

  const destroyMap = useCallback(() => {
    markersRef.current = []

    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const container = containerRef.current as LeafletContainer | null
    if (container?._leaflet_id) {
      delete container._leaflet_id
    }
  }, [])

  const initMap = useCallback(async () => {
    const container = containerRef.current as LeafletContainer | null

    if (typeof window === 'undefined' || !container) return
    if (mapRef.current) return

    const token = ++initTokenRef.current

    const L = (await import('leaflet')).default
    const activeContainer = containerRef.current as LeafletContainer | null

    if (!activeContainer || mapRef.current || initTokenRef.current !== token) return

    // Fix Leaflet default icon
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })

    if (activeContainer._leaflet_id) {
      delete activeContainer._leaflet_id
    }

    // Initialize map centered on India
    const map = L.map(activeContainer, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
    })

    // Satellite tile layer (ESRI World Imagery)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri — Source: Esri, USGS, NOAA | NRIP — Government of India',
      maxZoom: 19
    }).addTo(map)

    // Road labels overlay on top of satellite
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: '',
      maxZoom: 19,
      opacity: 0.7
    }).addTo(map)

    mapRef.current = map

    if (initTokenRef.current !== token) {
      map.remove()
      mapRef.current = null
      if (activeContainer._leaflet_id) {
        delete activeContainer._leaflet_id
      }
      return
    }

    // Load pothole data
    await loadPotholes(L, map, filter)
  }, [filter])

  const loadPotholes = async (L: any, map: any, currentFilter: string) => {
    // Clear existing markers
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    let features: any[] = []

    try {
      const res = await fetch(`${API_URL}/potholes/map-data`)
      if (res.ok) {
        const data = await res.json()
        features = data.features || []
      }
    } catch {
      // Use demo data
      features = generateDemoData()
    }

    // Update stats
    const stats = { critical: 0, high: 0, moderate: 0, total: features.length }
    features.forEach((f: any) => {
      if (f.properties.severity === 'critical') stats.critical++
      if (f.properties.severity === 'high') stats.high++
      if (f.properties.severity === 'moderate') stats.moderate++
    })
    onStatsUpdate(stats)

    // Filter
    const filtered = currentFilter === 'all'
      ? features
      : features.filter((f: any) => f.properties.originalSeverity === currentFilter || f.properties.severity === currentFilter)

    // Add markers
    filtered.forEach((feature: any) => {
      const props = feature.properties
      const [lng, lat] = feature.geometry.coordinates
      const color = props.is_repaired
        ? SEVERITY_COLORS.repaired
        : SEVERITY_COLORS[props.severity] || '#6B7280'

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width: ${props.severity === 'critical' ? 16 : 12}px;
          height: ${props.severity === 'critical' ? 16 : 12}px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 ${props.severity === 'critical' ? 8 : 4}px ${color}88;
          ${props.severity === 'critical' ? 'animation: none;' : ''}
        "></div>`,
        iconSize: [props.severity === 'critical' ? 16 : 12, props.severity === 'critical' ? 16 : 12],
        iconAnchor: [8, 8]
      })

      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:200px;font-family:Inter,sans-serif">
            <div style="background:${color};color:white;padding:8px 12px;border-radius:8px 8px 0 0;margin:-12px -12px 8px -12px;font-weight:bold">
              ${props.severity?.toUpperCase()} POTHOLE
            </div>
            <div style="font-size:11px;color:#666;margin-bottom:4px">${props.detection_id}</div>
            <table style="width:100%;font-size:12px;border-collapse:collapse">
              <tr><td style="color:#888;padding:2px 0">Source</td><td style="font-weight:500;text-transform:capitalize">${props.sensor_source}</td></tr>
              <tr><td style="color:#888;padding:2px 0">AI Confidence</td><td style="font-weight:500">${((props.confidence || 0) * 100).toFixed(1)}%</td></tr>
              <tr><td style="color:#888;padding:2px 0">Detected</td><td style="font-weight:500">${props.detected_at ? new Date(props.detected_at).toLocaleDateString('en-IN') : 'N/A'}</td></tr>
              <tr><td style="color:#888;padding:2px 0">Status</td><td style="font-weight:500;color:${props.is_repaired ? '#16A34A' : '#DC2626'}">${props.is_repaired ? '✅ Repaired' : '⚠️ Active'}</td></tr>
            </table>
          </div>
        `)
        .on('click', () => onPotholeSelect(props))

      markersRef.current.push(marker)
    })
  }

  useEffect(() => {
    initMap()
    return () => {
      initTokenRef.current += 1
      destroyMap()
    }
  }, [])

  // Re-filter when filter changes
  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then(({ default: L }) => {
      loadPotholes(L, mapRef.current, filter)
    })
  }, [filter])

  return (
    <div ref={containerRef} className="w-full h-full" style={{ zIndex: 0 }} />
  )
}
