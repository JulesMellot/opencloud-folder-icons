// Icône partagée : stockée sur le dossier lui-même, comme métadonnée WebDAV (PROPPATCH), donc
// visible par toutes les personnes qui ont accès au dossier. Côté serveur (reva), elle est rangée
// dans les attributs étendus du nœud ; l'écriture demande le droit de téléverser dans le dossier.
//
// Le serveur stocke le XML brut reçu et le renvoie échappé : la valeur ne doit contenir aucun
// caractère XML spécial. Format versionné, uniquement [A-Za-z0-9+/=;-] :
//   1;icon;<nom>;<couleur ou vide>
//   1;image;<base64 du PNG>
// Une valeur vide efface l'icône (le serveur ne renvoie pas les métadonnées vides).
import { FolderIconPreference, isValidPreference } from './catalog'

/** Préfixe = espace de noms XML propre à l'extension (les préfixes `oc:` inconnus sont refusés). */
export const SHARED_ICON_PROP = 'ocfoldericons:folder-icon'
const PNG_PREFIX = 'data:image/png;base64,'

export function encodeSharedPreference(pref: FolderIconPreference | undefined): string {
  if (!pref) {
    return ''
  }
  if ('image' in pref) {
    return `1;image;${pref.image.slice(PNG_PREFIX.length)}`
  }
  return `1;icon;${pref.icon};${pref.color ?? ''}`
}

/** Valeur écrite par n'importe quel membre : non fiable, validée comme une préférence locale. */
export function decodeSharedPreference(value: unknown): FolderIconPreference | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const [version, kind, a, b] = value.split(';')
  let pref: FolderIconPreference | undefined
  if (version === '1' && kind === 'image') {
    pref = { image: PNG_PREFIX + a }
  } else if (version === '1' && kind === 'icon') {
    pref = { icon: a, ...(b && { color: b }) }
  }
  return isValidPreference(pref) ? pref : undefined
}
