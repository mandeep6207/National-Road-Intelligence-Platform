'use client'

import { useState } from 'react'
import type { CitizenStatsResponse } from '@/lib/api'
import { downloadCitizenCertificate } from '@/lib/api'

type CitizenAchievementsProps = {
  stats: CitizenStatsResponse | null
}

export default function CitizenAchievements({ stats }: CitizenAchievementsProps) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const badges = stats?.badges ?? []
  const certificates = stats?.certificates ?? []
  const hasCertificate = certificates.includes('Road Safety Contributor Certificate') || (stats?.tokens_earned ?? 0) >= 100

  async function handleDownloadCertificate() {
    setDownloading(true)
    setError('')
    try {
      const blob = await downloadCitizenCertificate()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'road_safety_contributor_certificate.pdf'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (certificateError: any) {
      setError(certificateError?.message || 'Certificate download failed.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-[#0d3b5c]">Achievement Badges</h3>
        <p className="mt-1 text-sm font-semibold text-slate-700">Badges Earned: {badges.length}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {badges.length === 0 ? (
            <span className="text-sm text-slate-500">No badges earned yet. Submit pothole reports to unlock badges.</span>
          ) : (
            badges.map((badge) => (
              <span key={badge} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                {badge}
              </span>
            ))
          )}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-[#0d3b5c]">Certificate Unlock</h3>
        <p className="mt-2 text-sm text-slate-600">
          Road Safety Contributor Certificate unlocks at 100 tokens.
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-700">
          Current tokens: {stats?.tokens_earned ?? 0}
        </p>
        <button
          type="button"
          onClick={handleDownloadCertificate}
          disabled={!hasCertificate || downloading}
          className="mt-3 rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {downloading ? 'Preparing PDF...' : 'Download Certificate PDF'}
        </button>
        {!hasCertificate && <p className="mt-2 text-xs text-slate-500">Keep participating to reach 100 tokens.</p>}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </article>
    </section>
  )
}
