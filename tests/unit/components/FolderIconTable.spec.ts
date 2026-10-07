import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import { useConfigStore } from '@opencloud-eu/web-pkg'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { defineComponent, PropType } from 'vue'
import FolderIconTable from '../../../src/components/FolderIconTable.vue'
import { useFolderIconsStore } from '../../../src/composables/useFolderIconsStore'

// ResourceTable réel = trop de dépendances (router, stores…) : on vérifie ici le contrat des slots.
const ResourceTableStub = defineComponent({
  name: 'ResourceTable',
  props: { resources: { type: Array as PropType<Resource[]>, required: true } },
  template: `<div>
    <div v-for="r in resources" :key="r.id" class="row" :data-id="r.id">
      <slot name="image" :resource="r" />
      <slot name="indicators" :resource="r" />
    </div>
  </div>`
})

const res = (id: string, extra: Partial<Resource> = {}) =>
  mock<Resource>({
    id,
    fileId: id,
    storageId: 'sid$space',
    isFolder: true,
    type: 'folder',
    thumbnail: undefined,
    ...extra
  })

function mountTable(resources: Resource[], slots = {}) {
  const plugins = defaultPlugins({ piniaOptions: { stubActions: false } })
  useConfigStore().loadConfig({ server: 'https://cloud.example.org/' } as never)
  return mount(FolderIconTable, {
    props: { resources },
    slots,
    global: {
      plugins,
      stubs: { ResourceTable: ResourceTableStub, ResourceIcon: true, OcIcon: true, OcImage: true }
    }
  })
}

describe('FolderIconTable', () => {
  beforeEach(() => window.localStorage.clear())

  it('renders the custom icon for a customized folder and native icons otherwise', async () => {
    const custom = res('f1')
    const plain = res('f2')
    const file = res('file1', { isFolder: false, type: 'file' })
    const wrapper = mountTable([custom, plain, file])
    useFolderIconsStore().setPreference(custom, { icon: 'music', color: 'red' })
    await wrapper.vm.$nextTick()

    const row = (id: string) => wrapper.find(`.row[data-id="${id}"]`)
    const icon = row('f1').find('[data-test-id="folder-icons-custom"]')
    expect(icon.exists()).toBe(true)
    expect(icon.attributes('name')).toBe('music')
    expect(icon.attributes('color')).toBe('#ef4444')
    expect(row('f2').find('[data-test-id="folder-icons-custom"]').exists()).toBe(false)
    expect(row('f2').find('resource-icon-stub').exists()).toBe(true)
    expect(row('file1').find('resource-icon-stub').exists()).toBe(true)
  })

  it('renders an uploaded image for a folder', async () => {
    const folder = res('f1')
    const wrapper = mountTable([folder])
    useFolderIconsStore().setPreference(folder, { image: 'data:image/png;base64,iVBORw0KGgo=' })
    await wrapper.vm.$nextTick()
    const img = wrapper.find('[data-test-id="folder-icons-custom-image"]')
    expect(img.attributes('src')).toBe('data:image/png;base64,iVBORw0KGgo=')
    expect(wrapper.find('resource-icon-stub').exists()).toBe(false)
  })

  it('keeps file thumbnails', () => {
    const wrapper = mountTable([res('img', { isFolder: false, type: 'file', thumbnail: 'blob:x' })])
    expect(wrapper.find('.row oc-image-stub').exists()).toBe(true)
  })

  it('falls back to the native icon after a reset', async () => {
    const folder = res('f1')
    const wrapper = mountTable([folder])
    const store = useFolderIconsStore()
    store.setPreference(folder, { icon: 'music' })
    store.setPreference(folder, undefined)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test-id="folder-icons-custom"]').exists()).toBe(false)
    expect(wrapper.find('resource-icon-stub').exists()).toBe(true)
  })

  it('passes the parent slots (badges, context menu…) through untouched', () => {
    const wrapper = mountTable([res('f1')], {
      indicators: `<template #indicators="{ resource }"><span class="badge">{{ resource.id }}</span></template>`
    })
    expect(wrapper.find('.badge').text()).toBe('f1')
  })

  it('forwards the parent image slot for non-customized resources', async () => {
    const custom = res('f1')
    const wrapper = mountTable([custom, res('f2')], {
      image: `<template #image="{ resource }"><span class="parent-image">{{ resource.id }}</span></template>`
    })
    useFolderIconsStore().setPreference(custom, { icon: 'music' })
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.parent-image').map((e) => e.text())).toEqual(['f2'])
    expect(wrapper.find('[data-test-id="folder-icons-custom"]').exists()).toBe(true)
  })
})
