'use client'

import Link from 'next/link'
import { useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, ScatterChart, Scatter, ZAxis } from 'recharts'
import { TrendingDown, TrendingUp, AlertCircle, Map, Target } from 'lucide-react'

const highwayData = [
  { highway: 'NH-48', potholes: 234, avgResponseDays: 12, repaired: 178, budget: 4.2 },
  { highway: 'NH-44', potholes: 189, avgResponseDays: 8, repaired: 167, budget: 3.8 },
  { highway: 'NH-19', potholes: 312, avgResponseDays: 18, repaired: 198, budget: 5.1 },
  { highway: 'NH-27', potholes: 156, avgResponseDays: 7, repaired: 145, budget: 2.9 },
  { highway: 'NH-6', potholes: 278, avgResponseDays: 14, repaired: 201, budget: 4.7 },
]

const failureForecast = [
  { road: 'NH-19 UP Stretch', probability: 89, days: 28, cost: 45 },
  { road: 'NH-44 Bihar Corridor', probability: 82, days: 35, cost: 38 },
  { road: 'SH-8 Rajasthan', probability: 76, days: 42, cost: 22 },
  { road: 'MDR-12 Jharkhand', probability: 71, days: 55, cost: 18 },
  { road: 'NH-16 Odisha', probability: 68, days: 61, cost: 31 },
]

const radarData = [
  { metric: 'Detection Speed', india: 72, global: 85 },
  { metric: 'Repair Quality', india: 68, global: 82 },
  { metric: 'Response Time', india: 55, global: 79 },
  { metric: 'Budget Efficiency', india: 64, global: 77 },
  { metric: 'Citizen Satisfaction', india: 61, global: 80 },
  { metric: 'Transparency', india: 70, global: 88 },
]

const budgetTrend = [
  { quarter: 'Q1 FY24', allocated: 120, spent: 98, anomalies: 2 },
  { quarter: 'Q2 FY24', allocated: 135, spent: 122, anomalies: 4 },
  { quarter: 'Q3 FY24', allocated: 140, spent: 89, anomalies: 1 },
  { quarter: 'Q4 FY24', allocated: 150, spent: 0, anomalies: 0 },
]

