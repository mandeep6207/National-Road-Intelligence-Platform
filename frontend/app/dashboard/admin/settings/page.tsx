'use client'

import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'

const SETTINGS_KEY = 'nrip_admin_ui_settings_v1'

interface UiSettings {
  autoRefreshInsights: boolean
  showHighPriorityAlerts: boolean
  enablePopupAutoOpen: boolean
}

const DEFAULT_SETTINGS: UiSettings = {
  autoRefreshInsights: true,
  showHighPriorityAlerts: true,
  enablePopupAutoOpen: false,
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<UiSettings>(DEFAULT_SETTINGS)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as UiSettings
      setSettings({ ...DEFAULT_SETTINGS, ...parsed })
    } catch {
      setSettings(DEFAULT_SETTINGS)
    }
  }, [])

  function updateSetting<K extends keyof UiSettings>(key: K, value: UiSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function saveSettings() {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    setSavedMessage('Settings saved for this browser session.')
    window.setTimeout(() => setSavedMessage(''), 2500)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Settings className="h-5 w-5 text-[#1f4e79]" />
          <h2 className="text-lg font-bold text-[#0d3b5c]">System Settings</h2>
        </div>
        <p className="text-sm text-slate-600">Configure interactive behavior for the AI Road Intelligence Control Center.</p>

        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Auto Refresh Insights</p>
              <p className="text-xs text-slate-500">Refresh insight cards after each analysis run.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoRefreshInsights}
              onChange={(event) => updateSetting('autoRefreshInsights', event.target.checked)}
              className="h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">High Priority Alerts</p>
              <p className="text-xs text-slate-500">Highlight high priority issues in report and issue tables.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.showHighPriorityAlerts}
              onChange={(event) => updateSetting('showHighPriorityAlerts', event.target.checked)}
              className="h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Auto Open Popup Details</p>
              <p className="text-xs text-slate-500">Automatically open first marker popup after simulation run.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enablePopupAutoOpen}
              onChange={(event) => updateSetting('enablePopupAutoOpen', event.target.checked)}
              className="h-4 w-4"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveSettings}
            className="rounded-lg bg-[#0d3b5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a304a]"
          >
            Save Settings
          </button>
          {savedMessage && <span className="text-sm text-emerald-700">{savedMessage}</span>}
        </div>
      </section>
    </div>
  )
}
