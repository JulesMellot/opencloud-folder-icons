// Import d'une image personnalisée (PNG ou ICO). Le fichier n'est jamais stocké tel quel :
// il est décodé par le navigateur puis redessiné dans un canvas 64×64 et ré-encodé en PNG.
// On ne garde donc que des pixels, quelle que soit la taille ou le contenu du fichier d'origine.
import { MAX_IMAGE_DATA_URL_LENGTH } from './catalog'

export const ACCEPTED_EXTENSIONS = ['png', 'ico']
export const ACCEPTED_MIME_TYPES = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon']
/** Valeur de l'attribut `accept` du champ fichier. */
export const ACCEPT_ATTRIBUTE = [
  ...ACCEPTED_EXTENSIONS.map((e) => `.${e}`),
  ...ACCEPTED_MIME_TYPES
].join(',')
export const MAX_FILE_SIZE = 1024 * 1024
export const IMAGE_SIZE = 64

export type ImageErrorReason = 'type' | 'size' | 'unreadable'

export class ImageImportError extends Error {
  constructor(public reason: ImageErrorReason) {
    super(`Image import failed: ${reason}`)
  }
}

/** Contrôles avant décodage. Le type MIME peut être vide (fréquent pour .ico) : l'extension fait foi. */
export function validateImageFile(file: Pick<File, 'name' | 'type' | 'size'>) {
  const extension = /\.([^.]+)$/.exec(file.name)?.[1].toLowerCase()
  if (
    !ACCEPTED_EXTENSIONS.includes(extension) ||
    (file.type && !ACCEPTED_MIME_TYPES.includes(file.type))
  ) {
    throw new ImageImportError('type')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new ImageImportError('size')
  }
}

function decode(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  const img = new Image()
  return new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img)
    img.onerror = () => reject(new ImageImportError('unreadable'))
    img.src = url
  }).finally(() => URL.revokeObjectURL(url))
}

/** Fichier PNG/ICO → data URL PNG 64×64 (image centrée, proportions conservées). */
export async function imageFileToDataUrl(file: File): Promise<string> {
  validateImageFile(file)
  const img = await decode(file)
  const width = img.naturalWidth
  const height = img.naturalHeight
  if (!width || !height) {
    throw new ImageImportError('unreadable')
  }

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = IMAGE_SIZE
  const context = canvas.getContext('2d')
  if (!context) {
    throw new ImageImportError('unreadable')
  }
  // Un .ico contient souvent plusieurs tailles : le navigateur décode la plus grande disponible.
  const scale = Math.min(IMAGE_SIZE / width, IMAGE_SIZE / height)
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  context.imageSmoothingQuality = 'high'
  context.drawImage(img, (IMAGE_SIZE - w) / 2, (IMAGE_SIZE - h) / 2, w, h)

  const dataUrl = canvas.toDataURL('image/png')
  if (!dataUrl.startsWith('data:image/png;base64,') || dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new ImageImportError('unreadable')
  }
  return dataUrl
}
