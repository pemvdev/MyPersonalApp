# Task Manager

React/Vite frontend and NestJS backend, using **Supabase PostgreSQL**, **Prisma ORM 7**, and **Supabase Auth with Google**.

## Responsibilities

- Supabase Auth performs Google OAuth and issues/refreshes the user's session.
- The frontend uses the Supabase publishable key and PKCE, restores sessions, and sends the access token to NestJS.
- NestJS verifies every protected request with Supabase Auth's `getUser(token)`. The client cannot choose the user ID used for database operations.
- Prisma connects to Supabase PostgreSQL. `GET /auth/me` upserts the verified user's application profile and returns only ID, email, and name.
- Supabase owns `auth.users`; Prisma manages only `public.app_users`. Application profiles and a personal financial workspace are created atomically when a verified user first loads their account. Profiles have no authorization role fields and are not matched or merged by email.

## 1. Configure Supabase and Google

1. Create or select your Supabase project. Copy the project URL and **publishable key** from its connection/API settings.
2. In Google Cloud, configure the OAuth consent screen and create an OAuth client of type **Web application**. Add test users if the consent screen is in testing mode.
3. In Supabase **Authentication → Sign In / Providers → Google**, copy the callback URL and add it as an **Authorized redirect URI** on the Google OAuth client. It normally looks like `https://YOUR_PROJECT.supabase.co/auth/v1/callback`.
4. Enter the Google client ID and client secret into the Supabase Google provider settings and enable the provider. The Google secret belongs in that dashboard, never in Vite environment variables.
5. In Supabase **Authentication → URL Configuration**, set Site URL to `http://localhost:5173` and allow `http://localhost:5173/auth/callback` as a redirect URL. Add your exact HTTPS production URLs when deploying. Disable other auth providers if Google must be the only available login method.

