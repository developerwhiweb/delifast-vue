import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ClientVerificationPrompt from '@/components/ClientVerificationPrompt.vue'

const api = vi.hoisted(() => ({
  clientApi: {
    getEmailVerificationDestination: vi.fn(),
    requestSensitiveAccess: vi.fn(),
    confirmSensitiveAccess: vi.fn(),
    requestEmailVerification: vi.fn(),
    confirmEmailVerification: vi.fn(),
  },
}))

vi.mock('@/services/api', () => api)

describe('ClientVerificationPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('shows the masked destination email inside the verification card', async () => {
    api.clientApi.getEmailVerificationDestination.mockResolvedValue({
      data: {
        data: {
          masked_email: 'jo*******@e******.com',
        },
      },
    })

    const wrapper = mount(ClientVerificationPrompt, {
      props: {
        modelValue: true,
        purpose: 'sensitive',
      },
    })
    await flushPromises()

    expect(wrapper.find('.verification-card').text()).toContain(
      'Enviaremos o código de confirmação para',
    )
    expect(wrapper.find('.verification-card').text()).toContain(
      'jo*******@e******.com',
    )
  })

  it('asks for a new email when changing the account email', () => {
    const wrapper = mount(ClientVerificationPrompt, {
      props: {
        modelValue: true,
        purpose: 'email-change',
      },
    })

    expect(wrapper.find('.verification-card').text()).toContain(
      'Digite o novo e-mail que deseja cadastrar.',
    )
  })
})
