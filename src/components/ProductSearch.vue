<template>
  <div
    v-if="mode === 'desktop'"
    ref="rootElement"
    class="product-search product-search-desktop"
  >
    <label :for="inputId" class="visually-hidden">Buscar produtos</label>
    <div class="product-search-field">
      <input
        :id="inputId"
        ref="searchInput"
        v-model="query"
        type="search"
        class="form-control input-search"
        placeholder="Buscar produtos..."
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="suggestionsVisible"
        :aria-controls="resultsId"
        :aria-activedescendant="activeOptionId"
        @focus="isFocused = true"
        @input="highlightedIndex = -1"
        @keydown="handleKeydown"
      >
      <button
        type="button"
        class="product-search-submit"
        aria-label="Buscar produtos"
        @click="searchInput?.focus()"
      >
        <i class="bi bi-search" aria-hidden="true"></i>
      </button>
    </div>

    <div
      v-if="suggestionsVisible"
      :id="resultsId"
      class="product-search-results"
      role="listbox"
      aria-label="Sugestões de produtos"
    >
      <p class="product-search-heading">
        {{ query.trim() ? 'Resultados da busca' : 'Sugestões para você' }}
      </p>
      <p v-if="loading" class="product-search-status" role="status">Carregando produtos...</p>
      <p v-else-if="error" class="product-search-status" role="status">
        Não foi possível carregar os produtos.
      </p>
      <p v-else-if="!searchResults.length" class="product-search-status" role="status">
        {{ query.trim() ? 'Nenhum produto encontrado.' : 'Nenhum produto disponível.' }}
      </p>
      <button
        v-for="(product, index) in searchResults"
        :id="optionId(index)"
        :key="product.id"
        type="button"
        class="product-search-result"
        role="option"
        :aria-selected="highlightedIndex === index"
        @mousedown.prevent
        @mouseenter="highlightedIndex = index"
        @click="selectProduct(product)"
      >
        <ProductSearchResult :product="product" />
      </button>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="mode === 'mobile' && modelValue"
      class="product-search-mobile-overlay"
      @click.self="closeMobileSearch"
    >
      <section
        class="product-search-mobile-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Buscar produtos"
      >
        <header class="product-search-mobile-header">
          <div>
            <h2>Buscar produtos</h2>
            <p>Encontre seu próximo pedido</p>
          </div>
          <button
            type="button"
            class="btn-close"
            aria-label="Fechar busca"
            @click="closeMobileSearch"
          ></button>
        </header>

        <label :for="inputId" class="visually-hidden">Buscar produtos</label>
        <div class="product-search-field">
          <input
            :id="inputId"
            ref="searchInput"
            v-model="query"
            type="search"
            class="form-control"
            placeholder="Digite o nome de um produto..."
            autocomplete="off"
            role="combobox"
            aria-autocomplete="list"
            :aria-expanded="suggestionsVisible"
            :aria-controls="resultsId"
            :aria-activedescendant="activeOptionId"
            @input="highlightedIndex = -1"
            @keydown="handleKeydown"
          >
          <button
            v-if="query"
            type="button"
            class="product-search-clear"
            aria-label="Limpar busca"
            @click="clearSearch"
          >
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>

        <div
          :id="resultsId"
          class="product-search-results product-search-mobile-results"
          role="listbox"
          aria-label="Sugestões de produtos"
        >
          <p class="product-search-heading">
            {{ query.trim() ? 'Resultados da busca' : 'Sugestões para você' }}
          </p>
          <p v-if="loading" class="product-search-status" role="status">Carregando produtos...</p>
          <p v-else-if="error" class="product-search-status" role="status">
            Não foi possível carregar os produtos.
          </p>
          <p v-else-if="!searchResults.length" class="product-search-status" role="status">
            {{ query.trim() ? 'Nenhum produto encontrado.' : 'Nenhum produto disponível.' }}
          </p>
          <button
            v-for="(product, index) in searchResults"
            :id="optionId(index)"
            :key="product.id"
            type="button"
            class="product-search-result"
            role="option"
            :aria-selected="highlightedIndex === index"
            @mouseenter="highlightedIndex = index"
            @click="selectProduct(product)"
          >
            <ProductSearchResult :product="product" />
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import ProductSearchResult from './ProductSearchResult.vue'

