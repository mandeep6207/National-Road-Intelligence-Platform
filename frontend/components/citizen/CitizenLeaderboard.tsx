import type { CitizenLeaderboardEntry } from '@/lib/api'

type CitizenLeaderboardProps = {
  entries: CitizenLeaderboardEntry[]
  loading?: boolean
}

export default function CitizenLeaderboard({ entries, loading = false }: CitizenLeaderboardProps) {
  const placeholderRows: CitizenLeaderboardEntry[] = [
    { rank: 1, name: 'Citizen A', reports: 0, tokens: 0 },
    { rank: 2, name: 'Citizen B', reports: 0, tokens: 0 },
  ]

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-[#0d3b5c]">Top Citizen Contributors</h3>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Leaderboard</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Rank</th>
              <th className="px-4 py-3 text-left font-semibold">Citizen</th>
              <th className="px-4 py-3 text-left font-semibold">Verified Reports</th>
              <th className="px-4 py-3 text-left font-semibold">Tokens</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading &&
              [1, 2, 3].map((row) => (
                <tr key={row}>
                  <td className="px-4 py-3"><div className="h-4 w-8 animate-pulse rounded bg-slate-200" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-slate-200" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-10 animate-pulse rounded bg-slate-200" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-10 animate-pulse rounded bg-slate-200" /></td>
                </tr>
              ))}

            {!loading && entries.length === 0 &&
              placeholderRows.map((entry) => (
                <tr key={`placeholder-${entry.rank}`} className="bg-slate-50/70">
                  <td className="px-4 py-3 font-semibold text-[#1f4e79]">#{entry.rank}</td>
                  <td className="px-4 py-3">{entry.name}</td>
                  <td className="px-4 py-3">{entry.reports}</td>
                  <td className="px-4 py-3">{entry.tokens}</td>
                </tr>
              ))}

            {!loading &&
              entries.map((entry) => (
                <tr key={`${entry.rank}-${entry.name}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-[#1f4e79]">#{entry.rank}</td>
                  <td className="px-4 py-3">{entry.name}</td>
                  <td className="px-4 py-3">{entry.reports}</td>
                  <td className="px-4 py-3">{entry.tokens}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
