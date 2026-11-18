const formatPrice = (value) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
}).format(Number(value) || 0)

const formatAddress = (address) => {
    if (!address) return ''

    return [
        address.street,
        address.number,
        address.complement,
        address.neighborhood,
        address.city && address.state ? `${address.city} - ${address.state}` : address.city || address.state,
        address.cep || address.zip_code,
    ].filter(Boolean).join(', ')
}

const getComboComponentLabel = (comboItem, choiceName) => {
    const itemName = comboItem?.name?.trim()
    if (
        !itemName
        || /bebida|escolha|opção|opcao|sabor|item do combo/i.test(itemName)
        || choiceName.toLowerCase().includes(itemName.toLowerCase())
    ) {
        return choiceName
    }

    return `${itemName} (${choiceName})`
}

const getItemBreakdown = (item) => {
    const details = item.details || {}
    const quantity = Number(item.quantity) || 1
    const additions = []
    const componentLines = []
    const detailLines = []
    const addAddition = (label, count, price) => {
        const additionQuantity = Number(count) || 1
        const unitPrice = Number(price) || 0
        additions.push({
            label,
            quantity: additionQuantity * quantity,
            unitPrice,
            total: unitPrice * additionQuantity,
        })
    }
    const addComponent = (label, count = 1) => {
        componentLines.push({
            label,
            quantity: (Number(count) || 1) * quantity,
        })
    }

    if (details.selectedSize?.name) {
        detailLines.push(`Tamanho: ${details.selectedSize.name}`)
    }

    for (const [index, group] of (details.options || []).entries()) {
        const key = String(group.id ?? group.title ?? index)
        const selected = details.selectedOptions?.[key]
            ?? (details.selectedOption !== null && details.selectedOption !== undefined
                && Object.keys(details.selectedOptions || {}).length === 0
                ? details.selectedOption
                : null)
        const selectedIds = Array.isArray(selected) ? selected : [selected]
        const choices = selectedIds
            .filter((id) => id !== null && id !== undefined)
            .map((id) => group.items?.find((choice) => String(choice.id) === String(id)))
            .filter(Boolean)

        for (const choice of choices) {
            if (group.isSizeOption || group.priceMode === 'replace') {
                if (!details.selectedSize || details.selectedSize.name !== choice.name) {
                    detailLines.push(`${group.title || 'Opção'}: ${choice.name}`)
                }
            } else if (Number(choice.price) > 0) {
                addAddition(`${group.title ? `${group.title}: ` : ''}${choice.name}`, 1, choice.price)
            } else {
                detailLines.push(`${group.title || 'Opção'}: ${choice.name}`)
            }
        }
    }

    for (const flavor of details.selectedFlavors || []) {
        if (Number(flavor.price) > 0) {
            addAddition(`Sabor: ${flavor.name}`, 1, flavor.price)
        } else {
            detailLines.push(`Sabor: ${flavor.name}`)
        }
    }

    if (details.isCombo) {
        for (const addon of details.selectedAddons || []) {
            if (addon.quantity > 0) {
                addAddition(addon.name, addon.quantity, addon.price)
            }
        }

        const itemSelections = details.itemSelections || {}
        const matchedSelectionIds = new Set()
        for (const comboItem of details.comboItems || []) {
            const itemId = String(comboItem.id)
            const selection = itemSelections[itemId]
            const selections = Array.isArray(selection) ? selection : selection ? [selection] : []
            if (selection !== undefined) matchedSelectionIds.add(itemId)

            if (!selections.length) {
                addComponent(comboItem.name, comboItem.quantity)
                continue
            }

            for (const entry of selections) {
                const choice = entry?.choice
                const choiceName = choice?.name || entry?.selected
                if (!choiceName) continue

                const choiceQuantity = (Number(comboItem.quantity) || 1)
                    * (Number(entry?.quantity) || 1)
                addComponent(getComboComponentLabel(comboItem, choiceName), choiceQuantity)

                const choicePrice = choice?.price ?? (
                    Number(entry?.price) / (Number(entry?.quantity) || 1) || 0
                )
                if (Number(choicePrice) > 0) {
                    const label = choiceName.toLowerCase().includes(comboItem.name?.toLowerCase() || '')
                        ? choiceName
                        : `${comboItem.name} ${choiceName}`
                    addAddition(label, choiceQuantity, choicePrice)
                }
            }
        }

        for (const [itemId, selection] of Object.entries(itemSelections)) {
            if (matchedSelectionIds.has(String(itemId))) continue
            const selections = Array.isArray(selection) ? selection : [selection]
            for (const entry of selections) {
                const choiceName = entry?.choice?.name || entry?.selected
                if (!choiceName) continue
                const choiceQuantity = Number(entry?.quantity) || 1
                addComponent(choiceName, choiceQuantity)
                const choicePrice = entry?.choice?.price ?? (
                    Number(entry?.price) / choiceQuantity || 0
                )
                if (Number(choicePrice) > 0) {
                    addAddition(choiceName, choiceQuantity, choicePrice)
                }
            }
        }
    }

    if (!details.isCombo) {
        for (const group of details.aditionals || []) {
            for (const addon of group.items || []) {
                if (addon.quantity > 0) {
                    addAddition(addon.name, addon.quantity, addon.price)
                }
            }
        }
    }

    const unitPrice = Number(
        item.unit_price
        ?? item.price
        ?? details.finalPrice
        ?? details.price
        ?? details.basePrice
        ?? 0,
    )
    const additionsTotal = additions.reduce((total, addition) => total + addition.total, 0)
    const basePrice = Math.max(0, Number((unitPrice - additionsTotal).toFixed(2)))
    const lineTotal = Number(item.total_price ?? (unitPrice * quantity))

    return {
        quantity,
        basePrice,
        lineTotal,
        additions,
        componentLines,
        detailLines,
        additionsTotal: additionsTotal * quantity,
        productTotal: basePrice * quantity,
    }
}

