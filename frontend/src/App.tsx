import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from './features/auth/api'
import { useAuth } from './features/auth/useAuth'
import { ApiError } from './lib/api'
import { supabase } from './lib/supabase'
import { Dashboard } from './features/dashboard/Dashboard'
import './App.css'

function App() {
  const auth = useAuth()
  const profile = useQuery({
    queryKey: ['current-user', auth.session?.user.id],
    queryFn: ({ signal }) => getCurrentUser(signal),
    enabled: Boolean(auth.session),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 401) && failureCount < 1,
  })

  if (auth.session && profile.isSuccess) {
    return (
      <Dashboard
        key={profile.data.id}
        userId={profile.data.id}
        name={profile.data.name}
        onSignOut={() => void auth.signOut()}
        isSigningOut={auth.isSubmitting}
        error={auth.error}
      />
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="page-title">
        <p className="eyebrow">MyPersonalApp</p>
        <h1 id="page-title">A little more organized.</h1>
        {!supabase ? (
          <p role="alert">
            Sign-in is not configured yet. Follow the project setup guide to
            connect Supabase.
          </p>
        ) : auth.isLoading ? (
          <p role="status">Restoring your session…</p>
        ) : !auth.session ? (
          <>
            <p>Sign in to your account to get started.</p>
            <button
              onClick={() => void auth.signIn()}
              disabled={auth.isSubmitting}
            >
              {auth.isSubmitting ? 'Connecting…' : 'Continue with Google'}
            </button>
          </>
        ) : (
          <>
            {profile.isPending ? (
              <p role="status">Loading your account…</p>
            ) : profile.isError ? (
              <div role="alert">
                <p>{profile.error.message}</p>
                <button
                  onClick={() => void profile.refetch()}
                  disabled={profile.isFetching}
                >
                  {profile.isFetching ? 'Retrying…' : 'Try again'}
                </button>
              </div>
            ) : null}
            <button
              className="secondary"
              onClick={() => void auth.signOut()}
              disabled={auth.isSubmitting}
            >
              {auth.isSubmitting ? 'Signing out…' : 'Sign out'}
            </button>
          </>
        )}
        {auth.error && <p role="alert">{auth.error}</p>}
      </section>
    </main>
  )
}

export default App
