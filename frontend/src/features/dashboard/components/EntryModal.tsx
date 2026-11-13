import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../../components/ui/Modal'
import type {
  EntryType,
  Task,
  CreateTaskInput,
  CreateTransactionInput,
  TransactionKind,
  Transaction,
  UpdateTransactionInput,
  RepeatFrequency,
} from '../types'
import { parseAmountInCents } from '../format'

interface EntryModalProps {
  type: EntryType
  onClose: () => void
  date: string
  onAddTask: (task: CreateTaskInput) => Promise<unknown>
  onAddTransaction: (transaction: CreateTransactionInput) => Promise<unknown>
  onUpdateTransaction: (
    id: string,
    transaction: UpdateTransactionInput,
  ) => Promise<unknown>
  transaction?: Transaction
}

export function EntryModal({
  type,
  date,
  onClose,
  onAddTask,
  onAddTransaction,
  onUpdateTransaction,
  transaction,
}: EntryModalProps) {
  const [title, setTitle] = useState(transaction?.title ?? '')
  const [clientId] = useState(() => crypto.randomUUID())
  const [entryDate, setEntryDate] = useState(transaction?.date ?? date)
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [expenseKind, setExpenseKind] = useState<TransactionKind>(
    transaction && transaction.kind !== 'income' ? transaction.kind : 'other',
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [time, setTime] = useState('09:00')
  const [category, setCategory] = useState<Task['category']>('Work')
  const [repeatFrequency, setRepeatFrequency] = useState<RepeatFrequency | ''>('')
  const [repeatInterval, setRepeatInterval] = useState(1)
  const [repeatUntil, setRepeatUntil] = useState('')
  const [amount, setAmount] = useState(
    transaction
      ? (Math.abs(transaction.amountInCents) / 100).toFixed(2)
      : '',
  )
  const [isIncome, setIsIncome] = useState(
    transaction?.kind === 'income',
  )
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)
    if (!title.trim()) {
      setError('Please enter a title.')
      return
    }
    setIsSubmitting(true)
    try {
      if (type === 'task') {
        await onAddTask({
          clientId,
          title: title.trim(),
          time,
          date: entryDate,
          durationMinutes,
          category,
          ...(repeatFrequency
            ? { repeatFrequency, repeatInterval, ...(repeatUntil ? { repeatUntil } : {}) }
            : {}),
        })
      } else {
        const cents = parseAmountInCents(amount)
        if (cents === null) {
          setError(
            'Enter an amount greater than zero with at most two decimal places (maximum 999,999.99).',
          )
          return
        }
        const transactionInput = {
          title: title.trim(),
          date: entryDate,
          amountInCents: isIncome ? cents : -cents,
          kind: isIncome ? 'income' : expenseKind,
          ...(repeatFrequency
            ? { repeatFrequency, repeatInterval, ...(repeatUntil ? { repeatUntil } : {}) }
            : {}),
        }
        if (transaction) {
          await onUpdateTransaction(transaction.id, transactionInput)
        } else {
          await onAddTransaction({ clientId, ...transactionInput })
        }
      }
      onClose()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to save. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title={transaction ? 'Edit transaction' : `Add a ${type}`}
      onClose={onClose}
    >
      <p className="mb-5 text-xs leading-5 text-muted">
        {transaction
          ? 'Update this transaction in your personal workspace.'
          : 'Save this entry to your personal workspace.'}
      </p>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <fieldset disabled={isSubmitting} className="space-y-4">
          <div>
            <label className="field-label" htmlFor="entry-date">
              Date
            </label>
            <input
              id="entry-date"
              type="date"
              className="field"
              required
              value={entryDate}
              onChange={(event) => setEntryDate(event.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="entry-title">
              {type === 'task' ? 'Task name' : 'Transaction name'}
            </label>
            <input
              id="entry-title"
              className="field"
              value={title}
              maxLength={100}
              onChange={(event) => setTitle(event.target.value)}
              required
              autoFocus
              placeholder={
                type === 'task'
                  ? 'What’s on your mind?'
                  : 'e.g. Coffee with a friend'
              }
            />
          </div>
          {type === 'task' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label" htmlFor="entry-time">
                  Time
                </label>
                <input
                  id="entry-time"
                  className="field"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="entry-category">
                  Category
                </label>
                <select
                  id="entry-category"
                  className="field"
                  value={category}
                  onChange={(event) => {
                    const value = event.target.value
                    if (
                      value === 'Work' ||
                      value === 'Health' ||
                      value === 'Personal'
                    )
                      setCategory(value)
                  }}
                >
                  {['Work', 'Health', 'Personal'].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="field-label" htmlFor="entry-amount">
                  Amount (USD)
                </label>
                <input
                  id="entry-amount"
                  className="field"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'entry-error' : undefined}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="entry-direction">
                  Type
                </label>
                <select
                  id="entry-direction"
                  className="field"
                  value={isIncome ? 'income' : 'expense'}
                  onChange={(event) =>
                    setIsIncome(event.target.value === 'income')
                  }
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
            </>
          )}
          {type === 'task' && (
            <div>
              <label className="field-label" htmlFor="entry-duration">
                Duration (minutes)
              </label>
              <input
                id="entry-duration"
                type="number"
                min="1"
                max="1440"
                step="1"
                required
                className="field"
                value={durationMinutes}
                onChange={(event) =>
                  setDurationMinutes(event.target.valueAsNumber)
                }
              />
            </div>
          )}
          {type === 'transaction' && !isIncome && (
            <div>
              <label className="field-label" htmlFor="expense-category">
                Category
              </label>
              <select
                id="expense-category"
                className="field"
                value={expenseKind}
                onChange={(event) => {
                  const value = event.target.value
                  if (
                    value === 'food' ||
                    value === 'housing' ||
                    value === 'transport' ||
                    value === 'other'
                  )
                    setExpenseKind(value)
                }}
              >
                <option value="housing">Housing</option>
                <option value="food">Food</option>
                <option value="transport">Transport</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}
          <div className="space-y-3 rounded-lg bg-soft p-3">
            <label className="field-label" htmlFor="entry-repeat">Repeat</label>
            <select id="entry-repeat" className="field" value={repeatFrequency} onChange={(event) => setRepeatFrequency(event.target.value as RepeatFrequency | '')}>
              <option value="">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            {repeatFrequency && <>
              <label className="field-label" htmlFor="entry-repeat-interval">Every</label>
              <div className="flex items-center gap-2">
                <input id="entry-repeat-interval" className="field w-20" type="number" min="1" max="365" value={repeatInterval} onChange={(event) => setRepeatInterval(event.target.valueAsNumber)} />
                <span className="text-xs text-muted">{repeatFrequency === 'daily' ? 'day(s)' : repeatFrequency === 'weekly' ? 'week(s)' : 'month(s)'}</span>
              </div>
              <label className="field-label" htmlFor="entry-repeat-until">End date (optional)</label>
              <input id="entry-repeat-until" className="field" type="date" min={entryDate} value={repeatUntil} onChange={(event) => setRepeatUntil(event.target.value)} />
            </>}
          </div>
          {error && (
            <p id="entry-error" role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
          <button type="submit" className="primary-button w-full">
            {isSubmitting
              ? 'Saving…'
              : transaction
                ? 'Save changes'
                : `Add ${type}`}
          </button>
        </fieldset>
      </form>
    </Modal>
  )
}
