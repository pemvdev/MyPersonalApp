import { Icon } from '../../../components/ui/Icon'
import { formatTime } from '../format'
import type { Task } from '../types'

export function Schedule({
  tasks,
  onToggle,
  onAdd,
  onViewDay,
  onRemove,
  isSaving = false,
  embedded = false,
}: {
  tasks: Task[]
  onToggle: (id: string) => void
  onAdd: () => void
  onViewDay?: () => void
  onRemove?: (id: string) => void
  isSaving?: boolean
  embedded?: boolean
}) {
  return (
    <section
      className={embedded ? 'min-w-0' : 'panel min-w-0 px-5 pb-1 pt-6'}
      aria-labelledby="schedule-heading"
    >
      {!embedded && (
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="section-kicker">Today</p>
            <h2 id="schedule-heading" className="mt-1 text-sm font-semibold">
              Your schedule
            </h2>
          </div>
          {onViewDay && (
            <button onClick={onViewDay} className="text-action">
              View full day
              <Icon name="arrow" className="size-3" />
            </button>
          )}
        </div>
      )}
      <ul className="divide-y divide-line/70">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex min-h-[63px] items-center gap-3 py-3"
          >
            <button
              aria-label={`${task.isComplete ? 'Mark incomplete' : 'Complete'}: ${task.title}`}
              aria-pressed={task.isComplete}
              disabled={isSaving}
              onClick={() => onToggle(task.id)}
              className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border ${task.isComplete ? 'border-lime bg-lime text-ink' : 'border-stone hover:border-green'}`}
            >
              {task.isComplete && <Icon name="check" className="size-3" />}
            </button>
            <div className="w-[63px] shrink-0">
              <p className="text-[10px] font-semibold">
                {formatTime(task.time)}
              </p>
              <p className="mt-1 text-[9px] text-muted">{task.duration}</p>
            </div>
            <p
              className={`min-w-0 flex-1 text-[11px] leading-5 ${task.isComplete ? 'text-muted line-through' : ''}`}
            >
              {task.title}
            </p>
            <span
              className={`hidden shrink-0 rounded-full px-2 py-1 text-[8px] sm:inline ${task.category === 'Health' ? 'bg-green-soft text-green' : 'bg-soft text-muted'}`}
            >
              {task.category}
            </span>
            {onRemove && (
              <button
                disabled={isSaving}
                onClick={() => onRemove(task.id)}
                aria-label={`Delete task: ${task.title}`}
                className="icon-button size-6"
              >
                <Icon name="close" className="size-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {tasks.length === 0 && (
        <p className="py-8 text-xs text-muted">
          No tasks found. Add your first task for this day.
        </p>
      )}
      <button
        onClick={onAdd}
        className="flex w-full items-center gap-2 border-t border-line/70 py-4 text-[10px] text-muted hover:text-ink"
      >
        <Icon name="plus" className="size-3.5" />
        Add a task
      </button>
    </section>
  )
}
