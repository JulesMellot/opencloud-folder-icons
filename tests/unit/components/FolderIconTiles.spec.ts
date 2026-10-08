import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'
import { useConfigStore } from '@opencloud-eu/web-pkg'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { defineComponent, PropType } from 'vue'
import FolderIconTiles from '../../../src/components/FolderIconTiles.vue'
import { useFolderIconsStore } from '../../../src/composables/useFolderIconsStore'

// Reproduit le contrat de ResourceTiles/ResourceTile : le contenu du slot `image` remplace
// l'aperçu natif, sauf s'il est vide (Vue affiche alors le contenu par défaut).
const ResourceTilesStub = defineComponent({
  name: 'ResourceTiles',
  props: { resources: { type: Array as PropType<Resource[]>, required: true } },
  template: `<div>
    <div v-for="r in resources" :key="r.id" class="tile" :data-id="r.id">
      <slot name="image" :resource="r"><span class="native-preview" /></slot>
      <slot name="indicators" :resource="r" />
    </div>
  </div>`
})

const folder = (id: string) =>
  mock<Resource>({ id, fileId: id, storageId: 'sid$space', isFolder: true, type: 'folder' })

function mountTiles(resources: Resource[], { slots = {}, viewSize = 2 } = {}) {
  const plugins = defaultPlugins({ piniaOptions: { stubActions: false } })
  useConfigStore().loadConfig({ server: 'https://cloud.example.org/' } as never)
  return mount(FolderIconTiles, {
    props: { resources },
    attrs: { viewSize },
    slots,
    global: { plugins, stubs: { ResourceTiles: ResourceTilesStub, OcIcon: true } }
  })
}

describe('FolderIconTiles', () => {
  beforeEach(() => window.localStorage.clear())

  it('replaces the preview of customized folders only', async () => {
    const custom = folder('f1')
    const wrapper = mountTiles([custom, folder('f2')], { viewSize: 4 })
    useFolderIconsStore().setPreference(custom, { icon: 'music' })
    await wrapper.vm.$nextTick()
    const tile = (id: string) => wrapper.find(`.tile[data-id="${id}"]`)
    const icon = tile('f1').find('[data-test-id="folder-icons-custom"]')
    expect(icon.attributes('name')).toBe('music')
    expect(icon.attributes('sizeclass')).toBe('size-22')
    expect(tile('f1').find('.native-preview').exists()).toBe(false)
    expect(tile('f2').find('.native-preview').exists()).toBe(true)
  })

  it('forwards the parent image slot (e.g. space images) and other slots', () => {
    const wrapper = mountTiles([folder('f1')], {
      slots: {
        image: `<template #image="{ resource }"><span class="parent-image">{{ resource.id }}</span></template>`,
        indicators: `<template #indicators="{ resource }"><span class="badge">{{ resource.id }}</span></template>`
      }
    })
    expect(wrapper.find('.parent-image').text()).toBe('f1')
    expect(wrapper.find('.badge').text()).toBe('f1')
  })

  it('lets an uploaded image fill the tile preview', async () => {
    const custom = folder('f1')
    const wrapper = mountTiles([custom])
    useFolderIconsStore().setPreference(custom, { image: 'data:image/webp;base64,UklGRg==' })
    await wrapper.vm.$nextTick()
    const img = wrapper.find('[data-test-id="folder-icons-custom-image"]')
    expect(img.classes()).toEqual(expect.arrayContaining(['ext:size-full', 'ext:object-contain']))
  })
})
