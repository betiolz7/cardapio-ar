# CONTEXT.md: Cardápio AR

> Contexto do projeto para quem for desenvolver (pessoa ou IA). Leia antes de mexer no código.
> Última revisão: 12/11/2026. Inclui a análise de mercado e de projetos open source no GitHub.

## 1. O que é

Um cardápio digital **web** (não é app) em que o cliente vê os pratos em **3D** e em **realidade aumentada no tamanho real**, em cima da própria mesa. Tudo roda no navegador do celular, sem instalar nada.

**Fluxo do cliente**

1. Escaneia o QR code da mesa.
2. Abre o cardápio do restaurante no navegador.
3. Gira o prato em 3D e toca em **"Ver na minha mesa"**.
4. A câmera abre, ele aponta para a mesa e o prato aparece na escala 1:1.

**Para quem**

- **Cliente final:** decide melhor o que pedir (tamanho, aparência, porção).
- **Restaurante:** vende mais (sobremesa e adicionais, menos "não era o que eu esperava"), ganha um diferencial de marketing e passa a ter **dados de quais pratos chamam atenção**.

## 2. Decisões principais

> **Restrição de orçamento:** o projeto precisa ser desenvolvido e operado com **custo zero** (no máximo R$ 50 por mês) até ter receita. Toda escolha abaixo respeita isso. Veja a seção 12.1.

| Decisão | Escolha | Por quê |
|---|---|---|
| Plataforma | **Só web**: SPA em **Vite + React + TypeScript**. Sem app nativo | O cliente escaneia o QR e vê o cardápio na hora. Uma SPA estática roda de graça, com uso comercial permitido, no Cloudflare. O Next.js com SSR exigiria o Vercel Pro (US$ 20 por mês), porque o Hobby proíbe uso comercial, ou o Workers, cujo plano grátis tem limite apertado de CPU. |
| Hospedagem | **Cloudflare Pages** (ou Workers Static Assets) | Grátis, **uso comercial permitido**, sem limite de tráfego para arquivos estáticos, HTTPS automático e headers configuráveis pelo arquivo `_headers`. |
| 3D e AR | **`<model-viewer>`** (Google) | Já resolve WebXR, Scene Viewer e Quick Look, além de poster, carregamento sob demanda e acessibilidade. Escrever AR próprio com three.js e WebXR leva meses (seção 4). |
| Backend | **Supabase Free** (Postgres, Auth e RLS) | O isolamento entre restaurantes fica no banco, via RLS. Não precisa de servidor próprio. Os dados trafegados são poucos (JSON do cardápio e eventos). |
| Arquivos 3D e fotos | **Piloto: Supabase Storage** (bucket público `menu`). **Depois: Cloudflare R2 Free** (10 GB, **download grátis**) | O painel envia direto do navegador, com RLS por restaurante, sem configurar mais nada. Fotos são comprimidas para cerca de 80 KB. O limite de 5 GB de download por mês do Supabase Free aguenta o piloto: com 1 restaurante, cerca de 1.500 aberturas de modelo por mês. Quando o tráfego crescer, os arquivos migram para o R2, que não cobra download. Só `uploadFile()` em `src/admin/data.ts` muda. |
| Painel admin | **Na mesma SPA**, na rota `/admin` | São 5 telas. Um CMS seria mais uma coisa para aprender e manter. |
| Origem do 3D | **Nós escaneamos** (fotogrametria com ferramentas gratuitas). Gerar 3D por IA a partir de fotos fica para a Fase 4 | A qualidade é o diferencial contra o DegustAR (seção 3). |
| Ambiente de desenvolvimento | **Supabase CLI local** (Docker) e um projeto Supabase Free para produção | O plano grátis permite só 2 projetos; desenvolver localmente não gasta nenhum deles. |

## 3. Mercado e concorrência (pesquisa de nov/2026)

**Concorrentes no Brasil**

