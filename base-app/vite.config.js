import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Each app runs on its own fixed port so the portal links stay stable.
export default defineConfig({
  plugins: [react()],
  base: './',
  // allowedHosts: lets SAP BAS open the dev server through its port5173-workspaces-… address
  server: { port: 5173, strictPort: true, allowedHosts: ['.applicationstudio.cloud.sap'] },
  preview: { port: 5173, strictPort: true },
})
