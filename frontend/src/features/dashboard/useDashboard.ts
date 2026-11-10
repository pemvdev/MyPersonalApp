import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as api from './api'
import { ApiError } from '../../lib/api'
import type {
  CreateTaskInput,
  CreateTransactionInput,
  Task,
  UpdateTransactionInput,
} from './types'

export function useDashboard(userId: string, date: string) {
  const client = useQueryClient()
  const [taskPage, setTaskPage] = useState(1)
  const [transactionPage, setTransactionPage] = useState(1)
  const workspace = useQuery({
    queryKey: ['workspace', userId, date, taskPage, transactionPage],
    queryFn: ({ signal }) =>
      api.getWorkspace(date, taskPage, transactionPage, signal),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status < 500) && count < 1,
  })
  type Change =
    | { type: 'task'; input: CreateTaskInput }
    | { type: 'transaction'; input: CreateTransactionInput }
    | { type: 'update-transaction'; id: string; input: UpdateTransactionInput }
    | { type: 'delete-transaction'; id: string }
    | { type: 'toggle'; task: Task }
    | { type: 'delete'; id: string }
    | { type: 'bookmark'; id: string; isSaved: boolean }
    | { type: 'budget'; kind: string; amountInCents: number }
    | { type: 'focus'; clientId: string; date: string; durationSeconds: number }
  const mutation = useMutation({
    mutationFn: (change: Change) => {
      switch (change.type) {
        case 'task':
          return api.createTask(change.input)
        case 'transaction':
          return api.createTransaction(change.input)
        case 'update-transaction':
          return api.updateTransaction(change.id, change.input)
        case 'delete-transaction':
          return api.deleteTransaction(change.id)
        case 'toggle':
          return api.updateTask(change.task.id, !change.task.isComplete)
        case 'delete':
          return api.deleteTask(change.id)
        case 'bookmark':
          return api.setBookmark(change.id, change.isSaved)
        case 'budget':
          return api.setBudget({
            kind: change.kind,
            amountInCents: change.amountInCents,
          })
        case 'focus':
          return api.saveFocus({
            clientId: change.clientId,
            date: change.date,
            durationSeconds: change.durationSeconds,
          })
      }
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['workspace', userId] })
    },
  })
  function run(change: Change) {
    if (!mutation.isPending) mutation.mutate(change)
  }
  return {
    ...workspace,
    taskPage,
    setTaskPage,
    transactionPage,
    setTransactionPage,
    isSaving: mutation.isPending,
    saveError: mutation.error?.message,
    toggleTask: (task: Task) => run({ type: 'toggle', task }),
    removeTask: (id: string) => run({ type: 'delete', id }),
    toggleBookmark: (id: string, isSaved: boolean) =>
      run({ type: 'bookmark', id, isSaved }),
    addTask: (input: CreateTaskInput) =>
      mutation.mutateAsync({ type: 'task', input }),
    addTransaction: (input: CreateTransactionInput) =>
      mutation.mutateAsync({ type: 'transaction', input }),
    updateTransaction: (id: string, input: UpdateTransactionInput) =>
      mutation.mutateAsync({ type: 'update-transaction', id, input }),
    removeTransaction: (id: string) =>
      mutation.mutateAsync({ type: 'delete-transaction', id }),
    setBudget: (kind: string, amountInCents: number) =>
      mutation.mutateAsync({ type: 'budget', kind, amountInCents }),
    saveFocus: (
      clientId: string,
      sessionDate: string,
      durationSeconds: number,
    ) =>
      mutation.mutateAsync({
        type: 'focus',
        clientId,
        date: sessionDate,
        durationSeconds,
      }),
  }
}
