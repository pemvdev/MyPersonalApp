import { useState } from 'react'
import { Icon } from '../../../components/ui/Icon'
import type { EntryType } from '../types'

interface TopbarProps {
  onMenu: () => void
  onAdd: (type: EntryType) => void
  search: string
  onSearch: (value: string) => void
  pendingTasks: number
}

export function Topbar({
  onMenu,
  onAdd,
  search,
  onSearch,
  pendingTasks,
}: TopbarProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [openPanel, setOpenPanel] = useState<'notifications' | 'add' | null>(
    null,
  )
  const date = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date())
  return (
    <header className="relative z-20 flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-line bg-sidebar px-4 py-3 sm:px-8">
      <div className="flex items-center gap-3 text-[11px] text-muted">
        <button
          aria-label="Open navigation"
          onClick={onMenu}
          className="icon-button lg:hidden"
        >
          <Icon name="menu" />
        </button>
        <Icon name="sun" className="hidden size-4 sm:block" />
        <span>{date}</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          aria-label="Search workspace"
          aria-expanded={isSearching}
          onClick={() => setIsSearching(!isSearching)}
          className="icon-button"
        >
          <Icon name="search" />
        </button>
        <button
          aria-label="Notifications"
          aria-expanded={openPanel === 'notifications'}
          onClick={() =>
            setOpenPanel(openPanel === 'notifications' ? null : 'notifications')
          }
          className="icon-button relative"
        >
          <Icon name="bell" />
          <span className="absolute right-1.5 top-1 size-1.5 rounded-full border border-sidebar bg-coral" />
        </button>
        <button
          onClick={() => setOpenPanel(openPanel === 'add' ? null : 'add')}
          aria-expanded={openPanel === 'add'}
          className="flex items-center gap-2 rounded-md bg-ink px-3 py-2.5 text-[10px] font-medium text-white sm:px-4"
        >
          <Icon name="plus" className="size-3.5" />
          Quick add
        </button>
      </div>
      {isSearching && (
        <div className="w-full">
          <label htmlFor="workspace-search" className="sr-only">
            Search tasks, transactions, and articles
          </label>
          <input
            id="workspace-search"
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search your workspace…"
            className="field"
            autoFocus
          />
        </div>
      )}
      {openPanel && (
        <>
          <button
            aria-label="Close quick panel"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpenPanel(null)}
          />
          <div className="absolute right-4 top-[calc(100%-4px)] z-20 w-64 rounded-xl border border-line bg-surface p-4 shadow-lg sm:right-8">
            {openPanel === 'notifications' ? (
              <>
                <h2 className="text-sm font-semibold">A little reminder</h2>
                <p className="mt-2 text-xs leading-6 text-muted">
                  You have {pendingTasks} unfinished{' '}
                  {pendingTasks === 1 ? 'task' : 'tasks'} in your schedule. One
                  thing at a time.
                </p>
              </>
            ) : (
              <div className="space-y-1">
                {(['task', 'transaction'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      onAdd(type)
                      setOpenPanel(null)
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-xs hover:bg-soft"
                  >
                    <Icon name={type === 'task' ? 'check' : 'wallet'} />
                    Add a {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </header>
  )
}
