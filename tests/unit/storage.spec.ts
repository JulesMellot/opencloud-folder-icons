import { isValidPreference, resolveFolderIcon, getIcons } from '../../src/catalog'
import {
  createLocalFolderIconStorage,
  folderKey,
  STORAGE_PREFIX,
  storageKey
} from '../../src/storage'

const KEY = storageKey('https://cloud.example.org/', 'user-1')

describe('catalog', () => {
  it('has unique icon names', () => {
    const names = getIcons((s) => s).map(({ name }) => name)
    expect(new Set(names).size).toBe(names.length)
  })
  it('accepts only catalog icons and palette colors', () => {
    expect(isValidPreference({ icon: 'briefcase' })).toBe(true)
    expect(isValidPreference({ icon: 'briefcase', color: 'red' })).toBe(true)
    expect(isValidPreference({ icon: 'not-an-icon' })).toBe(false)
    expect(isValidPreference({ icon: 'briefcase', color: '#ff0000' })).toBe(false)
    expect(isValidPreference({ icon: '../../evil' })).toBe(false)
    expect(isValidPreference(null)).toBe(false)
    expect(isValidPreference('briefcase')).toBe(false)
  })
  it('accepts only bounded PNG data URLs as images', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo='
    expect(isValidPreference({ image: png })).toBe(true)
    expect(resolveFolderIcon({ image: png })).toEqual({ kind: 'image', src: png })
    expect(isValidPreference({ image: 'data:image/webp;base64,UklGRg==' })).toBe(true)
    expect(isValidPreference({ image: 'data:image/svg+xml;base64,PHN2Zz4=' })).toBe(false)
    expect(isValidPreference({ image: 'javascript:alert(1)' })).toBe(false)
    expect(isValidPreference({ image: 'https://example.org/x.png' })).toBe(false)
    expect(isValidPreference({ image: 'data:image/png;base64,AA"><script>' })).toBe(false)
    expect(isValidPreference({ image: `data:image/png;base64,${'A'.repeat(40_000)}` })).toBe(false)
    expect(isValidPreference({ image: png, icon: 'music' })).toBe(false)
  })
  it('resolves a preference to icon props, or undefined for invalid data', () => {
    expect(resolveFolderIcon({ icon: 'music', color: 'blue' })).toEqual({
      kind: 'icon',
      name: 'music',
      fillType: 'fill',
      color: '#3b82f6'
    })
    expect(resolveFolderIcon({ icon: 'music' })).toEqual({
      kind: 'icon',
      name: 'music',
      fillType: 'fill',
      color: ''
    })
    expect(resolveFolderIcon({ icon: 'unknown' })).toBeUndefined()
    expect(resolveFolderIcon(undefined)).toBeUndefined()
  })
})

describe('keys', () => {
  it('isolates instances and users', () => {
    expect(KEY).toBe(`${STORAGE_PREFIX}:https://cloud.example.org:user-1`)
    expect(storageKey('https://cloud.example.org', 'user-2')).not.toBe(KEY)
    expect(storageKey('https://other.example.org', 'user-1')).not.toBe(KEY)
  })
  it('uses space and stable file id, never name or path', () => {
    const folder = { id: 'sid$spid!node', fileId: 'sid$spid!node', storageId: 'sid$spid' }
    const renamed = { ...folder, name: 'renamed', path: '/elsewhere/renamed' }
    expect(folderKey(renamed)).toBe(folderKey(folder))
    expect(folderKey({ ...folder, fileId: 'sid$other!node2', storageId: 'sid$other' })).not.toBe(
      folderKey(folder)
    )
  })
})

describe('local storage', () => {
  beforeEach(() => window.localStorage.clear())

  it('round-trips preferences', () => {
    const storage = createLocalFolderIconStorage(KEY)
    storage.save({ a: { icon: 'music', color: 'red' } })
    expect(createLocalFolderIconStorage(KEY).load()).toEqual({ a: { icon: 'music', color: 'red' } })
    expect(JSON.parse(window.localStorage.getItem(KEY)).version).toBe(2)
  })
  it('reads version 1 data and upgrades it to version 2 on save', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ version: 1, folders: { a: { icon: 'home' } } })
    )
    const storage = createLocalFolderIconStorage(KEY)
    const map = storage.load()
    expect(map).toEqual({ a: { icon: 'home' } })
    storage.save({ ...map, b: { image: 'data:image/png;base64,iVBORw0KGgo=' } })
    const stored = JSON.parse(window.localStorage.getItem(KEY))
    expect(stored.version).toBe(2)
    expect(Object.keys(stored.folders)).toEqual(['a', 'b'])
  })
  it('removes the key when the last preference is reset', () => {
    const storage = createLocalFolderIconStorage(KEY)
    storage.save({ a: { icon: 'music' } })
    storage.save({})
    expect(window.localStorage.getItem(KEY)).toBeNull()
  })
  it('returns an empty map for corrupted JSON', () => {
    window.localStorage.setItem(KEY, '{not json')
    expect(createLocalFolderIconStorage(KEY).load()).toEqual({})
  })
  it('drops invalid entries but keeps valid ones', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        folders: { ok: { icon: 'home' }, bad: { icon: 'nope' }, worse: 42 }
      })
    )
    expect(createLocalFolderIconStorage(KEY).load()).toEqual({ ok: { icon: 'home' } })
  })
  it('ignores data with an unknown version and refuses to overwrite newer data', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ version: 3, folders: { a: { icon: 'home' } } })
    )
    const storage = createLocalFolderIconStorage(KEY)
    expect(storage.load()).toEqual({})
    expect(() => storage.save({ b: { icon: 'home' } })).toThrow()
    expect(JSON.parse(window.localStorage.getItem(KEY)).version).toBe(3)
  })
  it('survives an unavailable storage on load and reports it on save', () => {
    const storage = createLocalFolderIconStorage(KEY, () => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(storage.load()).toEqual({})
    expect(() => storage.save({ a: { icon: 'home' } })).toThrow()
  })
  it('reports a full storage on save', () => {
    const full = {
      getItem: (): string | null => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError')
      }
    } as unknown as Storage
    expect(() =>
      createLocalFolderIconStorage(KEY, () => full).save({ a: { icon: 'home' } })
    ).toThrow()
  })
})
