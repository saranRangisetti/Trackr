/**
 * Simple Trackr Application Entry Point
 * Basic Chrome extension setup
 */

import './style.css'
import '@/assets/anti-flicker.css'
import { createApp } from 'vue'
import App from './App.vue'

// Create and mount the Vue app
const app = createApp(App)
app.mount('#app')
