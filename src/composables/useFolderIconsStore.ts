import { defineStore } from 'pinia'
import { computed, ref, unref, watch } from 'vue'
import { useConfigStore, useUserStore } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { FolderIconPreference, resolveFolderIcon } from '../catalog'
import { createLocalFolderIconStorage, folderKey, FolderIconMap, storageKey } from '../storage'

export function isCustomizableFolder(resource: Resource) {
  return !!resource?.isFolder && resource.type !== 'space'
}

/**
 * État partagé des préférences de l'utilisateur courant. Chargé une seule fois depuis le
 * stockage (puis à chaque changement de compte), consulté ensuite en O(1) par ligne affichée.
 */
export const useFolderIconsStore = defineStore('web-app-folder-icons', () => {
  const configStore = useConfigStore()
  const userStore = useUserStore()

  const storage = computed(() => {
    const userId = userStore.user?.id
    if (!userId || !configStore.serverUrl) {
      return undefined
    }
    return createLocalFolderIconStorage(storageKey(configStore.serverUrl, userId))
  })

  const icons = ref<FolderIconMap>({})
  watch(storage, (s) => (icons.value = s?.load() ?? {}), { immediate: true })

  const isAvailable = computed(() => !!unref(storage))

  function getPreference(resource: Resource): FolderIconPreference | undefined {
    if (!isCustomizableFolder(resource)) {
      return undefined
    }
    return unref(icons)[folderKey(resource)]
  }

  function getIcon(resource: Resource) {
    return resolveFolderIcon(getPreference(resource))
  }

  /** `undefined` réinitialise le dossier. Lève une exception si l'écriture échoue (état inchangé). */
  function setPreference(resource: Resource, pref: FolderIconPreference | undefined) {
    const s = unref(storage)
    if (!s || !isCustomizableFolder(resource)) {
      throw new Error('Folder icon storage unavailable')
    }
    const next = { ...unref(icons) }
    if (pref) {
      next[folderKey(resource)] = pref
    } else {
      delete next[folderKey(resource)]
    }
    s.save(next)
    icons.value = next
  }

  return { isAvailable, getPreference, getIcon, setPreference }
})
