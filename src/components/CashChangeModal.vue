<template>
  <div
    v-if="modelValue"
    class="modal fade show"
    tabindex="-1"
    role="dialog"
    aria-labelledby="cash-change-title"
    style="display: block; background: rgba(0, 0, 0, .5)"
    @click.self="close"
  >
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content">
        <div class="modal-header">
          <h5 id="cash-change-title" class="modal-title">Precisa de troco?</h5>
          <button type="button" class="btn-close" aria-label="Fechar" @click="close"></button>
        </div>

        <div class="modal-body">
          <div class="d-grid gap-2">
            <label class="change-option" :class="{ selected: needsChange === false }">
              <input v-model="needsChange" type="radio" :value="false">
              <span>Não preciso de troco</span>
            </label>
            <label class="change-option" :class="{ selected: needsChange === true }">
              <input v-model="needsChange" type="radio" :value="true">
              <span>Sim, preciso de troco</span>
            </label>
          </div>

          <div v-if="needsChange === true" class="mt-3">
            <label for="cash-change-amount" class="form-label">Vai pagar com quanto?</label>
            <div class="input-group">
              <span class="input-group-text">R$</span>
              <input
                id="cash-change-amount"
                ref="amountInput"
                v-model="amount"
                class="form-control"
                type="number"
                min="0"
                step="0.01"
                inputmode="decimal"
                placeholder="Ex.: 100,00"
              >
            </div>
            <small class="text-muted d-block mt-1">
              Total do pedido: {{ formatPrice(total) }}
            </small>
            <small v-if="amount && !isAmountValid" class="text-danger" role="alert">
              Informe um valor maior que o total do pedido.
            </small>
            <small v-else-if="isAmountValid" class="text-success" role="status">
              Troco: {{ formatPrice(Number(amount) - Number(total)) }}
            </small>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" @click="close">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="needsChange === null || (needsChange && !isAmountValid)"
            @click="confirm"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  total: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue', 'change-confirmed'])
const needsChange = ref(null)
const amount = ref('')
const amountInput = ref(null)

const isAmountValid = computed(() => {
  const amountInCents = Math.round(Number(amount.value) * 100)
  const totalInCents = Math.round(Number(props.total) * 100)
  return Number.isFinite(amountInCents) && amountInCents > totalInCents
})

const formatPrice = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(value) || 0)

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    needsChange.value = null
    amount.value = ''
  }
})

watch(needsChange, async (selected) => {
  if (selected) {
    await nextTick()
    amountInput.value?.focus()
  }
})

const close = () => emit('update:modelValue', false)

const confirm = () => {
  if (needsChange.value === null || (needsChange.value && !isAmountValid.value)) return

  emit('change-confirmed', {
    needsChange: needsChange.value,
    amount: needsChange.value ? Number(amount.value) : null,
  })
  close()
}
</script>

<style scoped>
.modal-content {
  border: 0;
  border-radius: 12px;
}

.change-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  cursor: pointer;
}

.change-option.selected {
  border-color: var(--primary);
  background: #f9f0f8;
}

.change-option input {
  accent-color: var(--primary);
}

.btn-primary {
  background-color: var(--primary);
  border-color: var(--primary);
}
</style>
