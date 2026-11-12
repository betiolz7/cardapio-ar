# CONTEXT.md: Cardápio AR

> Contexto do projeto para quem for desenvolver (pessoa ou IA). Leia antes de mexer no código.

## 1. O que é

Um cardápio digital para restaurantes em que o cliente vê os pratos em **3D** e em **realidade aumentada, no tamanho real**, em cima da própria mesa, direto no navegador do celular, sem instalar app.

**Fluxo do cliente**

1. Escaneia o QR code da mesa.
2. Abre o cardápio do restaurante (web).
3. Gira o prato em 3D e toca em **"Ver em tamanho real"**.
4. A câmera abre, ele aponta para a mesa e o prato aparece na escala 1:1.

**Para quem**

- **Cliente final:** decide melhor o que pedir (tamanho, aparência, porção).
- **Restaurante:** vende mais (ticket médio maior, menos devolução por "não era o que eu esperava") e ganha um diferencial de marketing.

## 2. Estado atual

Existe um **protótipo funcional** (pasta `cardapio-ar/`):

- `index.html`: cardápio estático com 3 pratos, filtro por categoria e o botão de AR.
- `models/*.glb`: modelos 3D estilizados, gerados por código, em escala real (hambúrguer de ~12 cm, pizza de 35 cm, açaí de ~14 cm).
- Usa `@google/model-viewer@3.5.0` via CDN.
- Faz deploy estático (por exemplo, Netlify Drop) e precisa de HTTPS.

A lista de pratos fica no array `ITEMS` dentro do `index.html`. Isso vai migrar para um banco de dados (ver seção 6).

## 3. Como o AR funciona (decisões técnicas)

| Plataforma | Tecnologia | Formato do modelo |
|---|---|---|
| Android | Scene Viewer (Google) ou WebXR | `.glb` |
| iPhone/iPad | AR Quick Look (Apple) | `.usdz`, gerado automaticamente pelo model-viewer a partir do `.glb` (ou enviado manualmente para ter mais qualidade) |
| Desktop / celular sem AR | Visualizador 3D (girar e dar zoom) + QR code | `.glb` |

Configuração-chave do `<model-viewer>`:

```html
<model-viewer src="models/prato.glb"
  ar ar-modes="webxr scene-viewer quick-look"
  ar-scale="fixed"        <!-- impede o cliente de redimensionar: tamanho real sempre -->
  ar-placement="floor"    <!-- superfície horizontal (a mesa) -->
  camera-controls shadow-intensity="1" environment-image="neutral">
</model-viewer>
```

**Regras que não podem ser quebradas**

- **A unidade dos modelos é o metro.** 1 unidade = 1 m. Um hambúrguer tem cerca de 0,12, não 12. Se a escala errar, o "tamanho real" deixa de ser real.
- **O eixo Y aponta para cima**, e a base do prato fica em y = 0 (assim ele não flutua nem afunda na mesa).
- **O site precisa de HTTPS.** Sem ele não tem câmera nem AR.
- **Os arquivos de modelo precisam ser públicos.** O Scene Viewer baixa o `.glb` pela URL.
- **Cada modelo deve ter no máximo uns 5 MB** (o ideal é 1 a 3 MB) para carregar rápido no 4G.

## 4. Pipeline de modelos 3D (o coração do negócio)

```
Fotografar prato → Fotogrametria → Limpeza → Escala real → Otimização → Upload
```

1. **Captura:** de 50 a 150 fotos ao redor do prato, com luz difusa, fundo neutro e o prato sobre uma base giratória. Ferramentas: **Polycam**, **Luma AI**, **RealityScan** ou **Object Capture** (iPhone Pro com LiDAR).
2. **Limpeza (Blender):** remover a mesa e o fundo, fechar buracos, centralizar e apoiar no chão (y = 0).
3. **Escala:** medir o prato real com uma régua e ajustar o modelo em metros.
4. **Otimização:** reduzir os polígonos (de 20 a 60 mil triângulos), aplicar texturas de 1024 a 2048 px em WebP/KTX2 e compressão Draco/Meshopt:

   ```bash
   npx @gltf-transform/cli optimize entrada.glb saida.glb --texture-compress webp
   ```

5. **USDZ (opcional, para mais qualidade no iPhone):** usar o Reality Converter (Mac) ou o Blender.
6. **QA:** testar num Android e num iPhone de verdade, comparando com o prato real ao lado.

**O que escaneia bem:** hambúrguer, pizza, sobremesas, sushi, pratos secos e sólidos.
**O que escaneia mal:** sopas, bebidas, vidro, molhos brilhantes e coisas transparentes. Nesses casos, usar foto ou um modelo feito à mão.

## 5. Escopo do MVP

**Entra no MVP**

- Cardápio público por restaurante: `cardapio.app/{restaurante}`.
- Categorias, pratos, preço, descrição, foto e modelo 3D (opcional por prato).
- Botão de AR com fallback para 3D, e para foto quando não houver modelo.
- Painel admin simples para o restaurante editar pratos e preços.
- QR code por mesa: `?mesa=12`.
- Métricas básicas: visualizações por prato e aberturas de AR.

**Fica fora do MVP (depois)**

- Pedido e pagamento pelo cardápio.
- Integração com PDV/iFood.
- Vários idiomas.
- Escaneamento feito pelo próprio restaurante no app.

## 6. Arquitetura proposta

