import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import { createMockStore } from '@opencloud-eu/web-test-helpers'
import { setActivePinia } from 'pinia'
import { useConfigStore } from '@opencloud-eu/web-pkg'
import { SHARED_ICON_PROP } from '../../../src/shared'
import { useFolderIconsStore } from '../../../src/composables/useFolderIconsStore'

const SERVER = 'https://cloud.example.org/'

function folder(overrides: Partial<Resource> = {}) {
  return mock<Resource>({
    id: 'sid$space1!node1',
    fileId: 'sid$space1!node1',
    storageId: 'sid$space1',
    name: 'Projets',
    path: '/Projets',
    type: 'folder',
    isFolder: true,
    ...overrides
  })
}

/** Simule un (re)chargement de la page pour un utilisateur donné. */
function load(userId = 'alice', server = SERVER) {
  setActivePinia(
    createMockStore({
      stubActions: false,
      userState: { user: { id: userId } as never }
    })
  )
  // configState.server n'atteint pas serverUrl dans le mock de web-test-helpers 8.1 : on charge la config.
  useConfigStore().loadConfig({ server } as never)
  return useFolderIconsStore()
}

describe('useFolderIconsStore', () => {
  beforeEach(() => window.localStorage.clear())

  it('saves, persists across reloads and resets', () => {
    load().setPreference(folder(), { icon: 'briefcase', color: 'blue' })

    const reloaded = load()
    expect(reloaded.getIcon(folder())).toEqual({
      kind: 'icon',
      name: 'briefcase',
      fillType: 'fill',
      color: '#3b82f6'
    })

    reloaded.setPreference(folder(), undefined)
    expect(reloaded.getIcon(folder())).toBeUndefined()
    expect(load().getIcon(folder())).toBeUndefined()
  })

  it('isolates two accounts and two instances', () => {
    load('alice').setPreference(folder(), { icon: 'music' })
    expect(load('bob').getIcon(folder())).toBeUndefined()
    expect(load('alice', 'https://other.example.org').getIcon(folder())).toBeUndefined()
    expect(load('alice').getIcon(folder())).toBeDefined()
  })

  it('keeps the icon after a rename or a move inside the same space (same id)', () => {
    const store = load()
    store.setPreference(folder(), { icon: 'music' })
    expect(store.getIcon(folder({ name: 'Renamed', path: '/a/b/Renamed' }))).toMatchObject({
      name: 'music'
    })
  })

  it('loses the icon after a move to another space (copy = new id)', () => {
    const store = load()
    store.setPreference(folder(), { icon: 'music' })
    const copy = folder({
      id: 'sid$space2!node9',
      fileId: 'sid$space2!node9',
      storageId: 'sid$space2'
    })
    expect(store.getIcon(copy)).toBeUndefined()
  })

  it('never customizes files or spaces', () => {
    const store = load()
    window.localStorage.setItem(
      `opencloud-folder-icons:https://cloud.example.org:alice`,
      JSON.stringify({ version: 1, folders: { 'sid$space1|file1': { icon: 'music' } } })
    )
    const reloaded = load()
    const file = folder({ id: 'file1', fileId: 'file1', isFolder: false, type: 'file' })
    expect(reloaded.getIcon(file)).toBeUndefined()
    expect(() => store.setPreference(file, { icon: 'music' })).toThrow()
    expect(() => store.setPreference(folder({ type: 'space' }), { icon: 'music' })).toThrow()
  })

  it('falls back to native icons and keeps state when storage fails', () => {
    const store = load()
    const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(() => store.setPreference(folder(), { icon: 'music' })).toThrow()
    expect(store.getIcon(folder())).toBeUndefined()
    spy.mockRestore()
  })

  it('is unavailable without a logged-in user (e.g. public links)', () => {
    const store = load('')
    expect(store.isAvailable).toBe(false)
    expect(store.getIcon(folder())).toBeUndefined()
    expect(() => store.setPreference(folder(), { icon: 'music' })).toThrow()
  })

  describe('shared icons', () => {
    const shared = (value: string, extra: Partial<Resource> = {}) =>
      folder({ extraProps: { [SHARED_ICON_PROP]: value }, ...extra })

    it('shows the icon stored on the folder when there is no personal one', () => {
      expect(load().getIcon(shared('1;icon;camera;green'))).toEqual({
        kind: 'icon',
        name: 'camera',
        fillType: 'fill',
        color: '#22c55e'
      })
      expect(load().getSharedPreference(shared('1;icon;camera;green'))).toEqual({
        icon: 'camera',
        color: 'green'
      })
    })

    it('lets the personal icon take precedence', () => {
      const store = load()
      store.setPreference(folder(), { icon: 'music' })
      expect(store.getIcon(shared('1;icon;camera;green'))).toMatchObject({ name: 'music' })
    })

    it('ignores invalid shared values and files', () => {
      const store = load()
      expect(store.getIcon(shared('1;icon;evil;'))).toBeUndefined()
      expect(
        store.getIcon(shared('1;icon;camera;', { isFolder: false, type: 'file' }))
      ).toBeUndefined()
    })
  })
})
