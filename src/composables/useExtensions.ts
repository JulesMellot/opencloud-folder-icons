// Intégration OpenCloud : uniquement des points d'extension publics de web-pkg / web-app-files v8.1.
import {
  ActionExtension,
  Extension,
  FileAction,
  FolderView,
  FolderViewExtension,
  useConfigStore,
  useModals
} from '@opencloud-eu/web-pkg'
import { computed, markRaw, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import FolderIconPicker from '../components/FolderIconPicker.vue'
import FolderIconTable from '../components/FolderIconTable.vue'
import FolderIconTiles from '../components/FolderIconTiles.vue'
import { isCustomizableFolder, useFolderIconsStore } from './useFolderIconsStore'

export const ACTION_EXTENSION_ID = 'eu.opencloud.web-extensions.folder-icons.customize'
export const FOLDER_VIEW_EXTENSION_ID = 'eu.opencloud.web-extensions.folder-icons.list-view'
export const FOLDER_VIEW_NAME = 'folder-icons-table'
export const REPLACEMENT_VIEW_ID_PREFIX = 'eu.opencloud.web-extensions.folder-icons.folder-view.'

// Les trois vues natives (packages/web-app-files/src/composables/extensions/useFolderViews.ts).
// Si l'administrateur les désactive via WEB_OPTION_DISABLED_EXTENSIONS, l'extension enregistre
// à leur place des vues de même nom : OpenCloud les traite alors exactement comme les vues de base
// (aperçus, taille des tuiles, navigation clavier dépendent de ces noms).
export const NATIVE_VIEWS = [
  {
    id: 'com.github.opencloud-eu.web.files.folder-view.resource-tiles',
    name: 'resource-tiles',
    icon: 'gallery-view-2',
    component: FolderIconTiles
  },
  {
    id: 'com.github.opencloud-eu.web.files.folder-view.resource-table',
    name: 'resource-table',
    icon: 'list-unordered',
    component: FolderIconTable
  },
  {
    id: 'com.github.opencloud-eu.web.files.folder-view.resource-table-condensed',
    name: 'resource-table-condensed',
    icon: 'menu-line-condensed',
    component: FolderIconTable
  }
]

// Points sur lesquels les vues natives sont enregistrées (packages/web-app-files/src/extensionPoints.ts).
export const ALL_FOLDER_VIEW_EXTENSION_POINT_IDS = [
  'app.files.folder-views.folder',
  'app.files.folder-views.project-spaces',
  'app.files.folder-views.favorites',
  'app.files.folder-views.trash',
  'app.files.folder-views.trash-overview',
  'app.files.folder-views.shared-with-me',
  'app.files.folder-views.shared-via-link',
  'app.files.folder-views.shared-with-others',
  'app.files.folder-views.search'
]

// Points couverts par la vue séparée (mode sans remplacement) : ni corbeille, ni liste des espaces.
export const FOLDER_VIEW_EXTENSION_POINT_IDS = [
  'app.files.folder-views.folder',
  'app.files.folder-views.favorites',
  'app.files.folder-views.shared-with-me',
  'app.files.folder-views.shared-via-link',
  'app.files.folder-views.shared-with-others',
  'app.files.folder-views.search'
]

export function useExtensions() {
  const { $gettext } = useGettext()
  const { dispatchModal } = useModals()
  const store = useFolderIconsStore()
  const configStore = useConfigStore()

  const nativeLabels: Record<string, string> = {
    'resource-tiles': $gettext('Grid'),
    'resource-table': $gettext('List'),
    'resource-table-condensed': $gettext('Condensed list')
  }

  const folderViews = computed<FolderViewExtension[]>(() => {
    const disabled = configStore.options.disabledExtensions ?? []
    const replaced = NATIVE_VIEWS.filter(({ id }) => disabled.includes(id))
    const views: FolderViewExtension[] = replaced.map((view) => ({
      id: `${REPLACEMENT_VIEW_ID_PREFIX}${view.name}`,
      type: 'folderView',
      extensionPointIds: ALL_FOLDER_VIEW_EXTENSION_POINT_IDS,
      folderView: {
        name: view.name,
        label: nativeLabels[view.name],
        icon: { name: view.icon, fillType: 'none' },
        component: markRaw(view.component)
      } satisfies FolderView
    }))
    if (replaced.some(({ name }) => name === 'resource-table')) {
      return views
    }
    // Vues natives conservées : on ajoute la vue séparée « Liste avec icônes personnalisées ».
    return [
      ...views,
      {
        id: FOLDER_VIEW_EXTENSION_ID,
        type: 'folderView',
        extensionPointIds: FOLDER_VIEW_EXTENSION_POINT_IDS,
        folderView: {
          name: FOLDER_VIEW_NAME,
          label: $gettext('List with custom icons'),
          icon: { name: 'palette', fillType: 'line' },
          component: markRaw(FolderIconTable)
        }
      }
    ]
  })

  const action = computed<FileAction>(() => ({
    name: 'folder-icons-customize',
    icon: 'palette',
    category: 'tertiary',
    label: () => $gettext('Customize icon'),
    isVisible: ({ resources }) =>
      unref(store.isAvailable) && resources.length === 1 && isCustomizableFolder(resources[0]),
    handler: ({ space, resources }) => {
      dispatchModal({
        title: $gettext('Customize icon'),
        hideConfirmButton: true,
        customComponent: markRaw(FolderIconPicker),
        customComponentAttrs: () => ({ space, resource: resources[0] })
      })
    },
    class: 'oc-files-actions-folder-icons-customize'
  }))

  return computed<Extension[]>(() => [
    {
      id: ACTION_EXTENSION_ID,
      type: 'action',
      extensionPointIds: ['global.files.context-actions'],
      action: unref(action)
    } satisfies ActionExtension,
    ...unref(folderViews)
  ])
}
