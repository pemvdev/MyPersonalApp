import { useEffect, useRef, useState } from 'react'

export function useFocusTimer(
  date: string,
  onSave: (id: string, date: string, seconds: number) => Promise<unknown>,
) {
  const [remaining, setRemaining] = useState(1500)
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientId, setClientId] = useState(() => crypto.randomUUID())
  const deadline = useRef(0)
  const sessionDate = useRef(date)
  useEffect(() => {
    if (!isRunning) return
    const timer = setInterval(() => {
      const seconds = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      )
      setRemaining(seconds)
      if (seconds === 0) setIsRunning(false)
    }, 250)
    return () => clearInterval(timer)
  }, [isRunning])
  function toggle() {
    if (isRunning) {
      setRemaining(
        Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)),
      )
      setIsRunning(false)
    } else {
      if (remaining === 1500) sessionDate.current = date
      deadline.current = Date.now() + remaining * 1000
      setIsRunning(true)
    }
  }
  async function save() {
    if (isSaving || remaining === 1500) return
    setIsRunning(false)
    setIsSaving(true)
    setError(null)
    try {
      await onSave(clientId, sessionDate.current, 1500 - remaining)
      setRemaining(1500)
      setClientId(crypto.randomUUID())
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to save your session.',
      )
    } finally {
      setIsSaving(false)
    }
  }
  return { remaining, isRunning, isSaving, error, toggle, save }
}
export type FocusTimerState = ReturnType<typeof useFocusTimer>
