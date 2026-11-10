import { useState } from 'react'
import { Icon } from '../../../components/ui/Icon'
import { Modal } from '../../../components/ui/Modal'
import { formatMoney, parseAmountInCents } from '../format'
import type { FinanceSummary, Transaction } from '../types'
import { RecentActivity } from './RecentActivity'

export function FinanceScreen({
  finance,
  onAdd,
  onSetBudget,
  onEdit,
  onDelete,
}: {
  finance: FinanceSummary
  onAdd: () => void
  onSetBudget: (kind: string, cents: number) => Promise<unknown>
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => Promise<unknown>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const hasActivity = finance.months.some(
    (month) => month.incomeInCents > 0 || month.expenseInCents > 0,
  )
  const maximum = Math.max(
    1,
    ...finance.months.flatMap((month) => [
      month.incomeInCents,
      month.expenseInCents,
    ]),
  )
  return (
    <div className="space-y-3.5">
      <section
        aria-label="Financial summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr]"
      >
        <article className="rounded-xl bg-ink p-6 text-white sm:col-span-2 xl:col-span-1">
          <h2 className="text-[10px] text-white/60">Net balance</h2>
          <p className="mt-6 text-3xl font-semibold tracking-tight">
            {formatMoney(finance.balanceInCents)}
          </p>
          <p className="mt-3 text-[9px] text-white/60">
            All recorded income minus expenses
          </p>
        </article>
        {[
          {
            title: 'Income',
            value: finance.incomeInCents,
            icon: 'arrow' as const,
            style: 'bg-green-soft text-green -rotate-90',
          },
          {
            title: 'Expenses',
            value: finance.expenseInCents,
            icon: 'arrow' as const,
            style: 'bg-sand text-coral rotate-90',
          },
        ].map((card) => (
          <article key={card.title} className="panel p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] text-muted">{card.title}</h2>
              <span className={`rounded-full p-2 ${card.style}`}>
                <Icon name={card.icon} className="size-3" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight">
              {formatMoney(card.value)}
            </p>
            <p className="mt-3 text-[9px] text-muted">Selected month</p>
          </article>
        ))}
      </section>
      <div className="grid gap-3.5 xl:grid-cols-[1.4fr_1fr]">
        <section className="panel p-5 sm:p-6" aria-labelledby="cash-heading">
          <p className="section-kicker">Cash flow</p>
          <div className="mt-2 flex items-center justify-between">
            <h2 id="cash-heading" className="text-sm font-semibold">
              Income &amp; expenses
            </h2>
            <span className="text-[9px] text-muted">Last 6 months</span>
          </div>
          <svg
            viewBox="0 0 600 200"
            className="mt-8 w-full"
            role="img"
            aria-label="Income and expenses over the last six months"
          >
            <line x1="10" x2="590" y1="160" y2="160" className="stroke-line" />
            <line x1="10" x2="590" y1="70" y2="70" className="stroke-line/60" />
            {finance.months.map((month, index) => (
              <g key={month.key}>
                <title>{`${month.label}: income ${formatMoney(month.incomeInCents)}, expenses ${formatMoney(month.expenseInCents)}`}</title>
                <rect
                  x={35 + index * 96}
                  y={160 - (month.incomeInCents / maximum) * 130}
                  width="11"
                  height={(month.incomeInCents / maximum) * 130}
                  rx="3"
                  className="fill-ink"
                />
                <rect
                  x={51 + index * 96}
                  y={160 - (month.expenseInCents / maximum) * 130}
                  width="11"
                  height={(month.expenseInCents / maximum) * 130}
                  rx="3"
                  className="fill-lime"
                />
                <text
                  x={48 + index * 96}
                  y="180"
                  textAnchor="middle"
                  className="fill-muted text-[10px]"
                >
                  {month.label}
                </text>
              </g>
            ))}
          </svg>
          <div className="flex justify-center gap-4 text-[9px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 bg-ink" />
              Income
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 bg-lime" />
              Expenses
            </span>
          </div>
          {!hasActivity && (
            <p className="mt-4 text-center text-xs text-muted">
              Add a transaction to start your cash-flow history.
            </p>
          )}
        </section>
        <section className="panel p-5 sm:p-6" aria-labelledby="budget-heading">
          <p className="section-kicker">Budget</p>
          <div className="mt-2 flex justify-between gap-3">
            <h2 id="budget-heading" className="text-sm font-semibold">
              Spending by category
            </h2>
            <button className="text-action" onClick={() => setIsEditing(true)}>
              Edit limits
              <Icon name="arrow" className="size-3" />
            </button>
          </div>
          <ul className="mt-6 space-y-6">
            {finance.categories.map((category) => (
              <li key={category.kind}>
                <div className="mb-2 flex flex-wrap justify-between gap-1 text-[10px]">
                  <span>{category.label}</span>
                  <span>
                    {formatMoney(category.spentInCents)}{' '}
                    <span className="text-muted">
                      /{' '}
                      {category.budgetInCents === null
                        ? 'No limit'
                        : formatMoney(category.budgetInCents)}
                    </span>
                  </span>
                </div>
                <progress
                  data-kind={category.kind}
                  aria-label={`${category.label} spending`}
                  max={
                    category.budgetInCents ?? Math.max(1, category.spentInCents)
                  }
                  value={category.spentInCents}
                  className="goal-progress category-progress h-1 w-full"
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
      <RecentActivity
        transactions={finance.transactions}
        onEdit={onEdit}
        onDelete={onDelete}
        onAdd={onAdd}
        title="Recent transactions"
      />
      {isEditing && (
        <BudgetModal onClose={() => setIsEditing(false)} onSave={onSetBudget} />
      )}
    </div>
  )
}

function BudgetModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (kind: string, cents: number) => Promise<unknown>
}) {
  const [kind, setKind] = useState('housing')
  const [amount, setAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <Modal title="Set a monthly category limit" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (isSaving) return
          const cents = parseAmountInCents(amount)
          if (cents === null) {
            setError('Enter a positive amount with at most two decimal places.')
            return
          }
          setIsSaving(true)
          void onSave(kind, cents)
            .then(onClose)
            .catch((error: unknown) =>
              setError(
                error instanceof Error
                  ? error.message
                  : 'Unable to save your budget.',
              ),
            )
            .finally(() => setIsSaving(false))
        }}
      >
        <label className="field-label" htmlFor="budget-kind">
          Category
        </label>
        <select
          id="budget-kind"
          className="field"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
        >
          {['housing', 'food', 'transport', 'other'].map((value) => (
            <option key={value} value={value}>
              {value[0].toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
        <label className="field-label" htmlFor="budget-amount">
          Monthly limit (USD)
        </label>
        <input
          id="budget-amount"
          className="field"
          inputMode="decimal"
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
        <button className="primary-button w-full" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save limit'}
        </button>
      </form>
    </Modal>
  )
}
