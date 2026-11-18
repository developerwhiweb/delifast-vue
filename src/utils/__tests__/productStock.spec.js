import { describe, expect, it } from 'vitest'
import { validateCartStock } from '../productStock'

describe('validateCartStock', () => {
  it('rejects a cart item when the latest stock is zero', () => {
    expect(() => validateCartStock(
      [{ id: 4, name: 'Açaí no copo', quantity: 1 }],
      [{
        id: 4,
        name: 'Açaí no copo',
        stock: { control: true, available: false, quantity: 0 },
      }],
    )).toThrow('Açaí no copo está esgotado.')
  })

  it('sums differently customized lines before validating available stock', () => {
    const items = [
      { id: 'small', productId: 4, name: 'Açaí no copo', quantity: 1 },
      { id: 'large', productId: 4, name: 'Açaí no copo', quantity: 1 },
    ]
    const products = [{
      id: 4,
      name: 'Açaí no copo',
      stock: { control: true, available: true, quantity: 1 },
    }]

    expect(() => validateCartStock(items, products))
      .toThrow('Estoque insuficiente para Açaí no copo. Disponível: 1.')
  })

  it('allows an in-stock controlled product and an uncontrolled product', () => {
    expect(validateCartStock(
      [
        { id: 4, name: 'Açaí no copo', quantity: 1 },
        { id: 5, name: 'Água', quantity: 3 },
      ],
      [
        { id: 4, name: 'Açaí no copo', stock: { control: true, available: true, quantity: 1 } },
        { id: 5, name: 'Água', stock: { control: false, available: true } },
      ],
    )).toBe(true)
  })
})