export default function PolicyDashboard() {
  const [activeView, setActiveView] = useState('highways')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-govBlue-900 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-blue-400 hover:text-white transition text-sm">← Home</Link>
            <span>|</span>
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="font-bold text-xl">Government Policy Intelligence Dashboard</h1>
              <p className="text-blue-300 text-xs">Road Infrastructure Analytics | MoRTH</p>
            </div>
          </div>
          <div className="text-xs text-blue-400">Last updated: {new Date().toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-govBlue-800 px-6">
        <div className="max-w-7xl mx-auto flex text-sm">
          {[['highways', '🛣️ Dangerous Highways'], ['repairs', '⏱️ Repair Delays'], ['contractors', '🏆 Rankings'], ['budget', '💰 Budget'], ['forecast', '🔮 Failure Forecast'], ['global', '🌍 Global Benchmark']].map(([v, l]) => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`px-4 py-3 font-medium transition whitespace-nowrap ${activeView === v ? 'text-white border-b-2 border-saffron' : 'text-blue-300 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {activeView === 'highways' && (
          <>
            <div className="gov-card p-6">
              <h3 className="font-bold text-govBlue-700 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Most Dangerous National Highways
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={highwayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="highway" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="potholes" fill="#DC2626" name="Active Potholes" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="repaired" fill="#16A34A" name="Repaired" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="gov-card p-6">
              <h3 className="font-bold text-govBlue-700 mb-4">Average Response Time by Highway (Days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={highwayData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="highway" type="category" tick={{ fontSize: 12 }} width={60} />
                  <Tooltip />
                  <Bar dataKey="avgResponseDays" fill="#1A3A6B" name="Days to Respond" radius={[0, 4, 4, 0]}
                    label={({ x, y, width, value }) => <text x={x + width + 5} y={y + 12} fill="#666" fontSize={11}>{value}d</text>} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {activeView === 'forecast' && (
          <div className="gov-card p-6">
            <h3 className="font-bold text-govBlue-700 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              Infrastructure Failure Prediction (30-90 Days)
            </h3>
            <p className="text-gray-500 text-sm mb-5">Roads with highest failure probability in the next quarter</p>
            <div className="space-y-4">
              {failureForecast.map((f, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-red-300 transition">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                    f.probability >= 85 ? 'bg-red-600' : f.probability >= 75 ? 'bg-orange-500' : 'bg-yellow-500'
                  }`}>
                    {f.probability}%
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{f.road}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${
                          f.probability >= 85 ? 'bg-red-500' : f.probability >= 75 ? 'bg-orange-500' : 'bg-yellow-500'
                        }`} style={{ width: `${f.probability}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-800">~{f.days} days</div>
                    <div className="text-xs text-gray-500">until failure</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-govBlue-700">₹{f.cost} Cr</div>
                    <div className="text-xs text-gray-500">est. repair cost</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                    f.probability >= 85 ? 'bg-red-100 text-red-700' : f.probability >= 75 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {f.probability >= 85 ? '🚨 CRITICAL' : f.probability >= 75 ? '⚠️ HIGH' : '⚡ MEDIUM'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'global' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="gov-card p-6">
              <h3 className="font-bold text-govBlue-700 mb-4">🌍 Global Infrastructure Benchmark</h3>
              <p className="text-gray-500 text-sm mb-4">India vs Global Average across infrastructure KPIs</p>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <Radar name="India" dataKey="india" stroke="#FF9933" fill="#FF9933" fillOpacity={0.3} />
                  <Radar name="Global Avg" dataKey="global" stroke="#1A3A6B" fill="#1A3A6B" fillOpacity={0.15} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="gov-card p-6">
              <h3 className="font-bold text-govBlue-700 mb-4">Global Rankings (Road Quality Index)</h3>
              <div className="space-y-3">
                {[
                  { rank: 1, country: '🇸🇬 Singapore', score: 94.2, trend: 'stable' },
                  { rank: 2, country: '🇦🇪 UAE', score: 91.8, trend: 'up' },
                  { rank: 8, country: '🇺🇸 USA', score: 82.4, trend: 'stable' },
                  { rank: 17, country: '🇨🇳 China', score: 74.1, trend: 'up' },
                  { rank: 34, country: '🇧🇷 Brazil', score: 62.7, trend: 'down' },
                  { rank: 42, country: '🇮🇳 India', score: 58.3, trend: 'up', highlight: true },
                  { rank: 51, country: '🇳🇬 Nigeria', score: 41.2, trend: 'stable' },
                ].map((c, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${c.highlight ? 'bg-saffron/10 border border-saffron/30' : 'hover:bg-gray-50'}`}>
                    <span className="text-sm font-bold text-gray-500 w-8">#{c.rank}</span>
                    <span className="flex-1 text-sm font-medium">{c.country}</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-govBlue-600 h-2 rounded-full" style={{ width: `${c.score}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-10">{c.score}</span>
                    <span>{c.trend === 'up' ? '📈' : c.trend === 'down' ? '📉' : '➡️'}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-saffron/10 rounded-lg border border-saffron/20 text-sm text-gray-700">
                🇮🇳 India's road quality index has improved by <strong>+7.2 points</strong> since NRIP deployment.
                Target: Top 30 by 2030.
              </div>
            </div>
          </div>
        )}

        {activeView === 'budget' && (
          <div className="gov-card p-6">
            <h3 className="font-bold text-govBlue-700 mb-4">Autonomous Budget Guard — Quarterly Analysis</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={budgetTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `₹${v} Cr`} />
                <Legend />
                <Bar dataKey="allocated" fill="#1A3A6B" name="Allocated (₹ Cr)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" fill="#16A34A" name="Spent (₹ Cr)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-sm font-semibold text-yellow-800">🤖 AI Budget Guard Alert</div>
              <p className="text-xs text-yellow-700 mt-1">Q2 FY24: 4 anomalous transactions detected totaling ₹4.2 Cr above statistical norm. Flagged for audit review.</p>
            </div>
          </div>
        )}

        {(activeView === 'repairs' || activeView === 'contractors') && (
          <div className="gov-card p-6">
            <h3 className="font-bold text-govBlue-700 mb-4">
              {activeView === 'repairs' ? '⏱️ Repair Delay Analysis' : '🏆 Contractor Performance Rankings'}
            </h3>
            <p className="text-gray-500">This section displays interactive charts and tables with the latest data from the backend API.</p>
            <Link href="/dashboard/government" className="inline-block mt-4 bg-govBlue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-govBlue-800 transition">
              View Full Details →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
