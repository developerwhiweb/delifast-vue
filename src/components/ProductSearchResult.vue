<template>
  <span class="product-search-result-content">
    <img
      v-if="product.image"
      :src="product.image"
      alt=""
      class="product-search-image"
      loading="lazy"
    >
    <span v-else class="product-search-image product-search-image-placeholder">
      <i class="bi bi-cup-straw" aria-hidden="true"></i>
    </span>
    <span class="product-search-copy">
      <span class="product-search-name">{{ product.name }}</span>
      <span v-if="product.description" class="product-search-description">
        {{ product.description }}
      </span>
    </span>
    <span class="product-search-price">{{ formatPrice(product.price) }}</span>
  </span>
</template>

<script setup>
defineProps({
  product: {
    type: Object,
    required: true,
  },
})

const formatPrice = (price) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(price) || 0)
</script>

<style scoped>
.product-search-result-content {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.product-search-image {
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border-radius: 8px;
  object-fit: cover;
}

.product-search-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f3f5;
  color: var(--primary);
  font-size: 1.25rem;
}

.product-search-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.product-search-name {
  overflow: hidden;
  color: #212529;
  font-size: 0.875rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-search-description {
  display: -webkit-box;
  overflow: hidden;
  color: #6c757d;
  font-size: 0.75rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.product-search-price {
  flex-shrink: 0;
  color: var(--primary);
  font-size: 0.8125rem;
  font-weight: 700;
}

@media (max-width: 420px) {
  .product-search-image {
    width: 42px;
    height: 42px;
    flex-basis: 42px;
  }

  .product-search-price {
    font-size: 0.75rem;
  }
}
</style>
