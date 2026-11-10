import { supabase } from './supabase'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiRequest(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<unknown> {
  const { signal } = options
  if (!supabase) throw new Error('Sign-in has not been configured.')
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new ApiError('Please sign in again.', 401)

  let response: Response
  try {
    response = await fetch(
      `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}${path}`,
      {
        method: options.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          ...(options.body !== undefined
            ? { 'Content-Type': 'application/json' }
            : {}),
        },
        body:
          options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal,
      },
    )
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error(
      'Unable to reach the server. Check your connection and try again.',
      { cause: error },
    )
  }
  if (!response.ok) {
    throw new ApiError(
      response.status === 401
        ? 'Your session has expired. Sign out and sign in again.'
        : response.status === 400
          ? 'Check the form values and try again.'
          : 'Unable to save or load your workspace. Please try again.',
      response.status,
    )
  }
  try {
    return await response.json()
  } catch (error) {
    throw new Error(
      'The server returned an invalid response. Please try again.',
      {
        cause: error,
      },
    )
  }
}

export function apiGet(path: string, signal?: AbortSignal): Promise<unknown> {
  return apiRequest(path, { signal })
}
