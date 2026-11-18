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

const formatItemDetails = (item) => {
    const details = item.details || {}
    const lines = []

    if (details.selectedSize?.name) {
        lines.push(`  Tamanho: ${details.selectedSize.name}`)
    }

    for (const [index, group] of (details.options || []).entries()) {
        const key = String(group.id ?? group.title ?? index)
        const selected = details.selectedOptions?.[key]
            ?? (details.selectedOption !== null && details.selectedOption !== undefined
                ? details.selectedOption
                : null)
        const selectedIds = Array.isArray(selected) ? selected : [selected]
        const choices = selectedIds
            .filter((id) => id !== null && id !== undefined)
            .map((id) => group.items?.find((choice) => String(choice.id) === String(id)))
            .filter(Boolean)

        if (choices.length) {
            lines.push(`  ${group.title || 'Opções'}: ${choices.map((choice) => choice.name).join(', ')}`)
        }
    }

    for (const flavor of details.selectedFlavors || []) {
        lines.push(`  Sabor: ${flavor.name}`)
    }

    for (const [itemId, selection] of Object.entries(details.itemSelections || {})) {
        const comboItem = details.comboItems?.find((combo) => String(combo.id) === String(itemId))
        const name = comboItem?.name || itemId
        const selections = Array.isArray(selection) ? selection : [selection]
        const choices = selections.map((entry) => {
            const quantity = entry?.quantity
            const choice = entry?.choice?.name || entry?.selected
            if (!choice) return null
            return quantity ? `${quantity}x ${choice}` : choice
        }).filter(Boolean)

        if (choices.length) {
            lines.push(`  ${name}: ${choices.join(', ')}`)
        }
    }

    const addons = details.isCombo
        ? details.selectedAddons || []
        : (details.aditionals || []).flatMap((group) => (
            (group.items || [])
                .filter((additional) => additional.quantity > 0)
                .map((additional) => additional)
        ))

    for (const addon of addons) {
        if (!addon.quantity || addon.quantity <= 0) continue
        lines.push(`  Adicional: ${addon.quantity}x ${addon.name}`)
    }

    return lines
}

export const formatOrderWhatsAppMessage = (orderData, savedOrder) => {
    const orderNumber = savedOrder?.number || savedOrder?.id
    const lines = [
        `*Novo pedido${orderNumber ? ` #${orderNumber}` : ''}*`,
        `Cliente: ${orderData.customer?.name || 'Não informado'}`,
        '',
        '*Itens:*',
    ]

    for (const item of orderData.items || []) {
        lines.push(`• ${item.quantity}x ${item.name} — ${formatPrice(item.total_price)}`)
        lines.push(...formatItemDetails(item))
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
        '',
        `Entrega: ${deliveryMethod || 'Não informada'}`,
    )
    if (orderData.delivery_details?.timeEstimate) {
        lines.push(`Previsão: ${orderData.delivery_details.timeEstimate}`)
    }
    if (address) lines.push(`Endereço: ${address}`)
    lines.push(
        `Pagamento: ${paymentMethod || 'Não informado'}`,
        `Subtotal: ${formatPrice(orderData.subtotal)}`,
    )
    if (Number(orderData.discount) > 0) {
        lines.push(`Desconto: -${formatPrice(orderData.discount)}`)
    }
    lines.push(`*Total: ${formatPrice(orderData.total)}*`)

    return lines.join('\n')
}

export const createOrderWhatsAppUrl = (whatsapp, message) => {
    let phone = String(whatsapp || '').replace(/\D/g, '')
    if (phone.length === 10 || phone.length === 11) phone = `55${phone}`
    if (!phone) return null

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
