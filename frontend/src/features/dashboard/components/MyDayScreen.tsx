import { useState } from 'react'
import { Icon } from '../../../components/ui/Icon'
import { calendarDate } from '../format'
import type { Task } from '../types'
import type { FocusTimerState } from '../useFocusTimer'
import { Schedule } from './Schedule'

interface MyDayProps {
  date: string
  onDate: (date: string) => void
  tasks: Task[]
  total: number
  completed: number
  isSaving: boolean
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onAdd: () => void
  focus: FocusTimerState
}

export function MyDayScreen({
  date,
  onDate,
  tasks,
  total,
  completed,
  isSaving,
  onToggle,
  onRemove,
  onAdd,
  focus,
}: MyDayProps) {
  const [category, setCategory] = useState('All')
  const selected = new Date(`${date}T12:00:00`)
  const monday = new Date(selected)
  monday.setDate(selected.getDate() - ((selected.getDay() + 6) % 7))
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
  return (
    <div className="space-y-3.5">
      <div className="panel flex items-center gap-1 p-2">
        <button
          className="icon-button"
          aria-label="Previous week"
          onClick={() => {
            const next = new Date(selected)
            next.setDate(next.getDate() - 7)
            onDate(calendarDate(next))
          }}
        >
          <Icon name="arrow" className="size-3 rotate-180" />
        </button>
        {Array.from({ length: 7 }, (_, index) => {
          const day = new Date(monday)
          day.setDate(day.getDate() + index)
          const key = calendarDate(day)
          return (
            <button
              key={key}
              onClick={() => onDate(key)}
              aria-pressed={key === date}
              aria-label={day.toDateString()}
              className={`min-w-0 flex-1 rounded-lg py-3 text-center ${key === date ? 'bg-ink text-white' : 'text-muted hover:bg-soft'}`}
            >
              <span className="block text-[8px]">
                {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
                  day,
                )}
              </span>
              <span className="mt-1 block font-editorial text-lg">
                {String(day.getDate()).padStart(2, '0')}
              </span>
            </button>
          )
        })}
        <button
          className="icon-button"
          aria-label="Next week"
          onClick={() => {
            const next = new Date(selected)
            next.setDate(next.getDate() + 7)
            onDate(calendarDate(next))
          }}
        >
          <Icon name="arrow" className="size-3" />
        </button>
      </div>
      <div className="grid items-start gap-3.5 xl:grid-cols-[2.3fr_1fr]">
        <div className="panel p-4 sm:p-6">
          <p className="section-kicker">
            {new Intl.DateTimeFormat('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(selected)}
          </p>
          <div className="my-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-editorial text-2xl">Today’s plan</h2>
            <div
              className="flex gap-1"
              role="group"
              aria-label="Filter tasks by category"
            >
              {['All', 'Work', 'Personal', 'Health'].map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  aria-pressed={category === item}
                  className={`rounded-full px-2.5 py-1 text-[9px] ${category === item ? 'bg-ink text-white' : 'bg-soft text-muted'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <Schedule
            tasks={tasks.filter(
              (task) => category === 'All' || task.category === category,
            )}
            onToggle={onToggle}
            onRemove={onRemove}
            onAdd={onAdd}
            isSaving={isSaving}
            embedded
          />
        </div>
        <aside className="space-y-3.5">
          <FocusTimer timer={focus} />
          <section className="panel p-6 text-center">
            <h2 className="section-kicker text-left">Daily progress</h2>
            <div className="relative mx-auto my-6 flex size-28 items-center justify-center">
              <svg
                className="absolute size-full -rotate-90"
                viewBox="0 0 120 120"
                aria-hidden="true"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  className="fill-none stroke-line"
                  strokeWidth="7"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  className="fill-none stroke-lime"
                  strokeWidth="7"
                  pathLength="100"
                  strokeDasharray={`${percent} 100`}
                />
              </svg>
              <span className="font-editorial text-2xl">
                {completed}/{total}
              </span>
            </div>
            <p className="text-[10px]">
              {total === 0
                ? 'Make space for your first task.'
                : 'You’re building momentum.'}
            </p>
            <p className="mt-2 text-[9px] text-muted">
              {total - completed} tasks left for this day
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function FocusTimer({ timer }: { timer: FocusTimerState }) {
  const { remaining, isRunning, isSaving, error, toggle, save } = timer
  return (
    <section className="rounded-xl bg-ink p-6 text-center text-white">
      <h2 className="section-kicker text-lime">▷ Focus session</h2>
      <p className="my-6 font-editorial text-5xl tabular-nums">
        {String(Math.floor(remaining / 60)).padStart(2, '0')}:
        {String(remaining % 60).padStart(2, '0')}
      </p>
      <p className="mb-5 text-[9px] text-white/50">
        {remaining === 0
          ? 'Well done. Save your focus session.'
          : 'Ready for your next focus block?'}
      </p>
      <button
        disabled={isSaving || remaining === 0}
        onClick={toggle}
        className="w-full rounded-md bg-lime px-3 py-3 text-[10px] font-semibold text-ink"
      >
        {isRunning
          ? 'Pause focus'
          : remaining === 1500
            ? 'Start focus'
            : 'Resume focus'}
      </button>
      {remaining < 1500 && !isRunning && (
        <button
          onClick={() => void save()}
          disabled={isSaving}
          className="mt-3 text-[10px] text-lime"
        >
          {isSaving ? 'Saving…' : 'Finish and save session'}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs text-coral">
          {error}
        </p>
      )}
    </section>
  )
}
