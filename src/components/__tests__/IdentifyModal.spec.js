import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { clientApi } from '@/services/api'
import { useUserStore } from '@/stores/useUserStore'
import IdentifyModal from '@/components/IdentifyModal.vue'

vi.mock('vue-toastification', () => ({
  useToast: () => ({
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('IdentifyModal', () => {
  let wrapper
  let userStore

  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()

    const pinia = createPinia()
    setActivePinia(pinia)
    userStore = useUserStore()
    wrapper = mount(IdentifyModal, {
      props: { modelValue: true },
      global: { plugins: [pinia] },
    })
  })

  it('sends name and formatted phone, then logs in the returned client', async () => {
    expect(wrapper.find('#client-email').exists()).toBe(false)

    vi.spyOn(clientApi, 'login').mockResolvedValue({
      data: {
        data: {
          token: 'test-token',
          client: {
            id: 7,
            name: 'Maria Silva',
            phone: '(11) 99999-9999',
            email: null,
          },
        },
      },
    })

    await wrapper.find('#client-name').setValue(' Maria Silva ')
    await wrapper.find('#client-phone').setValue('11999999999')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(clientApi.login).toHaveBeenCalledWith({
      name: 'Maria Silva',
      phone: '(11) 99999-9999',
    })
    expect(userStore.isLogged).toBe(true)
    expect(userStore.userId).toBe(7)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('asks for an email only after the API identifies a first-time registration', async () => {
    const loginSpy = vi.spyOn(clientApi, 'login')
      .mockRejectedValueOnce({
        response: {
          status: 422,
          data: { errors: { email: ['Informe um e-mail válido para criar sua conta.'] } },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            token: 'test-token',
            client: {
              id: 8,
              name: 'João Silva',
              phone: '11999999999',
              has_email: true,
              email_verified: false,
            },
          },
        },
      })

    await wrapper.find('#client-name').setValue('João Silva')
    await wrapper.find('#client-phone').setValue('11999999999')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(loginSpy).toHaveBeenNthCalledWith(1, {
      name: 'João Silva',
      phone: '(11) 99999-9999',
    })
    expect(wrapper.find('#client-email').exists()).toBe(true)
    expect(userStore.isLogged).toBe(false)

    await wrapper.find('#client-email').setValue('joao@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(loginSpy).toHaveBeenNthCalledWith(2, {
      name: 'João Silva',
      phone: '(11) 99999-9999',
      email: 'joao@example.com',
    })
    expect(userStore.userId).toBe(8)
  })

  it('shows a friendly message when the API requires an email for registration', async () => {
    vi.spyOn(clientApi, 'login').mockRejectedValue({
      response: { status: 422, data: { errors: { email: ['validation.required'] } } },
    })

    await wrapper.find('#client-name').setValue('João Silva')
    await wrapper.find('#client-phone').setValue('11999999999')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('#client-email').exists()).toBe(true)
    expect(wrapper.find('[role="alert"]').text()).toBe(
      'Informe seu e-mail para concluir o cadastro.',
    )
  })

  it('keeps the modal open and shows the API message when login fails', async () => {
    vi.spyOn(clientApi, 'login').mockRejectedValue({
      response: { data: { message: 'Telefone já associado a outro nome.' } },
    })

    await wrapper.find('#client-name').setValue('Maria Silva')
    await wrapper.find('#client-phone').setValue('11999999999')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(userStore.isLogged).toBe(false)
    expect(wrapper.find('[role="alert"]').text()).toBe('Telefone já associado a outro nome.')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('closes promptly on logout without showing the login loading label', async () => {
    userStore.login({
      id: 7,
      fullName: 'Maria Silva',
      whatsapp: '(11) 99999-9999',
    })

    let finishLogout
    vi.spyOn(userStore, 'logout').mockImplementation(() => {
      userStore.$reset()
      return new Promise((resolve) => {
        finishLogout = resolve
      })
    })

    await wrapper.vm.$nextTick()
    await wrapper.get('.btn-outline-danger').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(wrapper.text()).not.toContain('Entrando...')

    finishLogout()
    await flushPromises()
  })
})
