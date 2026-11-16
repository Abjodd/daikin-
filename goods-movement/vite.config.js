import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: { 
    port: 5177, 
    strictPort: true, 
    allowedHosts: ['.applicationstudio.cloud.sap'] 
  },
  preview: { port: 5177, strictPort: true },
})
