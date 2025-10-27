<template>
  <button 
    class="theme-toggle"
    @click="toggleTheme"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <div class="toggle-track" :class="{ 'dark': isDark }">
      <div class="toggle-thumb">
        <svg v-if="!isDark" class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        <svg v-else class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isDark = ref(false);

// Load theme from storage or system preference
onMounted(() => {
  const savedTheme = localStorage.getItem('trackr-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    isDark.value = savedTheme === 'dark';
  } else {
    isDark.value = systemPrefersDark;
  }
  
  applyTheme();
});

const toggleTheme = () => {
  isDark.value = !isDark.value;
  applyTheme();
  localStorage.setItem('trackr-theme', isDark.value ? 'dark' : 'light');
};

const applyTheme = () => {
  const root = document.documentElement;
  if (isDark.value) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
};
</script>

<style scoped>
.theme-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-xs);
  border-radius: var(--radius);
  /* No transitions to prevent shaking */
}

.theme-toggle:hover {
  background: var(--bg-tertiary);
}

.toggle-track {
  width: 48px;
  height: 24px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  position: relative;
  /* No transitions to prevent shaking */
  transition: none !important;
  animation: none !important;
  transform: none !important;
  border: 1px solid var(--border-primary);
}

.toggle-track.dark {
  background: var(--accent);
}

.toggle-thumb {
  width: 20px;
  height: 20px;
  background: var(--bg-primary);
  border-radius: 50%;
  position: absolute;
  top: 1px;
  left: 1px;
  /* No transitions to prevent shaking */
  transition: none !important;
  animation: none !important;
  transform: none !important;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}

.toggle-track.dark .toggle-thumb {
  left: 25px;
}

.sun-icon,
.moon-icon {
  width: 12px;
  height: 12px;
  color: var(--text-secondary);
}

.toggle-track.dark .moon-icon {
  color: var(--text-primary);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
