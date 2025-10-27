<template>
  <button
    class="btn"
    :class="variant"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{ variant?: 'primary'|'subtle', disabled?: boolean }>();
defineEmits(['click']);
</script>

<style scoped>
.btn {
  min-height: 44px;
  padding: 0 var(--space-lg);
  border-radius: var(--radius);
  border: 1px solid transparent;
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  transition: none !important;
  animation: none !important;
  transform: none !important;
  position: relative;
  overflow: hidden;
}

/* Removed shimmer effect for instant response */

.btn.primary {
  background: var(--accent);
  color: white;
  box-shadow: var(--shadow);
  border: 1px solid var(--accent);
}

.btn.primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  box-shadow: var(--shadow-lg);
}

.btn.primary:active {
  box-shadow: var(--shadow);
}

.btn.subtle {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--border-primary);
  backdrop-filter: var(--blur);
}

.btn.subtle:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-secondary);
  box-shadow: var(--shadow);
}

.btn.subtle:active {
  box-shadow: none;
}

.btn:disabled {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}

.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius);
}

/* Premium button variants */
.btn.large {
  min-height: 52px;
  padding: 0 var(--space-xl);
  font-size: var(--font-size-base);
}

.btn.small {
  min-height: 36px;
  padding: 0 var(--space-md);
  font-size: var(--font-size-xs);
}

.btn.icon-only {
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: var(--radius);
}

.btn.icon-only.small {
  width: 36px;
  height: 36px;
}

.btn.icon-only.large {
  width: 52px;
  height: 52px;
}
</style>
