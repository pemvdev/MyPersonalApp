import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFocusTimer } from './useFocusTimer'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
describe('Focus timer persistence', () => {
  it('records elapsed seconds against the day the session started, even after navigation changes the selected day', async () => {
    vi.useFakeTimers()
    const onSave = vi.fn().mockResolvedValue({ id: 'focus-1' })
    const { result, rerender } = renderHook(
      ({ date }) => useFocusTimer(date, onSave),
      { initialProps: { date: '2026-11-07' } },
    )
    act(() => result.current.toggle())
    act(() => vi.advanceTimersByTime(65000))
    rerender({ date: '2026-11-08' })
    act(() => result.current.toggle())
    expect(result.current.remaining).toBe(1435)
    await act(async () => {
      await result.current.save()
    })
    expect(onSave).toHaveBeenCalledWith(expect.any(String), '2026-11-07', 65)
    expect(result.current.remaining).toBe(1500)
  })
  it('preserves elapsed time and the request ID when a save must be retried', async () => {
    vi.useFakeTimers()
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('Try again'))
      .mockResolvedValueOnce({ id: 'focus-1' })
    const { result } = renderHook(() => useFocusTimer('2026-11-07', onSave))
    act(() => result.current.toggle())
    act(() => vi.advanceTimersByTime(1000))
    act(() => result.current.toggle())
    await act(async () => {
      await result.current.save()
    })
    expect(result.current.error).toBe('Try again')
    expect(result.current.remaining).toBe(1499)
    await act(async () => {
      await result.current.save()
    })
    expect(onSave.mock.calls[0][0]).toBe(onSave.mock.calls[1][0])
  })
})
