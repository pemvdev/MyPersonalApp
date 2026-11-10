import {
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { Dashboard } from './Dashboard'
import { emptyWorkspace, taskFixture } from '../../test/workspace-fixtures'

const api = vi.hoisted(() => ({
  getWorkspace: vi.fn(),
  createTask: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  setBookmark: vi.fn(),
  setBudget: vi.fn(),
  saveFocus: vi.fn(),
}))
vi.mock('./api', () => api)
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
beforeEach(() => {
  vi.resetAllMocks()
  api.getWorkspace.mockResolvedValue(structuredClone(emptyWorkspace))
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
function renderWorkspace() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={client}>
      <Dashboard userId="user-1" name="Alex" onSignOut={vi.fn()} />
    </QueryClientProvider>,
  )
  return { ...view, client }
}

describe('Account workspace', () => {
  it('starts empty and requests the current authenticated workspace', async () => {
    renderWorkspace()
    expect(
      await screen.findByText(
        'No tasks found. Add your first task for this day.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/sample workspace/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Jordan Davis')).not.toBeInTheDocument()
    expect(api.getWorkspace).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      1,
      1,
      expect.any(AbortSignal),
    )
  })
  it('waits for task persistence before closing the form and loads saved data again after remount', async () => {
    const view = renderWorkspace()
    await screen.findByText('No tasks found. Add your first task for this day.')
    await userEvent.click(screen.getByRole('button', { name: 'Add a task' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(
      within(dialog).getByLabelText('Task name'),
      'Plan the weekend',
    )
    const saved = { ...taskFixture, title: 'Plan the weekend' }
    api.createTask.mockImplementation(async () => {
      api.getWorkspace.mockResolvedValue({
        ...emptyWorkspace,
        tasks: [saved],
        taskTotal: 1,
      })
      return { id: saved.id }
    })
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Add task' }),
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(await screen.findByText('Plan the weekend')).toBeInTheDocument()
    expect(api.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Plan the weekend',
        durationMinutes: 30,
        clientId: expect.any(String),
      }),
    )
    view.unmount()
    view.client.clear()
    renderWorkspace()
    expect(await screen.findByText('Plan the weekend')).toBeInTheDocument()
  })
  it('preserves form input when saving fails', async () => {
    renderWorkspace()
    await screen.findByText('No tasks found. Add your first task for this day.')
    api.createTask.mockRejectedValue(new Error('Unable to save your task.'))
    await userEvent.click(screen.getByRole('button', { name: 'Add a task' }))
    await userEvent.type(screen.getByLabelText('Task name'), 'Keep this input')
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }))
    expect(
      await within(screen.getByRole('dialog')).findByRole('alert'),
    ).toHaveTextContent('Unable to save your task.')
    expect(screen.getByLabelText('Task name')).toHaveValue('Keep this input')
  })
  it('saves explicit task completion and refetches progress', async () => {
    api.getWorkspace.mockResolvedValue({
      ...emptyWorkspace,
      tasks: [taskFixture],
      taskTotal: 1,
    })
    renderWorkspace()
    await screen.findByText(taskFixture.title)
    api.updateTask.mockImplementation(async () => {
      api.getWorkspace.mockResolvedValue({
        ...emptyWorkspace,
        tasks: [{ ...taskFixture, isComplete: true }],
        taskTotal: 1,
        completedTasks: 1,
      })
      return { success: true }
    })
    await userEvent.click(
      screen.getByRole('button', { name: `Complete: ${taskFixture.title}` }),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('progressbar', { name: 'Day progress' }),
      ).toHaveAttribute('aria-valuenow', '100'),
    )
    expect(api.updateTask).toHaveBeenCalledWith(taskFixture.id, true)
  })
  it('validates transaction precision before sending an integer-cent entry', async () => {
    renderWorkspace()
    await screen.findByText('No tasks found. Add your first task for this day.')
    await userEvent.click(
      screen.getByRole('button', { name: 'Add a transaction' }),
    )
    const dialog = screen.getByRole('dialog')
    await userEvent.type(
      within(dialog).getByLabelText('Transaction name'),
      'Coffee',
    )
    const amount = within(dialog).getByLabelText('Amount (USD)')
    await userEvent.type(amount, '4.999')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Add transaction' }),
    )
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'at most two decimal places',
    )
    expect(api.createTransaction).not.toHaveBeenCalled()
    await userEvent.clear(amount)
    await userEvent.type(amount, '4.99')
    api.createTransaction.mockResolvedValue({ id: 'transaction-1' })
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Add transaction' }),
    )
    await waitFor(() =>
      expect(api.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Coffee',
          amountInCents: -499,
          kind: 'other',
        }),
      ),
    )
  })
  it('edits an existing transaction and persists its changed fields', async () => {
    const transaction = {
      id: 'transaction-1',
      title: 'Coffee',
      category: 'Food',
      date: '2026-11-07',
      amountInCents: -499,
      kind: 'food' as const,
    }
    api.getWorkspace.mockResolvedValue({
      ...structuredClone(emptyWorkspace),
      finance: {
        ...emptyWorkspace.finance,
        transactions: [transaction],
      },
    })
    renderWorkspace()
    await screen.findByText('No tasks found. Add your first task for this day.')
    await userEvent.click(screen.getByRole('button', { name: 'Finances' }))
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Edit transaction: Coffee',
      }),
    )
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('Amount (USD)')).toHaveValue('4.99')
    await userEvent.clear(within(dialog).getByLabelText('Transaction name'))
    await userEvent.type(
      within(dialog).getByLabelText('Transaction name'),
      'Lunch',
    )
    api.updateTransaction.mockResolvedValue({ success: true })
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Save changes' }),
    )
    await waitFor(() =>
      expect(api.updateTransaction).toHaveBeenCalledWith(
        'transaction-1',
        {
          title: 'Lunch',
          date: '2026-11-07',
          amountInCents: -499,
          kind: 'food',
        },
      ),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('confirms and persists transaction deletion', async () => {
    const transaction = {
      id: 'transaction-1',
      title: 'Coffee',
      category: 'Food',
      date: '2026-11-07',
      amountInCents: -499,
      kind: 'food' as const,
    }
    api.getWorkspace.mockResolvedValue({
      ...structuredClone(emptyWorkspace),
      finance: {
        ...emptyWorkspace.finance,
        transactions: [transaction],
      },
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    api.deleteTransaction.mockResolvedValue({ success: true })
    renderWorkspace()
    await screen.findByText('No tasks found. Add your first task for this day.')
    await userEvent.click(screen.getByRole('button', { name: 'Finances' }))
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Delete transaction: Coffee',
      }),
    )
    await waitFor(() =>
      expect(api.deleteTransaction).toHaveBeenCalledWith('transaction-1'),
    )
    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this transaction?',
    )
  })
  it('opens My Day from the mobile drawer with week and focus controls', async () => {
    renderWorkspace()
    await screen.findByText('No tasks found. Add your first task for this day.')
    await userEvent.click(
      screen.getByRole('button', { name: 'Open navigation' }),
    )
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /My day/,
      }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Make today count.',
    )
    expect(
      screen.getByRole('button', { name: 'Start focus' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Next week' }),
    ).toBeInTheDocument()
  })
  it('shows the real finance layout with empty history and editable limits', async () => {
    renderWorkspace()
    await screen.findByText('No tasks found. Add your first task for this day.')
    await userEvent.click(screen.getByRole('button', { name: 'Finances' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Your money, made clear.',
    )
    expect(screen.getByText('Income & expenses')).toBeInTheDocument()
    expect(screen.getByText('Spending by category')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit limits' }),
    ).toBeInTheDocument()
  })
  it('saves category limits and bookmarks to the account', async () => {
    renderWorkspace()
    await screen.findByText('No tasks found. Add your first task for this day.')
    api.setBookmark.mockResolvedValue({ success: true })
    await userEvent.click(
      screen.getByRole('button', { name: 'Save article: Your plan' }),
    )
    await waitFor(() =>
      expect(api.setBookmark).toHaveBeenCalledWith('plan', true),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Finances' }))
    await userEvent.click(screen.getByRole('button', { name: 'Edit limits' }))
    await userEvent.type(screen.getByLabelText('Monthly limit (USD)'), '500.50')
    api.setBudget.mockResolvedValue({ id: 'budget-1' })
    await userEvent.click(screen.getByRole('button', { name: 'Save limit' }))
    await waitFor(() =>
      expect(api.setBudget).toHaveBeenCalledWith({
        kind: 'housing',
        amountInCents: 50050,
      }),
    )
  })
})
