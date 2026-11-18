import { describe, expect, it } from 'vitest'
import { createOrderWhatsAppUrl, formatOrderWhatsAppMessage } from '../orderWhatsApp'

describe('order WhatsApp message', () => {
  it('formats the saved order with product customizations and delivery details', () => {
    const orderData = {
      customer: { name: 'Ana' },
      delivery_method: 'delivery',
      delivery_details: { label: 'Entrega', timeEstimate: '40 minutos' },
      delivery_address: {
        street: 'Rua A',
        number: '10',
        neighborhood: 'Centro',
        city: 'Salvador',
        state: 'BA',
        cep: '40000-000',
      },
      payment_method: 'pix',
      subtotal: 30,
      discount: 2,
      total: 28,
      items: [{
        name: 'Pizza',
        quantity: 2,
        total_price: 30,
        details: {
          selectedSize: { name: 'Grande' },
          selectedFlavors: [{ name: 'Calabresa' }],
          aditionals: [{ items: [{ name: 'Queijo extra', quantity: 1 }] }],
        },
      }],
    }

    const message = formatOrderWhatsAppMessage(orderData, { number: 'PED-123' })

    expect(message).toContain('*Novo pedido #PED-123*')
    expect(message).toContain('• 2x Pizza — R$ 30,00')
    expect(message).toContain('Tamanho: Grande')
    expect(message).toContain('Sabor: Calabresa')
    expect(message).toContain('Adicional: 1x Queijo extra')
    expect(message).toContain('Endereço: Rua A, 10, Centro, Salvador - BA, 40000-000')
    expect(message).toContain('*Total: R$ 28,00*')
  })

  it('creates a WhatsApp link and reports when the contact has no valid number', () => {
    expect(createOrderWhatsAppUrl('(71) 99999-1234', 'Pedido confirmado'))
      .toBe('https://wa.me/5571999991234?text=Pedido%20confirmado')
    expect(createOrderWhatsAppUrl('', 'Pedido confirmado')).toBeNull()
  })
})
