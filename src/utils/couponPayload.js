const selectionChoiceIds = (selection) => {
  const selections = Array.isArray(selection) ? selection : [selection]

  return selections
    .map((choice) => {
      if (!choice || typeof choice !== 'object') return choice
      return choice.id ?? choice.choice_id ?? choice.name ?? choice.value
    })
    .filter((choice) => choice !== undefined && choice !== null)
}

export const buildCouponValidationItem = (item) => {
  const rawProductId = item.productId ?? item.originalProductId ?? item.id
  const productId = Number(rawProductId)
  const groups = item.options || []
  const selectedOptions = {}
  let hasUnmappedOption = false

  for (const [key, selection] of Object.entries(item.selectedOptions || {})) {
    const group = groups.find((option, index) => (
      [option.id, option.title, index]
        .some((value) => value !== undefined && value !== null && String(value) === String(key))
    )) ?? groups.find((option) => {
      const selectedIds = selectionChoiceIds(selection)
      return selectedIds.length > 0 && selectedIds.every((selectedId) => (
        option.items?.some((choice) => String(choice.id) === String(selectedId))
      ))
    })

    if (!group) {
      hasUnmappedOption = true
      continue
    }

    const groupIndex = groups.indexOf(group)
    selectedOptions[String(group.id ?? group.title ?? groupIndex)] = selection
  }

  if (
    Object.keys(selectedOptions).length === 0
    && item.selectedOption !== null
    && item.selectedOption !== undefined
  ) {
    const group = groups.find((option) => (
      option.items?.some((choice) => String(choice.id) === String(item.selectedOption))
    ))

    if (group) {
      const groupIndex = groups.indexOf(group)
      selectedOptions[String(group.id ?? group.title ?? groupIndex)] = item.selectedOption
    } else {
      hasUnmappedOption = true
    }
  }

  return {
    product_id: Number.isSafeInteger(productId) && productId > 0
      ? productId
      : rawProductId,
    quantity: Number(item.quantity),
    selected_options: selectedOptions,
    ...(item.selectedSize?.id !== undefined
      ? { selected_size_id: item.selectedSize.id }
      : {}),
    ...(item.selectedSize?.name
      ? { selected_size_name: item.selectedSize.name }
      : {}),
    hasUnmappedOption,
  }
}
