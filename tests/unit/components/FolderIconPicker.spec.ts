import { mock } from 'vitest-mock-extended'
import { DavHttpError, Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  Modal,
  useConfigStore,
  useMessages,
  useModals,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { SHARED_ICON_PROP } from '../../../src/shared'
import { imageFileToDataUrl, ImageImportError } from '../../../src/image'
import FolderIconPicker from '../../../src/components/FolderIconPicker.vue'
import { useFolderIconsStore } from '../../../src/composables/useFolderIconsStore'

vi.mock('../../../src/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/image')>()),
  imageFileToDataUrl: vi.fn()
}))

const PNG = 'data:image/png;base64,iVBORw0KGgo='

async function upload(wrapper: ReturnType<typeof mountPicker>, name = 'logo.png') {
  const input = wrapper.find('[data-test-id="folder-icons-file"]')
  Object.defineProperty(input.element, 'files', {
    value: [new File(['x'], name)],
    configurable: true
  })
  await input.trigger('change')
  await new Promise((r) => setTimeout(r))
}

const space = mock<SpaceResource>({ id: 'space1' })
let folder: Resource
let mocks: ReturnType<typeof defaultComponentMocks>

function makeFolder({ canUpload = false, shared = '' } = {}) {
  return mock<Resource>({
    id: 'f1',
    fileId: 'f1',
    storageId: 'sid$space',
    name: 'Projets',
    path: '/Projets',
    isFolder: true,
    type: 'folder',
    extraProps: shared ? { [SHARED_ICON_PROP]: shared } : {},
    canUpload: () => canUpload
  })
}

function mountPicker({ withPreference = false, canUpload = false, shared = '' } = {}) {
  folder = makeFolder({ canUpload, shared })
  const plugins = defaultPlugins({ piniaOptions: { stubActions: false } })
  useConfigStore().loadConfig({ server: 'https://cloud.example.org/' } as never)
  if (withPreference) {
    useFolderIconsStore().setPreference(folder, { icon: 'music', color: 'red' })
  }
  mocks = defaultComponentMocks()
  return mount(FolderIconPicker, {
    props: { modal: mock<Modal>({ id: 'm1' }), space, resource: folder },
    global: { plugins, mocks, provide: mocks, stubs: { teleport: true, OcIcon: true } },
    attachTo: document.body
  })
}

const iconButtons = (w: ReturnType<typeof mountPicker>) => w.findAll('[data-icon]')

