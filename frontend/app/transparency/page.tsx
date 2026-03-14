'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, Shield, Eye, Globe, TrendingUp, Users } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const demoStats = {
  active_potholes: 1284,
  repairs_completed: 8921,
  blockchain_records: 156432,
  total_government_spend_inr: 890000000
}

const topContractors = [
  { company_name: 'Ashoka Buildcon', rating: 4.7, total_jobs: 145, quality_score: 94.2, state: 'National', grade: 'A+' },
  { company_name: 'L&T Infrastructure', rating: 4.6, total_jobs: 89, quality_score: 91.7, state: 'National', grade: 'A+' },
  { company_name: 'NCC Limited', rating: 4.4, total_jobs: 67, quality_score: 88.4, state: 'National', grade: 'A' },
]

const recentRepairs = [
  { repair_number: 'WO-2024-A1B2C3', status: 'verified', ai_verified: true, ai_verification_score: 91.2 },
  { repair_number: 'WO-2024-D4E5F6', status: 'completed', ai_verified: false, ai_verification_score: null },
  { repair_number: 'WO-2024-G7H8I9', status: 'in_progress', ai_verified: false, ai_verification_score: null },
]

export default function TransparencyPortal() {
  const [stats, setStats] = useState(demoStats)
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    fetch(`${API_URL}/transparency/`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats(demoStats))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-govGreen-600 text-white px-6 py-4" style={{ backgroundColor: '#138808' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-green-200 hover:text-white transition text-sm">← Home</Link>
            <span>|</span>
            <Globe className="w-5 h-5" />
            <div>
              <h1 className="font-bold text-xl">Public Transparency Portal</h1>
              <p className="text-green-200 text-xs">Government of India | National Road Intelligence Platform</p>
            </div>
          </div>
          <div className="text-xs text-green-200">
            🔓 Public Access | No login required
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6" style={{ backgroundColor: '#0D6E04' }}>
        <div className="max-w-7xl mx-auto flex text-sm">
          {[['overview', '📊 Overview'], ['blockchain', '🔗 Blockchain Ledger'], ['contractors', '🏭 Contractors'], ['repairs', '🔧 Repair Tracker']].map(([v, l]) => (
            <button key={v} onClick={() => setActiveSection(v)}
              className={`px-4 py-3 font-medium transition ${activeSection === v ? 'text-white border-b-2 border-saffron' : 'text-green-300 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {activeSection === 'overview' && (
          <>
            {/* Hero Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Active Potholes', value: stats.active_potholes.toLocaleString(), icon: '🕳️', desc: 'Under monitoring' },
                { label: 'Repairs Completed', value: stats.repairs_completed.toLocaleString(), icon: '✅', desc: 'AI verified' },
                { label: 'Blockchain Records', value: stats.blockchain_records.toLocaleString(), icon: '🔗', desc: 'Immutable entries' },
                { label: 'Government Spend', value: `₹${(stats.total_government_spend_inr / 10000000).toFixed(1)} Cr`, icon: '💰', desc: 'This FY' },
              ].map((s, i) => (
                <div key={i} className="gov-card p-6 text-center border-t-4 border-govGreen-400" style={{ borderColor: '#138808' }}>
                  <div className="text-4xl mb-2">{s.icon}</div>
                  <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">{s.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
                </div>
              ))}
            </div>

            {/* Transparency Commitments */}
            <div className="gov-card p-6">
              <h3 className="font-bold text-govBlue-700 mb-4 text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Our Transparency Commitments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: '🔗', title: 'Blockchain Verified', desc: 'Every repair lifecycle event is logged on blockchain — tamper-proof and publicly verifiable.' },
                  { icon: '🤖', title: 'AI Accountability', desc: 'Repair quality is verified by AI — not self-reported by contractors.' },
                  { icon: '👥', title: 'Citizen Oversight', desc: 'Citizens can vote on complaints and verify repair quality from their mobile phones.' },
                ].map((c, i) => (
                  <div key={i} className="flex gap-3 p-4 bg-gray-50 rounded-xl">
                    <span className="text-3xl">{c.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">{c.title}</div>
                      <p className="text-xs text-gray-600 mt-1">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeSection === 'blockchain' && (
          <div className="gov-card p-6">
            <h3 className="font-bold text-govBlue-700 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Public Blockchain Ledger — Infrastructure Events
            </h3>
            <p className="text-gray-500 text-sm mb-5">
              All infrastructure lifecycle events are hashed and recorded on the Polygon blockchain network.
              Records are immutable and publicly verifiable.
            </p>
            <div className="space-y-2">
              {[
                { hash: '0xab3f9d2e14c8a7b9...', type: 'verification', time: '2 mins ago', confirmed: true },
                { hash: '0xcd7e8b1a35f2c6d9...', type: 'repair', time: '15 mins ago', confirmed: true },
                { hash: '0xef1a2b3c4d5e6f7a...', type: 'complaint', time: '32 mins ago', confirmed: true },
                { hash: '0x12a3b4c5d6e7f809...', type: 'detection', time: '1 hour ago', confirmed: true },
                { hash: '0x34c5d6e7f890a1b2...', type: 'assignment', time: '2 hours ago', confirmed: true },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                  <span className="font-mono text-xs text-gray-600 flex-1">{r.hash}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded capitalize">{r.type}</span>
                  <span className="text-xs text-gray-400">{r.time}</span>
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓ Confirmed</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-700">
              🔒 All records are stored on Polygon Mumbai Testnet. Verify independently at: polygonscan.com
            </div>
          </div>
        )}

        {activeSection === 'contractors' && (
          <div className="gov-card p-6">
            <h3 className="font-bold text-govBlue-700 mb-4">Public Contractor Performance Rankings</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left bg-gray-50">
                    <th className="py-3 px-3 font-semibold text-gray-600">Rank</th>
                    <th className="py-3 px-3 font-semibold text-gray-600">Company</th>
                    <th className="py-3 px-3 font-semibold text-gray-600">Rating</th>
                    <th className="py-3 px-3 font-semibold text-gray-600">Jobs</th>
                    <th className="py-3 px-3 font-semibold text-gray-600">Quality</th>
                    <th className="py-3 px-3 font-semibold text-gray-600">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topContractors.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-500'
                        }`}>{i + 1}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-gray-800">{c.company_name}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span className="font-medium">{c.rating}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-700">{c.total_jobs}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${c.quality_score}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{c.quality_score}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.grade === 'A+' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {c.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'repairs' && (
          <div className="gov-card p-6">
            <h3 className="font-bold text-govBlue-700 mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Public Repair Status Tracker
            </h3>
            <div className="space-y-3">
              {recentRepairs.map((r, i) => (
                <div key={i} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    r.status === 'verified' ? 'bg-green-500' : 
                    r.status === 'completed' ? 'bg-blue-500' : 'bg-yellow-400 animate-pulse'
                  }`} />
                  <span className="font-mono text-sm font-medium text-gray-800 flex-1">{r.repair_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium badge-${r.status}`}>
                    {r.status.replace('_', ' ')}
                  </span>
                  {r.ai_verified ? (
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> AI Verified: {r.ai_verification_score?.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Pending AI Verification</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="mt-12 bg-govBlue-900 text-white py-6 text-center">
        <p className="text-sm text-blue-300">
          🇮🇳 Government of India | National Road Intelligence Platform | 
          Powered by AI & Blockchain | Digital India Initiative
        </p>
        <p className="text-xs text-blue-500 mt-1">
          All data is publicly accessible under RTI Act 2005. 
          Contact: transparency@nrip.gov.in
        </p>
      </footer>
    </div>
  )
}
