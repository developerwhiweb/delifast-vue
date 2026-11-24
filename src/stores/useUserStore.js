// stores/useUserStore.js
import { defineStore } from 'pinia'
import { clientApi, clearClientToken, getClientToken } from '@/services/api'

export const useUserStore = defineStore('user', {
  state: () => ({
    id: null,           // ID único do usuário
    fullName: '',       // Nome completo
    whatsapp: '',       // WhatsApp para contato
    pathImage: '',
    hasEmail: false,
    emailVerified: false,
    addressStorageEnabled: false,
    hasSavedAddress: false,
    canBindEmail: false,
    isLogged: false     // Status de login
  }),

  getters: {
    // Getter para o ID (consistência)
    userId: (state) => state.id,
    
    // Informações completas do usuário
    userInfo: (state) => ({
      id: state.id,
      fullName: state.fullName,
      whatsapp: state.whatsapp,
      pathImage: state.pathImage,
      hasEmail: state.hasEmail,
      emailVerified: state.emailVerified,
      addressStorageEnabled: state.addressStorageEnabled,
      hasSavedAddress: state.hasSavedAddress,
    }),
    
    // Nome de exibição (primeiro nome)
    displayName: (state) => {
      if (!state.fullName) return 'Usuário'
      return state.fullName.split(' ')[0]
    }
  },

  actions: {
    // Login do usuário
    login(userData) {
      // Garantir que tenha um ID (se não veio, gerar temporário)
      this.id = userData.id || Date.now()
      this.fullName = userData.fullName || ''
      this.whatsapp = userData.whatsapp || ''
      this.pathImage = userData.pathImage || userData.path_image || ''
      this.hasEmail = Boolean(userData.hasEmail ?? userData.has_email)
      this.emailVerified = Boolean(userData.emailVerified ?? userData.email_verified)
      this.addressStorageEnabled = Boolean(
        userData.addressStorageEnabled ?? userData.address_storage_enabled,
      )
      this.hasSavedAddress = Boolean(
        userData.hasSavedAddress
          ?? userData.has_saved_address
          ?? this.addressStorageEnabled,
      )
      this.canBindEmail = Boolean(userData.canBindEmail ?? userData.can_bind_email)
      this.isLogged = true
      
      // Salvar no localStorage para persistência
      this.saveToStorage()
      
    },

    // Atualizar dados do usuário
    updateUser(userData) {
      if (Object.prototype.hasOwnProperty.call(userData, 'id')) this.id = userData.id
      if (Object.prototype.hasOwnProperty.call(userData, 'fullName')) this.fullName = userData.fullName || ''
      if (Object.prototype.hasOwnProperty.call(userData, 'whatsapp')) this.whatsapp = userData.whatsapp || ''
      if (Object.prototype.hasOwnProperty.call(userData, 'pathImage')) this.pathImage = userData.pathImage || ''
      if (Object.prototype.hasOwnProperty.call(userData, 'path_image')) this.pathImage = userData.path_image || ''
      if (Object.prototype.hasOwnProperty.call(userData, 'hasEmail')) {
        this.hasEmail = Boolean(userData.hasEmail)
      }
      if (Object.prototype.hasOwnProperty.call(userData, 'has_email')) {
        this.hasEmail = Boolean(userData.has_email)
      }
      if (Object.prototype.hasOwnProperty.call(userData, 'emailVerified')) {
        this.emailVerified = Boolean(userData.emailVerified)
      }
      if (Object.prototype.hasOwnProperty.call(userData, 'email_verified')) {
        this.emailVerified = Boolean(userData.email_verified)
      }
      if (Object.prototype.hasOwnProperty.call(userData, 'addressStorageEnabled')) {
        this.addressStorageEnabled = Boolean(userData.addressStorageEnabled)
      }
      if (Object.prototype.hasOwnProperty.call(userData, 'address_storage_enabled')) {
        this.addressStorageEnabled = Boolean(userData.address_storage_enabled)
      }
      if (Object.prototype.hasOwnProperty.call(userData, 'hasSavedAddress')) {
        this.hasSavedAddress = Boolean(userData.hasSavedAddress)
      }
      if (Object.prototype.hasOwnProperty.call(userData, 'has_saved_address')) {
        this.hasSavedAddress = Boolean(userData.has_saved_address)
      }
      if (Object.prototype.hasOwnProperty.call(userData, 'canBindEmail')) {
        this.canBindEmail = Boolean(userData.canBindEmail)
      }
      if (Object.prototype.hasOwnProperty.call(userData, 'can_bind_email')) {
        this.canBindEmail = Boolean(userData.can_bind_email)
      }
      
      this.saveToStorage()
    },

    // Logout
    logout() {
      const logoutRequest = getClientToken()
        ? clientApi.logout().catch((error) => {
            console.error('Erro ao encerrar sessão na API:', error)
            return null
          })
        : Promise.resolve(null)

      this.id = null
      this.fullName = ''
      this.whatsapp = ''
      this.pathImage = ''
      this.hasEmail = false
      this.emailVerified = false
      this.addressStorageEnabled = false
      this.hasSavedAddress = false
      this.canBindEmail = false
      this.isLogged = false
      clearClientToken()
      
      // Remover do localStorage
      localStorage.removeItem('userData')
      return logoutRequest
    },

    // Salvar no localStorage
    saveToStorage() {
      localStorage.setItem('userData', JSON.stringify({
        id: this.id,
        fullName: this.fullName,
        whatsapp: this.whatsapp,
        pathImage: this.pathImage,
        hasEmail: this.hasEmail,
        emailVerified: this.emailVerified,
        addressStorageEnabled: this.addressStorageEnabled,
        hasSavedAddress: this.hasSavedAddress,
        canBindEmail: this.canBindEmail,
      }))
    },

    // Carregar do localStorage ao iniciar
    loadUserFromStorage() {
      const saved = localStorage.getItem('userData')
      if (!getClientToken()) {
        if (saved || this.isLogged) this.logout()
        return
      }

      if (saved) {
        try {
          const data = JSON.parse(saved)
          this.id = data.id
          this.fullName = data.fullName || ''
          this.whatsapp = data.whatsapp || ''
          this.pathImage = data.pathImage || data.path_image || ''
          this.hasEmail = Boolean(data.hasEmail ?? data.has_email)
          this.emailVerified = Boolean(data.emailVerified ?? data.email_verified)
          this.addressStorageEnabled = Boolean(
            data.addressStorageEnabled ?? data.address_storage_enabled,
          )
          this.hasSavedAddress = Boolean(
            data.hasSavedAddress
              ?? data.has_saved_address
              ?? this.addressStorageEnabled,
          )
          this.canBindEmail = Boolean(data.canBindEmail ?? data.can_bind_email)
          this.isLogged = true
          this.saveToStorage()
        } catch (error) {
          console.error('Erro ao carregar usuário:', error)
          this.logout()
        }
      }
    },

    // Método para sincronizar com backend (quando estiver pronto)
    async syncWithBackend() {
      if (!this.id) return null
      
      try {
        // Exemplo de chamada para o backend
        // const response = await fetch(`/api/users/${this.id}`)
        // const userData = await response.json()
        // this.updateUser(userData)
        // return userData
        
        return null
      } catch (error) {
        console.error('Erro ao sincronizar com backend:', error)
        return null
      }
    }
  },

  // Configuração de persistência
  persist: {
    key: 'user',
    storage: localStorage,
    paths: [
      'id',
      'fullName',
      'whatsapp',
      'pathImage',
      'hasEmail',
      'emailVerified',
      'addressStorageEnabled',
      'hasSavedAddress',
      'canBindEmail',
      'isLogged',
    ]
  }
})