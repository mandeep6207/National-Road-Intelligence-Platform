'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Landmark,
  Lock,
  Shield,
  User,
  Wrench,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const ROLE_DASHBOARDS: Record<string, string> = {
  admin: '/dashboard/admin',
  authority: '/dashboard/government',
  contractor: '/dashboard/contractor',
  citizen: '/dashboard/citizen',
  super_admin: '/dashboard/admin',
  government: '/dashboard/government',
}

const ROLES = [
  {
    role: 'admin',
    label: 'Admin',
    buttonLabel: 'Login as Admin',
    email: 'admin@test.com',
    password: '1234',
    icon: Shield,
    iconWrap: 'bg-[#e6eef5] text-[#0d3b5c]',
    desc: 'Platform administration',
  },
  {
    role: 'authority',
    label: 'Road Authority',
    buttonLabel: 'Login as Authority',
    email: 'authority@test.com',
    password: '1234',
    icon: Landmark,
    iconWrap: 'bg-[#e8f1f8] text-[#1f4e79]',
    desc: 'Policy oversight',
  },
  {
    role: 'contractor',
    label: 'Contractor Management',
    buttonLabel: 'Login as Contractor',
    email: 'contractor@test.com',
    password: '1234',
    icon: Wrench,
    iconWrap: 'bg-[#fff3dc] text-[#b86b00]',
    desc: 'Repair execution',
  },
  {
    role: 'citizen',
    label: 'Citizen Portal',
    buttonLabel: 'Login as Citizen',
    email: 'citizen@test.com',
    password: '1234',
    icon: User,
    iconWrap: 'bg-[#e8f6ee] text-[#2f855a]',
    desc: 'Report road issues',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [loadingRole, setLoadingRole] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const loginAs = async (roleEmail: string, rolePassword: string, roleKey: string) => {
    setLoadingRole(roleKey)
    setError('')
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: roleEmail, password: rolePassword }),
      })
      const data = await res.json()
      const token = data?.access_token || data?.token
      const role = data?.user?.role || data?.role
      const userEmail = data?.user?.email || roleEmail
      const userName = data?.user?.name || data?.full_name || 'User'
      const userId = data?.user_id || userEmail

      if (!res.ok || data?.success === false || !token || !role) {
        throw new Error(data?.message || data?.detail || 'Login failed')
      }

      localStorage.setItem('nrip_token', token)
      localStorage.setItem('nrip_role', role)
      localStorage.setItem('nrip_user', JSON.stringify({
        id: userId,
        name: userName,
        role,
        email: userEmail,
      }))
      router.push(ROLE_DASHBOARDS[role] || '/dashboard/citizen')
    } catch (err: any) {
      setError(err.message || 'Login failed. Is the backend running?')
      setLoadingRole(null)
    }
  }

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Enter email and password'); return }
    await loginAs(email, password, 'manual')
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#d8e4ec] bg-[#f8fafc] text-2xl shadow-sm">
              🇮🇳
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#1f4e79]">Government Of India</p>
              <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0d3b5c] sm:text-2xl">National Road Intelligence Platform</h1>
              <p className="mt-1 text-sm text-slate-600">Government Infrastructure Monitoring System</p>
            </div>
          </div>
        </div>
        <div className="h-1 w-full bg-[linear-gradient(to_right,#f59e0b_33%,#ffffff_33%,#ffffff_66%,#138808_66%)]" />
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="border-b border-slate-200 pb-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#1f4e79]">Demo Access Portal</p>
            <h2 className="mt-2 text-2xl font-bold text-[#0d3b5c]">Authorized Demo Access</h2>
          </div>

          <div className="mt-6 space-y-5">
            {ROLES.map((r) => {
              const Icon = r.icon

              return (
                <div key={r.role} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${r.iconWrap}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-[#0d3b5c]">{r.label}</h3>
                      <p className="mt-1 text-sm text-slate-600">{r.desc}</p>
                      <button
                        onClick={() => loginAs(r.email, r.password, r.role)}
                        disabled={!!loadingRole}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#0d3b5c] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0a304a] disabled:opacity-60"
                      >
                        {loadingRole === r.role ? 'Signing in...' : r.buttonLabel}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 rounded-3xl border border-slate-200 bg-[#f8fafc] p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7eef4] text-[#0d3b5c]">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#1f4e79]">Manual Login</p>
                <h3 className="mt-1 text-xl font-bold text-[#0d3b5c]">Manual Credential Verification</h3>
              </div>
            </div>

            <form onSubmit={handleManualLogin} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700" data-i18n="email_address">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  data-i18n-placeholder="enter_authorized_email"
                  placeholder="Enter authorized email"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-[#1f4e79] focus:ring-2 focus:ring-[#1f4e79]/15"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700" data-i18n="password">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  data-i18n-placeholder="enter_password"
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-[#1f4e79] focus:ring-2 focus:ring-[#1f4e79]/15"
                />
              </div>
              <button
                type="submit"
                disabled={!!loadingRole}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#0d3b5c] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0a304a] disabled:opacity-60"
              >
                {loadingRole === 'manual' ? 'Signing in...' : 'Sign In To Portal'}
              </button>
            </form>

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#d7e4ef] bg-white px-4 py-3 text-sm text-slate-600">
              <Shield className="mt-0.5 h-4 w-4 text-[#1f4e79]" />
              <p>This is a secure government authentication portal. Unauthorized access is prohibited.</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm font-semibold text-[#1f4e79] hover:text-[#0d3b5c]">
              Back to Homepage
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-center text-sm text-slate-600 sm:px-6 lg:px-8">
          <p>© Government of India</p>
          <p>National Road Intelligence Platform</p>
        </div>
      </footer>
    </div>
  )
}
