import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': resolve(import.meta.dirname, './src') } },
  plugins: [react(), tailwindcss()],
})
