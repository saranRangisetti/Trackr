<template>
  <div class="seg">
    <button 
      v-for="(option, i) in options" 
      :key="option" 
      :class="['seg-btn', { active: i === modelValue }]"
      @click="$emit('update:modelValue', i)"
    >
      {{ option }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ options: string[], modelValue: number }>();
defineEmits(['update:modelValue']);
</script>

<style scoped>
.seg {
  display: inline-flex;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 4px;
  background: var(--bg-secondary);
  backdrop-filter: var(--blur);
  box-shadow: var(--shadow-sm);
  transition: none !important;
  animation: none !important;
  transform: none !important;
  position: relative !important;
  contain: layout !important;
  flex-shrink: 0 !important;
  width: fit-content !important;
}

.seg:hover {
  border-color: var(--border-secondary);
  box-shadow: var(--shadow);
}

.seg-btn {
  min-width: 88px;
  height: 36px;
  border-radius: var(--radius);
  padding: 0 var(--space-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  border: none;
  background: transparent;
  cursor: pointer;
  transition: none !important;
  animation: none !important;
  transform: none !important;
  position: relative;
  overflow: hidden;
  contain: layout !important;
  flex-shrink: 0 !important;
  width: auto !important;
}

/* Removed hover animations for instant response */

.seg-btn.active {
  color: var(--text-primary);
  font-weight: var(--font-weight-semibold);
}

.seg-btn.active::before {
  opacity: 1;
  background: var(--accent);
}

.seg-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius);
}

/* Premium segment variants */
.seg.large .seg-btn {
  min-width: 120px;
  height: 44px;
  font-size: var(--font-size-base);
}

.seg.small .seg-btn {
  min-width: 72px;
  height: 32px;
  font-size: var(--font-size-xs);
}

.seg.compact {
  padding: 2px;
}

.seg-btn.compact {
  min-width: 64px;
  height: 28px;
  padding: 0 var(--space-sm);
  font-size: var(--font-size-xs);
}

/* Premium animations - Disabled to prevent flickering */
.seg-btn {
  animation: none;
}
</style>
