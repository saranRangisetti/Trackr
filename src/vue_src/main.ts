/**
 * Advanced Application Entry Point
 * Enterprise-grade application initialization
 */

import '@/assets/tokens.css'
import '@/assets/main.css'
import '@/assets/anti-flicker.css'
import { app } from './core/Application'

// Initialize the application
app.initialize().catch(error => {
  console.error('Failed to initialize application:', error);
  
  // Fallback to basic Vue app if advanced initialization fails
  import('./App.vue').then(({ default: App }) => {
    import('vue').then(({ createApp }) => {
      createApp(App).mount('#app');
    });
  });
});
