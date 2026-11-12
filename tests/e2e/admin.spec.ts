import { NodeIO } from '@gltf-transform/core'
import { expect, test, type Page } from '@playwright/test'

// Painel: só roda contra um Supabase de verdade (local).
//   VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<publishable> \
//   SUPABASE_SERVICE_ROLE_KEY=<service_role> npm run test:e2e
// A service key fica só no processo do teste (cria/remove usuários). Nunca vai para o navegador.

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
test.skip(!url || !serviceKey, 'Precisa de VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (Supabase local).')
// Os testes dependem um do outro (o prato criado no 1º é reordenado depois).
test.describe.configure({ mode: 'serial' })

const RESTAURANT_ID = '00000000-0000-4000-8000-000000000001' // Casa Lume (seed.sql)
const STAMP = Date.now()
const OWNER = { email: `e2e-dono-${STAMP}@cardapio.test`, password: 'senha-de-teste-123', id: '' }
const STAFF = { email: `e2e-garcom-${STAMP}@cardapio.test`, password: 'senha-de-teste-123', id: '' }
const DISH = 'Burger Teste E2E'
const DISH_SLUG = 'burger-teste-e2e'
// PNG 1x1 válido (a tela comprime para WEBP antes de enviar).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

const admin = (path: string, init: RequestInit = {}) =>
  fetch(`${url}${path}`, {
    ...init,
    headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...init.headers },
  })

async function createUser(user: typeof OWNER, role: 'owner' | 'staff') {
  const res = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email: user.email, password: user.password, email_confirm: true }),
  })
  expect(res.ok, await res.clone().text()).toBe(true)
  user.id = (await res.json()).id
  const m = await admin('/rest/v1/memberships', {
    method: 'POST',
    body: JSON.stringify({ user_id: user.id, restaurant_id: RESTAURANT_ID, role }),
  })
  expect(m.ok, await m.clone().text()).toBe(true)
}

test.beforeAll(async () => {
  await createUser(OWNER, 'owner')
  await createUser(STAFF, 'staff')
})