describe('FolderIconPicker', () => {
  beforeEach(() => window.localStorage.clear())

  it('lists the catalog grouped by category, with accessible radios', () => {
    const wrapper = mountPicker()
    expect(wrapper.findAll('section')).toHaveLength(8)
    const selected = wrapper.find('[data-icon="folder"]')
    expect(selected.attributes('role')).toBe('radio')
    expect(selected.attributes('aria-checked')).toBe('true')
    expect(selected.attributes('aria-label')).toBe('Folder')
    expect(selected.attributes('tabindex')).toBe('0')
    expect(wrapper.find('[data-icon="music"]').attributes('tabindex')).toBe('-1')
  })

  it('filters icons with the search field (accents and case insensitive)', async () => {
    const wrapper = mountPicker()
    await wrapper.find('input:not([type="file"]):not([type="radio"])').setValue('MUSIC')
    const names = iconButtons(wrapper).map((b) => b.attributes('data-icon'))
    expect(names).toContain('music')
    expect(names).not.toContain('briefcase')
    await wrapper.find('input:not([type="file"]):not([type="radio"])').setValue('zzz')
    expect(iconButtons(wrapper)).toHaveLength(0)
    expect(wrapper.text()).toContain('No icon found')
  })

  it('updates the preview immediately', async () => {
    const wrapper = mountPicker()
    await wrapper.find('[data-icon="camera"]').trigger('click')
    await wrapper.find('[data-color="green"]').trigger('click')
    const preview = wrapper.find('[data-test-id="folder-icons-preview"] oc-icon-stub')
    expect(preview.attributes('name')).toBe('camera')
    expect(preview.attributes('color')).toBe('#22c55e')
  })

  it('supports arrow key navigation', async () => {
    const wrapper = mountPicker()
    await wrapper.find('[data-icon="folder"]').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.find('[data-icon="folder-2"]').attributes('aria-checked')).toBe('true')
    await wrapper.find('[data-color=""]').trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.find('[data-color="grey"]').attributes('aria-checked')).toBe('true')
  })

  it('saves the selection and closes the modal', async () => {
    const wrapper = mountPicker()
    await wrapper.find('[data-icon="briefcase"]').trigger('click')
    await wrapper.find('[data-color="blue"]').trigger('click')
    await wrapper.find('.oc-modal-body-actions-confirm').trigger('click')
    expect(useFolderIconsStore().getPreference(folder)).toEqual({
      icon: 'briefcase',
      color: 'blue'
    })
    expect(useModals().removeModal).toHaveBeenCalledWith('m1')
    expect(useMessages().showMessage).toHaveBeenCalled()
  })

  it('disables reset without a preference', () => {
    const wrapper = mountPicker()
    expect(wrapper.find('.folder-icons-reset').attributes('disabled')).toBeDefined()
  })

  it('opens with the saved preference and resets it', async () => {
    const wrapper = mountPicker({ withPreference: true })
    expect(wrapper.find('[data-icon="music"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.find('[data-color="red"]').attributes('aria-checked')).toBe('true')
    await wrapper.find('.folder-icons-reset').trigger('click')
    expect(useFolderIconsStore().getPreference(folder)).toBeUndefined()
    expect(useModals().removeModal).toHaveBeenCalledWith('m1')
  })

  it('reports a storage failure without closing', async () => {
    const wrapper = mountPicker()
    const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    await wrapper.find('.oc-modal-body-actions-confirm').trigger('click')
    expect(useMessages().showErrorMessage).toHaveBeenCalled()
    expect(useModals().removeModal).not.toHaveBeenCalled()
    expect(useFolderIconsStore().getPreference(folder)).toBeUndefined()
    spy.mockRestore()
  })

  it('imports an image, previews it and saves it', async () => {
    vi.mocked(imageFileToDataUrl).mockResolvedValue(PNG)
    const wrapper = mountPicker()
    await upload(wrapper)
    expect(wrapper.find('[data-test-id="folder-icons-preview-image"]').attributes('src')).toBe(PNG)
    expect(wrapper.find('[data-icon="folder"]').attributes('aria-checked')).toBe('false')
    expect(wrapper.find('[data-color="blue"]').attributes('disabled')).toBeDefined()
    await wrapper.find('.oc-modal-body-actions-confirm').trigger('click')
    expect(useFolderIconsStore().getPreference(folder)).toEqual({ image: PNG })
  })

  it('switches back to a catalog icon after an import', async () => {
    vi.mocked(imageFileToDataUrl).mockResolvedValue(PNG)
    const wrapper = mountPicker()
    await upload(wrapper)
    await wrapper.find('[data-icon="music"]').trigger('click')
    expect(wrapper.find('[data-test-id="folder-icons-preview-image"]').exists()).toBe(false)
    await wrapper.find('.oc-modal-body-actions-confirm').trigger('click')
    expect(useFolderIconsStore().getPreference(folder)).toEqual({ icon: 'music' })
  })

  it('reports a rejected file and keeps the current selection', async () => {
    vi.mocked(imageFileToDataUrl).mockRejectedValue(new ImageImportError('type'))
    const wrapper = mountPicker()
    await upload(wrapper, 'evil.svg')
    expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Unsupported format: only PNG and ICO files are accepted'
      })
    )
    expect(wrapper.find('[data-test-id="folder-icons-preview-image"]').exists()).toBe(false)
  })

  it('reopens with a saved image', () => {
    const wrapper = mountPicker()
    useFolderIconsStore().setPreference(folder, { image: PNG })
    const reopened = mountPicker()
    expect(reopened.find('[data-test-id="folder-icons-preview-image"]').exists()).toBe(true)
    wrapper.unmount()
  })

  describe('shared icon (everyone with access)', () => {
    it('is disabled without permission to edit the folder', () => {
      const wrapper = mountPicker()
      const all = wrapper.find('[data-test-id="folder-icons-scope-all"]')
      expect(all.attributes('disabled')).toBeDefined()
      expect(wrapper.text()).toContain('Sharing it requires permission to edit this folder.')
    })

    it('writes the icon on the folder as a WebDAV property and updates the list', async () => {
      const wrapper = mountPicker({ canUpload: true, withPreference: true })
      await wrapper.find('[data-test-id="folder-icons-scope-all"]').setValue(true)
      await wrapper.find('[data-icon="briefcase"]').trigger('click')
      await wrapper.find('[data-color="blue"]').trigger('click')
      await wrapper.find('.oc-modal-body-actions-confirm').trigger('click')
      await new Promise((r) => setTimeout(r))

      expect(mocks.$clientService.webdav.setProperties).toHaveBeenCalledWith(
        space,
        { path: '/Projets' },
        { [SHARED_ICON_PROP]: '1;icon;briefcase;blue' },
        { extraProps: [SHARED_ICON_PROP] }
      )
      expect(useResourcesStore().updateResourceField).toHaveBeenCalledWith({
        id: 'f1',
        field: 'extraProps',
        value: expect.objectContaining({ [SHARED_ICON_PROP]: '1;icon;briefcase;blue' })
      })
      // l'icône personnelle masquerait l'icône commune : elle est retirée
      expect(useFolderIconsStore().getPreference(folder)).toBeUndefined()
      expect(useModals().removeModal).toHaveBeenCalledWith('m1')
    })

    it('opens on the shared icon and resets it with an empty value', async () => {
      const wrapper = mountPicker({ canUpload: true, shared: '1;icon;camera;green' })
      expect(
        (wrapper.find('[data-test-id="folder-icons-scope-all"]').element as HTMLInputElement)
          .checked
      ).toBe(true)
      expect(wrapper.find('[data-icon="camera"]').attributes('aria-checked')).toBe('true')
      await wrapper.find('.folder-icons-reset').trigger('click')
      await new Promise((r) => setTimeout(r))
      expect(mocks.$clientService.webdav.setProperties).toHaveBeenCalledWith(
        space,
        { path: '/Projets' },
        { [SHARED_ICON_PROP]: '' },
        { extraProps: [SHARED_ICON_PROP] }
      )
    })

    it('reports a permission error from the server and keeps the dialog open', async () => {
      const wrapper = mountPicker({ canUpload: true })
      vi.mocked(mocks.$clientService.webdav.setProperties).mockRejectedValue(
        new DavHttpError('forbidden', undefined, undefined, 403)
      )
      await wrapper.find('[data-test-id="folder-icons-scope-all"]').setValue(true)
      await wrapper.find('.oc-modal-body-actions-confirm').trigger('click')
      await new Promise((r) => setTimeout(r))
      expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'You are not allowed to change the icon of this folder for everyone'
        })
      )
      expect(useModals().removeModal).not.toHaveBeenCalled()
    })
  })
})
