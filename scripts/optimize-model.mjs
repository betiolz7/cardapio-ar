#!/usr/bin/env node
// Otimiza um modelo .glb para o cardápio (CONTEXT.md §6, passo 4) e valida o resultado.
//
//   node scripts/optimize-model.mjs entrada.glb [saida.glb] [--texture-size 2048] [--no-simplify]
//
// - Geometria: quantização (KHR_mesh_quantization). Não precisa de decodificador
//   externo; Draco e Meshopt fazem o model-viewer baixar um decodificador de CDN.
// - Texturas: WEBP, no máximo 2048 px.
// - Simplificação conservadora da malha (meshoptimizer), desligável com --no-simplify.
// Depois roda scripts/check-model.mjs no arquivo gerado.

import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--no-')))
const sizeIdx = args.indexOf('--texture-size')
const textureSize = sizeIdx >= 0 ? args[sizeIdx + 1] : '2048'
const files = args.filter((a, i) => !a.startsWith('--') && !(sizeIdx >= 0 && i === sizeIdx + 1))
const [input, outputArg] = files

if (!input || !existsSync(input)) {
  console.error('Uso: node scripts/optimize-model.mjs entrada.glb [saida.glb] [--texture-size 2048] [--no-simplify]')
  process.exit(2)
}
const output = outputArg ?? input.replace(/\.glb$/i, '.otimizado.glb')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cli = join(root, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js')

const optimizeArgs = [
  cli, 'optimize', input, output,
  '--compress', 'quantize',
  '--texture-compress', 'webp',
  '--texture-size', textureSize,
  '--simplify', flags.has('--no-simplify') ? 'false' : 'true',
]

console.log(`Otimizando ${input} → ${output}`)
const run = spawnSync(process.execPath, optimizeArgs, { stdio: 'inherit' })
if (run.status !== 0) process.exit(run.status ?? 1)

const before = statSync(input).size
const after = statSync(output).size
const mb = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`
console.log(`\nTamanho: ${mb(before)} → ${mb(after)} (${Math.round((1 - after / before) * 100)}% menor)`)

const check = spawnSync(process.execPath, [join(root, 'scripts', 'check-model.mjs'), output], { stdio: 'inherit' })
process.exit(check.status ?? 1)
