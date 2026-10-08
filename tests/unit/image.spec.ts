import {
  ImageImportError,
  imageFileToDataUrl,
  MAX_FILE_SIZE,
  validateImageFile
} from '../../src/image'

const file = (name: string, type: string, size = 100) =>
  ({ name, type, size }) as Pick<File, 'name' | 'type' | 'size'>

function reason(fn: () => unknown) {
  try {
    fn()
  } catch (e) {
    return (e as ImageImportError).reason
  }
}

describe('validateImageFile', () => {
  it('accepts PNG and ICO, including an empty MIME type for .ico', () => {
    expect(() => validateImageFile(file('logo.png', 'image/png'))).not.toThrow()
    expect(() => validateImageFile(file('fav.ICO', 'image/x-icon'))).not.toThrow()
    expect(() => validateImageFile(file('fav.ico', 'image/vnd.microsoft.icon'))).not.toThrow()
    expect(() => validateImageFile(file('fav.ico', ''))).not.toThrow()
  })
  it('rejects other formats, even disguised', () => {
    expect(reason(() => validateImageFile(file('a.svg', 'image/svg+xml')))).toBe('type')
    expect(reason(() => validateImageFile(file('a.jpg', 'image/jpeg')))).toBe('type')
    expect(reason(() => validateImageFile(file('a.png', 'image/svg+xml')))).toBe('type')
    expect(reason(() => validateImageFile(file('png', '')))).toBe('type')
  })
  it('rejects files over 1 MB', () => {
    expect(reason(() => validateImageFile(file('a.png', 'image/png', MAX_FILE_SIZE + 1)))).toBe(
      'size'
    )
  })
})

describe('imageFileToDataUrl', () => {
  const WEBP = 'data:image/webp;base64,UklGRg=='
  const PNG = 'data:image/png;base64,iVBORw0KGgo='
  let natural: [number, number]
  let imageBehaviour: 'load' | 'error'
  let toDataURL: (type: string) => string
  let canvas: { width: number; height: number }
  const drawImage = vi.fn()

  const pngFile = () => new File(['x'], 'logo.png', { type: 'image/png' })

  beforeEach(() => {
    natural = [400, 100]
    imageBehaviour = 'load'
    toDataURL = vi.fn((type: string) => (type === 'image/webp' ? WEBP : PNG))
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() })
    vi.stubGlobal(
      'Image',
      class {
        get naturalWidth() {
          return natural[0]
        }
        get naturalHeight() {
          return natural[1]
        }
        onload: () => void
        onerror: () => void
        set src(_: string) {
          queueMicrotask(() => (imageBehaviour === 'load' ? this.onload() : this.onerror()))
        }
      }
    )
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag !== 'canvas') {
        return realCreate(tag)
      }
      canvas = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage, clearRect: vi.fn() }),
        toDataURL: (type: string) => toDataURL(type)
      } as never
      return canvas as unknown as HTMLCanvasElement
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('keeps proportions, without padding, up to 192 px on the longest side', async () => {
    expect(await imageFileToDataUrl(pngFile())).toBe(WEBP)
    expect([canvas.width, canvas.height]).toEqual([192, 48])
    expect(drawImage.mock.calls[0].slice(1)).toEqual([0, 0, 192, 48])
  })

  it('never upscales small images such as 32×32 icons', async () => {
    natural = [32, 32]
    await imageFileToDataUrl(new File(['x'], 'fav.ico', { type: '' }))
    expect([canvas.width, canvas.height]).toEqual([32, 32])
  })

  it('falls back to PNG when the browser cannot encode WebP', async () => {
    toDataURL = vi.fn(() => PNG) // ex. Safari : image/webp ignoré, PNG renvoyé
    expect(await imageFileToDataUrl(pngFile())).toBe(PNG)
  })

  it('shrinks the image until it fits the storage limit', async () => {
    const tooBig = `data:image/webp;base64,${'A'.repeat(40_000)}`
    toDataURL = vi.fn(() => (canvas.width > 128 ? tooBig : WEBP))
    expect(await imageFileToDataUrl(pngFile())).toBe(WEBP)
    expect(canvas.width).toBe(128)
  })

  it('reports an image that never fits', async () => {
    toDataURL = vi.fn(() => `data:image/png;base64,${'A'.repeat(40_000)}`)
    await expect(imageFileToDataUrl(pngFile())).rejects.toMatchObject({ reason: 'unreadable' })
  })

  it('reports an unreadable file', async () => {
    imageBehaviour = 'error'
    await expect(
      imageFileToDataUrl(new File(['x'], 'broken.ico', { type: '' }))
    ).rejects.toMatchObject({ reason: 'unreadable' })
  })

  it('validates before decoding', async () => {
    drawImage.mockClear()
    await expect(
      imageFileToDataUrl(new File(['<svg/>'], 'evil.svg', { type: 'image/svg+xml' }))
    ).rejects.toMatchObject({ reason: 'type' })
    expect(drawImage).not.toHaveBeenCalled()
  })
})
