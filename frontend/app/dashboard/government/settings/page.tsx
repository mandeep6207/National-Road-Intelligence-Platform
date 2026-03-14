'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'

export default function GovernmentSettingsPage() {
  const [autoEscalate, setAutoEscalate] = useState(false)
  const [notificationMode, setNotificationMode] = useState<'all' | 'high-only'>('high-only')
  const [saved, setSaved] = useState('')

  function handleSave() {
    setSaved('Workflow settings updated for Government Authority dashboard.')
    setTimeout(() => setSaved(''), 2500)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Settings className="h-5 w-5 text-[#1f4e79]" />
          <h2 className="text-lg font-bold text-[#0d3b5c]">Workflow Settings</h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Auto escalate overdue repairs</p>
              <p className="text-xs text-slate-500">Automatically mark delayed contractor jobs as escalated.</p>
            </div>
            <input type="checkbox" checked={autoEscalate} onChange={(event) => setAutoEscalate(event.target.checked)} className="h-4 w-4" />
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700">Notification mode</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="notification"
                  checked={notificationMode === 'all'}
                  onChange={() => setNotificationMode('all')}
                />
                All updates
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="notification"
                  checked={notificationMode === 'high-only'}
                  onChange={() => setNotificationMode('high-only')}
                />
                High priority only
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={handleSave} className="rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a]">
            Save Settings
          </button>
          {saved && <span className="text-sm text-emerald-700">{saved}</span>}
        </div>
      </section>
    </div>
  )
}
