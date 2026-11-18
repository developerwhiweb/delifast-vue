import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import DesktopCartSummary from '../DesktopCartSummary.vue'
import { useCartStore } from '@/stores/useCartStore'

let wrapper
let cart

beforeEach(() => {
  setActivePinia(createPinia())
  cart = useCartStore()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('DesktopCartSummary', () => {
  it('stays hidden while the cart is empty', () => {
    wrapper = mount(DesktopCartSummary)

    expect(wrapper.find('aside').exists()).toBe(false)
  })

  it('shows the product quantity and purchase total', () => {
    cart.items = [{
      id: 'item-1',
      name: 'Combo',
      quantity: 2,
      isCombo: false,
      price: 18.5,
      basePrice: 18.5,
      options: [],
      aditionals: [],
    }]
    wrapper = mount(DesktopCartSummary)

    expect(wrapper.text()).toContain('2 produtos')
    expect(wrapper.text().replace(/\s+/g, ' ')).toContain('R$ 37,00')
    expect(wrapper.get('button').attributes('data-bs-target')).toBe('#cartCanvas')
  })
})