const props = defineProps({
  products: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: 'desktop',
    validator: (value) => ['desktop', 'mobile'].includes(value),
  },
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select', 'update:modelValue'])
const query = ref('')
const isFocused = ref(false)
const highlightedIndex = ref(-1)
const rootElement = ref(null)
const searchInput = ref(null)
const inputId = `product-search-input-${useId()}`
const resultsId = `product-search-results-${useId()}`
const normalizeText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()

const normalizedQuery = computed(() => normalizeText(query.value.trim()))
const searchResults = computed(() => {
  const tokens = normalizedQuery.value.split(/\s+/).filter(Boolean)

  return props.products
    .map((product, index) => {
      if (
        !product
        || typeof product.name !== 'string'
        || !product.name.trim()
        || product.stock?.available === false
      ) {
        return null
      }

      const name = normalizeText(product.name)
      const tags = Array.isArray(product.tags)
        ? product.tags.map((tag) => (
            typeof tag === 'string' ? tag : tag?.name ?? tag?.title ?? ''
          )).join(' ')
        : ''
      const searchableText = normalizeText([
        product.name,
        product.description,
        product.category,
        tags,
      ].join(' '))

      if (tokens.some((token) => !searchableText.includes(token))) return null

      const score = !tokens.length
        ? (product.featured ? 0 : 1)
        : name === normalizedQuery.value
          ? 0
          : name.startsWith(normalizedQuery.value)
            ? 1
            : tokens.every((token) => name.includes(token))
              ? 2
              : 3

      return { product, index, score }
    })
    .filter(Boolean)
    .sort((first, second) => first.score - second.score || first.index - second.index)
    .slice(0, 8)
    .map(({ product }) => product)
})

const suggestionsVisible = computed(() => (
  props.mode === 'mobile' ? props.modelValue : isFocused.value
))
const activeOptionId = computed(() => (
  highlightedIndex.value >= 0 && searchResults.value[highlightedIndex.value]
    ? optionId(highlightedIndex.value)
    : undefined
))

const optionId = (index) => `${resultsId}-${index}`

const selectProduct = (product) => {
  emit('select', product)
  query.value = ''
  highlightedIndex.value = -1
  isFocused.value = false
  if (props.mode === 'mobile') emit('update:modelValue', false)
}

const closeMobileSearch = () => emit('update:modelValue', false)

const clearSearch = () => {
  query.value = ''
  highlightedIndex.value = -1
  searchInput.value?.focus()
}

const handleKeydown = (event) => {
  if (event.key === 'ArrowDown' && searchResults.value.length) {
    event.preventDefault()
    highlightedIndex.value = (highlightedIndex.value + 1) % searchResults.value.length
  } else if (event.key === 'ArrowUp' && searchResults.value.length) {
    event.preventDefault()
    highlightedIndex.value = highlightedIndex.value <= 0
      ? searchResults.value.length - 1
      : highlightedIndex.value - 1
  } else if (event.key === 'Enter' && searchResults.value.length) {
    event.preventDefault()
    selectProduct(searchResults.value[highlightedIndex.value] || searchResults.value[0])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    if (props.mode === 'mobile') closeMobileSearch()
    else isFocused.value = false
  }
}

const handleDocumentPointerDown = (event) => {
  if (props.mode === 'desktop' && !rootElement.value?.contains(event.target)) {
    isFocused.value = false
  }
}

watch(() => props.modelValue, async (isOpen) => {
  if (props.mode !== 'mobile') return

  if (isOpen) {
    query.value = ''
    highlightedIndex.value = -1
    await nextTick()
    searchInput.value?.focus()
  } else {
    isFocused.value = false
  }
})

onMounted(() => document.addEventListener('pointerdown', handleDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleDocumentPointerDown))
</script>

<style scoped>
.product-search {
  position: relative;
  width: 100%;
}

.product-search-field {
  position: relative;
  display: flex;
  align-items: center;
}

.product-search-desktop .product-search-field input {
  height: 35px;
  padding: 0 46px 0 12px;
  border-color: var(--primary);
}

.product-search-submit,
.product-search-clear {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--primary);
}

.product-search-submit {
  top: 0;
  right: 0;
  width: 40px;
  height: 35px;
  border-radius: 0 0.375rem 0.375rem 0;
  background: var(--primary);
  color: #fff;
}

.product-search-submit:hover {
  filter: brightness(0.94);
}

.product-search-clear {
  right: 12px;
  width: 32px;
  height: 100%;
}

.product-search-results {
  position: absolute;
  z-index: 1100;
  top: calc(100% + 6px);
  left: 0;
  width: 100%;
  max-height: 360px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
}

.product-search-heading {
  margin: 4px 8px 8px;
  color: #6c757d;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.product-search-status {
  margin: 0;
  padding: 12px 8px;
  color: #6c757d;
  font-size: 0.875rem;
}

.product-search-result {
  display: block;
  width: 100%;
  padding: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
}

.product-search-result:hover,
.product-search-result[aria-selected="true"] {
  background: #f7f7f7;
}

.product-search-mobile-overlay {
  position: fixed;
  z-index: 12000;
  inset: 0;
  display: flex;
  justify-content: center;
  padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
  background: rgba(0, 0, 0, 0.55);
}

.product-search-mobile-panel {
  display: flex;
  width: min(100%, 640px);
  max-height: 100%;
  flex-direction: column;
  overflow: hidden;
  padding: 18px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
}

.product-search-mobile-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.product-search-mobile-header h2 {
  margin: 0;
  color: #212529;
  font-size: 1.125rem;
  font-weight: 700;
}

.product-search-mobile-header p {
  margin: 4px 0 0;
  color: #6c757d;
  font-size: 0.8125rem;
}

.product-search-mobile-panel .product-search-field input {
  min-height: 44px;
  padding-right: 42px;
}

.product-search-mobile-results {
  position: static;
  width: auto;
  max-height: none;
  flex: 1;
  margin-top: 12px;
  padding: 0 4px 4px;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

@media (max-width: 420px) {
  .product-search-mobile-panel {
    padding: 14px;
  }

}
</style>
