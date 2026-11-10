import { Icon } from '../../../components/ui/Icon'
import { formatMoney } from '../format'
import type { FinanceSummary } from '../types'

export function SummaryCards({
  finance,
  focusSeconds,
  onFinances,
}: {
  finance: FinanceSummary
  focusSeconds: number
  onFinances: () => void
}) {
  const income = finance.incomeInCents
  const spent = finance.expenseInCents
  const previous =
    finance.months[finance.months.length - 2]?.expenseInCents ?? 0
  const comparison =
    previous > 0
      ? `${Math.round((Math.abs(spent - previous) / previous) * 100)}% ${spent > previous ? 'more' : 'less'} than last month`
      : 'No previous-month spending to compare'
  return (
    <section
      aria-label="Your summary"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr]"
    >
      <article className="balance-card relative overflow-hidden rounded-xl bg-ink p-5 text-white sm:col-span-2 xl:col-span-1">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] text-white/65">Available balance</h2>
          <button
            onClick={onFinances}
            aria-label="View finances"
            className="flex size-7 items-center justify-center rounded-full border border-white/10 text-lime hover:bg-white/10"
          >
            <Icon name="arrow" className="size-3.5" />
          </button>
        </div>
        <p className="mt-6 text-[29px] font-semibold tracking-[-.06em]">
          {formatMoney(finance.balanceInCents)}
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[9px] text-white/55">
          <span className="flex items-center gap-1.5">
            <span className="flex size-4 items-center justify-center rounded-full bg-lime/20 text-lime">
              <Icon name="arrow" className="size-2.5 -rotate-90" />
            </span>
            {formatMoney(income)} income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex size-4 items-center justify-center rounded-full bg-coral/20 text-coral">
              <Icon name="arrow" className="size-2.5 rotate-90" />
            </span>
            {formatMoney(spent)} spent
          </span>
        </div>
      </article>
      <article className="panel p-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-lavender text-violet">
          <Icon name="trend" />
        </span>
        <div className="mt-4 flex justify-between text-[10px] text-muted">
          <h2>Monthly spending</h2>
          <span className="text-[9px]">Selected month</span>
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-[-.05em]">
          {formatMoney(spent)}
        </p>
        <p className="mt-3 text-[9px] text-muted">{comparison}</p>
      </article>
      <article className="panel p-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-green-soft text-green">
          <Icon name="check" />
        </span>
        <div className="mt-4 flex justify-between text-[10px] text-muted">
          <h2>Focus time</h2>
          <span className="text-[9px]">Today</span>
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-[-.05em]">
          {Math.floor(focusSeconds / 3600)}h{' '}
          {Math.floor((focusSeconds % 3600) / 60)}m
        </p>
        <p className="mt-3 text-[9px] text-muted">Completed focus sessions</p>
      </article>
    </section>
  )
}
