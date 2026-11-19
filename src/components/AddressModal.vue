<template>
  <div
    v-if="modelValue && userStore.isLogged"
    class="modal fade show"
    tabindex="-1"
    style="display: block; background: rgba(0,0,0,.5)"
    @click.self="close"
  >
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">

        <!-- HEADER -->
        <div class="modal-header py-2">
            <h5 class="modal-title">
                <i class="bi bi-geo-alt me-2"></i>Meus Endereços
            </h5>
            <button type="button" class="btn-close" @click="close"></button>
        </div>

        <div class="modal-body">

          <div v-if="view === 'protected'" class="alert alert-secondary text-center py-4">
            <i class="bi bi-eye-slash fs-2 d-block mb-2"></i>
            <strong>Seus endereços estão protegidos</strong>
            <p class="small text-muted mt-2 mb-3">
              Confirme sua identidade pelo e-mail para visualizar os endereços salvos.
            </p>
            <button type="button" class="btn btn-outline-primary" @click="openSensitiveVerification">
              <i class="bi bi-eye me-1"></i>Solicitar visualização
            </button>
            <button
              v-if="props.checkoutMode"
              type="button"
              class="btn btn-primary ms-2"
              @click="showForm"
            >
              Informar um endereço para este pedido
            </button>
          </div>

          <!-- LISTA -->
          <div v-else-if="view === 'list'" class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="address-title">Endereços cadastrados</h6>
                <!-- No lugar do botão Novo Endereço existente -->
                <button
                    v-if="addresses.length < 2"
                    class="btn btn-outline-primary btn-sm"
                    @click="showForm"
                    :disabled="isLoadingAddresses || isSaving"
                >
                    <i class="bi bi-plus"></i> Novo Endereço
                </button>
            </div>

            <div v-if="loadError" class="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
              <span>{{ loadError }}</span>
              <button class="btn btn-sm btn-outline-danger ms-2" @click="loadAddresses()">
                Tentar novamente
              </button>
            </div>

            <div v-else-if="isLoadingAddresses" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Carregando endereços...</span>
              </div>
            </div>

            <div v-else class="row g-3">
              <div class="col-md-6" v-for="addr in addresses" :key="addr.id">
                <div
                  class="card address-card"
                  :class="{ selected: String(selectedId) === String(addr.id) }"
                  @click="selectAddress(addr.id)"
                >
                  <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                      <h6 class="card-title">{{ addr.nickname }}</h6>
                      <span class="badge text-black px-3" :class="addr.primary ? 'bg-primary text-white' : 'bg-secondary'">
                        {{ addr.primary ? 'Principal' : 'Secundário' }}
                      </span>
                    </div>

                    <p v-if="addr.recipientName" class="card-text small mb-1">{{ addr.recipientName }}</p>
                    <p class="card-text small mb-1">{{ addr.street }}, {{ addr.number }}</p>
                    <p class="card-text small mb-1">{{ addr.neighborhood }}</p>
                    <p class="card-text small mb-1">
                      {{ addr.city }} - {{ addr.state }}, {{ addr.cep }}
                    </p>

                    <div class="mt-2">
                      <button class="btn btn-sm btn-outline-secondary me-1" :disabled="isSaving" @click.stop="editAddress(addr.id)">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-danger" :disabled="isSaving" @click.stop="requestDeleteAddress(addr.id)">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- FORM -->
          <div v-else>
            <div v-if="loadError" class="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
              <span>{{ loadError }}</span>
              <button class="btn btn-sm btn-outline-danger ms-2" @click="loadAddresses({ showFormWhenEmpty: false })">
                Tentar novamente
              </button>
            </div>

            <div class="progress">
              <div
                class="progress-bar"
                :style="{ width: step === 1 ? '50%' : '100%' }"
              ></div>
            </div>

            <!-- STEP 1 -->
            <div class="form-step mt-3 active" v-if="step === 1">
              <h6 class="mb-3">Informações do Endereço</h6>

              <div class="row g-3">

                <div class="col-md-6">
                  <label class="form-label">Apelido do Endereço</label>
                  <input v-model="form.nickname" class="form-control" placeholder="Ex: Casa, Trabalho...">
                </div>

                <div class="col-md-6">
                  <label class="form-label">Nome de quem recebe</label>
                  <input v-model="form.recipientName" class="form-control" autocomplete="name" required>
                </div>

                <div class="col-md-6">
                  <label class="form-label">CEP</label>
                  <div class="input-group">
                    <input
                      v-model="form.cep"
                      class="form-control"
                      maxlength="9"
                      @input="handleCepInput"
                    >
                  </div>

                  <div class="cep-loading mt-1" v-show="loadingCEP">
                    <small class="text-muted">Buscando CEP...</small>
                  </div>
                </div>

                <div class="col-md-8">
                  <label class="form-label">Rua</label>
                  <input v-model="form.street" class="form-control">
                </div>

                <div class="col-md-4">
                  <label class="form-label">Número</label>
                  <input v-model="form.number" class="form-control">
                </div>

                <div class="col-md-6">
                  <label class="form-label">Complemento</label>
                  <input v-model="form.complement" class="form-control" placeholder="Apto, Bloco, etc.">
                </div>

                <div class="col-md-6">
                  <label class="form-label">Bairro</label>
                  <input v-model="form.neighborhood" class="form-control">
                </div>

                <div class="col-md-8">
                  <label class="form-label">Cidade</label>
                  <input v-model="form.city" class="form-control">
                </div>

                <div class="col-md-4">
                  <label class="form-label">Estado</label>
                  <select v-model="form.state" class="form-select">
                    <option value="">Selecione</option>
                    <option v-for="state in brazilStates" :key="state" :value="state">
                      {{ state }}
                    </option>
                  </select>
                </div>

              </div>

              <div class="d-flex justify-content-between mt-4">
                <button class="btn bg-light" @click="showList">
                  Voltar
                </button>
                <button class="btn bg-primary text-white fw-medium" @click="nextStep">
                  Continuar
                </button>
              </div>
            </div>

            <!-- STEP 2 -->
            <div class="form-step mt-3" v-if="step === 2">
              <h6 class="mb-3">Ponto de referência e instruções de entrega</h6>

              <textarea v-model="form.reference" class="form-control"></textarea>

              <div v-if="props.checkoutMode" class="mt-3">
                <p class="form-label mb-2">Deseja salvar este endereço para utilizá-lo em próximas compras?</p>
                <div class="d-flex flex-column gap-2">
                  <div class="d-flex align-items-center gap-2">
                    <label class="form-check mb-0">
                      <input v-model="saveAddressPreference" class="form-check-input" type="radio" :value="true">
                      <span class="form-check-label">Sim, desejo salvar</span>
                    </label>
                    <button
                      type="button"
                      class="btn btn-link btn-sm p-0 text-primary"
                      aria-label="Explicação sobre salvar o endereço"
                      @click.stop="openAddressSaveInfo(true)"
                    >
                      <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>
                    </button>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <label class="form-check mb-0">
                      <input v-model="saveAddressPreference" class="form-check-input" type="radio" :value="false">
                      <span class="form-check-label">Não desejo salvar</span>
                    </label>
                    <button
                      type="button"
                      class="btn btn-link btn-sm p-0 text-primary"
                      aria-label="Explicação sobre não salvar o endereço"
                      @click.stop="openAddressSaveInfo(false)"
                    >
                      <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>

                <p v-if="saveAddressPreference && !userStore.emailVerified && !userStore.hasEmail && !userStore.canBindEmail" class="small text-warning mt-2 mb-0">
                  Esta conta já possui dados associados e não pode cadastrar um novo e-mail sem verificação adicional. Você ainda pode continuar sem salvar o endereço.
                </p>

                <div v-if="!saveAddressPreference" class="mt-3">
                  <label class="form-label" for="order-contact-email">E-mail para este pedido <small>(opcional)</small></label>
                  <input
                    id="order-contact-email"
                    v-model.trim="customerEmail"
                    type="email"
                    class="form-control"
                    autocomplete="email"
                    maxlength="255"
                  >
                  <small class="text-muted">Este e-mail será usado somente neste pedido.</small>
                </div>
              </div>

              <div class="form-check mt-3">
                <input type="checkbox" v-model="form.primary" class="form-check-input">
                <label class="form-check-label">
                  Definir como endereço principal
                </label>
              </div>

              <div class="d-flex justify-content-between mt-4">
                <button class="btn bg-light" @click="prevStep">Voltar</button>
                <button
                  class="btn bg-primary fw-medium text-white"
                  @click="saveAddress"
                  :disabled="isSaving"
                >
                  {{ isSaving ? 'Salvando...' : 'Salvar Endereço' }}
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  </div>
  <div
    v-if="addressSaveInfoChoice !== null"
    class="address-save-info-overlay"
    role="presentation"
    @click.self="closeAddressSaveInfo"
  >
    <div
      class="address-save-info-dialog bg-white rounded-3 shadow p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-save-info-title"
    >
      <div class="d-flex align-items-start justify-content-between gap-3 mb-3">
        <h5 id="address-save-info-title" class="mb-0">
          {{ addressSaveInfoChoice ? 'Salvar endereço' : 'Não salvar endereço' }}
        </h5>
        <button
          type="button"
          class="btn-close"
          aria-label="Fechar explicação"
          @click="closeAddressSaveInfo"
        ></button>
      </div>
      <p v-if="addressSaveInfoChoice" class="mb-0">
        Salvo na sua conta, o endereço poderá ser selecionado automaticamente nas próximas compras, sem precisar preenchê-lo novamente. 
        <br>
        <br>
        Ao informar e confirmar seu e-mail, você terá acesso às áreas restritas da sua conta, como <strong>Meus Pedidos, Meu Perfil e Meus Endereços</strong>. 
        <br>
        <br>
        A confirmação será realizada por meio do e-mail informado. Além disso, o pedido mantém uma cópia independente do endereço utilizado na compra.
      </p>
      <p v-else class="mb-0">
        O endereço será utilizado apenas neste pedido e não ficará salvo na sua conta. Na próxima compra, você precisará informá-lo novamente. 
        <br>
        <br>
        O e-mail, caso informado, também será utilizado somente neste pedido. Sem um e-mail confirmado, você não terá acesso às áreas restritas da conta, como <strong>Meus Pedidos, Meu Perfil e Meus Endereços</strong>.
      </p>
    </div>
  </div>
  <div
    v-if="addressToDelete"
    class="modal fade show delete-confirmation"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    style="display: block; background: rgba(0,0,0,.5)"
    @click.self="cancelDelete"
  >
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content">
        <div class="modal-header py-2">
          <h5 class="modal-title">Excluir endereço?</h5>
          <button type="button" class="btn-close" :disabled="isSaving" @click="cancelDelete"></button>
        </div>
        <div class="modal-body">
          <p class="mb-0">
            Deseja excluir o endereço <strong>{{ addressToDelete.nickname }}</strong>?
          </p>
        </div>
        <div class="modal-footer py-2">
          <button class="btn btn-light" :disabled="isSaving" @click="cancelDelete">
            Cancelar
          </button>
          <button class="btn btn-danger" :disabled="isSaving" @click="deleteAddress">
            {{ isSaving ? 'Excluindo...' : 'Excluir endereço' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <ClientVerificationPrompt
    v-model="showVerificationPrompt"
    :purpose="verificationPurpose"
    @needs-email="verificationPurpose = 'email'"
    @verified="handleVerification"
  />
  <IdentifyModal v-model="showIdentifyModal" />
</template>

<script setup>
    import { onBeforeUnmount, ref, watch } from 'vue'
    import { useToast } from 'vue-toastification'
    import {
        createAddress as createAddressRequest,
        deleteAddress as deleteAddressRequest,
        getAddresses,
        hasClientSensitiveAccess,
        updateAddress as updateAddressRequest,
    } from '@/services/api'
    import { useUserStore } from '@/stores/useUserStore'
    import IdentifyModal from './IdentifyModal.vue'
    import ClientVerificationPrompt from './ClientVerificationPrompt.vue'
    import { useClientSensitiveAccess } from '@/composables/useClientSensitiveAccess'

    const toast = useToast()
    const userStore = useUserStore()

    const props = defineProps({
        modelValue: Boolean,
        checkoutMode: {
            type: Boolean,
            default: false,
        },
    })

    const emit = defineEmits(['update:modelValue', 'address-selected'])
    const { isAuthorized: hasSensitiveAccess, refresh: refreshSensitiveAccess } = useClientSensitiveAccess()

    const view = ref('list')         // 'list' ou 'form'
    const step = ref(1)              // passo do formulário
    const selectedId = ref(null)     // id do endereço selecionado
    const loadingCEP = ref(false)    // flag de loading CEP
    const isLoadingAddresses = ref(false)
    const isSaving = ref(false)
    const loadError = ref('')
    const showIdentifyModal = ref(false)
    const showVerificationPrompt = ref(false)
    const addressSaveInfoChoice = ref(null)
    const verificationPurpose = ref('sensitive')
    const saveAddressPreference = ref(Boolean(userStore.addressStorageEnabled))
    const customerEmail = ref('')
    const pendingCheckoutAddress = ref(null)
    const addressToDelete = ref(null)
    const brazilStates = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
        'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
        'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
    ]

    let debounceTimer = null

    const notifyAddressUpdate = () => {
        window.dispatchEvent(new CustomEvent('addresses-updated'))
        localStorage.setItem('addressesUpdated', Date.now().toString())
    }

    const addresses = ref([])

    const createEmptyForm = () => ({
        cep: '',
        nickname: '',
        recipientName: userStore.fullName,
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        reference: '',
        primary: false,
        id: null
    })

    const form = ref(createEmptyForm())

    const getErrorMessage = (error, fallback) => {
        const validationErrors = error.response?.data?.errors
        const firstValidationError = validationErrors
            ? Object.values(validationErrors).flat()[0]
            : null

        return firstValidationError
            || error.response?.data?.message
            || (error.response?.status ? `${fallback} (HTTP ${error.response.status})` : error.message)
            || fallback
    }

    const loadAddresses = async ({ showFormWhenEmpty = true } = {}) => {
        if (!userStore.isLogged) return []
        if (!hasClientSensitiveAccess()) {
            addresses.value = []
            selectedId.value = null
            localStorage.removeItem('selectedAddressId')
            view.value = 'protected'
            return null
        }

        isLoadingAddresses.value = true
        loadError.value = ''
        localStorage.removeItem('addresses')
        localStorage.removeItem('selectedAddress')

        try {
            const loadedAddresses = await getAddresses()
            addresses.value = loadedAddresses
            selectedId.value = localStorage.getItem('selectedAddressId')

            if (showFormWhenEmpty && loadedAddresses.length === 0) {
                showForm()
            }

            return loadedAddresses
        } catch (error) {
            console.error('Não foi possível carregar os endereços da API.', error)
            addresses.value = []
            if (error.response?.status === 403) {
                refreshSensitiveAccess()
                view.value = 'protected'
                return null
            }
            loadError.value = getErrorMessage(error, 'Não foi possível carregar os endereços.')
            return null
        } finally {
            isLoadingAddresses.value = false
        }
    }

    /* 🔥 MÁSCARA + TRIGGER AUTOMÁTICO */
    const handleCepInput = () => {
        let v = form.value.cep.replace(/\D/g, '')

        if (v.length > 5) {
            v = v.slice(0,5) + '-' + v.slice(5,8)
        }

        form.value.cep = v

        const cepLimpo = v.replace(/\D/g, '')

        if (cepLimpo.length === 8) {
            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
                searchCEP(cepLimpo)
            }, 400)
        }
    }

    /* 🔥 AJAX VIA CEP */
    const searchCEP = async (cep) => {
        loadingCEP.value = true

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
            const data = await res.json()

            if (!data.erro) {
                form.value.street = data.logradouro
                form.value.neighborhood = data.bairro
                form.value.city = data.localidade
                form.value.state = data.uf
            }
        } catch (e) {
            console.error(e)
        }

        loadingCEP.value = false
    }

    /* ---- NAVIGATION ---- */
    const showForm = () => {
        view.value = 'form'
        step.value = 1
        form.value = createEmptyForm()
        saveAddressPreference.value = Boolean(userStore.addressStorageEnabled)
        customerEmail.value = ''
    }

    const showList = () => {
        view.value = 'list'
    }
    
    const nextStep = () => step.value = 2
    const prevStep = () => step.value = 1

    /* ---- ENDEREÇOS ---- */
    const setSelectedAddress = (address, shouldNotify = true) => {
        selectedId.value = address.id
        localStorage.setItem('selectedAddressId', String(address.id))
        emit(
            'address-selected',
            props.checkoutMode
                ? {
                    address,
                    addressId: address.id,
                    saveToAccount: true,
                    customerEmail: '',
                }
                : address,
        )
        if (shouldNotify) notifyAddressUpdate()
    }

    const selectAddress = (id) => {
        const selectedAddr = addresses.value.find((address) => String(address.id) === String(id))
        if (!selectedAddr) return

        setSelectedAddress(selectedAddr)
        close()
    }

    const editAddress = (id) => {
        const addr = addresses.value.find((address) => String(address.id) === String(id))
        if (addr) {
            form.value = { ...createEmptyForm(), ...addr }
            view.value = 'form'
            step.value = 1
        }
    }

    const requestDeleteAddress = (id) => {
        addressToDelete.value = addresses.value.find(
            (address) => String(address.id) === String(id),
        ) || null
    }

    const cancelDelete = () => {
        if (!isSaving.value) addressToDelete.value = null
    }

    const deleteAddress = async () => {
        const address = addressToDelete.value
        if (!address || isSaving.value) return

        const wasSelected = localStorage.getItem('selectedAddressId') === String(address.id)
        isSaving.value = true

        try {
            await deleteAddressRequest(address.id)
            const updatedAddresses = await loadAddresses({ showFormWhenEmpty: false })
            if (!updatedAddresses) {
                addressToDelete.value = null
                toast.warning('Endereço excluído, mas não foi possível atualizar a lista.')
                return
            }

            if (wasSelected) {
                const nextAddress = updatedAddresses.find((address) => address.primary)
                    || updatedAddresses[0]

                if (nextAddress) {
                    setSelectedAddress(nextAddress)
                } else {
                    selectedId.value = null
                    localStorage.removeItem('selectedAddressId')
                    emit('address-selected', null)
                    notifyAddressUpdate()
                }
            } else {
                notifyAddressUpdate()
            }

            toast.success('Endereço removido com sucesso!', { timeout: 3000 })
            addressToDelete.value = null
        } catch (error) {
            console.error('Não foi possível remover o endereço.', error)
            toast.error(getErrorMessage(error, 'Não foi possível remover o endereço.'))
        } finally {
            isSaving.value = false
        }
    }

    const saveAddress = async () => {
        const isNewAddress = !form.value.id
        const wasSelected = localStorage.getItem('selectedAddressId') === String(form.value.id)
        const shouldSelect = Boolean(form.value.primary)
            || wasSelected
            || (isNewAddress && addresses.value.length === 0)
        const payload = {
            title: form.value.nickname.trim() || 'Casa',
            recipient_name: form.value.recipientName.trim(),
            zip_code: form.value.cep.trim(),
            state: form.value.state.trim(),
            city: form.value.city.trim(),
            neighborhood: form.value.neighborhood.trim(),
            street: form.value.street.trim(),
            number: form.value.number.trim(),
            complement: form.value.complement.trim() || null,
            reference: form.value.reference.trim() || null,
            is_default: Boolean(form.value.primary),
        }

        if (props.checkoutMode) {
            if (saveAddressPreference.value && !userStore.emailVerified) {
                pendingCheckoutAddress.value = payload
                verificationPurpose.value = 'email'
                showVerificationPrompt.value = true
                return
            }

            completeCheckoutAddress(payload)
            return
        }

        isSaving.value = true

        try {
            const response = isNewAddress
                ? await createAddressRequest(payload)
                : await updateAddressRequest(form.value.id, payload)

            const updatedAddresses = await loadAddresses({ showFormWhenEmpty: false })
            if (!updatedAddresses) {
                view.value = 'list'
                toast.warning('Endereço salvo, mas não foi possível atualizar a lista. Tente novamente.')
                return
            }

            if (shouldSelect) {
                const responseData = response.data?.data?.address
                    || response.data?.data?.data
                    || response.data?.data
                const savedId = responseData?.id || form.value.id
                const savedAddress = updatedAddresses.find(
                    (address) => String(address.id) === String(savedId),
                )
                const fallbackAddress = form.value.primary
                    ? updatedAddresses.find((address) => address.primary)
                    : isNewAddress && updatedAddresses.length === 1
                        ? updatedAddresses[0]
                        : null
                const selectedAddress = savedAddress || fallbackAddress

                if (selectedAddress) setSelectedAddress(selectedAddress, false)
            }

            userStore.updateUser({ addressStorageEnabled: true })
            notifyAddressUpdate()
            showList()
            toast.success(
                isNewAddress ? 'Endereço cadastrado com sucesso!' : 'Endereço atualizado com sucesso!',
                { timeout: 3000 },
            )
        } catch (error) {
            console.error('Não foi possível salvar o endereço.', error)
            toast.error(getErrorMessage(error, 'Não foi possível salvar o endereço.'))
        } finally {
            isSaving.value = false
        }
    }

    const close = () => {
        closeAddressSaveInfo()
        emit('update:modelValue', false)
    }

    const openAddressSaveInfo = (choice) => {
        addressSaveInfoChoice.value = choice
    }

    const closeAddressSaveInfo = () => {
        addressSaveInfoChoice.value = null
    }

    const completeCheckoutAddress = (payload) => {
        const address = {
            ...payload,
            nickname: payload.title,
            recipientName: payload.recipient_name,
            cep: payload.zip_code,
        }

        emit('address-selected', {
            address,
            addressId: null,
            saveToAccount: Boolean(saveAddressPreference.value),
            customerEmail: saveAddressPreference.value ? '' : customerEmail.value.trim(),
        })
        close()
        pendingCheckoutAddress.value = null
    }

    const openSensitiveVerification = () => {
        verificationPurpose.value = 'sensitive'
        showVerificationPrompt.value = true
    }

    const handleVerification = async (data) => {
        refreshSensitiveAccess()

        if (verificationPurpose.value === 'email') {
            if (data) userStore.updateUser(data)
            if (pendingCheckoutAddress.value) {
                completeCheckoutAddress(pendingCheckoutAddress.value)
            }
            return
        }

        if (hasClientSensitiveAccess()) {
            view.value = 'list'
            await loadAddresses()
        }
    }

    const openAddressView = async () => {
        if (props.checkoutMode && !userStore.addressStorageEnabled) {
            addresses.value = []
            showForm()
            return
        }

        refreshSensitiveAccess()
        if (!hasClientSensitiveAccess()) {
            view.value = 'protected'
            addresses.value = []
            selectedId.value = null
            localStorage.removeItem('selectedAddressId')
            return
        }

        view.value = 'list'
        await loadAddresses()
    }

    watch(hasSensitiveAccess, (authorized) => {
        if (authorized || !props.modelValue || view.value !== 'list') return
        addresses.value = []
        selectedId.value = null
        addressToDelete.value = null
        localStorage.removeItem('selectedAddressId')
        view.value = 'protected'
    })

    watch(() => props.modelValue, async (isOpen) => {
        if (!isOpen) {
            showIdentifyModal.value = false
            showVerificationPrompt.value = false
            closeAddressSaveInfo()
            return
        }

        if (!userStore.isLogged) {
            showIdentifyModal.value = true
            return
        }

        await openAddressView()
    }, { immediate: true })

    watch(() => userStore.isLogged, async (isLogged) => {
        if (!isLogged) {
            addresses.value = []
            return
        }

        if (props.modelValue) {
            showIdentifyModal.value = false
            await openAddressView()
        }
    })

    watch(showIdentifyModal, (isOpen, wasOpen) => {
        if (!isOpen && wasOpen && props.modelValue && !userStore.isLogged) {
            close()
        }
    })

    onBeforeUnmount(() => clearTimeout(debounceTimer))
