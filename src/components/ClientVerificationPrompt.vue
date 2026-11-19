<template>
  <div v-if="modelValue" class="verification-panel" role="dialog" aria-modal="true">
    <div class="verification-card">
      <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h6 class="mb-1">{{ title }}</h6>
          <p class="small text-muted mb-0">{{ description }}</p>
        </div>
        <button type="button" class="btn-close" aria-label="Fechar" :disabled="isLoading" @click="close"></button>
      </div>

      <template v-if="purpose === 'sensitive'">
        <div v-if="!userStore.emailVerified" class="alert alert-warning py-2 small">
          <template v-if="userStore.canBindEmail || userStore.hasEmail">
            Confirme um e-mail para proteger e liberar seus dados.
            <button type="button" class="btn btn-link btn-sm p-0 ms-1" @click="$emit('needs-email')">
              Confirmar e-mail
            </button>
          </template>
          <template v-else>
            Esta conta não possui um e-mail confirmado. Entre em contato com o estabelecimento para validar sua identidade.
          </template>
        </div>
        <button
          v-else-if="!codeSent"
          type="button"
          class="btn btn-outline-primary"
          :disabled="isLoading"
          @click="requestCode"
        >
          <i class="bi bi-eye me-1"></i>
          {{ isLoading ? 'Enviando...' : 'Enviar código para meu e-mail' }}
        </button>
      </template>

      <template v-else>
        <div v-if="emailInputRequired" class="mb-3">
          <label class="form-label" for="verification-email">E-mail</label>
          <input
            id="verification-email"
            v-model.trim="email"
            type="email"
            class="form-control"
            autocomplete="email"
            maxlength="255"
            :disabled="isLoading || codeSent"
          >
        </div>
        <div v-else-if="purpose === 'email' && !userStore.emailVerified && !userStore.hasEmail && !userStore.canBindEmail" class="alert alert-warning py-2 small">
          Não é possível adicionar um e-mail a esta conta sem uma verificação de identidade adicional. Entre em contato com o estabelecimento.
        </div>
        <button
          v-if="!codeSent && (purpose === 'email-change' || userStore.emailVerified || userStore.hasEmail || userStore.canBindEmail)"
          type="button"
          class="btn btn-outline-primary"
          :disabled="isLoading || (emailInputRequired && !email)"
          @click="requestCode"
        >
          {{ isLoading ? 'Enviando...' : 'Enviar código de confirmação' }}
        </button>
      </template>

      <div v-if="codeSent" class="mt-3">
        <label class="form-label" for="verification-code">Código de 6 dígitos</label>
        <div class="input-group">
          <input
            id="verification-code"
            v-model="code"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            class="form-control"
            maxlength="6"
            :disabled="isLoading"
            @input="code = code.replace(/\D/g, '').slice(0, 6)"
          >
          <button type="button" class="btn btn-primary" :disabled="isLoading || code.length !== 6" @click="confirmCode">
            {{ isLoading ? 'Validando...' : 'Confirmar' }}
          </button>
        </div>
        <small class="text-muted d-block mt-2">O código expira em 5 minutos e só pode ser usado uma vez.</small>
      </div>

      <div v-if="errorMessage" class="alert alert-danger py-2 mt-3 mb-0" role="alert">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { clientApi } from '@/services/api'
import { useUserStore } from '@/stores/useUserStore'

const props = defineProps({
  modelValue: Boolean,
  purpose: {
    type: String,
    default: 'sensitive',
    validator: (value) => ['sensitive', 'email', 'email-change'].includes(value),
  },
  title: {
    type: String,
    default: 'Dados protegidos',
  },
  description: {
    type: String,
    default: 'Confirme sua identidade para continuar.',
  },
})

const emit = defineEmits(['update:modelValue', 'verified', 'needs-email'])
const userStore = useUserStore()
const email = ref('')
const code = ref('')
const codeSent = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const emailInputRequired = computed(() => (
  props.purpose === 'email-change'
  || (props.purpose === 'email' && !userStore.emailVerified && userStore.canBindEmail)
))

const getErrorMessage = (error) => {
  const validationErrors = error.response?.data?.errors
  const firstValidationError = validationErrors
    ? Object.values(validationErrors).flat()[0]
    : null

  return firstValidationError || error.response?.data?.message || 'Não foi possível concluir a verificação.'
}

const requestCode = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    if (props.purpose === 'sensitive') {
      await clientApi.requestSensitiveAccess()
    } else {
      await clientApi.requestEmailVerification(
        emailInputRequired.value ? email.value : undefined,
      )
    }
    codeSent.value = true
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

const confirmCode = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    let result
    if (props.purpose === 'sensitive') {
      result = await clientApi.confirmSensitiveAccess(code.value)
    } else {
      result = await clientApi.confirmEmailVerification(code.value)
      userStore.updateUser(result.data?.data || {})
    }

    emit('verified', result.data?.data)
    close()
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

const close = () => {
  emit('update:modelValue', false)
  code.value = ''
  codeSent.value = false
  errorMessage.value = ''
  isLoading.value = false
}

watch(() => props.modelValue, (open) => {
  if (!open) return
  code.value = ''
  codeSent.value = false
  errorMessage.value = ''
  email.value = ''
})
</script>

<style scoped>
.verification-panel {
  position: fixed;
  inset: 0;
  z-index: 11000;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
}

.verification-card {
  width: min(100%, 440px);
  padding: 1.25rem;
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 1rem 2rem rgba(0, 0, 0, 0.2);
}
</style>
