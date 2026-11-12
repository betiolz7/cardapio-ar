#!/usr/bin/env node
// Valida modelos .glb com as MESMAS regras do painel (src/lib/model-rules.ts):
//   - unidade em metros: cada eixo entre 2 cm e 80 cm
//   - base apoiada em y = 0 (tolerância de 2 mm)
//   - arquivo até 5 MB (aviso acima de 3 MB), texturas até 2048 px
//   - USDZ correspondente ao lado (aviso; erro com --require-usdz)
//   - medidas batem com --dims (tolerância de 10%)
//
// Uso:
//   node scripts/check-model.mjs public/demo/models/*.glb
//   node scripts/check-model.mjs pizza.glb --dims diameter=35,h=3 --require-usdz
//   node scripts/check-model.mjs pizza.glb --json
//
// Requer Node 22.18+ (importa o .ts direto, com remoção de tipos nativa).

import { existsSync, globSync, statSync } from 'node:fs'
import { NodeIO, getBounds } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import { checkModel, cm, mb, suggestDims } from '../src/lib/model-rules.ts'

function parseArgs(argv) {
  const files = []
  const opts = { dims: null, requireUsdz: false, json: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--require-usdz') opts.requireUsdz = true
    else if (a === '--json') opts.json = true
    else if (a === '--dims') opts.dims = parseDims(argv[++i])
    // No Windows o npm usa o cmd, que não expande "*.glb": expandimos aqui.
    else if (a.includes('*')) files.push(...globSync(a.replace(/\\/g, '/')).sort())
    else files.push(a)
  }
  return { files, opts }
}

// "diameter=35,h=3" ou "w=12,d=12,h=9" (centímetros)
function parseDims(text) {
  if (!text) throw new Error('--dims precisa de um valor, ex.: diameter=35,h=3')
  return Object.fromEntries(
    text.split(',').map((pair) => {
      const [k, v] = pair.split('=')
      const n = Number(v)
      if (!['w', 'd', 'h', 'diameter'].includes(k) || !(n > 0)) throw new Error(`--dims inválido: "${pair}"`)
      return [k, n]
    }),
  )
}

async function readFacts(io, path) {
  const doc = await io.read(path)
  const root = doc.getRoot()
  const scene = root.getDefaultScene() ?? root.listScenes()[0]
  if (!scene) throw new Error('o arquivo não tem cena')
  const { min, max } = getBounds(scene)
  return {
    facts: {
      size: { x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2] },
      minY: min[1],
      bytes: statSync(path).size,
      textures: root.listTextures().map((t) => {
        const [width, height] = t.getSize() ?? [0, 0]
        return { name: t.getName() || t.getURI() || '?', width, height }
      }),
      hasUsdz: existsSync(path.replace(/\.glb$/i, '.usdz')),
      extensions: root.listExtensionsUsed().map((e) => e.extensionName),
    },
    bbox: { min, max },
  }
}

async function main() {
  const { files, opts } = parseArgs(process.argv.slice(2))
  if (files.length === 0) {
    console.error('Uso: node scripts/check-model.mjs <arquivo.glb> [...] [--dims diameter=35,h=3] [--require-usdz] [--json]')
    process.exit(2)
  }

  await MeshoptDecoder.ready
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })

  const results = []
  for (const path of files) {
    try {
      const { facts, bbox } = await readFacts(io, path)
      const report = checkModel(facts, { dims: opts.dims, requireUsdz: opts.requireUsdz })
      results.push({ path, facts, bbox, suggestedDims: suggestDims(facts.size), ...report })
    } catch (err) {
      results.push({ path, errors: [`Não consegui ler: ${err.message}`], warnings: [] })
    }
  }

  if (opts.json) {
    console.log(JSON.stringify(results, null, 2))
  } else {
    for (const r of results) {
      const status = r.errors.length ? 'ERRO' : r.warnings.length ? 'AVISO' : 'OK'
      console.log(`\n[${status}] ${r.path}${r.facts ? `  (${mb(r.facts.bytes)})` : ''}`)
      if (r.facts) {
        const s = r.facts.size
        console.log(`  medidas: ${cm(s.x)} x ${cm(s.y)} (altura) x ${cm(s.z)}   base y = ${cm(r.facts.minY)}`)
        console.log(`  sugestão de cadastro (cm): ${JSON.stringify(r.suggestedDims)}`)
      }
      for (const e of r.errors) console.log(`  ✗ ${e}`)
      for (const w of r.warnings) console.log(`  ! ${w}`)
    }
  }

  process.exit(results.some((r) => r.errors.length) ? 1 : 0)
}

main()
