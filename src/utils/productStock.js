import { getProducts } from '@/services/api'
import { normalizeProduct } from '@/services/products'

export const refreshProductStocks = async (cart, requestedProductId = null) => {
  const apiProducts = await getProducts()
  const products = apiProducts.map((product) => normalizeProduct(product))

  cart.syncProductStock(products)

  const requestedProduct = requestedProductId === null
    ? null
    : products.find((product) => String(product.id) === String(requestedProductId))

  if (requestedProductId !== null && !requestedProduct) {
    cart.setProductStock(requestedProductId, {
      control: true,
      available: false,
      quantity: 0,
    })
  }

  if (typeof window !== 'undefined' && Array.isArray(window.products)) {
    const productsById = new Map(products.map((product) => [String(product.id), product]))

    for (const product of window.products) {
      const latestProduct = productsById.get(String(product.id))
      if (latestProduct) {
        product.stock = latestProduct.stock
      } else if (requestedProductId !== null
        && String(product.id) === String(requestedProductId)) {
        product.stock = { control: true, available: false, quantity: 0 }
      }
    }
  }

  return products
}

export const validateCartStock = (items, products) => {
  const productsById = new Map(products.map((product) => [String(product.id), product]))
  const quantitiesById = new Map()
  const itemById = new Map()

  for (const item of items) {
    const productId = item.productId ?? item.originalProductId ?? item.id
    const key = String(productId)
    const quantity = Number(item.quantity)
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new Error(`${item.name ?? 'Um produto'} tem uma quantidade inválida no carrinho.`)
    }

    quantitiesById.set(key, (quantitiesById.get(key) ?? 0) + quantity)
    itemById.set(key, item)
  }

  for (const [productId, quantity] of quantitiesById) {
    const product = productsById.get(productId)
    if (!product) {
      const item = itemById.get(productId)
      throw new Error(`${item?.name ?? 'Um produto'} não está mais disponível.`)
    }

    if (product.stock?.control && quantity > product.stock.quantity) {
      const stockQuantity = product.stock.quantity
      const message = stockQuantity === 0
        ? `${product.name} está esgotado.`
        : `Estoque insuficiente para ${product.name}. Disponível: ${stockQuantity}.`

      throw new Error(`${message} Ajuste a quantidade no carrinho para continuar.`)
    }

    if (product.stock?.available === false) {
      throw new Error(`${product.name} não está mais disponível.`)
    }
  }

  return true
}
