import type { DashboardView } from '../types'

const headings: Record<DashboardView, string> = {
  Overview: 'Here’s your day at a glance.',
  Finances: 'A clearer picture of your money.',
  'My day': 'Make room for what matters.',
  'Daily brief': 'A little perspective for your day.',
}

export function DashboardHeading({
  name,
  view,
  completedTasks,
  totalTasks,
}: {
  name: string
  view: DashboardView
  completedTasks: number
  totalTasks: number
}) {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const percentage =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
  return (
    <div className="mb-9 flex flex-wrap items-end justify-between gap-5 sm:mb-11">
      <div>
        <p className="mb-2 text-[11px] text-muted">
          {greeting}, {name.split(' ')[0]}
        </p>
        <h1 className="max-w-2xl font-editorial text-[35px] leading-[1.12] tracking-[-.055em] sm:text-[43px]">
          {headings[view]}
        </h1>
      </div>
      <div
        className="flex shrink-0 items-center gap-3"
        role="progressbar"
        aria-label="Day progress"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="relative flex size-[52px] items-center justify-center">
          <svg
            className="absolute inset-0 size-full -rotate-90"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <circle
              cx="24"
              cy="24"
              r="21"
              strokeWidth="3"
              className="fill-none stroke-line"
            />
            <circle
              cx="24"
              cy="24"
              r="21"
              strokeWidth="3"
              pathLength="100"
              strokeDasharray={`${percentage} 100`}
              strokeLinecap="round"
              className="fill-none stroke-lime"
            />
          </svg>
          <span className="text-[10px] font-semibold">{percentage}%</span>
        </div>
        <div>
          <p className="text-[10px] font-semibold">Day progress</p>
          <p className="mt-1 text-[9px] text-muted">
            {completedTasks} of {totalTasks} tasks done
          </p>
        </div>
      </div>
    </div>
  )
}
