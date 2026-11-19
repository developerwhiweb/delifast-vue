import { getContacts } from '@/services/api'
import { isStoreOpenAt } from '@/utils/openingHours'

const cacheDuration = 30_000
let cachedSchedule = null
let cacheExpiresAt = 0
let scheduleRequest = null

export class StoreClosedError extends Error {
  constructor() {
    super('O estabelecimento está fechado no momento. Não é possível adicionar produtos ou finalizar pedidos.')
    this.name = 'StoreClosedError'
  }
}

export class StoreHoursUnavailableError extends Error {
  constructor(cause) {
    super('Não foi possível verificar o horário de funcionamento. Tente novamente.')
    this.name = 'StoreHoursUnavailableError'
    this.cause = cause
  }
}

const isValidTime = (time) => (
  typeof time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
)

const normalizeOpeningHours = (schedule) => {
  if (!Array.isArray(schedule) || schedule.length !== 7) {
    throw new Error('A resposta de /contacts não contém os horários dos sete dias.')
  }

  const days = new Set()
  return schedule.map((hour) => {
    const dayOfWeek = Number(hour?.day_of_week)
    const isClosed = hour?.is_closed

    if (
      !Number.isInteger(dayOfWeek)
      || dayOfWeek < 1
      || dayOfWeek > 7
      || days.has(dayOfWeek)
      || typeof isClosed !== 'boolean'
      || (!isClosed && (!isValidTime(hour.open_time) || !isValidTime(hour.close_time)))
    ) {
      throw new Error('A resposta de /contacts contém um horário de funcionamento inválido.')
    }

    days.add(dayOfWeek)
    return { ...hour, day_of_week: dayOfWeek, is_closed: isClosed }
  }).sort((first, second) => first.day_of_week - second.day_of_week)
}

export const getStoreSchedule = async ({ force = false } = {}) => {
  if (!force && cachedSchedule && Date.now() < cacheExpiresAt) {
    return cachedSchedule
  }

  if (force) cacheExpiresAt = 0

  if (!scheduleRequest) {
    scheduleRequest = (async () => {
      const contacts = await getContacts()
      const openingHours = contacts.length
        ? normalizeOpeningHours(contacts[0].opening_hours)
        : []
      const result = { contacts, openingHours }

      cachedSchedule = result
      cacheExpiresAt = Date.now() + cacheDuration
      return result
    })()
      .catch((error) => {
        throw new StoreHoursUnavailableError(error)
      })
      .finally(() => {
        scheduleRequest = null
      })
  }

  return scheduleRequest
}

export const assertStoreIsOpen = (openingHours, date = new Date()) => {
  const isOpen = isStoreOpenAt(openingHours, date)
  if (isOpen === false) throw new StoreClosedError()
  if (isOpen !== true) throw new StoreHoursUnavailableError()

  return true
}

export const ensureStoreIsOpen = async (options) => {
  const { openingHours } = await getStoreSchedule(options)
  return assertStoreIsOpen(openingHours)
}
