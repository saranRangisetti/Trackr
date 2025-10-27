<template>
  <button 
    class="sw" 
    :class="{ on: modelValue }" 
    @click="$emit('update:modelValue', !modelValue)" 
    :aria-pressed="modelValue"
  >
    <span class="knob" />
  </button>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>();
defineEmits(['update:modelValue']);
</script>

<style scoped>
.sw{
  width: 48px; 
  height: 28px; 
  border-radius: 999px; 
  position: relative; 
  border: 1px solid var(--separator);
  background: #e9e9eb; 
  transition: background var(--t-med) var(--ease);
  cursor: pointer;
}

.sw .knob{
  position: absolute; 
  top: 2px; 
  left: 2px; 
  width: 24px; 
  height: 24px; 
  border-radius: 999px; 
  background: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,.2); 
  transition: transform var(--t-med) var(--ease);
}

.sw.on{ 
  background: #34c759; 
}

.sw.on .knob{ 
  transform: translateX(20px); 
}

@media (prefers-color-scheme: dark){
  .sw{ 
    background: #3a3a3c; 
  }
}

.sw:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>

