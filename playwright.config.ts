import { defineConfig, devices } from '@playwright/test'

// Por padrão roda em modo demonstração (sem Supabase).
// Para testar contra o Supabase local:
//   VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<publishable> npm run test:e2e
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
