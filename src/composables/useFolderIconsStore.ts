import { defineStore } from 'pinia'
import { computed, ref, unref, watch } from 'vue'
import { useConfigStore, useUserStore } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { FolderIconPreference, ResolvedFolderIcon, resolveFolderIcon } from '../catalog'
import { decodeSharedPreference, SHARED_ICON_PROP } from '../shared'
import { createLocalFolderIconStorage, folderKey, FolderIconMap, storageKey } from '../storage'

export function isCustomizableFolder(resource: Resource) {
  return !!resource?.isFolder && resource.type !== 'space'
}

// Décodage des icônes partagées mis en cache par valeur brute : pas de revalidation à chaque rendu.
// ponytail: vidé en bloc au-delà de 500 entrées, un LRU si les listes deviennent énormes.
const sharedCache = new Map<string, ResolvedFolderIcon | undefined>()

// Préférences personnelles : objets stables tant qu'ils ne sont pas modifiés, d'où un WeakMap.
const personalCache = new WeakMap<FolderIconPreference, ResolvedFolderIcon | undefined>()

function resolvePersonal(pref: FolderIconPreference | undefined) {
  if (!pref) {
    return undefined
  }
  if (!personalCache.has(pref)) {
    personalCache.set(pref, resolveFolderIcon(pref))
  }
  return personalCache.get(pref)
}

function resolveShared(value: unknown) {
  if (typeof value !== 'string' || !value) {
    return undefined
  }
  if (!sharedCache.has(value)) {
    if (sharedCache.size > 500) {
      sharedCache.clear()
    }
    sharedCache.set(value, resolveFolderIcon(decodeSharedPreference(value)))
  }
  return sharedCache.get(value)
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

  /** Icône partagée par les membres, lue dans la réponse PROPFIND (aucune requête dédiée). */
  function getSharedPreference(resource: Resource): FolderIconPreference | undefined {
    if (!isCustomizableFolder(resource)) {
      return undefined
    }
    return decodeSharedPreference(resource.extraProps?.[SHARED_ICON_PROP])
  }

  /** Priorité à la préférence personnelle, sinon l'icône partagée du dossier. */
  function getIcon(resource: Resource) {
    const personal = resolvePersonal(getPreference(resource))
    if (personal || !isCustomizableFolder(resource)) {
      return personal
    }
    return resolveShared(resource.extraProps?.[SHARED_ICON_PROP])
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

  return { isAvailable, getPreference, getSharedPreference, getIcon, setPreference }
})
