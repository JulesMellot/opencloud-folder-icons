// Icône partagée : stockée sur le dossier lui-même, comme métadonnée WebDAV (PROPPATCH), donc
// visible par toutes les personnes qui ont accès au dossier. Côté serveur (reva), elle est rangée
// dans les attributs étendus du nœud ; l'écriture demande le droit de téléverser dans le dossier.
//
// Le serveur stocke le XML brut reçu et le renvoie échappé : la valeur ne doit contenir aucun
// caractère XML spécial. Format versionné, uniquement [A-Za-z0-9+/=;-] :
//   1;icon;<nom>;<couleur ou vide>
//   1;image;<base64 du PNG>
//   1;webp;<base64 du WebP>
// Une valeur vide efface l'icône (le serveur ne renvoie pas les métadonnées vides).
import { FolderIconPreference, isValidPreference } from './catalog'

/** Préfixe = espace de noms XML propre à l'extension (les préfixes `oc:` inconnus sont refusés). */
export const SHARED_ICON_PROP = 'ocfoldericons:folder-icon'
// Type d'image ↔ mot-clé de la valeur partagée (`image` = PNG, conservé depuis la 0.2.0).
const IMAGE_KINDS: Record<string, string> = {
  image: 'data:image/png;base64,',
  webp: 'data:image/webp;base64,'
}

export function encodeSharedPreference(pref: FolderIconPreference | undefined): string {
  if (!pref) {
    return ''
  }
  if ('image' in pref) {
    const [kind, prefix] = Object.entries(IMAGE_KINDS).find(([, p]) => pref.image.startsWith(p))
    return `1;${kind};${pref.image.slice(prefix.length)}`
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
  if (version === '1' && Object.hasOwn(IMAGE_KINDS, kind)) {
    pref = { image: IMAGE_KINDS[kind] + a }
  } else if (version === '1' && kind === 'icon') {
    pref = { icon: a, ...(b && { color: b }) }
  }
  return isValidPreference(pref) ? pref : undefined
}
