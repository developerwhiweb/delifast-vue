<template>
  <div
    v-if="modelValue"
    class="modal fade show"
    tabindex="-1"
    style="display: block; background: rgba(0, 0, 0, 0.5)"
    @click.self="close"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content identify-modal">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-person-circle fs-4 text-secondary"></i>
            <h5 class="modal-title mb-0">
              {{ userStore.isLogged ? 'Minha conta' : needsEmail ? 'Complete seu cadastro' : 'Identifique-se' }}
            </h5>
          </div>
          <button type="button" class="btn-close" aria-label="Fechar" @click="close"></button>
        </div>

        <div class="modal-body">
          <div v-if="userStore.isLogged" class="text-center">
            <p class="mb-3">Você está identificado para fazer seus pedidos.</p>
            <button class="btn btn-outline-danger w-100" :disabled="isLoggingOut" @click="logout">
              {{ isLoggingOut ? 'Saindo...' : 'Sair da conta' }}
            </button>
          </div>

          <form v-else @submit.prevent="login">
            <div class="mb-3">
              <label for="client-phone" class="form-label">Telefone</label>
              <div class="input-group">
                <span class="input-group-text">+55</span>
                <input
                  id="client-phone"
                  v-model="phone"
                  type="tel"
                  class="form-control"
                  placeholder="(99) 99999-9999"
                  autocomplete="tel-national"
                  maxlength="15"
                  required
                  :disabled="isLoading"
                  @input="formatPhone"
                >
              </div>
            </div>

            <div class="mb-3">
              <label for="client-name" class="form-label">Nome completo</label>
              <input
                id="client-name"
                v-model="name"
                type="text"
                class="form-control"
                placeholder="Digite seu nome completo"
                autocomplete="name"
                maxlength="255"
                required
                :disabled="isLoading"
              >
            </div>

            <div v-if="needsEmail" class="mb-3">
              <label for="client-email" class="form-label">E-mail</label>
              <input
                id="client-email"
                v-model.trim="email"
                type="email"
                class="form-control"
                placeholder="seu@email.com"
                autocomplete="email"
                maxlength="255"
                required
                :disabled="isLoading"
              >
            </div>

            <div v-if="errorMessage" class="alert alert-danger py-2" role="alert">
              {{ errorMessage }}
            </div>

            <button type="submit" class="btn btn-primary w-100" :disabled="isLoading">
              {{ isLoading ? 'Aguarde...' : needsEmail ? 'Criar conta' : 'Continuar' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { useUserStore } from '@/stores/useUserStore'
import { clientApi } from '@/services/api'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue', 'submit'])
const toast = useToast()
const userStore = useUserStore()

const name = ref('')
const phone = ref('')
const email = ref('')
const needsEmail = ref(false)
const isLoading = ref(false)
const isLoggingOut = ref(false)
const errorMessage = ref('')

const close = () => {
  if (isLoading.value) return
  emit('update:modelValue', false)
}

const formatPhone = () => {
  const digits = phone.value.replace(/\D/g, '').slice(0, 11)

  if (digits.length > 6) {
    phone.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  } else if (digits.length > 2) {
    phone.value = `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  } else if (digits.length) {
    phone.value = `(${digits}`
  }
}

const getErrorMessage = (error) => {
  const validationErrors = error.response?.data?.errors
  const emailError = validationErrors?.email
  const firstEmailError = Array.isArray(emailError) ? emailError[0] : emailError

  if (firstEmailError === 'validation.required') {
    return 'Informe seu e-mail para concluir o cadastro.'
  }

  const firstValidationError = validationErrors
    ? Object.values(validationErrors).flat()[0]
    : null

  return firstValidationError || error.response?.data?.message || error.message || 'Não foi possível entrar.'
}

const login = async () => {
  if (userStore.isLogged) return

  errorMessage.value = ''
  isLoading.value = true

  try {
    const response = await clientApi.login({
      name: name.value.trim(),
      phone: phone.value.trim(),
      ...(needsEmail.value ? { email: email.value.trim() } : {}),
    })
    const client = response.data.data.client

    userStore.login({
      id: client.id,
      fullName: client.name,
      whatsapp: client.phone,
      hasEmail: client.has_email,
      emailVerified: client.email_verified,
      addressStorageEnabled: client.address_storage_enabled,
      hasSavedAddress: client.has_saved_address,
      canBindEmail: client.can_bind_email,
      pathImage: client.path_image || '',
    })

    emit('submit', {
      id: client.id,
      fullName: client.name,
      whatsapp: client.phone,
      hasEmail: client.has_email,
      emailVerified: client.email_verified,
      addressStorageEnabled: client.address_storage_enabled,
      hasSavedAddress: client.has_saved_address,
      canBindEmail: client.can_bind_email,
      pathImage: client.path_image || '',
    })
    isLoading.value = false
    close()
  } catch (error) {
    console.error('Não foi possível autenticar o cliente.', error)
    if (error.response?.data?.errors?.email) {
      needsEmail.value = true
    }
    errorMessage.value = getErrorMessage(error)
    toast.error(errorMessage.value)
  } finally {
    isLoading.value = false
  }
}

const logout = async () => {
  if (isLoggingOut.value) return

  isLoggingOut.value = true
  try {
    const logoutRequest = userStore.logout()
    toast.info('Você saiu da sua conta.')
    close()
    await logoutRequest
  } finally {
    isLoggingOut.value = false
  }
}

watch(() => props.modelValue, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
  errorMessage.value = ''

  if (isOpen && userStore.isLogged) {
    name.value = userStore.fullName
    phone.value = userStore.whatsapp
  } else if (isOpen) {
    name.value = ''
    phone.value = ''
    email.value = ''
    needsEmail.value = false
  }
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.identify-modal {
  position: relative;
  z-index: 1060;
  border: 0;
  border-radius: 0.75rem;
}
.modal{
  backdrop-filter: blur(4px);
}
.modal-header {
  background: var(--bg-ouro);
}
</style>
