import type { CitizenNotificationEntry } from '@/lib/api'

type CitizenNotificationsProps = {
  notifications: CitizenNotificationEntry[]
  loading?: boolean
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export default function CitizenNotifications({ notifications, loading = false }: CitizenNotificationsProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-[#0d3b5c]">Engagement Notifications</h3>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Latest updates</span>
      </div>

      <div className="space-y-3">
        {loading &&
          [1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 p-3">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-200" />
            </div>
          ))}

        {!loading && notifications.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            No notifications yet.
          </p>
        )}

        {!loading &&
          notifications.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#1f4e79]">{item.title}</p>
                <span className="text-xs text-slate-500">{formatDate(item.created_at)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{item.message}</p>
            </article>
          ))}
      </div>
    </section>
  )
}
