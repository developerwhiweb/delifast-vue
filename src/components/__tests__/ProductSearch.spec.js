import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import ProductSearch from '../ProductSearch.vue'

const products = [
  {
    id: 1,
    name: 'Açaí no copo',
    description: 'Açaí, banana e granola',
    category: 'acai',
    price: 10,
    featured: true,
    stock: { available: true },
  },
  {
    id: 2,
    name: 'Pizza Calabresa',
    description: 'Molho, calabresa e queijo',
    category: 'pizza',
    price: 45,
    featured: false,
    stock: { available: true },
  },
  {
    id: 3,
    name: 'Pizza indisponível',
    description: '',
    category: 'pizza',
    price: 30,
    featured: false,
    stock: { available: false },
  },
]

let wrapper

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('ProductSearch', () => {
  it('suggests backend products and matches without diacritics', async () => {
    wrapper = mount(ProductSearch, { props: { products } })

    const input = wrapper.get('input')
    await input.trigger('focus')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(2)

    await input.setValue('acai')
    const results = wrapper.findAll('[role="option"]')

    expect(results).toHaveLength(1)
    expect(results[0].text()).toContain('Açaí no copo')
  })

  it('emits the selected product and closes the mobile search', async () => {
    wrapper = mount(ProductSearch, {
      props: {
        products,
        mode: 'mobile',
        modelValue: true,
      },
    })

    await wrapper.get('input').setValue('pizza')
    await wrapper.get('[role="option"]').trigger('click')

    expect(wrapper.emitted('select')[0][0].id).toBe(2)
    expect(wrapper.emitted('update:modelValue')[0][0]).toBe(false)
  })
})