```
[Cliente (celular)] ──HTTPS──> [Front-end Next.js (Vercel)]
                                      │
                                      ├──> [Supabase: Postgres + Auth]  dados e login do admin
                                      └──> [Storage/CDN: Supabase Storage ou Cloudflare R2]
                                             .glb / .usdz / fotos (públicos, com cache)
```

**Stack sugerida**

- **Front:** Next.js (App Router) + TypeScript + Tailwind + `@google/model-viewer`.
- **Back/DB/Auth:** Supabase (Postgres, Auth, Storage, Row Level Security).
- **Arquivos 3D:** Cloudflare R2 (sem custo de saída de dados) ou Supabase Storage.
- **Deploy:** Vercel.
- **Métricas:** tabela própria de eventos ou PostHog.

Para começar mais simples, dá pra trocar o banco por um JSON por restaurante e um site estático. Funciona até uns 5 clientes.

## 7. Modelo de dados

```sql
restaurants (id, slug, name, logo_url, theme_color, whatsapp, created_at)
users       (id, email, restaurant_id, role)            -- 'owner' | 'staff'
categories  (id, restaurant_id, name, position)
items       (id, restaurant_id, category_id, name, description,
             price_cents, serves, photo_url,
             model_glb_url, model_usdz_url,               -- nulos = sem 3D
             dims_cm jsonb,                               -- {x,y,z} para exibir
             is_available, position, created_at)
tables      (id, restaurant_id, label)                    -- "Mesa 12" → QR
events      (id, restaurant_id, item_id, table_id,
             type,                                        -- 'view' | 'open_3d' | 'open_ar'
             device, created_at)
```

Preço sempre em **centavos** (inteiro), nunca em float.

## 8. Estrutura de pastas (Next.js)

```
cardapio-ar/
├─ app/
│  ├─ [slug]/page.tsx            # cardápio público do restaurante
│  ├─ [slug]/item/[id]/page.tsx  # link direto de um prato (bom para Instagram)
│  ├─ admin/                     # painel (protegido por login)
│  │  ├─ page.tsx                # lista de pratos
│  │  ├─ itens/[id]/page.tsx     # editar prato + upload de modelo
│  │  ├─ mesas/page.tsx          # gerar QR codes
│  │  └─ metricas/page.tsx
│  └─ api/events/route.ts        # registrar view / AR
├─ components/
│  ├─ MenuItemCard.tsx
│  ├─ ModelViewer.tsx            # wrapper do <model-viewer> (client component)
│  ├─ ArButton.tsx               # activateAR() + fallback
│  └─ CategoryTabs.tsx
├─ lib/
│  ├─ supabase.ts
│  ├─ format.ts                  # formatar BRL, medidas
│  └─ device.ts                  # detectar suporte a AR
├─ public/
├─ scripts/
│  └─ optimize-models.sh         # gltf-transform em lote
├─ CONTEXT.md
└─ README.md
```

## 9. Requisitos não funcionais

- **Performance:** o cardápio deve abrir em menos de 2 s no 4G. Os modelos carregam com `loading="lazy"` e só baixam quando aparecem na tela. Usar poster (foto) enquanto o 3D carrega.
- **Compatibilidade:** testar sempre em Android (Chrome) e iPhone (Safari). Android sem ARCore cai no 3D.
- **Acessibilidade:** `alt` em todos os modelos, contraste bom e botões grandes, porque o cardápio é usado em restaurante com pouca luz.
- **Dark mode:** pensar no uso em ambiente escuro.
- **LGPD:** as métricas são anônimas. Não coletar dados pessoais do cliente final.

## 10. Modelo de negócio (hipótese)

- **Setup:** escaneamento e modelagem dos pratos, cobrado por prato ou em pacote.
- **Assinatura mensal:** hospedagem, painel, QR codes e métricas.
- **Upsell:** atualização de modelos quando o cardápio mudar, e pedido pelo WhatsApp.
- **Nicho inicial sugerido:** hamburguerias, pizzarias, docerias e açaiterias. São pratos que escaneiam bem e têm público jovem que gosta da novidade.

## 11. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Modelo feio ou irreal afasta o cliente | Padrão de captura (luz, base giratória) + QA antes de publicar |
| Escanear cada prato dá trabalho | Começar com os 5 a 10 pratos mais vendidos, não com o cardápio inteiro |
| Celular sem suporte a AR | Fallback 3D e foto sempre |
| Arquivos pesados | Pipeline de otimização obrigatório + limite de upload |
| Concorrentes já existem | Foco no mercado local, preço acessível e escaneamento incluso |

## 12. Roadmap

1. **Fase 0 (feito):** protótipo estático com 3 pratos.
2. **Fase 1:** escanear os pratos reais de 1 restaurante piloto e testar com clientes de verdade.
3. **Fase 2:** MVP com Next.js + Supabase, painel admin, QR por mesa e métricas.
4. **Fase 3:** 3 a 5 restaurantes pagantes, ajustes de preço e processo de escaneamento.
5. **Fase 4:** pedido pelo WhatsApp e integrações.

## 13. Convenções

- O código fica em inglês e o texto da interface em português (pt-BR).
- Nome dos modelos: `{restaurante}-{prato}.glb`, em minúsculas e com hífen.
- Preço em centavos e medidas em metros (no modelo) e centímetros (na interface).
- Todo prato com 3D precisa de uma foto como fallback.
