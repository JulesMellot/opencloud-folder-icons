import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  ActionExtension,
  FolderViewExtension,
  useConfigStore,
  useModals
} from '@opencloud-eu/web-pkg'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { unref } from 'vue'
import {
  ACTION_EXTENSION_ID,
  FOLDER_VIEW_EXTENSION_ID,
  NATIVE_VIEWS,
  useExtensions
} from '../../../src/composables/useExtensions'
import FolderIconPicker from '../../../src/components/FolderIconPicker.vue'

const space = mock<SpaceResource>()
const folder = mock<Resource>({ id: 'f1', isFolder: true, type: 'folder' })
const file = mock<Resource>({ id: 'x', isFolder: false, type: 'file' })

function setup(
  cb: (extensions: ReturnType<typeof useExtensions>) => void,
  disabledExtensions: string[] = []
) {
  getComposableWrapper(
    () => {
      useConfigStore().loadConfig({ server: 'https://cloud.example.org/' } as never)
      // Affectation directe : loadConfig fusionne dans le tableau par défaut partagé de web-pkg,
      // ce qui ferait fuiter la valeur d'un test à l'autre.
      useConfigStore().options.disabledExtensions = disabledExtensions
      cb(useExtensions())
    },
    { pluginOptions: { piniaOptions: { stubActions: false } } }
  )
}

describe('useExtensions', () => {
  it('shows "Customize icon" only for a single folder', () => {
    setup((extensions) => {
      const { action } = unref(extensions).find(
        ({ id }) => id === ACTION_EXTENSION_ID
      ) as ActionExtension
      expect(action.isVisible({ space, resources: [folder] })).toBe(true)
      expect(action.isVisible({ space, resources: [file] })).toBe(false)
      expect(action.isVisible({ space, resources: [folder, folder] })).toBe(false)
      expect(
        action.isVisible({ space, resources: [mock<Resource>({ isFolder: true, type: 'space' })] })
      ).toBe(false)
    })
  })

  it('opens the picker in an OpenCloud modal', () => {
    setup((extensions) => {
      const { action } = unref(extensions).find(
        ({ id }) => id === ACTION_EXTENSION_ID
      ) as ActionExtension
      action.handler({ space, resources: [folder] })
      const modal = useModals().modals.at(-1)
      expect(modal.customComponent).toBe(FolderIconPicker)
      expect(modal.customComponentAttrs()).toEqual({ resource: folder })
    })
  })

  it('registers the list view on the folder view extension points', () => {
    setup((extensions) => {
      const view = unref(extensions).find(
        ({ id }) => id === FOLDER_VIEW_EXTENSION_ID
      ) as FolderViewExtension
      expect(view.type).toBe('folderView')
      expect(view.extensionPointIds).toContain('app.files.folder-views.folder')
      expect(view.extensionPointIds).not.toContain('app.files.folder-views.trash')
    })
  })

  it('keeps the native views untouched when none is disabled', () => {
    setup((extensions) => {
      const views = unref(extensions).filter(({ type }) => type === 'folderView')
      expect(views.map(({ id }) => id)).toEqual([FOLDER_VIEW_EXTENSION_ID])
    })
  })

  it('replaces the native views disabled by the admin, under the same names', () => {
    setup(
      (extensions) => {
        const views = unref(extensions).filter(
          ({ type }) => type === 'folderView'
        ) as FolderViewExtension[]
        expect(views.map(({ folderView }) => folderView.name)).toEqual([
          'resource-tiles',
          'resource-table',
          'resource-table-condensed'
        ])
        expect(views.map(({ folderView }) => folderView.label)).toEqual([
          'Grid',
          'List',
          'Condensed list'
        ])
        for (const view of views) {
          expect(view.id).not.toMatch(/^com\.github\.opencloud-eu/)
          expect(view.extensionPointIds).toContain('app.files.folder-views.trash')
          expect(view.extensionPointIds).toContain('app.files.folder-views.project-spaces')
        }
      },
      NATIVE_VIEWS.map(({ id }) => id)
    )
  })

  it('keeps the separate list view while the native list is still active', () => {
    setup(
      (extensions) => {
        const names = (
          unref(extensions).filter(({ type }) => type === 'folderView') as FolderViewExtension[]
        ).map(({ folderView }) => folderView.name)
        expect(names).toEqual(['resource-tiles', 'folder-icons-table'])
      },
      [NATIVE_VIEWS[0].id]
    )
  })
})