Official references: [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase with Prisma](https://supabase.com/docs/guides/database/prisma).

## 2. Configure environment files

Copy [backend/.env.example](./backend/.env.example) to `backend/.env` and [frontend/.env.example](./frontend/.env.example) to `frontend/.env`. Replace all placeholder values.

- Both sides use the same Supabase project URL and publishable key.
- `DATABASE_URL` is a **PostgreSQL connection string**, not the Supabase HTTPS API URL. Copy a **session pooler** connection on port 5432 from Supabase's Connect dialog, or use a direct connection if your network supports it. URL-encode the database password and keep certificate verification enabled. If your environment requires the Supabase CA certificate, configure the trusted CA rather than disabling verification.
- `DIRECT_URL` is used for migrations. Use a direct connection or session pooler on port 5432, not the transaction pooler. It may equal `DATABASE_URL` for this persistent NestJS server.
- `FRONTEND_URL` is the exact permitted browser origin, without a trailing slash. `VITE_API_URL` is the backend origin, also without a trailing slash.
- Never expose database passwords, service-role keys, or Google client secrets through `VITE_*` variables. The Supabase publishable key is intended for browser use.

The backend fails at startup if required configuration is missing or a database connection cannot be established. Frontend builds embed their Vite configuration; rebuild after changing it for deployment.

## 3. Install and initialize

Use Node.js 22.23.1 or a compatible newer supported release.

From `backend/`:

```bash
npm ci
npm run prisma:generate
npm run db:migrate
npm run start:dev
```

From `frontend/`, in another terminal:

```bash
npm ci
npm run dev
```

The checked-in migrations create the application tables and enable RLS with no browser policies. Prisma's trusted backend database role must own those tables or have permission to bypass RLS; the Supabase `postgres` connection supports this. Browser clients cannot read or write profiles through the Data API. All application access goes through NestJS authorization. Prisma does not receive an automatic Supabase user context, so future resource queries must explicitly check membership/ownership in backend services.

The migration does not modify Supabase's managed auth schema. Deleting a Supabase auth account prevents future token verification but does not automatically remove application profiles. Define account deletion and data retention rules before adding a deletion feature.

## Account-owned workspace

The home page requires Google sign-in. Supabase creates or authenticates the Google identity, then NestJS atomically upserts the application account and its personal financial workspace. Repeat sign-ins reuse the same Supabase user ID and workspace. Existing accounts without a workspace are initialized on their next visit.

There is no public sample dashboard. The old `/preview` path redirects to the authenticated entry page. New accounts start with no tasks, transactions, limits, or focus sessions.

- [Dashboard](./frontend/src/features/dashboard/Dashboard.tsx) composes the account-owned interface and uses React Query for server state.
- [Finances](./frontend/src/features/dashboard/components/FinanceScreen.tsx) shows the recorded net balance, monthly income/expenses, six-month chart, category limits, and paginated transactions.
- [My Day](./frontend/src/features/dashboard/components/MyDayScreen.tsx) offers a week selector, category filters, task completion/deletion, a focus timer, and daily progress.
- [Workspace services](./backend/src/workspaces/), [task service](./backend/src/tasks/tasks.service.ts), and [finance service](./backend/src/finance/finance.service.ts) validate ownership and enforce business rules. Browser clients cannot select an owner or financial workspace ID.
- [Database schema](./backend/prisma/schema.prisma) separates general workspaces from financial profiles, transactions, and budgets. All application tables have RLS enabled, with access through the trusted backend.

Money is stored as integer USD cents. Transactions are manually entered; there is no bank integration. Net balance is the sum of all recorded entries, including opening funds entered as income. Category limits recur monthly and may be edited in Finances. Monthly summaries and charts aggregate the full dataset independently of list pagination (50 entries per page).

New task and transaction forms preserve inputs when saving fails and close only after persistence succeeds. Client request IDs prevent retries from creating duplicate tasks, transactions, or focus sessions. Task completion does not create or settle financial transactions. Financial records use restricted deletion relations and have no delete endpoint.

The focus timer continues across workspace sections. Completed or paused sessions are saved when **Finish and save session** is selected; an unsaved active countdown resets on a full browser refresh or sign-out. Daily brief content is calculated from the user's actual task and finance records, rather than fabricated news or an external AI feed. Bookmarks are saved to the account.

## Workspace API

All endpoints require a Supabase bearer token. Sign in through `/auth/me` first to create or load the application account and personal workspace.

```text
GET    /workspaces/current?date=YYYY-MM-DD&taskPage=1&transactionPage=1
POST   /workspaces/current/tasks
PATCH  /workspaces/current/tasks/:taskId
DELETE /workspaces/current/tasks/:taskId
POST   /workspaces/current/transactions
PUT    /workspaces/current/budgets
PUT    /workspaces/current/bookmarks
POST   /workspaces/current/focus-sessions
```

Task and transaction creation accept a `clientId` UUID for request deduplication and a calendar `date` in `YYYY-MM-DD` format. DTOs reject unknown properties, invalid dates/times, noninteger monetary amounts, zero transactions, and unsupported categories.

## Verification

From `backend/`:

```bash
npm run build
npx prisma validate
npx eslint 'src/**/*.ts' 'test/**/*.ts'
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

From `frontend/`:

```bash
npm run build
npm run lint
npm run test:run
```

For the live flow:

1. Open `http://localhost:5173`. Select **Continue with Google** and complete consent. You should return to the app and see your name/email.
2. In Supabase's table editor, verify that `app_users.id` matches that user's Authentication ID. Reload and sign in again; there should still be one profile and one personal workspace for that user. New workspaces start empty. Add a task or transaction, reload, and sign in again to confirm the records persist.
3. Reload to verify session persistence. Sign out and confirm the login screen returns and cached profile data disappears.
4. Cancel Google consent and confirm the app shows a retryable sign-in error.
5. Request `GET http://localhost:3000/auth/me` without a bearer token or with an invalid one; expect 401. A valid Supabase access token should return only that user's ID, email, and name. Supplying another user ID in query parameters cannot change the authenticated identity.
6. Stop the backend while signed in; the account screen should show an error and a retry button.

For an optional live Prisma integration check, run `npm run test:database` from the backend after configuring the database. It checks workspace reuse, ownership-scoped updates, exact cents, deduplicated transactions, and RLS inside a transaction, and rolls back all inserted test records.

Unit and HTTP tests mock external services. A live database connection, migration deployment, and Google round trip require your own project credentials and provider configuration.

For production hosting, configure your frontend host to serve `index.html` for `/auth/callback` (SPA fallback). Use HTTPS and update both Supabase redirect settings and backend CORS to the deployed origins.
