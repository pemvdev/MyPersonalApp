import { apiGet } from '../../lib/api'

export interface CurrentUser {
  id: string
  email: string | null
  name: string | null
}

export async function getCurrentUser(
  signal?: AbortSignal,
): Promise<CurrentUser> {
  const profile = await apiGet('/auth/me', signal)
  if (
    typeof profile !== 'object' ||
    profile === null ||
    !('id' in profile) ||
    typeof profile.id !== 'string' ||
    !('email' in profile) ||
    (profile.email !== null && typeof profile.email !== 'string') ||
    !('name' in profile) ||
    (profile.name !== null && typeof profile.name !== 'string')
  ) {
    throw new Error('The server returned an invalid account. Please try again.')
  }
  return { id: profile.id, email: profile.email, name: profile.name }
}
