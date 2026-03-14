import type { CitizenStatsResponse } from '@/lib/api'

type CitizenStatsCardsProps = {
  stats: CitizenStatsResponse | null
  loading?: boolean
}

type StatCard = {
  label: string
  value: string | number
  accent: string
}

export default function CitizenStatsCards({ stats, loading = false }: CitizenStatsCardsProps) {
  const cards: StatCard[] = [
    {
      label: 'Solved Complaints',
      value: stats?.solved_complaints ?? 0,
      accent: 'text-emerald-700',
    },
    {
      label: 'Tokens Earned',
      value: stats?.tokens_earned ?? 0,
      accent: 'text-amber-600',
    },
    {
      label: 'Reporting Streak',
      value: stats ? `${stats.current_streak} day${stats.current_streak === 1 ? '' : 's'}` : '0 days',
      accent: 'text-sky-700',
    },
    {
      label: 'Citizen Rank',
      value: stats?.rank ?? 'Beginner Reporter',
      accent: 'text-[#0d3b5c]',
    },
  ]

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-2/3 animate-pulse rounded bg-slate-200" />
          ) : (
            <p className={`mt-2 text-2xl font-extrabold ${card.accent}`}>{card.value}</p>
          )}
        </article>
      ))}
    </section>
  )
}
