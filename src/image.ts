// Import d'une image personnalisée (PNG ou ICO). Le fichier n'est jamais stocké tel quel :
// il est décodé par le navigateur, redessiné dans un canvas (192 px max., proportions conservées)
// et ré-encodé en WebP ou PNG. On ne garde donc que des pixels, quel que soit le fichier d'origine.
import { MAX_IMAGE_DATA_URL_LENGTH } from './catalog'

export const ACCEPTED_EXTENSIONS = ['png', 'ico']
export const ACCEPTED_MIME_TYPES = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon']
/** Valeur de l'attribut `accept` du champ fichier. */
export const ACCEPT_ATTRIBUTE = [
  ...ACCEPTED_EXTENSIONS.map((e) => `.${e}`),
  ...ACCEPTED_MIME_TYPES
].join(',')
export const MAX_FILE_SIZE = 1024 * 1024
/** Tailles essayées (plus grand côté, en px) jusqu'à tenir sous MAX_IMAGE_DATA_URL_LENGTH. */
export const IMAGE_SIZES = [192, 160, 128, 96, 64]
/** WebP d'abord (bien plus léger) ; un navigateur qui ne sait pas l'encoder renvoie du PNG. */
const OUTPUT_TYPES = ['image/webp', 'image/png']

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

/** Fichier PNG/ICO → data URL WebP ou PNG, 192 px max. sur le plus grand côté, sans marges. */
export async function imageFileToDataUrl(file: File): Promise<string> {
  validateImageFile(file)
  const img = await decode(file)
  const width = img.naturalWidth
  const height = img.naturalHeight
  if (!width || !height) {
    throw new ImageImportError('unreadable')
  }

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) {
    throw new ImageImportError('unreadable')
  }
  for (const size of IMAGE_SIZES) {
    // Jamais d'agrandissement : une icône 32×32 reste en 32×32 (un .ico contient souvent plusieurs
    // tailles, le navigateur décode la plus grande disponible).
    const scale = Math.min(1, size / Math.max(width, height))
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.imageSmoothingQuality = 'high'
    context.drawImage(img, 0, 0, canvas.width, canvas.height)

    for (const type of OUTPUT_TYPES) {
      const dataUrl = canvas.toDataURL(type, 0.9)
      if (
        dataUrl.startsWith(`data:${type};base64,`) &&
        dataUrl.length <= MAX_IMAGE_DATA_URL_LENGTH
      ) {
        return dataUrl
      }
    }
  }
  throw new ImageImportError('unreadable')
}
