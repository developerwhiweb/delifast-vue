<template>
  <Transition name="desktop-cart-summary">
    <aside
      v-if="cart.totalItems > 0"
      class="desktop-cart-summary d-none d-lg-block"
      aria-label="Resumo do carrinho"
      aria-live="polite"
    >
      <button
        type="button"
        class="desktop-cart-summary-button"
        data-bs-toggle="offcanvas"
        data-bs-target="#cartCanvas"
        :aria-label="summaryLabel"
      >
        <span class="desktop-cart-summary-main">
          <span class="desktop-cart-summary-icon">
            <i class="bi bi-cart3" aria-hidden="true"></i>
            <Transition name="desktop-cart-count" mode="out-in">
              <span :key="cart.totalItems" class="desktop-cart-summary-count">
                {{ cart.totalItems > 99 ? '99+' : cart.totalItems }}
              </span>
            </Transition>
          </span>
          <span class="desktop-cart-summary-copy">
            <strong>Seu carrinho</strong>
            <span>{{ cart.totalItems }} {{ cart.totalItems === 1 ? 'produto' : 'produtos' }}</span>
          </span>
        </span>

        <span class="desktop-cart-summary-footer">
          <span class="desktop-cart-summary-total">
            <span>Total da compra</span>
            <Transition name="desktop-cart-value" mode="out-in">
              <strong :key="cart.total">{{ formatPrice(cart.total) }}</strong>
            </Transition>
          </span>
          <span class="desktop-cart-summary-action">
            Ver carrinho
            <i class="bi bi-arrow-right" aria-hidden="true"></i>
          </span>
        </span>
      </button>
    </aside>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useCartStore } from '@/stores/useCartStore'

const cart = useCartStore()

const formatPrice = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(value) || 0)

const summaryLabel = computed(() => (
  `Abrir carrinho com ${cart.totalItems} ${cart.totalItems === 1 ? 'produto' : 'produtos'}, total ${formatPrice(cart.total)}`
))
</script>

<style scoped>
.desktop-cart-summary {
  position: fixed;
  z-index: 1030;
  right: 24px;
  bottom: 24px;
}

.desktop-cart-summary-button {
  display: flex;
  width: 286px;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border: 1px solid rgba(16, 81, 61, 0.14);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 12px 36px rgba(27, 38, 34, 0.18);
  color: #242a27;
  text-align: left;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.desktop-cart-summary-button:hover {
  transform: translateY(-3px);
  border-color: var(--primary);
  box-shadow: 0 16px 40px rgba(27, 38, 34, 0.22);
}

.desktop-cart-summary-button:focus-visible {
  outline: 3px solid rgba(16, 81, 61, 0.28);
  outline-offset: 3px;
}

.desktop-cart-summary-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.desktop-cart-summary-icon {
  position: relative;
  display: flex;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  background: color-mix(in srgb, var(--primary) 10%, white);
  color: var(--primary);
  font-size: 1.4rem;
}

.desktop-cart-summary-count {
  position: absolute;
  top: -7px;
  right: -9px;
  display: flex;
  min-width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #ffc400;
  color: #1f2522;
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 1;
}

.desktop-cart-summary-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.desktop-cart-summary-copy strong {
  font-size: 0.95rem;
  line-height: 1.2;
}

.desktop-cart-summary-copy > span {
  color: #6b716e;
  font-size: 0.8rem;
}

.desktop-cart-summary-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid #edf0ee;
}

.desktop-cart-summary-total {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.desktop-cart-summary-total > span {
  color: #6b716e;
  font-size: 0.7rem;
}

.desktop-cart-summary-total strong {
  color: var(--primary);
  font-size: 1rem;
}

.desktop-cart-summary-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.desktop-cart-summary-enter-active,
.desktop-cart-summary-leave-active {
  transition: opacity 240ms ease, transform 300ms cubic-bezier(0.2, 0.75, 0.25, 1);
}

.desktop-cart-summary-enter-from,
.desktop-cart-summary-leave-to {
  opacity: 0;
  transform: translate(20px, 8px) scale(0.96);
}

.desktop-cart-count-enter-active,
.desktop-cart-count-leave-active,
.desktop-cart-value-enter-active,
.desktop-cart-value-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.desktop-cart-count-enter-from,
.desktop-cart-count-leave-to,
.desktop-cart-value-enter-from,
.desktop-cart-value-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (prefers-reduced-motion: reduce) {
  .desktop-cart-summary-button,
  .desktop-cart-summary-enter-active,
  .desktop-cart-summary-leave-active,
  .desktop-cart-count-enter-active,
  .desktop-cart-count-leave-active,
  .desktop-cart-value-enter-active,
  .desktop-cart-value-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
