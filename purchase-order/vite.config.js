import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Each app runs on its own fixed port so the portal links stay stable.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 5176, strictPort: true },
  preview: { port: 5176, strictPort: true },
})

