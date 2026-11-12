import type { ModelFacts } from '../lib/model-rules.ts'

// Lê um .glb no navegador e mede o modelo (tamanho, base, texturas), para o
// painel validar com as mesmas regras de scripts/check-model.mjs.
// As bibliotecas só são baixadas quando alguém escolhe um modelo.

export interface InspectedModel {
  facts: ModelFacts
  bbox: { min: number[]; max: number[] }
}

export async function inspectGlb(data: ArrayBuffer, hasUsdz: boolean): Promise<InspectedModel> {
  const [{ WebIO, getBounds }, { ALL_EXTENSIONS }, { MeshoptDecoder }] = await Promise.all([
    import('@gltf-transform/core'),
    import('@gltf-transform/extensions'),
    import('meshoptimizer'),
  ])
  await MeshoptDecoder.ready
  const io = new WebIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })

  let doc
  try {
    doc = await io.readBinary(new Uint8Array(data))
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (/draco/i.test(message)) {
      throw new Error('Modelo com compressão Draco não é aceito. Exporte sem compressão ou otimize com scripts/optimize-model.mjs.')
    }
    throw new Error('Não consegui ler o arquivo. Confira se é um .glb válido.')
  }

  const root = doc.getRoot()
  const scene = root.getDefaultScene() ?? root.listScenes()[0]
  if (!scene) throw new Error('O arquivo não tem nenhum objeto 3D.')

  const { min, max } = getBounds(scene)
  const round = (n: number) => Math.round(n * 10000) / 10000

  return {
    facts: {
      size: { x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2] },
      minY: min[1],
      bytes: data.byteLength,
      textures: root.listTextures().map((t) => {
        const [width, height] = t.getSize() ?? [0, 0]
        return { name: t.getName() || t.getURI() || 'textura', width, height }
      }),
      hasUsdz,
      extensions: root.listExtensionsUsed().map((e) => e.extensionName),
    },
    bbox: { min: min.map(round), max: max.map(round) },
  }
}
