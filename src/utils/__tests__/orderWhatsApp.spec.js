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
        unit_price: 15,
        total_price: 30,
        details: {
          basePrice: 10,
          selectedSize: { name: 'Grande' },
          selectedFlavors: [{ name: 'Calabresa', price: 2 }],
          aditionals: [{ items: [{ name: 'Queijo extra', quantity: 1, price: 3 }] }],
        },
      }],
    }

    const message = formatOrderWhatsAppMessage(orderData, { number: 'PED-123' })

    expect(message).toContain('🍔 *NOVO PEDIDO #PED-123*')
    expect(message).toContain('👤 *Cliente:* Ana')
    expect(message).toContain('🛒 *RESUMO DO PEDIDO*')
    expect(message).toContain('*2x Pizza*')
    expect(message).toContain('• Valor do produto: R$ 20,00')
    expect(message).toContain('• Tamanho: Grande')
    expect(message).toContain('• 2x Sabor: Calabresa: R$ 2,00 cada — R$ 4,00')
    expect(message).toContain('• 2x Queijo extra: R$ 3,00 cada — R$ 6,00')
    expect(message).toContain('*Total do item: R$ 30,00*')
    expect(message).toContain('Endereço: Rua A, 10, Centro, Salvador - BA, 40000-000')
    expect(message).toContain('*TOTAL DO PEDIDO: R$ 28,00*')
    expect(message).toContain('Obrigado pelo pedido! ❤️')
  })

  it('lists combo contents and prices combo choices and extras separately', () => {
    const orderData = {
      customer: { name: 'Wagner Oliveira' },
      delivery_method: 'local',
      delivery_details: { label: 'Consumo no local' },
      payment_method: 'card',
      subtotal: 66.9,
      discount: 0,
      total: 66.9,
      items: [{
        name: 'Combo Hambúrguer',
        quantity: 1,
        unit_price: 66.9,
        total_price: 66.9,
        details: {
          isCombo: true,
          basePrice: 39.9,
          comboItems: [
            { id: 1, name: 'Bebida', quantity: 1 },
            { id: 2, name: 'Batata frita', quantity: 1 },
          ],
          itemSelections: {
            1: { choice: { name: 'Fanta Laranja', price: 0 }, quantity: 1, price: 0 },
            2: { choice: { name: '+500g', price: 10 }, quantity: 1, price: 10 },
          },
          selectedAddons: [
            { name: 'Hashi (par de palitinhos)', quantity: 3, price: 3 },
            { name: 'Molho Especial', quantity: 2, price: 4 },
          ],
        },
      }],
    }

    const message = formatOrderWhatsAppMessage(orderData, { number: 'PED-261118-B0F2QR' })

    expect(message).toContain('🍔 *NOVO PEDIDO #PED-261118-B0F2QR*')
    expect(message).toContain('*1x Combo Hambúrguer*')
    expect(message).toContain('• Valor do produto: R$ 39,90')
    expect(message).toContain('• 1x Fanta Laranja')
    expect(message).toContain('• 1x Batata frita (+500g)')
    expect(message).toContain('• 3x Hashi (par de palitinhos): R$ 3,00 cada — R$ 9,00')
    expect(message).toContain('• 2x Molho Especial: R$ 4,00 cada — R$ 8,00')
    expect(message).toContain('• 1x Batata frita +500g: R$ 10,00 cada — R$ 10,00')
    expect(message).toContain('Produto: R$ 39,90')
    expect(message).toContain('Adicionais: R$ 27,00')
    expect(message).toContain('*Total do item: R$ 66,90*')
    expect(message).toContain('🏠 *Entrega:* Consumo no local')
    expect(message).toContain('💳 *Pagamento:* Cartão de crédito/débito')
  })

  it('creates a WhatsApp link and reports when the contact has no valid number', () => {
    expect(createOrderWhatsAppUrl('(71) 99999-1234', 'Pedido confirmado'))
      .toBe('https://wa.me/5571999991234?text=Pedido%20confirmado')
    expect(createOrderWhatsAppUrl('', 'Pedido confirmado')).toBeNull()
  })
})
