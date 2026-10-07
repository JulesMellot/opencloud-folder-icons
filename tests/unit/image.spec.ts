import {
  IMAGE_SIZE,
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
  const drawImage = vi.fn()
  let imageBehaviour: 'load' | 'error'

  beforeEach(() => {
    imageBehaviour = 'load'
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() })
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = 128
        naturalHeight = 64
        onload: () => void
        onerror: () => void
        set src(_: string) {
          queueMicrotask(() => (imageBehaviour === 'load' ? this.onload() : this.onerror()))
        }
      }
    )
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
      tag === 'canvas'
        ? ({
            getContext: () => ({ drawImage }),
            toDataURL: () => 'data:image/png;base64,iVBORw0KGgo='
          } as unknown as HTMLCanvasElement)
        : realCreate(tag)
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it('re-encodes the image as a centered 64×64 PNG, keeping proportions', async () => {
    const dataUrl = await imageFileToDataUrl(new File(['x'], 'logo.png', { type: 'image/png' }))
    expect(dataUrl).toBe('data:image/png;base64,iVBORw0KGgo=')
    const [, x, y, w, h] = drawImage.mock.calls[0]
    expect([x, y, w, h]).toEqual([0, 16, IMAGE_SIZE, 32])
  })
  it('reports an unreadable file', async () => {
    imageBehaviour = 'error'
    await expect(
      imageFileToDataUrl(new File(['x'], 'broken.ico', { type: '' }))
    ).rejects.toMatchObject({ reason: 'unreadable' })
  })
  it('validates before decoding', async () => {
    await expect(
      imageFileToDataUrl(new File(['<svg/>'], 'evil.svg', { type: 'image/svg+xml' }))
    ).rejects.toMatchObject({ reason: 'type' })
    expect(drawImage).not.toHaveBeenCalled()
  })
})
