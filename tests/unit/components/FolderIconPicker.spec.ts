import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import { Modal, useConfigStore, useMessages, useModals } from '@opencloud-eu/web-pkg'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
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

const folder = mock<Resource>({
  id: 'f1',
  fileId: 'f1',
  storageId: 'sid$space',
  name: 'Projets',
  isFolder: true,
  type: 'folder'
})

function mountPicker({ withPreference = false } = {}) {
  const plugins = defaultPlugins({ piniaOptions: { stubActions: false } })
  useConfigStore().loadConfig({ server: 'https://cloud.example.org/' } as never)
  if (withPreference) {
    useFolderIconsStore().setPreference(folder, { icon: 'music', color: 'red' })
  }
  return mount(FolderIconPicker, {
    props: { modal: mock<Modal>({ id: 'm1' }), resource: folder },
    global: { plugins, stubs: { teleport: true, OcIcon: true } },
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
    await wrapper.find('input:not([type="file"])').setValue('MUSIC')
    const names = iconButtons(wrapper).map((b) => b.attributes('data-icon'))
    expect(names).toContain('music')
    expect(names).not.toContain('briefcase')
    await wrapper.find('input:not([type="file"])').setValue('zzz')
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
})
