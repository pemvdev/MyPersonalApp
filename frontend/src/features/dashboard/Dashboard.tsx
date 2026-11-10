import { useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { DailyBrief } from './components/DailyBrief'
import { DashboardHeading } from './components/DashboardHeading'
import { EntryModal } from './components/EntryModal'
import { RecentActivity } from './components/RecentActivity'
import { Schedule } from './components/Schedule'
import { Sidebar } from './components/Sidebar'
import { SummaryCards } from './components/SummaryCards'
import { Topbar } from './components/Topbar'
import { FinanceScreen } from './components/FinanceScreen'
import { MyDayScreen } from './components/MyDayScreen'
import { calendarDate } from './format'
import type {
  BriefArticle,
  DashboardView,
  EntryType,
  Transaction,
} from './types'
import { useFocusTimer } from './useFocusTimer'
import { useDashboard } from './useDashboard'

interface DashboardProps {
  userId: string
  name: string | null
  onSignOut: () => void
  isSigningOut?: boolean
  error?: string | null
}
type Overlay = EntryType | 'navigation' | 'help' | BriefArticle | null

export function Dashboard({
  userId,
  name,
  onSignOut,
  isSigningOut,
  error,
}: DashboardProps) {
  const [view, setView] = useState<DashboardView>('Overview')
  const [selectedDay, setSelectedDay] = useState(calendarDate)
  const [financialMonth, setFinancialMonth] = useState(() =>
    calendarDate().slice(0, 7),
  )
  const date = view === 'Finances' ? `${financialMonth}-01` : selectedDay
  const [search, setSearch] = useState('')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null)
  const workspace = useDashboard(userId, date)
  const focus = useFocusTimer(selectedDay, workspace.saveFocus)
  const data = workspace.data
  const displayName = name?.trim() || 'Your workspace'
  const pendingTasks = data ? data.taskTotal - data.completedTasks : 0
  const query = search.trim().toLowerCase()
  const tasks =
    data?.tasks.filter((task) =>
      `${task.title} ${task.category}`.toLowerCase().includes(query),
    ) ?? []
  const transactions =
    data?.finance.transactions.filter((entry) =>
      `${entry.title} ${entry.category}`.toLowerCase().includes(query),
    ) ?? []
  const articles =
    data?.articles.filter((article) =>
      `${article.title} ${article.category}`.toLowerCase().includes(query),
    ) ?? []
  const budgetCategories =
    data?.finance.categories.filter(
      (category) => category.budgetInCents !== null,
    ) ?? []
  const budgetTotal = budgetCategories.reduce(
    (sum, category) => sum + (category.budgetInCents ?? 0),
    0,
  )
  const budgetSpent = budgetCategories.reduce(
    (sum, category) => sum + category.spentInCents,
    0,
  )
  function navigate(next: DashboardView) {
    if (next === 'Overview') setSelectedDay(calendarDate())
    setView(next)
    setOverlay(null)
    workspace.setTaskPage(1)
    workspace.setTransactionPage(1)
  }
  function selectDate(next: string) {
    if (view === 'Finances') setFinancialMonth(next.slice(0, 7))
    else setSelectedDay(next)
    workspace.setTaskPage(1)
    workspace.setTransactionPage(1)
  }
  function editTransaction(transaction: Transaction) {
    setOverlay(null)
    setEditingTransaction(transaction)
  }
  function closeEntry() {
    setOverlay(null)
    setEditingTransaction(null)
  }
  function toggleTask(id: string) {
    const task = data?.tasks.find((item) => item.id === id)
    if (task) workspace.toggleTask(task)
  }
  const sidebar = (
    <Sidebar
      view={view}
      onNavigate={navigate}
      name={displayName}
      pendingTasks={pendingTasks}
      onSignOut={onSignOut}
      isSigningOut={isSigningOut}
      budgetTotal={budgetTotal}
      budgetSpent={budgetSpent}
    />
  )
  return (
    <div className="min-h-svh bg-canvas text-ink">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-ink p-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 overflow-y-auto border-r border-line lg:block">
        {sidebar}
      </aside>
      <div className="lg:ml-56">
        <Topbar
          onMenu={() => setOverlay('navigation')}
          onAdd={setOverlay}
          search={search}
          onSearch={setSearch}
          pendingTasks={pendingTasks}
        />
        <main
          id="main-content"
          className="mx-auto max-w-[1192px] px-4 pb-16 pt-7 sm:px-8 sm:pt-10 xl:px-12 xl:pt-12"
        >
          {(error || workspace.saveError) && (
            <p
              role="alert"
              className="mb-5 rounded-lg border border-danger/20 bg-surface p-3 text-xs text-danger"
            >
              {error || workspace.saveError}
            </p>
          )}
          {workspace.isPending ? (
            <p role="status" className="panel p-8 text-sm text-muted">
              Loading your workspace…
            </p>
          ) : workspace.isError ? (
            <div role="alert" className="panel p-8">
              <p className="text-sm text-danger">{workspace.error.message}</p>
              <button
                className="primary-button mt-4"
                onClick={() => void workspace.refetch()}
              >
                Try again
              </button>
            </div>
          ) : (
            data && (
              <>
                {view === 'Overview' || view === 'Daily brief' ? (
                  <DashboardHeading
                    name={displayName}
                    view={view}
                    completedTasks={data.completedTasks}
                    totalTasks={data.taskTotal}
                  />
                ) : (
                  <div className="mb-9 flex flex-wrap items-center justify-between gap-5">
                    <div>
                      <p className="section-kicker">
                        {view === 'Finances'
                          ? 'Financial control'
                          : 'Daily productivity'}
                      </p>
                      <h1 className="mt-3 font-editorial text-[35px] leading-tight tracking-[-.055em] sm:text-[43px]">
                        {view === 'Finances'
                          ? 'Your money, made clear.'
                          : 'Make today count.'}
                      </h1>
                      <p className="mt-3 text-[10px] text-muted">
                        {view === 'Finances'
                          ? 'Track what comes in, what goes out, and where you’re heading.'
                          : 'Plan with intention, focus on one thing at a time.'}
                      </p>
                    </div>
                    <button
                      className="primary-button flex items-center gap-2"
                      onClick={() =>
                        setOverlay(view === 'Finances' ? 'transaction' : 'task')
                      }
                    >
                      <Icon name="plus" className="size-3" />
                      {view === 'Finances' ? 'Add transaction' : 'New task'}
                    </button>
                  </div>
                )}
                {view === 'Finances' && (
                  <div className="mb-4 flex justify-end">
                    <label className="flex items-center gap-2 text-xs text-muted">
                      Month
                      <input
                        aria-label="Financial month"
                        type="month"
                        className="field w-auto"
                        value={date.slice(0, 7)}
                        onChange={(event) => {
                          if (event.target.value)
                            selectDate(`${event.target.value}-01`)
                        }}
                      />
                    </label>
                  </div>
                )}
                <div className="space-y-3.5">
                  {view === 'Overview' && (
                    <>
                      <SummaryCards
                        finance={data.finance}
                        focusSeconds={data.focusSeconds}
                        onFinances={() => navigate('Finances')}
                      />
                      <div className="grid gap-3.5 xl:grid-cols-[1.35fr_1fr]">
                        <Schedule
                          tasks={tasks}
                          onToggle={toggleTask}
                          onAdd={() => setOverlay('task')}
                          onViewDay={() => navigate('My day')}
                          isSaving={workspace.isSaving}
                        />
                        <RecentActivity
                          transactions={transactions.slice(0, 4)}
                          onAdd={() => setOverlay('transaction')}
                          onEdit={editTransaction}
                          onDelete={workspace.removeTransaction}
                          onViewAll={() => navigate('Finances')}
                        />
                      </div>
                    </>
                  )}
                  {view === 'Finances' && (
                    <FinanceScreen
                      finance={{ ...data.finance, transactions }}
                      onAdd={() => setOverlay('transaction')}
                      onSetBudget={workspace.setBudget}
                      onEdit={editTransaction}
                      onDelete={workspace.removeTransaction}
                    />
                  )}
                  {view === 'My day' && (
                    <MyDayScreen
                      date={date}
                      onDate={selectDate}
                      tasks={tasks}
                      total={data.taskTotal}
                      completed={data.completedTasks}
                      onToggle={toggleTask}
                      onRemove={workspace.removeTask}
                      onAdd={() => setOverlay('task')}
                      isSaving={workspace.isSaving}
                      focus={focus}
                    />
                  )}
                  {(view === 'Overview' || view === 'Daily brief') && (
                    <DailyBrief
                      articles={articles}
                      bookmarks={data.bookmarks}
                      onBookmark={(id) =>
                        workspace.toggleBookmark(
                          id,
                          !data.bookmarks.includes(id),
                        )
                      }
                      onOpen={setOverlay}
                      onViewAll={
                        view === 'Overview'
                          ? () => navigate('Daily brief')
                          : undefined
                      }
                    />
                  )}
                  {view === 'My day' && (
                    <Pagination
                      page={workspace.taskPage}
                      hasMore={data.taskHasMore}
                      onPage={workspace.setTaskPage}
                    />
                  )}
                  {view === 'Finances' && (
                    <Pagination
                      page={workspace.transactionPage}
                      hasMore={data.finance.hasMore}
                      onPage={workspace.setTransactionPage}
                    />
                  )}
                </div>
              </>
            )
          )}
        </main>
      </div>
      <button
        onClick={() => setOverlay('help')}
        aria-label="Workspace help"
        className="fixed bottom-5 right-5 flex size-9 items-center justify-center rounded-full bg-ink text-white shadow-md"
      >
        <Icon name="help" className="size-5" />
      </button>
      {(overlay === 'task' ||
        overlay === 'transaction' ||
        editingTransaction !== null) && (
        <EntryModal
          key={
            editingTransaction
              ? editingTransaction.id
              : overlay === 'task'
                ? 'new-task'
                : 'new-transaction'
          }
          date={editingTransaction?.date ?? date}
          type={
            editingTransaction
              ? 'transaction'
              : overlay === 'task'
                ? 'task'
                : 'transaction'
          }
          transaction={editingTransaction ?? undefined}
          onClose={closeEntry}
          onAddTask={workspace.addTask}
          onAddTransaction={workspace.addTransaction}
          onUpdateTransaction={workspace.updateTransaction}
        />
      )}
      {overlay === 'navigation' && (
        <Modal title="Your workspace" onClose={() => setOverlay(null)} isDrawer>
          {sidebar}
        </Modal>
      )}
      {overlay === 'help' && (
        <Modal
          title="A little help, when you need it."
          onClose={() => setOverlay(null)}
        >
          <p className="text-sm leading-7 text-muted">
            Your workspace keeps your tasks, recorded finances, and focus
            sessions together. Add a task to plan your day, record an income or
            expense entry in Finances, and set monthly category limits to track
            your spending. Your changes are saved to your account.
          </p>
        </Modal>
      )}
      {typeof overlay === 'object' && overlay !== null && (
        <Modal title={overlay.title} onClose={() => setOverlay(null)}>
          <p className="section-kicker">
            {overlay.category} · {overlay.readTime} min read
          </p>
          <p className="mt-4 text-sm leading-7 text-muted">{overlay.summary}</p>
        </Modal>
      )}
    </div>
  )
}

function Pagination({
  page,
  hasMore,
  onPage,
}: {
  page: number
  hasMore: boolean
  onPage: (page: number) => void
}) {
  if (page === 1 && !hasMore) return null
  return (
    <nav
      aria-label="List pages"
      className="flex items-center justify-end gap-3 text-xs"
    >
      <button
        className="primary-button"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      <span>Page {page}</span>
      <button
        className="primary-button"
        disabled={!hasMore}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </nav>
  )
}
