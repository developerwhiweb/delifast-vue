import { describe, expect, it } from 'vitest'
import { buildCouponValidationItem } from '../couponPayload'

describe('buildCouponValidationItem', () => {
  const item = {
    id: 'cart-item-1',
    productId: 7,
    quantity: 1,
    options: [{
      id: 42,
      title: 'Tamanhos',
      items: [{ id: 'size-700', name: '700ml' }],
    }],
  }

  it('converts an old option index key to the product option ID', () => {
    expect(buildCouponValidationItem({
      ...item,
      selectedOptions: { 0: 'size-700' },
    })).toMatchObject({
      product_id: 7,
      selected_options: { 42: 'size-700' },
      hasUnmappedOption: false,
    })
  })

  it('recovers a persisted selection using its choice ID when the old key is unknown', () => {
    expect(buildCouponValidationItem({
      ...item,
      selectedOptions: { sizes: 'size-700' },
    })).toMatchObject({
      selected_options: { 42: 'size-700' },
      hasUnmappedOption: false,
    })
  })
})
