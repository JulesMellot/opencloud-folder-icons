// Persistance des préférences, isolée derrière une interface pour pouvoir passer plus tard
// à un stockage serveur sans toucher au reste de l'extension.
import { FolderIconPreference, isValidPreference } from './catalog'

export type FolderIconMap = Record<string, FolderIconPreference>

export interface FolderIconStorage {
  /** Ne lève jamais d'exception : un stockage absent ou corrompu donne une carte vide. */
  load(): FolderIconMap
  /** Lève une exception si l'écriture est impossible (quota, stockage bloqué, données plus récentes). */
  save(map: FolderIconMap): void
}

export const STORAGE_PREFIX = 'opencloud-folder-icons'
// v1 : icônes du catalogue. v2 : + images importées. v1 étant un sous-ensemble de v2, il est relu tel quel.
export const STORAGE_VERSION = 2
const READABLE_VERSIONS = [1, 2]

type StoredData = { version: number; folders: Record<string, unknown> }

/** Clé de stockage : une entrée par couple instance + utilisateur. */
export function storageKey(instanceUrl: string, userId: string) {
  return `${STORAGE_PREFIX}:${instanceUrl.replace(/\/+$/, '')}:${userId}`
}

/** Clé d'un dossier : espace + identifiant stable du nœud (jamais le nom ni le chemin). */
export function folderKey(resource: { storageId?: string; fileId?: string; id: string }) {
  return `${resource.storageId ?? ''}|${resource.fileId || resource.id}`
}

function read(storage: Storage, key: string): StoredData | undefined {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? 'null')
    if (parsed && typeof parsed === 'object' && typeof parsed.version === 'number') {
      return parsed
    }
  } catch {
    // JSON corrompu ou stockage inaccessible : on retombe sur les icônes natives.
  }
  return undefined
}

export function createLocalFolderIconStorage(
  key: string,
  getStorage: () => Storage = () => window.localStorage
): FolderIconStorage {
  return {
    load() {
      let data: StoredData | undefined
      try {
        data = read(getStorage(), key)
      } catch {
        return {}
      }
      if (
        !READABLE_VERSIONS.includes(data?.version) ||
        !data.folders ||
        typeof data.folders !== 'object'
      ) {
        return {}
      }
      // Les entrées invalides (icône retirée du catalogue, couleur inconnue…) sont ignorées une à une.
      return Object.fromEntries(
        Object.entries(data.folders).filter(([, pref]) => isValidPreference(pref))
      ) as FolderIconMap
    },
    save(map) {
      const storage = getStorage()
      const existing = read(storage, key)
      // Ne jamais écraser des données écrites par une version plus récente de l'extension.
      if (existing && existing.version > STORAGE_VERSION) {
        throw new Error('Stored folder icons were written by a newer version')
      }
      if (!Object.keys(map).length) {
        storage.removeItem(key)
        return
      }
      storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, folders: map }))
    }
  }
}
