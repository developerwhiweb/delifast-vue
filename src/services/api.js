import axios from 'axios'

const apiBaseUrl = (() => {
    const configuredUrl = import.meta.env.VITE_API_BASE_URL
    if (configuredUrl) {
        return new URL(configuredUrl).href.replace(/\/$/, '')
    }

    const url = new URL(window.location.origin)

    if (import.meta.env.DEV) {
        url.port = '8000'
    }

    url.pathname = '/api'
    return url.href.replace(/\/$/, '')
})()

const appearanceCacheKey = `delifast:appearance:${apiBaseUrl}/appearance`
const clientTokenKey = 'clientToken'
let clientSensitiveToken = null
let clientSensitiveTokenExpiresAt = 0

const normalizeAppearance = (response) => {
    const data = response?.data?.appearance || response?.data || response
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('A resposta de /appearance não contém os dados do tenant.')
    }

    return {
        name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : null,
        logo: typeof data.logo === 'string' && data.logo.trim() ? data.logo.trim() : null,
        colors: data.colors && typeof data.colors === 'object' && !Array.isArray(data.colors)
            ? data.colors
            : {},
    }
}

export const getCachedAppearance = () => {
    if (typeof localStorage === 'undefined') return null

    try {
        const cached = localStorage.getItem(appearanceCacheKey)
        if (!cached) return null

        const appearance = normalizeAppearance(JSON.parse(cached))
        return appearance.name || appearance.logo || Object.keys(appearance.colors).length
            ? appearance
            : null
    } catch (error) {
        console.warn('Não foi possível ler a aparência em cache.', error)
        return null
    }
}

export const getClientToken = () => (
    typeof localStorage === 'undefined' ? null : localStorage.getItem(clientTokenKey)
)

export const clearClientToken = () => {
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(clientTokenKey)
    }
    clearClientSensitiveAccess()
}

export const setClientSensitiveAccess = (token, expiresAt) => {
    clientSensitiveToken = token
    clientSensitiveTokenExpiresAt = Date.parse(expiresAt) || 0
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('client-sensitive-access-changed'))
    }
}

export const clearClientSensitiveAccess = () => {
    const hadToken = Boolean(clientSensitiveToken)
    clientSensitiveToken = null
    clientSensitiveTokenExpiresAt = 0
    if (hadToken && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('client-sensitive-access-changed'))
    }
}

export const hasClientSensitiveAccess = () => {
    if (clientSensitiveToken && clientSensitiveTokenExpiresAt > Date.now()) return true
    clearClientSensitiveAccess()
    return false
}

export const getClientSensitiveAccessExpiresAt = () => clientSensitiveTokenExpiresAt

export const api = axios.create({
    baseURL: apiBaseUrl,
})

api.interceptors.request.use((config) => {
    const token = getClientToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    if (hasClientSensitiveAccess()) {
        config.headers['X-Client-Verification'] = clientSensitiveToken
    } else {
        clearClientSensitiveAccess()
    }
    return config
})

api.interceptors.response.use(undefined, (error) => {
    if (
        error.response?.status === 403
        && error.response?.data?.code === 'client_verification_required'
    ) {
        clearClientSensitiveAccess()
    }

    return Promise.reject(error)
})

const clientEndpoint = '/client'

export const clientApi = {
    login: async (credentials) => {
        clearClientSensitiveAccess()
        const response = await api.post(`${clientEndpoint}/login`, credentials)
        const { token, client } = response.data?.data || {}

        if (!token || !client?.id) {
            throw new Error('A resposta do login não contém um token e os dados do cliente.')
        }

        localStorage.setItem(clientTokenKey, token)
        return response
    },
    me: {
        get: () => api.get(`${clientEndpoint}/me`),
        put: (data) => api.put(`${clientEndpoint}/me`, data),
        patch: (data) => {
            if (typeof FormData !== 'undefined' && data instanceof FormData) {
                // Laravel/PHP parses multipart form fields reliably through POST with method spoofing.
                data.set('_method', 'PATCH')
                return api.post(`${clientEndpoint}/me`, data)
            }

            return api.patch(`${clientEndpoint}/me`, data)
        },
        delete: () => api.delete(`${clientEndpoint}/me`),
    },
    logout: () => {
        const token = getClientToken()
        if (!token) return Promise.resolve(null)

        return api.post(
            `${clientEndpoint}/logout`,
            null,
            { headers: { Authorization: `Bearer ${token}` } },
        ).finally(clearClientToken)
    },
    getEmailVerificationDestination: () => api.get(
        `${clientEndpoint}/email-verification/destination`,
    ),
    requestEmailVerification: (email) => api.post(
        `${clientEndpoint}/email-verification/request`,
        email ? { email } : {},
    ),
    confirmEmailVerification: async (code) => {
        const response = await api.post(
            `${clientEndpoint}/email-verification/confirm`,
            { code },
        )
        const access = response.data?.data?.sensitive_access
        if (!access?.token || !access?.expires_at) {
            throw new Error('A resposta da confirmação não contém uma autorização temporária.')
        }
        setClientSensitiveAccess(access.token, access.expires_at)
        return response
    },
    requestSensitiveAccess: () => api.post(`${clientEndpoint}/sensitive-access/request`),
    confirmSensitiveAccess: async (code) => {
        const response = await api.post(`${clientEndpoint}/sensitive-access/confirm`, { code })
        const access = response.data?.data
        if (!access?.token || !access?.expires_at) {
            throw new Error('A resposta da verificação não contém uma autorização temporária.')
        }
        setClientSensitiveAccess(access.token, access.expires_at)
        return response
    },
    updateAddressStorage: (enabled) => api.put(
        `${clientEndpoint}/address-storage`,
        { address_storage_enabled: enabled },
    ),
}

