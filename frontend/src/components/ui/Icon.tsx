import type { ReactNode } from 'react'

const paths = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 9h18m-6 6h3" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  brief: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6m-6 5h6m-6 5h4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  trend: (
    <>
      <path d="m3 17 6-6 4 4 7-9m-6 0h6v6" />
    </>
  ),
  down: <path d="m7 10 5 5 5-5" />,
  case: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V4h8v3M3 12h18m-10-1v3h2v-3" />
    </>
  ),
  food: (
    <>
      <path d="M5 3v7m3-7v7m-6-7v7c0 2 6 2 6 0m-3 2v9m12-18c-4 4-4 9 0 9V3Zm0 9v9" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7M5 9v12h14V9m-10 12v-7h6v7" />
    </>
  ),
  train: (
    <>
      <rect x="5" y="3" width="14" height="15" rx="3" />
      <path d="M5 11h14M9 3v8m6-8v8M8 21l2-3m4 0 2 3M8 15h1m6 0h1" />
    </>
  ),
  bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z" />,
  sparkles: (
    <>
      <path d="m10 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Zm9 12 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  logout: (
    <>
      <path d="M10 4H4v16h6m5-13 5 5-5 5M9 12h11" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1-1.5 3m0 3h.01" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof paths

export function Icon({
  name,
  className = '',
  filled = false,
}: {
  name: IconName
  className?: string
  filled?: boolean
}) {
  return (
    <svg
      className={`size-[18px] shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
