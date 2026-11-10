import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Modal({
  title,
  onClose,
  children,
  isDrawer = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  isDrawer?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className={
        isDrawer
          ? 'fixed inset-y-0 left-0 m-0 h-svh max-h-svh w-72 max-w-[calc(100%-2rem)] flex-col border-r border-line bg-sidebar p-4 text-ink shadow-xl backdrop:bg-ink/30 open:flex'
          : 'm-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-6 text-ink shadow-xl backdrop:bg-ink/30'
      }
      aria-labelledby="modal-title"
    >
      <div className="mb-6 flex shrink-0 items-center justify-between gap-4">
        <h2 id="modal-title" className="text-lg font-semibold">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
          className="icon-button"
        >
          <Icon name="close" />
        </button>
      </div>
      {isDrawer ? (
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      ) : (
        children
      )}
    </dialog>
  )
}
