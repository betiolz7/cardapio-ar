import { devices, expect, test } from '@playwright/test'

test('home leva ao cardápio de demonstração', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Ver demonstração' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Casa Lume' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3)
  await expect(page.getByText('R$ 38,90')).toBeVisible()
})

test('cardápio não baixa o model-viewer', async ({ page }) => {
  const scripts: string[] = []
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url())
  })
  await page.goto('/casa-lume')
  await expect(page.getByRole('heading', { level: 1, name: 'Casa Lume' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(scripts.some((u) => u.includes('model-viewer'))).toBe(false)
})

test('filtro por categoria', async ({ page }) => {
  await page.goto('/casa-lume')
  await page.getByRole('button', { name: 'Pizzas' }).click()
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Margherita'])
  await page.getByRole('button', { name: 'Todos' }).click()
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3)
})

test('prato abre o 3D e avisa quando o aparelho não tem AR', async ({ browser }) => {
  // Desktop: sem WebXR, sem Scene Viewer, sem Quick Look.
  const context = await browser.newContext({ ...devices['Desktop Chrome'], baseURL: 'http://localhost:4173' })
  const page = await context.newPage()
  await page.goto('/casa-lume?m=demo-mesa-01')
  await page.getByRole('link', { name: /Margherita/ }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Margherita' })).toBeVisible()
  await expect(page.getByText('Ø 40 cm · 3,5 cm de altura · Serve 3 pessoas')).toBeVisible()

  const viewer = page.locator('model-viewer')
  await expect(viewer).toHaveAttribute('src', '/demo/models/pizza.glb')
  await expect(viewer).toHaveAttribute('ar-scale', 'fixed')

  // O botão só habilita depois que o modelo carrega.
  const arButton = page.getByRole('button', { name: 'Ver na minha mesa' })
  await expect(arButton).toBeEnabled({ timeout: 20_000 })

  await arButton.click()
  await expect(page.getByText('Este aparelho não abre a realidade aumentada')).toBeVisible()
  await context.close()
})

test('navegador do Instagram mostra aviso para abrir no navegador', async ({ browser }) => {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0 Android',
  })
  const page = await context.newPage()
  await page.goto('http://localhost:4173/casa-lume/p/lume-burger')
  await expect(page.getByRole('note')).toContainText('abra no navegador')
  await expect(page.getByRole('button', { name: 'Ver na minha mesa' })).toHaveCount(0)
  await context.close()
})

test('slug inexistente mostra mensagem amigável', async ({ page }) => {
  await page.goto('/nao-existe')
  await expect(page.getByRole('heading', { name: 'Cardápio não encontrado' })).toBeVisible()
})
