/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Permite abrir pelo celular na mesma rede (AR exige HTTPS: use um túnel, ver README).
    host: true,
  },
  build: {
    // O chunk do model-viewer (+ three.js) tem ~1 MB (~290 KB gzip), mas só é
    // baixado ao abrir um prato com 3D. O bundle inicial fica abaixo de 100 KB gzip.
    chunkSizeWarningLimit: 1100,
  },
  test: {
    environment: 'node',
    // Com Node 26 + Vitest 5.1, os pools 'forks'/'threads' falham ao iniciar
    // ("Cannot read properties of undefined (reading 'config')"). Rever ao atualizar.
    pool: 'vmThreads',
    include: ['src/**/*.test.ts'],
  },
})
