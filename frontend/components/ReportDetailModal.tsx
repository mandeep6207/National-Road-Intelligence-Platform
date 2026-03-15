'use client'

import { useEffect, useState } from 'react'
import { fetchPotholeReportDetail, resolveStoredImageUrl, type PotholeReportDetail } from '@/lib/api'

export interface ReportDetailFallback {
  id: string
  complaint_id?: string
  type?: string
  severity?: string
  risk_score?: number
  confidence?: number
  latitude?: number
  longitude?: number
  state?: string
  district?: string
  pincode?: string
  road_name?: string
  timestamp?: string
  status?: string
  source?: string
  image?: string | null
}

interface ReportDetailModalProps {
  reportId: string | null
  title: string
  onClose: () => void
  fallback?: ReportDetailFallback | null
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return '—'
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return timestamp
  return parsed.toLocaleString()
}

export default function ReportDetailModal({ reportId, title, onClose, fallback = null }: ReportDetailModalProps) {
  const [report, setReport] = useState<PotholeReportDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!reportId) {
      setReport(null)
      setLoading(false)
      setError('')
      return
    }

    let active = true
    setLoading(true)
    setError('')
    setReport(null)

    fetchPotholeReportDetail(reportId)
      .then((detail) => {
        if (!active) return
        setReport(detail)
      })
      .catch((nextError: any) => {
        if (!active) return
        if (!fallback) {
          setError(nextError?.message || 'Unable to load pothole report details.')
        }
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fallback, reportId])

  if (!reportId) return null

  const detail = report ?? fallback
  const image = detail?.image ? resolveStoredImageUrl(detail.image) || detail.image : null

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/65 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold text-[#0d3b5c]">{title}</h4>
            <p className="mt-1 text-sm text-slate-600">Report ID: {reportId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.95fr]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={`Snapshot ${reportId}`} className="max-h-[70vh] w-full object-contain" />
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                {loading ? 'Loading report snapshot...' : 'No snapshot available for this report.'}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <p><span className="font-semibold">Complaint ID:</span> {formatValue(detail?.complaint_id || detail?.id || reportId)}</p>
              <p><span className="font-semibold">Type:</span> {formatValue(detail?.type || 'pothole')}</p>
              <p><span className="font-semibold">Severity:</span> {formatValue(detail?.severity)}</p>
              <p><span className="font-semibold">Risk Score:</span> {detail?.risk_score ?? '—'}</p>
              <p><span className="font-semibold">Confidence:</span> {detail?.confidence !== undefined ? detail.confidence.toFixed(3) : '—'}</p>
              <p><span className="font-semibold">Source:</span> {formatValue(detail?.source)}</p>
              <p><span className="font-semibold">Status:</span> {formatValue(detail?.status)}</p>
              <p><span className="font-semibold">Road:</span> {formatValue(detail?.road_name)}</p>
              <p><span className="font-semibold">Latitude:</span> {formatValue(detail?.latitude)}</p>
              <p><span className="font-semibold">Longitude:</span> {formatValue(detail?.longitude)}</p>
              <p><span className="font-semibold">State:</span> {formatValue(detail?.state)}</p>
              <p><span className="font-semibold">District:</span> {formatValue(detail?.district)}</p>
              <p><span className="font-semibold">Pincode:</span> {formatValue(detail?.pincode)}</p>
              <p><span className="font-semibold">Timestamp:</span> {formatTimestamp(detail?.timestamp)}</p>
            </div>

            {loading && !report && (
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                Loading full report metadata from backend...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}