export const getTenantConfig = async () => {
    const { data } = await api.get('/tenant')
    return data.data
}

export const getCategories = async () => {
    const { data } = await api.get('/category')
    const categories = data?.data

    if (!Array.isArray(categories)) {
        throw new Error('A resposta de /category não contém uma lista de categorias.')
    }

    return categories
}

export const getProducts = async () => {
    const { data } = await api.get('/products')
    const products = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.data)
            ? data.data.data
            : null

    if (!products) {
        throw new Error('A resposta de /products não contém uma lista de produtos.')
    }

    return products
}

export const getServiceLocations = async () => {
    const { data } = await api.get('/service-locations')
    const locations = data?.data

    if (!Array.isArray(locations)) {
        throw new Error('A resposta de /service-locations não contém uma lista de locais.')
    }

    return locations
}

export const getContacts = async () => {
    const { data } = await api.get('/contacts')
    const contacts = data?.data

    if (!Array.isArray(contacts)) {
        throw new Error('A resposta de /contacts não contém uma lista de contatos.')
    }

    return contacts
}

export const getAnnouncements = async (placement) => {
    const { data } = await api.get('/announcements')
    const placements = data?.data

    if (placements == null || (Array.isArray(placements) && placements.length === 0)) return []
    if (typeof placements !== 'object' || Array.isArray(placements)) {
        throw new Error('A resposta de /announcements não contém as listas de anúncios.')
    }

    const announcements = placements[placement]
    if (announcements == null) return []
    if (!Array.isArray(announcements)) {
        throw new Error(`A lista de anúncios "${placement}" não é válida.`)
    }

    return announcements
}

export const getAddresses = async () => {
    const { data } = await api.get('/client/addresses')
    const addresses = Array.isArray(data)
        ? data
        : Array.isArray(data?.data?.data)
            ? data.data.data
            : data?.data

    if (!Array.isArray(addresses)) {
        throw new Error('A resposta de /client/addresses não contém uma lista de endereços.')
    }

    return addresses.map((address) => ({
        ...address,
        nickname: address.title ?? address.nickname ?? '',
        recipientName: address.recipient_name ?? address.recipientName ?? '',
        cep: address.zip_code ?? address.cep ?? '',
        primary: Boolean(address.is_default ?? address.primary),
    }))
}

export const createAddress = (address) => api.post('/client/addresses', address)

export const updateAddress = (id, address) => api.put(`/client/addresses/${encodeURIComponent(id)}`, address)

export const deleteAddress = (id) => api.delete(`/client/addresses/${encodeURIComponent(id)}`)

export const getOrders = async () => {
    const { data } = await api.get('/client/orders')
    const orders = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.data)
            ? data.data.data
            : Array.isArray(data)
                ? data
                : null

    if (!orders) {
        throw new Error('A resposta de /client/orders não contém uma lista de pedidos.')
    }

    return orders
}

export const getOrder = async (id) => {
    const { data } = await api.get(`/client/orders/${encodeURIComponent(id)}`)
    const order = data?.data?.order || data?.data || data?.order || data

    if (!order || typeof order !== 'object' || Array.isArray(order)) {
        throw new Error('A resposta de /client/orders/{id} não contém os dados do pedido.')
    }

    return order
}

export const createOrder = (order) => api.post('/client/orders', order)
export const validateCoupon = (coupon) => api.post(`${clientEndpoint}/coupons/validate`, coupon)

export const getAppearance = async () => {
    const { data } = await api.get('/appearance')
    const appearance = normalizeAppearance(data)

    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(appearanceCacheKey, JSON.stringify(appearance))
        } catch (error) {
            console.warn('Não foi possível salvar a aparência em cache.', error)
        }
    }

    return appearance
}

export const resolveApiAssetUrl = (path) => {
    if (/^https?:\/\//i.test(path)) {
        const assetUrl = new URL(path)
        const apiUrl = new URL(apiBaseUrl)

        if (['localhost', '127.0.0.1', '::1'].includes(assetUrl.hostname)) {
            assetUrl.protocol = apiUrl.protocol
            assetUrl.host = apiUrl.host
        }

        return assetUrl.href
    }

    const imagePath = path.replace(/^\/+/, '')
    const storagePath = imagePath.startsWith('storage/') ? imagePath : `storage/${imagePath}`
    return new URL(storagePath, `${new URL(apiBaseUrl).origin}/`).href
}
