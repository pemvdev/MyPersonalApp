import { apiGet, apiRequest } from '../../lib/api'
import type {
  CreateTaskInput,
  CreateTransactionInput,
  UpdateTransactionInput,
  WorkspaceData,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
const isInteger = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value)
const isKind = (value: unknown) =>
  ['income', 'food', 'housing', 'transport', 'other'].some(
    (kind) => kind === value,
  )
function isWorkspace(value: unknown): value is WorkspaceData {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !isInteger(value.taskTotal) ||
    !isInteger(value.completedTasks) ||
    !isInteger(value.focusSeconds) ||
    typeof value.taskHasMore !== 'boolean'
  )
    return false
  if (
    !Array.isArray(value.tasks) ||
    !value.tasks.every(
      (task) =>
        isRecord(task) &&
        typeof task.id === 'string' &&
        typeof task.title === 'string' &&
        typeof task.time === 'string' &&
        typeof task.duration === 'string' &&
        ['Work', 'Health', 'Personal'].some(
          (category) => category === task.category,
        ) &&
        typeof task.isComplete === 'boolean',
    )
  )
    return false
  const finance = value.finance
  if (
    !isRecord(finance) ||
    !isInteger(finance.balanceInCents) ||
    !isInteger(finance.incomeInCents) ||
    !isInteger(finance.expenseInCents) ||
    typeof finance.hasMore !== 'boolean'
  )
    return false
  if (
    !Array.isArray(finance.transactions) ||
    !finance.transactions.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.id === 'string' &&
        typeof entry.title === 'string' &&
        typeof entry.category === 'string' &&
        typeof entry.date === 'string' &&
        isInteger(entry.amountInCents) &&
        isKind(entry.kind),
    )
  )
    return false
  if (
    !Array.isArray(finance.months) ||
    !finance.months.every(
      (month) =>
        isRecord(month) &&
        typeof month.key === 'string' &&
        typeof month.label === 'string' &&
        isInteger(month.incomeInCents) &&
        isInteger(month.expenseInCents),
    )
  )
    return false
  if (
    !Array.isArray(finance.categories) ||
    !finance.categories.every(
      (category) =>
        isRecord(category) &&
        isKind(category.kind) &&
        typeof category.label === 'string' &&
        isInteger(category.spentInCents) &&
        (category.budgetInCents === null || isInteger(category.budgetInCents)),
    )
  )
    return false
  if (
    !Array.isArray(value.bookmarks) ||
    !value.bookmarks.every((id) => typeof id === 'string')
  )
    return false
  return (
    Array.isArray(value.articles) &&
    value.articles.every(
      (article) =>
        isRecord(article) &&
        typeof article.id === 'string' &&
        typeof article.category === 'string' &&
        typeof article.title === 'string' &&
        typeof article.summary === 'string' &&
        isInteger(article.readTime),
    )
  )
}

export async function getWorkspace(
  date: string,
  taskPage: number,
  transactionPage: number,
  signal?: AbortSignal,
): Promise<WorkspaceData> {
  const response = await apiGet(
    `/workspaces/current?${new URLSearchParams({ date, taskPage: String(taskPage), transactionPage: String(transactionPage) })}`,
    signal,
  )
  if (!isWorkspace(response))
    throw new Error(
      'The server returned an invalid workspace. Please try again.',
    )
  return response
}
const base = '/workspaces/current'
export const createTask = (input: CreateTaskInput) =>
  apiRequest(`${base}/tasks`, { method: 'POST', body: input })
export const updateTask = (id: string, isComplete: boolean) =>
  apiRequest(`${base}/tasks/${id}`, { method: 'PATCH', body: { isComplete } })
export const deleteTask = (id: string) =>
  apiRequest(`${base}/tasks/${id}`, { method: 'DELETE' })
export const createTransaction = (input: CreateTransactionInput) =>
  apiRequest(`${base}/transactions`, { method: 'POST', body: input })
export const updateTransaction = (
  id: string,
  input: UpdateTransactionInput,
) =>
  apiRequest(`${base}/transactions/${id}`, { method: 'PATCH', body: input })
export const deleteTransaction = (id: string) =>
  apiRequest(`${base}/transactions/${id}`, { method: 'DELETE' })
export const setBookmark = (articleId: string, isSaved: boolean) =>
  apiRequest(`${base}/bookmarks`, {
    method: 'PUT',
    body: { articleId, isSaved },
  })
export const setBudget = (input: { kind: string; amountInCents: number }) =>
  apiRequest(`${base}/budgets`, { method: 'PUT', body: input })
export const saveFocus = (input: {
  clientId: string
  date: string
  durationSeconds: number
}) => apiRequest(`${base}/focus-sessions`, { method: 'POST', body: input })
