<template>
  <div class="card">
    <slot />
  </div>
</template>

<style scoped>
.card {
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  backdrop-filter: var(--blur);
  box-shadow: var(--shadow);
  border: 1px solid var(--border-primary);
  padding: var(--space-2xl);
  transition: none !important;
  position: relative;
  overflow: hidden;
}

/* Removed hover animations for instant response */

/* Premium card variants */
.card.elevated {
  background: var(--bg-tertiary);
  box-shadow: var(--shadow-lg);
  border-color: var(--border-secondary);
}

.card.floating {
  background: var(--bg-elevated);
  box-shadow: var(--shadow-xl);
  border-color: var(--border-primary);
}

.card.compact {
  padding: var(--space-lg);
}

.card.spacious {
  padding: var(--space-3xl);
}

/* Premium card animations - Disabled to prevent flickering */
.card {
  animation: none;
}
</style>
