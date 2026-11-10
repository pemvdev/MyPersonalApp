import { useState } from 'react'
import { Icon } from '../../../components/ui/Icon'
import type { IconName } from '../../../components/ui/Icon'
import { formatMoney, displayDate } from '../format'
import type { Transaction } from '../types'

const transactionIcons: Record<Transaction['kind'], IconName> = {
  income: 'case',
  food: 'food',
  housing: 'home',
  transport: 'train',
  other: 'wallet',
}

export function RecentActivity({
  transactions,
  onAdd,
  onEdit,
  onDelete,
  onViewAll,
  title = 'Recent activity',
}: {
  transactions: Transaction[]
  onAdd: () => void
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => Promise<unknown>
  onViewAll?: () => void
  title?: string
}) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this transaction?',
    )

    if (!confirmed) return

    setIsDeleting(id)
    setError(null)
    try {
      await onDelete(id)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to delete transaction.',
      )
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <section
      className="panel min-w-0 px-5 pb-1 pt-6"
      aria-labelledby="activity-heading"
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="section-kicker">Finances</p>
          <h2 id="activity-heading" className="mt-1 text-sm font-semibold">
            {title}
          </h2>
        </div>
        {onViewAll && (
          <button onClick={onViewAll} className="text-action">
            View all
            <Icon name="arrow" className="size-3" />
          </button>
        )}
      </div>
      <ul className="divide-y divide-line/70">
        {transactions.map((transaction) => (
          <li
            key={transaction.id}
            className="flex min-h-[63px] items-center gap-3 py-3"
          >
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${transaction.amountInCents > 0 ? 'bg-green-soft text-green' : 'bg-soft text-muted'}`}
            >
              <Icon
                name={transactionIcons[transaction.kind]}
                className="size-4"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium">
                {transaction.title}
              </p>
              <p className="mt-1 text-[9px] text-muted">
                {transaction.category} · {displayDate(transaction.date)}
              </p>
            </div>
            <p
              className={`shrink-0 text-[11px] font-semibold tabular-nums ${transaction.amountInCents > 0 ? 'text-green' : ''}`}
            >
              {transaction.amountInCents > 0 ? '+' : ''}
              {formatMoney(transaction.amountInCents)}
            </p>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                aria-label={`Edit transaction: ${transaction.title}`}
                title="Edit transaction"
                disabled={isDeleting !== null}
                onClick={() => onEdit(transaction)}
                className="icon-button size-8"
              >
                <Icon name="brief" className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Delete transaction: ${transaction.title}`}
                title="Delete transaction"
                disabled={isDeleting !== null}
                onClick={() => void handleDelete(transaction.id)}
                className="icon-button size-8"
              >
                <Icon name="close" className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="pb-3 text-xs text-danger">
          {error}
        </p>
      )}
      {transactions.length === 0 && (
        <p className="py-8 text-xs text-muted">
          No matching transactions. Add your first entry.
        </p>
      )}
      <button
        onClick={onAdd}
        className="flex w-full items-center gap-2 border-t border-line/70 py-4 text-[10px] text-muted hover:text-ink"
      >
        <Icon name="plus" className="size-3.5" />
        Add a transaction
      </button>
    </section>
  )
}
