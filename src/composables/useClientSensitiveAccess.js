import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  getClientSensitiveAccessExpiresAt,
  hasClientSensitiveAccess,
} from '@/services/api'

export const useClientSensitiveAccess = () => {
  const isAuthorized = ref(hasClientSensitiveAccess())
  let expirationTimer = null

  const refresh = () => {
    isAuthorized.value = hasClientSensitiveAccess()
    if (expirationTimer) clearTimeout(expirationTimer)

    const expiresAt = getClientSensitiveAccessExpiresAt()
    if (isAuthorized.value && expiresAt > Date.now()) {
      expirationTimer = setTimeout(refresh, expiresAt - Date.now() + 10)
    }
  }

  onMounted(() => {
    window.addEventListener('client-sensitive-access-changed', refresh)
    refresh()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('client-sensitive-access-changed', refresh)
    if (expirationTimer) clearTimeout(expirationTimer)
  })

  return { isAuthorized, refresh }
}
