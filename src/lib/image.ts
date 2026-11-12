// Compressão de foto no navegador antes do upload: a foto do celular tem 3–8 MB;
// o cardápio precisa de ~80 KB para abrir rápido no 4G (CONTEXT.md §11).

export interface CompressedImage {
  blob: Blob
  ext: 'webp' | 'jpg'
  contentType: 'image/webp' | 'image/jpeg'
  width: number
  height: number
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function compressImage(file: File, maxSide = 1200): Promise<CompressedImage> {
  let bitmap: ImageBitmap
  try {
    // from-image: respeita a orientação EXIF (foto de celular "deitada").
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Não consegui abrir essa imagem. Use uma foto em JPG, PNG ou WEBP.')
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  // Safari antigo não gera WEBP (devolve PNG): nesse caso usamos JPEG.
  const webp = await toBlob(canvas, 'image/webp', 0.8)
  if (webp && webp.type === 'image/webp') {
    return { blob: webp, ext: 'webp', contentType: 'image/webp', width, height }
  }
  const jpeg = await toBlob(canvas, 'image/jpeg', 0.82)
  if (!jpeg) throw new Error('Seu navegador não conseguiu processar a imagem.')
  return { blob: jpeg, ext: 'jpg', contentType: 'image/jpeg', width, height }
}