export const formatOrderWhatsAppMessage = (orderData, savedOrder) => {
    const orderNumber = savedOrder?.number || savedOrder?.id
    const lines = [
        `🍔 *NOVO PEDIDO${orderNumber ? ` #${orderNumber}` : ''}*`,
        '',
        `👤 *Cliente:* ${orderData.customer?.name || 'Não informado'}`,
        '',
        '━━━━━━━━━━━━━━━━━━',
        '🛒 *RESUMO DO PEDIDO*',
        '━━━━━━━━━━━━━━━━━━',
    ]

    for (const item of orderData.items || []) {
        const breakdown = getItemBreakdown(item)

        lines.push(
            '',
            `*${breakdown.quantity}x ${item.name}*`,
            `• Valor do produto: ${formatPrice(breakdown.productTotal)}`,
        )

        for (const component of breakdown.componentLines) {
            lines.push(`  • ${component.quantity}x ${component.label}`)
        }
        for (const detail of breakdown.detailLines) {
            lines.push(`  • ${detail}`)
        }

        if (breakdown.additions.length) {
            lines.push('', '*Opções e adicionais:*')
            for (const addition of breakdown.additions) {
                const lineAmount = addition.total * breakdown.quantity
                lines.push(
                    `• ${addition.quantity}x ${addition.label}: ${formatPrice(addition.unitPrice)} cada — ${formatPrice(lineAmount)}`,
                )
            }
        }

        lines.push(
            '',
            '━━━━━━━━━━━━━━━━━━',
            '💰 *VALORES*',
            '━━━━━━━━━━━━━━━━━━',
            `Produto: ${formatPrice(breakdown.productTotal)}`,
            `Adicionais: ${formatPrice(breakdown.additionsTotal)}`,
        )
        const itemDiscount = Number((
            breakdown.lineTotal - breakdown.productTotal - breakdown.additionsTotal
        ).toFixed(2))
        if (itemDiscount !== 0) {
            lines.push(`Desconto/ajuste: ${formatPrice(itemDiscount)}`)
        }
        lines.push(`*Total do item: ${formatPrice(breakdown.lineTotal)}*`)
    }

    const deliveryMethod = orderData.delivery_details?.label
        || ({ delivery: 'Entrega', pickup: 'Retirada', local: 'Consumo no local' }[orderData.delivery_method])
        || orderData.delivery_method
    const address = formatAddress(orderData.delivery_address)
    const paymentMethod = ({
        card: 'Cartão de crédito/débito',
        pix: 'PIX',
        cash: 'Dinheiro',
    }[orderData.payment_method] || orderData.payment_method)

    lines.push(
        '━━━━━━━━━━━━━━━━━━',
        '',
    )
    const couponDiscount = Number(orderData.coupon?.discount) || 0
    if (orderData.coupon?.code) {
        lines.push(`Cupom *${orderData.coupon.code}:* -${formatPrice(couponDiscount)}`)
        const otherDiscounts = Math.max(0, Number((Number(orderData.discount) - couponDiscount).toFixed(2)))
        if (otherDiscounts > 0) {
            lines.push(`Outros descontos: -${formatPrice(otherDiscounts)}`)
        }
    } else if (Number(orderData.discount) > 0) {
        lines.push(`Desconto do pedido: -${formatPrice(orderData.discount)}`)
    }
    lines.push(
        `*TOTAL DO PEDIDO: ${formatPrice(orderData.total)}*`,
        '━━━━━━━━━━━━━━━━━━',
        '',
        `🏠 *Entrega:* ${deliveryMethod || 'Não informada'}`,
    )
    if (orderData.delivery_details?.timeEstimate) {
        lines.push(`Previsão: ${orderData.delivery_details.timeEstimate}`)
    }
    if (address) lines.push(`Endereço: ${address}`)
    lines.push(
        `💳 *Pagamento:* ${paymentMethod || 'Não informado'}`,
    )
    if (orderData.payment_method === 'cash') {
        const cashChange = orderData.cash_change
        if (cashChange?.needsChange) {
            const changeToReturn = Number(cashChange.amount) - Number(orderData.total)
            lines.push(
                `💵 *Troco para:* ${formatPrice(cashChange.amount)}`,
                `Troco a devolver: ${formatPrice(changeToReturn)}`,
            )
        } else {
            lines.push('💵 *Troco:* Não precisa de troco')
        }
    }
    lines.push('', 'Obrigado pelo pedido! ❤️')

    return lines.join('\n')
}

export const createOrderWhatsAppUrl = (whatsapp, message) => {
    let phone = String(whatsapp || '').replace(/\D/g, '')
    if (phone.length === 10 || phone.length === 11) phone = `55${phone}`
    if (!phone) return null

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
