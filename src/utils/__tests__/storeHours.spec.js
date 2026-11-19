import { describe, expect, it } from 'vitest'
import {
  assertStoreIsOpen,
  StoreClosedError,
  StoreHoursUnavailableError,
} from '../storeHours'

const schedule = [
  { day_of_week: 1, open_time: '14:00', close_time: '18:00', is_closed: false },
  { day_of_week: 2, open_time: null, close_time: null, is_closed: true },
  { day_of_week: 3, open_time: null, close_time: null, is_closed: true },
  { day_of_week: 4, open_time: null, close_time: null, is_closed: true },
  { day_of_week: 5, open_time: null, close_time: null, is_closed: true },
  { day_of_week: 6, open_time: null, close_time: null, is_closed: true },
  { day_of_week: 7, open_time: null, close_time: null, is_closed: true },
]

describe('store operating hours gate', () => {
  it('allows ordering only inside the configured opening interval', () => {
    expect(assertStoreIsOpen(schedule, new Date(2026, 10, 16, 17, 59))).toBe(true)
    expect(() => assertStoreIsOpen(schedule, new Date(2026, 10, 16, 18, 0)))
      .toThrow(StoreClosedError)
  })

  it('blocks ordering when the schedule cannot be verified', () => {
    expect(() => assertStoreIsOpen([], new Date(2026, 10, 16, 15, 0)))
      .toThrow(StoreHoursUnavailableError)
  })
})