</script>

<style scoped>
.address-save-info-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.55);
}

.address-save-info-dialog {
  width: min(100%, 440px);
}
</style>


<style scoped>
    .badge.text-black{
        font-weight: 600;
        font-size: 0.75rem;
    }
    .modal{
      backdrop-filter: blur(4px);
    }
    .bg-primary{
      background: var(--primary)!important;
    }
    .bg-secondary{
        background: var(--bg-yellow) !important;
    }
    .progress-bar{
      background: var(--primary) !important;
      height: 6rem !important;
    }
    .modal-title{
        font-size: clamp(1rem, 1.125vw, 1.125rem);
    }
    h6, .form-label, .form-check-label{
        font-size: clamp(0.938rem, 1vw, 1rem);
    }
    .modal-header{
        background: var(--bg-ouro);
    }
    .delete-confirmation {
        z-index: 1070;
    }
    .address-card {
        transition: all 0.3s ease;
        cursor: pointer;
    }
    .address-card:hover {
        transform: translateY(-2px);
    }
    .address-card.selected {
        border-color: var(--primary);
        background-color: rgba(13,110,253,.05);
    }
    @media (max-width: 476px) {
      .address-title, .btn.btn-outline-primary.btn-sm{
        font-size: 0.844rem;  
      }
    }
</style>