| Empresa | Preço | Como faz o 3D |
|---|---|---|
| [DegustAR](https://degustar.io) | R$ 197, R$ 397 ou R$ 697 por mês (15, 45 ou pratos ilimitados). Sem fidelidade, 7 dias de teste | O **restaurante** manda 3 ou 4 fotos e informa a largura. A **IA** monta o 3D em minutos. A montagem feita pela equipe deles é opcional. |
| [menuAR](https://menuar.com.br) | R$ 1.199 (contrato de 3 meses), R$ 897 (6 meses) ou R$ 699 (12 meses). Pratos ilimitados | A equipe deles fotografa e modela tudo |

Cardápio digital comum, sem 3D, custa de R$ 70 a R$ 200 por mês (NuveMenu, Menu Digital, Virtual Cardápio). Esse é o preço que o restaurante usa para comparar.

**Exterior:** ARmenu (Reino Unido, a partir de £49 por prato), Platr (US$ 49,99 por mês), MenuQ (US$ 10 a 25 por mês), 3DMenu (Polônia, 99 PLN por mês) e Foodar (Romênia, 99 lei por mês). A pioneira, Kabaq/QReal, atendeu Denny's e Bareburger. A Diner, nos EUA, fechou.

**Evidência de que funciona:** num estudo de Oxford com a QReal, 41% das pessoas pediram sobremesa com o menu AR, contra 18% com o menu comum. Um estudo da WSU (2026) mostrou aumento na intenção de visita. **Não existe estudo publicado com dados de venda reais do cardápio inteiro.** Nosso piloto pode produzir esse número.

**Como vamos nos posicionar**

- **Preço intermediário:** "a gente escaneia, com qualidade de fotogrametria, sem fidelidade", entre R$ 250 e R$ 450 por mês, mais setup por prato. Fica entre o DegustAR (o restaurante faz o 3D) e o menuAR (caro e com contrato longo).
- **Diferencial no resultado, não no AR:** um relatório do tipo "pratos com 3D venderam X% a mais", com métricas por prato. Nenhum concorrente publica isso.
- **O AR sozinho não segura a assinatura.** Quem segura é o cardápio que o restaurante usa todo dia (preço, disponibilidade, QR, métricas). O 3D é o diferencial.

## 4. Referências open source (GitHub)

Há dezenas de repositórios com essa ideia, todos pequenos (0 a 2 estrelas). **O software não é a barreira de entrada; a qualidade dos modelos e a venda são.** Dois repositórios valem estudo. Use como **referência de ideias**: não copie código sem conferir a licença.

**[Diasprogramador/ar-menu](https://github.com/Diasprogramador/ar-menu):** React, Vite, Supabase com RLS, three.js e WebXR próprio. Tem docs excelentes (`docs/AR.md`, `docs/ARQUITETURA.md`, `docs/SEGURANCA.md`). O que aproveitamos:

- Memberships (`owner | admin | staff`) em vez de `users.restaurant_id`, e funções `is_member()` e `restaurant_is_public()` nas políticas de RLS.
- Eventos de métrica entram por uma **RPC `track_event` com lista branca de tipos**, nunca por insert direto. O `session_id` é anônimo.
- **Modo demonstração:** sem as chaves do Supabase, o cardápio usa dados estáticos. Ótimo para mostrar a clientes.
- Validação automática dos modelos no CI: dimensões, base em y = 0 e presença do USDZ.
- Lição: modelo 3D feito por código ou procedural "parece massinha". **Prato real vem de fotogrametria.**
- O que **não** copiamos: AR próprio com three.js e WebXR, rastreamento por câmera com marcador e carrinho de pedidos. É muito código para o MVP, e o model-viewer cobre 95% dos casos.

**[alvarogimenezcaceres-maker/menu](https://github.com/alvarogimenezcaceres-maker/menu):** Next.js com Payload, usado num piloto real na Espanha. O que aproveitamos:

- O pipeline de fotogrametria **COLMAP → OpenMVS → Blender → glTF-Transform**, que gera GLB de até 3 MB e USDZ. Roda num worker (até num runner do GitHub Actions).
- Um tapete com marcadores (ChArUco) sob o prato para tirar a escala automaticamente.
- TRELLIS.2 (IA que gera 3D a partir de fotos) como plano B quando a fotogrametria falha.
- A conclusão dele, que é a mesma nossa: **pratos brilhantes e líquidos falham**; oferecer "a gente escaneia para você".

## 5. Como o AR funciona

Ordem de tentativa (o model-viewer escolhe sozinho, na ordem de `ar-modes`):

| Aparelho | Caminho | Arquivo |
|---|---|---|
| Android com Serviços de RA do Google | WebXR, ou Scene Viewer como alternativa | `.glb` |
| iPhone/iPad | AR Quick Look | **`.usdz` gerado no pipeline** (`ios-src`) |
| Android sem ARCore, desktop, sem WebGL XR | Visualizador 3D (girar e dar zoom) | `.glb` |
| Sem WebGL ou sem modelo | Foto do prato | `.webp` |

```html
<model-viewer
  src="https://cdn.../pizzaria-x/margherita.v3.glb"
  ios-src="https://cdn.../pizzaria-x/margherita.v3.usdz"
  poster="https://cdn.../pizzaria-x/margherita.v3.webp"
  alt="Pizza Margherita, 35 cm de diâmetro"
  ar ar-modes="webxr scene-viewer quick-look"
  ar-scale="fixed" ar-placement="floor"
  camera-controls touch-action="pan-y"
  shadow-intensity="1" environment-image="neutral"
  loading="lazy" reveal="interaction">
</model-viewer>
```

**Regras que não podem ser quebradas**

- **A unidade dos modelos é o metro.** 1 unidade = 1 m. Um hambúrguer tem cerca de 0,12.
- **O eixo Y aponta para cima**, e a origem fica no centro da base, em y = 0.
- **HTTPS sempre.** Sem ele não tem câmera nem AR.
- **Os modelos ficam em URL pública, com CORS liberado** (`Access-Control-Allow-Origin: *`). O Scene Viewer baixa o arquivo pela URL.
- **MIME correto:** `.glb` como `model/gltf-binary` e `.usdz` como `model/vnd.usdz+zip`. Servido como `application/octet-stream`, o iPhone **baixa** o arquivo em vez de abrir o AR.
- **A extensão do arquivo precisa ser a real** (`.glb` e `.usdz`). O protótipo usa `.glb.wasm`; corrigir isso (seção 13).
- **Gere o USDZ no pipeline**, não deixe o model-viewer converter no celular. A conversão no aparelho é lenta e perde qualidade de material.
- **O tamanho de cada modelo vai de 1 a 3 MB** (máximo de 5 MB). Texturas de até 2048 px.
- **Use nomes com versão** (`margherita.v3.glb`) e cache `immutable`. Para trocar o modelo, suba uma versão nova; nunca sobrescreva o arquivo.

**Armadilhas conhecidas**

- **O navegador interno do Instagram e de outros apps não abre o AR direito.** Detecte pelo user agent (`Instagram`, `FBAN`, `FBAV`) e mostre um aviso: "Para ver na sua mesa, abra no Safari/Chrome". É o único lugar onde a detecção por user agent se justifica.
- **Luz baixa, mesa de vidro ou toalha branca lisa** atrapalham a detecção da superfície. Mostre uma dica antes de abrir o AR: "aponte para a mesa e mova o celular devagar". Mesa de madeira funciona melhor.
- **Muitos Androids de entrada não têm ARCore.** O fallback para 3D é obrigatório e precisa ser bom. Registre o evento `ar_unsupported` para medir quantos são.
- Prefira **detectar o recurso** (`canActivateAR` do model-viewer) a escrever `if (isIOS)`.

## 6. Pipeline de modelos 3D

```
Captura → Reconstrução → Limpeza → Escala → Otimização → Validação → Upload
```

1. **Captura:** de 50 a 150 fotos, com o prato sobre uma base giratória, luz difusa e fundo neutro. Coloque **um tapete com marcadores (ChArUco) ou uma régua** sob o prato para a escala. Defina um **tempo máximo de captura** (comida derrete e murcha) e use um prato montado só para a foto.
   Ferramentas: Polycam, RealityScan, Object Capture (iPhone Pro) ou o pipeline open source COLMAP → OpenMVS.
2. **Limpeza (Blender):** tirar a base e o fundo, fechar buracos, centralizar e apoiar em y = 0.
3. **Escala:** usar o tapete ou medir com régua e ajustar para metros.
4. **Otimização:**
   ```bash
   node scripts/optimize-model.mjs prato.glb            # gera prato.otimizado.glb e já valida
   ```
   O script usa quantização (`KHR_mesh_quantization`), texturas WEBP de até 2048 px e uma simplificação conservadora da malha. Nos modelos de demonstração, os arquivos ficaram de 48% a 55% menores, com escala e base intactas. Meta: de 20 a 60 mil triângulos e de 1 a 3 MB.
   **Não use Draco nem Meshopt:** com eles, o model-viewer baixa o decodificador de uma CDN externa (mais uma requisição e uma dependência de terceiros). A quantização é lida nativamente pelo three.js; isso foi testado, sem nenhuma requisição externa.
5. **USDZ:** exportar pelo Blender (exportador USD) ou pelo Reality Converter.
6. **Poster:** um render ou foto em `.webp` (de 800 a 1200 px). Aparece enquanto o 3D carrega.
7. **Validação automática** (`scripts/check-model.mjs`, com `@gltf-transform/core`):
   - a caixa que envolve o modelo fica entre 2 cm e 80 cm em cada eixo (fora disso, a unidade quase certamente está errada);
   - a base fica em y ≈ 0 (tolerância de 2 mm);
   - o arquivo tem até 5 MB, as texturas até 2048 px e existe um USDZ correspondente;
   - as medidas batem com o `dims_cm` cadastrado (diferença de até 10%).
   O mesmo script roda no painel, quando o modelo é enviado.
8. **QA:** testar num Android e num iPhone de verdade, com o prato real do lado.

**Escaneia bem:** hambúrguer, pizza, sobremesas, sushi, salgados, pratos secos.
**Escaneia mal:** sopas, bebidas, vidro, molhos brilhantes. Nesses casos, usar foto, vídeo curto ou um modelo feito à mão.

## 7. Escopo do MVP

**Entra no MVP**

- Cardápio público por restaurante: `/{slug}`. Link direto do prato: `/{slug}/p/{item-slug}` (bom para Instagram).
- Categorias, pratos, preço, descrição, foto, disponibilidade e 3D (opcional por prato).
- Botão de AR com fallback para 3D e depois para foto, incluindo o aviso de navegador de app (seção 5).
- Painel admin: editar pratos, preço e disponibilidade, enviar foto e modelo (com validação), gerenciar mesas e QR codes.
- QR por mesa: `/{slug}?m={token}`. O token é fixo; renomear a mesa não quebra o QR impresso.
- Métricas: visualização do cardápio, do prato, do 3D e do AR, e AR sem suporte. Por prato e por mesa.
- Modo demonstração (dados estáticos, sem Supabase) para vendas.

**Fica fora do MVP (depois)**

- Pedido e pagamento pelo cardápio. Um "Pedir pelo WhatsApp" com mensagem pronta é barato e pode entrar logo depois.
- Integração com PDV ou iFood.
- Vários idiomas.
- 3D gerado por IA a partir de fotos tiradas pelo próprio restaurante.
- AR próprio com WebXR e rastreamento por câmera (o modelo do Diasprogramador).

## 8. Arquitetura

```
[Celular do cliente] ──HTTPS──> [Cloudflare Pages]  SPA estática (HTML/JS/CSS), grátis, uso comercial
                                   │
                                   ├──> [Supabase Free]       RPC get_menu(slug), RPC track_event,
                                   │     Postgres + RLS        Auth do painel /admin
                                   │
                                   └──> [Cloudflare R2 Free]  .glb / .usdz / .webp
                                         (domínio próprio)     públicos, CORS, MIME, cache immutable
```

- **O cardápio público carrega uma SPA leve e faz uma única chamada**, `get_menu(slug)`, que devolve restaurante, categorias, pratos e modelos num JSON só (cerca de 20 KB). Meta: menos de 2 s no 4G.
- **O script do model-viewer só carrega quando precisa** (`import()` dinâmico, na página do prato ou quando um card com 3D aparece na tela). Ele nunca entra no bundle inicial.
- **Arquivos no piloto:** fotos e modelos ficam no Supabase Storage (bucket `menu`), enviados pelo painel. **Acompanhe o download no painel do Supabase.** Ao chegar perto de 5 GB por mês, migre os arquivos para o R2, onde o download é grátis; aí o Supabase volta a trafegar só JSON.
- **As métricas** vão pela RPC `track_event` (anônima, com lista branca de tipos e limite de 60 eventos por minuto por `session_id`). O envio é um `fetch` com `keepalive`, sem esperar resposta. Não usamos `sendBeacon` porque ele não permite mandar o header `apikey`.
- **O cardápio público não usa o supabase-js.** Ele chama as RPCs com `fetch` direto (`src/lib/rpc.ts`), o que tira uns 50 KB do bundle. O supabase-js entra só no painel `/admin`.
- **Sem servidor próprio.** As regras de negócio ficam no banco (RLS e RPC).
- **Cuidado ao criar funções no Supabase:** ele concede `EXECUTE` ao papel `anon` por padrão. Em função que o público não pode chamar, use `revoke execute ... from public, anon`; revogar só de `public` não basta.
- **Upload:** feito pelo painel `/admin` (seção 7). A foto é comprimida no navegador (cerca de 1200 px, WEBP, ou JPEG no Safari antigo). O `.glb` é lido e validado no navegador com as mesmas regras do `scripts/check-model.mjs` (`src/lib/model-rules.ts`) **antes** de subir. Quando migrar para o R2, o upload passa a usar uma Supabase Edge Function que gera URL pré-assinada (500 mil chamadas por mês no plano grátis).
- **Armadilha do upload:** o supabase-js envia `File`/`Blob` como formulário, e o Storage grava o **tipo do Blob**, ignorando a opção `contentType`. Um `.glb` vindo do seletor de arquivos tem tipo vazio e é recusado pelo bucket. Por isso `uploadFile()` recria o Blob com o tipo certo.
- **`publish_item_model` (RPC):** publica um modelo novo numa transação só. O modelo anterior vira `draft` e o novo entra com a próxima versão.
- **Preview de link no Instagram e no WhatsApp (depois do MVP):** uma SPA não tem `<meta og:*>` por prato. Quando isso fizer falta, criar uma Cloudflare Pages Function que injeta as meta tags em `/{slug}/p/{item}` (100 mil requisições por dia no plano grátis).

**Stack**

- Vite, React, TypeScript estrito, React Router, Tailwind e `@google/model-viewer` (versão fixada).
- Supabase: Postgres, Auth (e-mail e senha) e RLS. O Storage do Supabase não é usado (seção 12.1).
- Cloudflare: Pages (site), R2 (arquivos) e DNS.
- `@gltf-transform/core` e `@gltf-transform/cli` para validar e otimizar modelos.
- `qrcode` para gerar o PNG ou SVG da plaquinha da mesa.
- Vitest para as regras (formato de preço, escala, validação de modelo) e Playwright para o fluxo do cardápio.

## 9. Modelo de dados

```sql
restaurants    (id, slug unique, name, logo_url, theme_color, whatsapp,
                status,                       -- 'trial' | 'active' | 'suspended'
                created_at)
memberships    (user_id → auth.users, restaurant_id, role)   -- 'owner' | 'admin' | 'staff'
categories     (id, restaurant_id, name, position)
items          (id, restaurant_id, category_id, slug, name, description,
                price_cents int, serves, photo_url,
                is_available, position, created_at)
                unique (restaurant_id, slug)
item_models    (id, restaurant_id, item_id, version,
                glb_url, usdz_url, poster_url,
                dims_cm jsonb,                 -- {w, d, h} ou {diameter, h}
                bbox_m jsonb, size_bytes,      -- preenchidos pela validação
                status,                        -- 'draft' | 'published'
                created_at)
                -- só 1 'published' por item
tables         (id, restaurant_id, label, token unique)      -- token vai no QR
events         (id, restaurant_id, item_id null, table_id null,
                type,       -- 'menu_view' | 'item_view' | 'open_3d' | 'open_ar' | 'ar_unsupported'
                session_id, -- aleatório, gerado no navegador, sem dado pessoal
                device,     -- 'ios' | 'android' | 'desktop' | 'in_app'
                created_at)
```

**Regras**

- O preço é sempre em **centavos** (inteiro).
- Toda tabela com dono tem `restaurant_id` direto, mesmo quando dá para chegar a ele por relação, para manter o RLS simples.
- RLS: o `anon` só lê `restaurants`, `categories`, `items`, `item_models (published)` e `tables` de restaurantes que não estejam `suspended`. O `anon` nunca lê `events` nem `memberships`, e escreve em `events` **apenas pela RPC**.
- Um item com modelo publicado precisa ter `photo_url` (a foto é o fallback). Validar no painel e numa constraint ou trigger.
- Arquivos (bucket `menu`): `{restaurant_id}/{item-slug}.{carimbo}.{webp|jpg|glb|usdz}`. O nome é único, nunca sobrescrito, com cache de 1 ano. Só membro `owner` ou `admin` daquele restaurante escreve (política sobre a primeira pasta do caminho). O bucket aceita até 10 MB por arquivo e só os tipos webp, jpeg, png, gltf-binary e usdz.
- Slugs reservados (não podem ser de restaurante): `admin`, `login`, `api`, `assets`, `demo`, `r`.
- Ao migrar para o R2: o bucket precisa de CORS (`GET` de qualquer origem) e de domínio público próprio (`arquivos.seudominio.com.br`). O subdomínio `r2.dev` é só para teste.

## 10. Estrutura de pastas

```
cardapio-ar/
├─ src/
│  ├─ main.tsx, App.tsx              # rotas (React Router)
│  ├─ pages/
│  │  ├─ HomePage.tsx                # /, apresentação e link para a demo
│  │  ├─ MenuPage.tsx                # /:slug, cardápio público (?m=token da mesa)
│  │  ├─ ItemPage.tsx                # /:slug/p/:item, 3D, AR e medidas
│  ├─ admin/                         # painel, carregado sob demanda (React.lazy)
│  │  ├─ AdminApp.tsx                # rotas /admin/*
│  │  ├─ LoginPage.tsx               # /login (e-mail e senha)
│  │  ├─ ItemsPage.tsx               # lista de pratos, esgotado/disponível
│  │  ├─ ItemFormPage.tsx            # cadastrar/editar: foto (câmera), dados, 3D com prévia e validação
│  │  ├─ session.tsx, admin-context.ts  # login + restaurante do usuário
│  │  ├─ data.ts                     # consultas, RPCs e upload (supabase-js)
│  │  ├─ model-inspect.ts            # lê o .glb no navegador (gltf-transform)
│  │  ├─ AdminHeader.tsx             # cabeçalho + abas (Pratos, Mesas e QR, Métricas)
│  │  ├─ CategoriesPage.tsx          # criar, renomear, reordenar, excluir categorias
│  │  ├─ TablesPage.tsx              # mesas, QR code, novo código, baixar SVG
│  │  ├─ PrintTablesPage.tsx         # folha A4 com as plaquinhas para imprimir
│  │  ├─ QrCode.tsx                  # QR em SVG (biblioteca qrcode)
│  │  └─ MetricsPage.tsx             # visitas, pratos, mesas, aparelhos, gráfico por dia
│  ├─ components/
│  │  ├─ menu/ (MenuItemCard, CategoryTabs)
│  │  ├─ ar/   (ModelViewer.tsx, InAppBrowserNotice.tsx, model-viewer.d.ts)
│  │  └─ StatusScreen.tsx            # carregando, não encontrado, erro
│  └─ lib/
│     ├─ env.ts                      # config do Supabase; recusa chave secreta
│     ├─ rpc.ts                      # fetch direto às RPCs (sem supabase-js)
│     ├─ menu.ts                     # getMenu + cache + useMenu
│     ├─ analytics.ts                # track() → fetch keepalive → RPC track_event
│     ├─ format.ts                   # BRL e medidas
│     ├─ device.ts                   # in-app browser, tipo de aparelho
│     ├─ types.ts                    # formato do get_menu
│     ├─ model-rules.ts              # regras do modelo 3D (painel + script)
│     ├─ text.ts                     # slug, preço digitado → centavos
│     ├─ image.ts                    # compressão de foto no navegador
│     ├─ qr.ts                       # URL da mesa, SVG do QR, numeração de mesas
│     ├─ list.ts                     # mover item numa lista (reordenação)
│     └─ demo-data.ts                # modo demonstração (sem Supabase)
├─ public/
│  ├─ _headers                       # MIME de .glb/.usdz, CORS, cache, segurança
│  └─ demo/                          # modelos e fotos da demonstração
├─ supabase/
│  ├─ config.toml                    # signup público desligado
│  ├─ migrations/                    # schema, RLS, RPC
│  └─ seed.sql
├─ scripts/
│  ├─ check-model.mjs                # validação de escala, base, tamanho e USDZ
│  ├─ optimize-model.mjs             # otimiza um .glb (quantização + WEBP) e valida
│  └─ create-owner.mjs               # cria a conta do restaurante (usa a service key, local)
├─ tests/e2e/                        # Playwright (modo demo ou Supabase local)
├─ .github/workflows/
│  ├─ ci.yml                         # lint, build, testes, e2e (demo e com Supabase local)
│  └─ keepalive.yml                  # consulta a cada 3 dias (Supabase grátis não pausar)
├─ prototype/                        # protótipo estático da Fase 0 (referência)
├─ CONTEXT.md
└─ README.md
```

Sem um `404.html`, o Cloudflare Pages já trata o site como SPA. **Não crie `_redirects` com `/* /index.html 200`**: é desnecessário e o Pages acusa loop.

## 11. Requisitos não funcionais

- **Performance:** o cardápio abre em menos de 2 s no 4G. Bundle inicial de até ~150 KB gzip. Fotos em `.webp` de até 80 KB, com `loading="lazy"`. O model-viewer só carrega quando precisa. Modelos com `loading="lazy"` e poster.
- **Compatibilidade:** testar sempre em Android (Chrome), iPhone (Safari) **e no navegador interno do Instagram**.
- **Acessibilidade:** `alt` descritivo no 3D (com as medidas), bom contraste, botões de pelo menos 48 px. O cardápio é usado em restaurante com pouca luz.
- **Dark mode:** é o padrão do cardápio público, por causa do ambiente escuro.
- **LGPD:** as métricas são anônimas, com `session_id` aleatório, sem cookie de rastreamento e sem dado pessoal do cliente final.
- **Segurança:** a chave `service_role` nunca vai para o navegador. A segurança está no RLS; o que o front esconde é só usabilidade.

## 12. Modelo de negócio (hipótese a validar no piloto)

- **Setup:** escaneamento por prato (referência de mercado: de R$ 100 a R$ 300 por prato) ou pacote (por exemplo, 10 pratos).
- **Assinatura:** de R$ 250 a R$ 450 por mês, sem fidelidade. Inclui hospedagem, painel, QR codes e métricas.
- **Upsell:** atualizar modelos quando o cardápio mudar, pedido pelo WhatsApp e relatório mensal de desempenho.
- **Nicho inicial:** hamburguerias, pizzarias, docerias e açaiterias. São pratos que escaneiam bem e têm público jovem.
- **Falta medir:** horas e custo reais por prato escaneado. É isso que define o preço do setup.

### 12.1 Custo de operação: zero até a primeira venda

| Item | Serviço | Limite grátis | Custo |
|---|---|---|---|
| Site | Cloudflare Pages | Tráfego estático ilimitado, 500 builds por mês, uso comercial permitido | R$ 0 |
| Banco e login | Supabase Free | 500 MB de banco, 5 GB de download, 50 mil usuários ativos por mês, 2 projetos | R$ 0 |
| Fotos e modelos 3D (piloto) | Supabase Storage (no mesmo plano grátis) | 1 GB armazenado, 5 GB de download por mês (dividido com o banco) | R$ 0 |
| Fotos e modelos 3D (depois) | Cloudflare R2 Free | 10 GB armazenados, **download grátis**, 1 milhão de escritas e 10 milhões de leituras por mês (exige cartão cadastrado, sem cobrança dentro do limite) | R$ 0 |
| Código e CI | GitHub (repositório privado) e Actions | 2.000 minutos por mês | R$ 0 |
| Domínio | `.com.br` no Registro.br | Opcional no começo: dá para usar `*.pages.dev` | ~R$ 40 por ano (≈ R$ 3,50 por mês) |
| Escaneamento | Celular próprio, RealityScan (app grátis), Blender, gltf-transform, COLMAP | Luz natural de janela e prato giratório de bolo | R$ 0 a ~R$ 30, uma vez só |
| Cobrança dos clientes | Pix manual no início | Sem mensalidade | R$ 0 |
| **Total** | | | **R$ 0 a ~R$ 4 por mês** |

**Cuidados com o plano grátis**

- **O Supabase Free pausa o projeto depois de 7 dias sem atividade.** Com cardápio em uso, isso não acontece. Antes do primeiro cliente, use um GitHub Action agendado que faz uma consulta simples a cada 3 dias.
- **O e-mail padrão do Supabase só envia para membros da equipe do projeto.** No MVP, **nós criamos a conta do dono** (e-mail e senha, sem confirmação por e-mail) durante a implantação. Recuperação de senha e convites por e-mail entram depois, com um SMTP grátis (Resend: 3 mil e-mails por mês, exige domínio próprio).
- **Download do Supabase (5 GB por mês):** no piloto, fotos e modelos dividem esse limite com o banco. Com fotos de cerca de 80 KB e modelos de 1 a 3 MB, isso dá algo como 1.500 aberturas de 3D por mês. Ao passar de 1 ou 2 restaurantes, migre os arquivos para o R2.
- **Banco de 500 MB:** a tabela `events` é a que mais cresce. A função `rollup_old_events()` roda todo dia pelo pg_cron (incluído no plano grátis). Ela agrega os eventos com mais de 90 dias em `events_daily` e apaga os brutos. As métricas do painel cobrem até 90 dias.
- **Quando pagar (primeiros clientes):** Supabase Pro (US$ 25 por mês) só quando chegar perto dos limites ou houver mais de 3 ou 4 clientes. Isso já é pago com 1 cliente. O Cloudflare continua grátis por muito tempo.

**Teste em aparelhos sem custo:** o seu celular, mais um iPhone e um Android emprestados de amigos, para o teste da seção 6, passo 8. Os modelos podem ser conferidos rapidamente no [model-viewer editor](https://modelviewer.dev/editor/).

## 13. Roadmap

1. **Fase 0 (feito):** protótipo estático com 3 pratos, agora em `prototype/`.
   - [x] Renomear `models/*.glb.wasm` para `.glb`.
   - [x] Mover o protótipo para `prototype/`.
   - [ ] Testar o AR num Android e num iPhone de verdade (instruções no README, seção "Testar o AR no celular").
2. **Fase 1 (piloto):** escanear de 5 a 10 pratos de 1 restaurante e cronometrar o tempo por prato. **Critérios de sucesso definidos antes do piloto:**
   - mais de 30% das sessões abrem o 3D ou o AR;
   - os pratos com 3D vendem mais que no mesmo período anterior (dados do PDV do restaurante);
   - o dono aceita pagar a assinatura depois do piloto.
3. **Fase 2 (MVP, custo zero):** SPA em Vite e React no Cloudflare Pages, Supabase Free e R2 Free. O primeiro piloto pode ser **grátis em troca de depoimento e dados de venda**.
   - [x] Projeto Vite + React + TS + Tailwind, com testes (Vitest e Playwright).
   - [x] Banco: schema, RLS e RPCs (`get_menu`, `track_event`, `set_item_availability`), testados localmente (isolamento entre restaurantes, papéis, regra da foto, restaurante suspenso, limite de eventos).
   - [x] Cardápio público, página do prato com 3D e AR, aviso de navegador de app, métricas com mesa, modo demonstração.
   - [x] `scripts/check-model.mjs`.
   - [x] Login e painel `/admin`: cadastrar e editar pratos (foto pela câmera, 3D com prévia e validação), disponibilidade, excluir. Testado de ponta a ponta contra o Supabase local.
   - [x] Painel: mesas e QR codes (com folha de impressão), métricas (`restaurant_metrics`), categorias e ordem dos pratos.
   - [x] `scripts/optimize-model.mjs` e `scripts/create-owner.mjs`.
   - [x] Retenção: eventos com mais de 90 dias viram `events_daily` (pg_cron, todo dia às 03:15 em São Paulo).
   - [x] CI no GitHub e rotina `keepalive` (falta configurar os secrets ao criar o projeto de produção).
   - [ ] Migração dos arquivos para o R2 (quando o tráfego pedir).
   - [ ] Deploy no Cloudflare Pages e projeto Supabase de produção.
4. **Fase 3:** de 3 a 5 restaurantes pagantes. Ajustar o preço e padronizar a captura (tapete ChArUco, tempo por prato). Assinar o Supabase Pro quando a receita cobrir. Cobrança recorrente automática (Asaas ou Mercado Pago, que cobram só por transação).
5. **Fase 4:** pedido pelo WhatsApp, 3D gerado por IA a partir de fotos (o restaurante faz sozinho) e integrações.

## 14. Convenções

- O código fica em inglês e o texto da interface em português (pt-BR).
- Nome dos arquivos no storage: `{restaurant_id}/{item-slug}.{carimbo}.{ext}`, gerado pelo painel. A versão do modelo fica em `item_models.version`.
- Preço em centavos. Medidas em metros (no modelo) e em centímetros (no banco e na interface).
- Todo prato com 3D precisa de uma foto como fallback.
- Toda mudança de schema entra por migration em `supabase/migrations/`, nunca pelo painel do Supabase.
