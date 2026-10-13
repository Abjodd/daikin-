import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Each app runs on its own fixed port so the portal links stay stable.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
})