test.afterAll(async () => {
  await admin(`/rest/v1/items?restaurant_id=eq.${RESTAURANT_ID}&slug=eq.${DISH_SLUG}`, { method: 'DELETE' })
  await admin(`/rest/v1/tables?restaurant_id=eq.${RESTAURANT_ID}&token=not.like.demo-mesa-*`, { method: 'DELETE' })
  await admin(`/rest/v1/categories?restaurant_id=eq.${RESTAURANT_ID}&name=like.Bebidas*`, { method: 'DELETE' })
  // Devolve a ordem original das categorias e dos pratos do seed.
  await admin(`/rest/v1/categories?id=eq.00000000-0000-4000-8000-000000000101`, { method: 'PATCH', body: JSON.stringify({ position: 1 }) })
  await admin(`/rest/v1/items?restaurant_id=eq.${RESTAURANT_ID}`, { method: 'PATCH', body: JSON.stringify({ position: 1 }) })
  // Remove os arquivos que o teste enviou ao bucket.
  const list = await admin('/storage/v1/object/list/menu', {
    method: 'POST',
    body: JSON.stringify({ prefix: RESTAURANT_ID, search: DISH_SLUG, limit: 100 }),
  })
  const files = list.ok ? ((await list.json()) as { name: string }[]) : []
  if (files.length) {
    await admin('/storage/v1/object/menu', {
      method: 'DELETE',
      body: JSON.stringify({ prefixes: files.map((f) => `${RESTAURANT_ID}/${f.name}`) }),
    })
  }
  for (const u of [OWNER, STAFF]) if (u.id) await admin(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' })
})

async function login(page: Page, user: typeof OWNER, path = '/admin') {
  await page.goto(path)
  await expect(page).toHaveURL(/\/login\?next=/)
  await page.getByLabel('E-mail').fill(user.email)
  await page.getByLabel('Senha').fill(user.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Casa Lume' })).toBeVisible()
}

/** O burger do protótipo com a escala multiplicada por 100 (como se estivesse em centímetros). */
async function modelInCentimeters(): Promise<Buffer> {
  const io = new NodeIO()
  const doc = await io.read('public/demo/models/burger.glb')
  for (const node of doc.getRoot().getDefaultScene()!.listChildren()) {
    const [x, y, z] = node.getScale()
    node.setScale([x * 100, y * 100, z * 100])
  }
  return Buffer.from(await io.writeBinary(doc))
}

test('cadastra prato com foto e 3D pelo painel e ele aparece no cardápio', async ({ page, request }) => {
  await login(page, OWNER)

  await page.getByRole('link', { name: '+ Cadastrar prato' }).click()
  await page.getByLabel('Nome do prato').fill(DISH)
  await page.getByLabel('Descrição').fill('Prato criado pelo teste automático.')
  await page.getByLabel('Preço (R$)').fill('29,90')

  // Modelo em escala errada é barrado.
  await page.getByTestId('model-input').setInputFiles({ name: 'errado.glb', mimeType: 'model/gltf-binary', buffer: await modelInCentimeters() })
  await expect(page.getByText('não está em metros').first()).toBeVisible()

  // Troca pelo modelo certo: medidas lidas e sugeridas automaticamente.
  await page.locator('label', { hasText: 'Trocar modelo' }).locator('input').setInputFiles('public/demo/models/burger.glb')
  await expect(page.getByTestId('model-measures')).toContainText('12,5 cm × 12,4 cm, 10,6 cm de altura')
  await expect(page.getByLabel('Diâmetro')).toHaveValue('12,5')
  await expect(page.getByText('Modelo 3D aprovado')).toBeVisible()

  // Sem foto não salva (a foto é o fallback do 3D).
  await page.getByRole('button', { name: 'Salvar prato' }).click()
  await expect(page.getByRole('alert')).toContainText('Adicione uma foto')

  await page.getByTestId('photo-input').setInputFiles({ name: 'prato.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByText('Foto pronta')).toBeVisible()

  await page.getByRole('button', { name: 'Salvar prato' }).click()
  await expect(page.getByText(`“${DISH}” foi salvo.`)).toBeVisible({ timeout: 20_000 })
  await expect(page).toHaveURL(/\/admin$/)

  // Marca como esgotado pela lista.
  const row = page.getByRole('listitem').filter({ hasText: DISH })
  await expect(row.getByText('3D')).toBeVisible()
  await row.getByRole('switch').uncheck({ force: true })
  await expect(row.getByText('Esgotado')).toBeVisible()

  // Cardápio público.
  await page.goto(`/casa-lume/p/${DISH_SLUG}`)
  await expect(page.getByRole('heading', { level: 1, name: DISH })).toBeVisible()
  await expect(page.getByText('R$ 29,90')).toBeVisible()
  await expect(page.getByText('Ø 12,5 cm · 10,5 cm de altura')).toBeVisible()
  await expect(page.getByText('Esgotado no momento')).toBeVisible()

  const src = await page.locator('model-viewer').getAttribute('src')
  expect(src).toMatch(/\/storage\/v1\/object\/public\/menu\/.+\/burger-teste-e2e\..+\.glb$/)

  // O arquivo está público e com o MIME certo (exigência do AR).
  const glb = await request.get(src!)
  expect(glb.status()).toBe(200)
  expect(glb.headers()['content-type']).toBe('model/gltf-binary')
})

test('organiza a ordem dos pratos e o cardápio respeita', async ({ page }) => {
  await login(page, OWNER)
  await page.getByRole('button', { name: 'Organizar ordem' }).click()
  await page.getByRole('button', { name: `Subir ${DISH}` }).click()

  const lanches = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Lanches' }) })
  await expect(lanches.getByRole('listitem').first()).toContainText(DISH)

  await page.goto('/casa-lume')
  const publicLanches = page.locator('section').filter({ has: page.getByRole('heading', { level: 2, name: 'Lanches' }) })
  await expect(publicLanches.getByRole('heading', { level: 3 }).first()).toHaveText(DISH)
})

test('categorias: cria, reordena, renomeia e protege categoria com pratos', async ({ page }) => {
  await login(page, OWNER, '/admin/categorias')
  const rows = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Categorias' }) }).getByRole('listitem')

  await page.getByLabel('Nome da nova categoria').fill('Bebidas E2E')
  await page.getByRole('button', { name: 'Adicionar' }).click()
  await expect(page.getByText('Bebidas E2E')).toBeVisible()

  // Sobe para o topo (era a 4ª).
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /Subir Bebidas/ }).click()
  await expect(rows.first()).toContainText('Bebidas E2E')

  await rows.filter({ hasText: 'Bebidas E2E' }).getByRole('button', { name: 'Renomear' }).click()
  await page.getByLabel('Novo nome da categoria').fill('Bebidas')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(rows.first()).toContainText('Bebidas')

  // Categoria com pratos não pode ser excluída.
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Excluir Lanches' }).click()
  await expect(page.getByRole('alert')).toContainText('ainda tem pratos')

  // Categoria vazia não vira aba no cardápio público.
  await page.goto('/casa-lume')
  await expect(page.getByRole('button', { name: 'Lanches' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bebidas' })).toHaveCount(0)
})

test('mesas: cria numeradas, renomeia, troca código, exclui e imprime plaquinhas', async ({ page }) => {
  await login(page, OWNER, '/admin/mesas')

  // O seed tem Mesa 1 a 3: as novas continuam a numeração.
  await page.getByLabel('Quantidade de mesas').fill('3')
  await page.getByRole('button', { name: 'Adicionar' }).first().click()
  for (const label of ['Mesa 4', 'Mesa 5', 'Mesa 6']) await expect(page.getByText(label, { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: /QR code da Mesa/ })).toHaveCount(6)

  const card = (label: string) => page.getByRole('listitem').filter({ has: page.getByText(label, { exact: true }) })
  const urlOf = async (label: string) => (await card(label).locator('p[title]').getAttribute('title'))!

  expect(await urlOf('Mesa 6')).toMatch(/\/casa-lume\?m=[0-9a-f]{12}$/)

  await card('Mesa 6').getByRole('button', { name: 'Renomear' }).click()
  await page.getByLabel('Novo nome da mesa').fill('Varanda')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Varanda', { exact: true })).toBeVisible()

  const before = await urlOf('Varanda')
  page.once('dialog', (d) => d.accept())
  await card('Varanda').getByRole('button', { name: 'Novo código' }).click()
  await expect.poll(() => urlOf('Varanda')).not.toBe(before)

  page.once('dialog', (d) => d.accept())
  await card('Varanda').getByRole('button', { name: 'Excluir' }).click()
  await expect(page.getByText('Varanda', { exact: true })).toHaveCount(0)

  await page.getByRole('link', { name: 'Imprimir plaquinhas' }).click()
  await expect(page).toHaveURL(/\/admin\/mesas\/imprimir$/)
  await expect(page.locator('article')).toHaveCount(5)
  await expect(page.locator('article svg')).toHaveCount(5)
  await expect(page.locator('article').first()).toContainText('Casa Lume')
  await expect(page.getByRole('button', { name: 'Imprimir' })).toBeEnabled()
})

test('métricas: visitas vindas da mesa aparecem no painel', async ({ page, browser }) => {
  // Um cliente anônimo escaneia o QR da Mesa 2 e abre a Margherita.
  const client = await browser.newContext({ baseURL: 'http://localhost:4173' })
  const c = await client.newPage()
  await c.goto('/casa-lume?m=demo-mesa-02')
  await c.getByRole('link', { name: /Margherita/ }).click()
  await expect(c.getByRole('heading', { level: 1, name: 'Margherita' })).toBeVisible()
  await c.waitForLoadState('networkidle')
  await client.close()

  await login(page, OWNER, '/admin/metricas')
  await expect(page.getByText('Visitas ao cardápio')).toBeVisible()
  const porMesa = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Por mesa' }) })
  await expect(porMesa.getByText('Mesa 2')).toBeVisible()
  const pratos = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Pratos mais vistos' }) })
  await expect(pratos.getByRole('rowheader', { name: 'Margherita' })).toBeVisible()

  await page.getByRole('radio', { name: '7 dias' }).click()
  await expect(page.getByRole('radio', { name: '7 dias' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('group', { name: 'Visitas por dia' }).getByRole('button')).toHaveCount(7)
})

test('garçom só marca esgotado: sem abas de mesas/métricas e sem editar', async ({ page }) => {
  await login(page, STAFF)
  await expect(page.getByRole('link', { name: 'Mesas e QR' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '+ Cadastrar prato' })).toHaveCount(0)
  await expect(page.getByRole('switch').first()).toBeVisible()

  await page.goto('/admin/metricas')
  await expect(page.getByRole('heading', { name: 'Você não tem permissão para acessar esta página' })).toBeVisible()
})
