import { Icon } from '../../../components/ui/Icon'
import type { IconName } from '../../../components/ui/Icon'
import type { DashboardView } from '../types'

const navigation: { label: DashboardView; icon: IconName }[] = [
  { label: 'Overview', icon: 'grid' },
  { label: 'Finances', icon: 'wallet' },
  { label: 'My day', icon: 'check' },
  { label: 'Daily brief', icon: 'brief' },
]

interface SidebarProps {
  view: DashboardView
  onNavigate: (view: DashboardView) => void
  name: string
  pendingTasks: number
  onSignOut: () => void
  budgetTotal: number
  budgetSpent: number
  isSigningOut?: boolean
}

export function Sidebar({
  view,
  onNavigate,
  name,
  pendingTasks,
  onSignOut,
  isSigningOut,
  budgetTotal,
  budgetSpent,
}: SidebarProps) {
  const budgetPercent =
    budgetTotal > 0 ? Math.round((budgetSpent / budgetTotal) * 100) : 0
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
  return (
    <div className="flex h-full min-h-max w-56 max-w-full flex-col bg-sidebar px-4 py-6">
      <a
        href="/"
        className="mb-12 flex items-center gap-3 px-2 text-[13px] font-semibold tracking-tight"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-ink font-editorial text-xl text-lime">
          M
        </span>
        My Personal App
      </a>
      <p className="mb-3 px-3 text-[9px] font-medium uppercase tracking-[.2em] text-muted">
        Workspace
      </p>
      <nav aria-label="Workspace" className="space-y-1.5">
        {navigation.map((item) => (
          <button
            key={item.label}
            onClick={() => onNavigate(item.label)}
            aria-current={view === item.label ? 'page' : undefined}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-xs transition-colors ${view === item.label ? 'bg-ink text-white' : 'text-muted hover:bg-soft hover:text-ink'}`}
          >
            <Icon
              name={item.icon}
              className={view === item.label ? 'text-lime' : ''}
            />
            {item.label}
            {item.label === 'My day' && (
              <span className="ml-auto rounded-full bg-soft px-2 py-0.5 text-[9px] text-muted">
                {pendingTasks}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="mt-auto pt-12">
        <div className="rounded-lg bg-soft p-3.5">
          <div className="mb-3 flex justify-between text-[10px]">
            <span>Monthly budget</span>
            <span className="font-semibold">
              {budgetTotal > 0 ? `${budgetPercent}%` : 'No limits set'}
            </span>
          </div>
          <progress
            value={Math.min(100, budgetPercent)}
            max="100"
            aria-label="Monthly budget usage"
            className="goal-progress h-[3px] w-full"
          />
          <p className="mt-2 text-[9px] text-muted">
            {budgetTotal > 0
              ? 'Based on your recorded spending.'
              : 'Set category limits in Finances.'}
          </p>
        </div>
        <div className="mt-6 flex items-center gap-2.5 px-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sand text-[10px] font-medium">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold">{name}</p>
            <p className="mt-0.5 text-[9px] text-muted">Personal workspace</p>
          </div>
          {
            <button
              className="icon-button"
              onClick={onSignOut}
              disabled={isSigningOut}
              aria-label={isSigningOut ? 'Signing out…' : 'Sign out'}
            >
              <Icon name="logout" className="size-4" />
            </button>
          }
        </div>
      </div>
    </div>
  )
}
