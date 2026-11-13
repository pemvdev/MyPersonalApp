export type DashboardView = 'Overview' | 'Finances' | 'My day' | 'Daily brief'
export type EntryType = 'task' | 'transaction'

export interface Task {
  id: string
  title: string
  time: string
  duration: string
  category: 'Work' | 'Health' | 'Personal'
  isComplete: boolean
}

export interface Transaction {
  id: string
  title: string
  category: string
  date: string
  amountInCents: number
  kind: 'income' | 'food' | 'housing' | 'transport' | 'other'
}

export interface BriefArticle {
  id: string
  category: string
  readTime: number
  title: string
  summary: string
}

export type TaskCategory = Task['category']
export type TransactionKind = Transaction['kind']
export type RepeatFrequency = 'daily' | 'weekly' | 'monthly'
export interface CreateTaskInput {
  clientId: string
  title: string
  time: string
  date: string
  durationMinutes: number
  category: TaskCategory
  repeatFrequency?: RepeatFrequency
  repeatInterval?: number
  repeatUntil?: string
}
export interface CreateTransactionInput {
  clientId: string
  title: string
  date: string
  amountInCents: number
  kind: TransactionKind
  repeatFrequency?: RepeatFrequency
  repeatInterval?: number
  repeatUntil?: string
}
export type UpdateTransactionInput = Omit<CreateTransactionInput, 'clientId'>
export interface FinanceMonth {
  key: string
  label: string
  incomeInCents: number
  expenseInCents: number
}
export interface SpendingCategory {
  kind: TransactionKind
  label: string
  spentInCents: number
  budgetInCents: number | null
}
export interface FinanceSummary {
  balanceInCents: number
  incomeInCents: number
  expenseInCents: number
  months: FinanceMonth[]
  categories: SpendingCategory[]
  transactions: Transaction[]
  hasMore: boolean
}
export interface WorkspaceData {
  id: string
  name: string
  tasks: Task[]
  taskTotal: number
  completedTasks: number
  focusSeconds: number
  taskHasMore: boolean
  finance: FinanceSummary
  bookmarks: string[]
  articles: BriefArticle[]
}
