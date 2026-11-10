import type { WorkspaceData, Task } from '../features/dashboard/types'
export const taskFixture: Task = {
  id: 'a05dff41-ea6b-40f8-9a8a-e83c31e2b9be',
  title: 'Prepare product presentation',
  time: '10:30',
  duration: '90 min',
  category: 'Work',
  isComplete: false,
}
export const emptyWorkspace: WorkspaceData = {
  id: 'workspace-1',
  name: 'Personal workspace',
  tasks: [],
  taskTotal: 0,
  completedTasks: 0,
  focusSeconds: 0,
  taskHasMore: false,
  finance: {
    balanceInCents: 0,
    incomeInCents: 0,
    expenseInCents: 0,
    months: [],
    categories: [
      {
        kind: 'housing',
        label: 'Housing',
        spentInCents: 0,
        budgetInCents: null,
      },
    ],
    transactions: [],
    hasMore: false,
  },
  bookmarks: [],
  articles: [
    {
      id: 'plan',
      category: 'Your day',
      readTime: 1,
      title: 'Your plan',
      summary: 'No tasks added yet.',
    },
  ],
}
