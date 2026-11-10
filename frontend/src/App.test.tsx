import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { emptyWorkspace } from './test/workspace-fixtures'
import { ApiError } from './lib/api'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
  getCurrentUser: vi.fn(),
  getWorkspace: vi.fn(),
}))

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signInWithOAuth: mocks.signInWithOAuth,
      signOut: mocks.signOut,
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: mocks.unsubscribe } },
      }),
    },
  },
}))
vi.mock('./features/dashboard/api', () => ({
  getWorkspace: mocks.getWorkspace,
}))
vi.mock('./features/auth/api', () => ({ getCurrentUser: mocks.getCurrentUser }))

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
  return client
}

describe('Google authentication', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.getWorkspace.mockResolvedValue(emptyWorkspace)
    window.history.replaceState({}, '', '/')
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
  })
  afterEach(cleanup)

  it('starts Google OAuth with the fixed callback and prevents repeat submissions', async () => {
    mocks.signInWithOAuth.mockResolvedValue({ error: null })
    renderApp()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Continue with Google' }),
    )
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    expect(screen.getByRole('button', { name: 'Connecting…' })).toBeDisabled()
    expect(mocks.getCurrentUser).not.toHaveBeenCalled()
  })

  it('lets the user retry a failed sign-in', async () => {
    mocks.signInWithOAuth.mockResolvedValue({
      error: new Error('provider unavailable'),
    })
    renderApp()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Continue with Google' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to start Google sign-in',
    )
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeEnabled()
  })

  it('shows a loading state until session restoration finishes', async () => {
    mocks.getSession.mockReturnValue(new Promise(() => {}))
    renderApp()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Restoring your session',
    )
  })

  it('handles a rejected callback without displaying provider error details', async () => {
    window.history.replaceState(
      {},
      '',
      '/auth/callback?error=access_denied&error_description=private',
    )
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Google sign-in could not be completed',
    )
    expect(window.location.search).toBe('')
    expect(screen.queryByText('private')).not.toBeInTheDocument()
  })

  it('loads the account, signs out, and removes cached account data', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    })
    mocks.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      name: 'Alex',
      email: 'user@example.com',
    })
    mocks.signOut.mockResolvedValue({ error: null })
    const client = renderApp()
    expect(
      await screen.findByText(/Good (morning|afternoon|evening), Alex/),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(
      await screen.findByRole('button', { name: 'Continue with Google' }),
    ).toBeInTheDocument()
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(client.getQueryData(['current-user', 'user-1'])).toBeUndefined()
  })

  it('shows backend authorization errors and supports retry', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    })
    mocks.getCurrentUser.mockRejectedValueOnce(
      new ApiError('Please sign in again.', 401),
    )
    mocks.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      name: 'Alex',
      email: null,
    })
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please sign in again.',
    )
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    })
    await waitFor(() =>
      expect(
        screen.getByText(/Good (morning|afternoon|evening), Alex/),
      ).toBeInTheDocument(),
    )
  })
})
