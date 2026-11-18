import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CashChangeModal from '@/components/CashChangeModal.vue'

describe('CashChangeModal', () => {
  it('requires an amount greater than the order total when change is needed', async () => {
    const wrapper = mount(CashChangeModal, {
      props: { modelValue: true, total: 25 },
    })

    await wrapper.findAll('input[type="radio"]')[1].setValue()
    const confirmButton = wrapper.find('.modal-footer .btn-primary')
    expect(confirmButton.attributes('disabled')).toBeDefined()

    await wrapper.find('#cash-change-amount').setValue('2500')
    expect(confirmButton.attributes('disabled')).toBeDefined()

    await wrapper.find('#cash-change-amount').setValue('5000')
    expect(wrapper.find('#cash-change-amount').element.value).toBe('50,00')
    expect(confirmButton.attributes('disabled')).toBeUndefined()
    await confirmButton.trigger('click')

    expect(wrapper.emitted('change-confirmed')).toEqual([[
      { needsChange: true, amount: 50 },
    ]])
  })

  it('confirms when no change is needed', async () => {
    const wrapper = mount(CashChangeModal, {
      props: { modelValue: true, total: 25 },
    })

    await wrapper.findAll('input[type="radio"]')[0].setValue()
    await wrapper.find('.modal-footer .btn-primary').trigger('click')

    expect(wrapper.emitted('change-confirmed')).toEqual([[
      { needsChange: false, amount: null },
    ]])
  })
})
