// Résolution de l'apparence : catalogue d'icônes, palette et validation des préférences.
// Toutes les icônes viennent du jeu Remix Icon livré par OpenCloud Web (`<serveur>/icons/*.svg`),
// rien n'est chargé depuis un service externe.

export type CategoryId =
  'folders' | 'work' | 'documents' | 'photos' | 'videos' | 'music' | 'archives' | 'personal'

export type CatalogIcon = { name: string; label: string; category: CategoryId }
export type PaletteColor = { id: string; label: string; hex: string }

/**
 * Préférence stockée pour un dossier : une icône du catalogue (`color` absent = couleur du thème)
 * ou une image importée, toujours redessinée (192 px max.) et ré-encodée en WebP ou PNG (data URL)
 * avant stockage.
 */
export type FolderIconPreference = { icon: string; color?: string } | { image: string }

export type ResolvedFolderIcon =
  { kind: 'icon'; name: string; fillType: 'fill'; color: string } | { kind: 'image'; src: string }

/**
 * Plafond d'une image stockée : tient dans un attribut étendu (ZFS, XFS, Btrfs) et ne pèse pas sur
 * le quota du navigateur. L'import réduit la taille jusqu'à passer sous ce seuil.
 */
export const MAX_IMAGE_DATA_URL_LENGTH = 32_000
const IMAGE_DATA_URL = /^data:image\/(png|webp);base64,[A-Za-z0-9+/]+={0,2}$/

type Gettext = (msgid: string) => string

// Les libellés sont écrits en appels littéraux à $gettext pour rester extractibles (gettext-extract).
export function getCategories($gettext: Gettext): { id: CategoryId; label: string }[] {
  return [
    { id: 'folders', label: $gettext('Folders') },
    { id: 'work', label: $gettext('Work') },
    { id: 'documents', label: $gettext('Documents') },
    { id: 'photos', label: $gettext('Photos') },
    { id: 'videos', label: $gettext('Videos') },
    { id: 'music', label: $gettext('Music') },
    { id: 'archives', label: $gettext('Archives') },
    { id: 'personal', label: $gettext('Personal') }
  ]
}

export function getIcons($gettext: Gettext): CatalogIcon[] {
  const icon = (category: CategoryId) => (name: string, label: string) => ({
    name,
    label,
    category
  })
  const folders = icon('folders')
  const work = icon('work')
  const documents = icon('documents')
  const photos = icon('photos')
  const videos = icon('videos')
  const music = icon('music')
  const archives = icon('archives')
  const personal = icon('personal')

  return [
    folders('folder', $gettext('Folder')),
    folders('folder-2', $gettext('Folder (tab)')),
    folders('folder-3', $gettext('Folder (open)')),
    folders('folder-5', $gettext('Folder (stack)')),
    folders('folder-check', $gettext('Folder checked')),
    folders('folder-lock', $gettext('Locked folder')),
    folders('folder-shared', $gettext('Shared folder')),
    folders('folder-user', $gettext('User folder')),
    work('briefcase', $gettext('Briefcase')),
    work('building', $gettext('Office')),
    work('presentation', $gettext('Presentation')),
    work('bar-chart-box', $gettext('Chart')),
    work('folder-chart', $gettext('Reports')),
    work('calendar', $gettext('Calendar')),
    work('team', $gettext('Team')),
    work('mail-open', $gettext('Mail')),
    work('code-box', $gettext('Code')),
    work('flask', $gettext('Research')),
    documents('file-text', $gettext('Text document')),
    documents('file-list-3', $gettext('List')),
    documents('file-paper-2', $gettext('Contract')),
    documents('article', $gettext('Article')),
    documents('book-open', $gettext('Book')),
    documents('booklet', $gettext('Booklet')),
    documents('newspaper', $gettext('Newspaper')),
    documents('clipboard', $gettext('Clipboard')),
    photos('image', $gettext('Image')),
    photos('gallery', $gettext('Gallery')),
    photos('folder-image', $gettext('Photo folder')),
    photos('camera', $gettext('Camera')),
    photos('camera-lens', $gettext('Lens')),
    photos('landscape', $gettext('Landscape')),
    photos('polaroid', $gettext('Instant photo')),
    photos('palette', $gettext('Palette')),
    videos('film', $gettext('Film')),
    videos('movie', $gettext('Movie')),
    videos('folder-video', $gettext('Video folder')),
    videos('clapperboard', $gettext('Clapperboard')),
    videos('vidicon', $gettext('Video camera')),
    videos('play-circle', $gettext('Play')),
    music('music', $gettext('Music note')),
    music('music-2', $gettext('Notes')),
    music('folder-music', $gettext('Music folder')),
    music('headphone', $gettext('Headphones')),
    music('album', $gettext('Album')),
    music('disc', $gettext('Disc')),
    music('mic', $gettext('Microphone')),
    music('play-list', $gettext('Playlist')),
    archives('archive', $gettext('Archive')),
    archives('archive-drawer', $gettext('Drawer')),
    archives('inbox-archive', $gettext('Archived inbox')),
    archives('folder-zip', $gettext('Compressed folder')),
    archives('box-3', $gettext('Box')),
    archives('safe', $gettext('Safe')),
    archives('stack', $gettext('Stack')),
    archives('history', $gettext('History')),
    personal('home', $gettext('Home')),
    personal('heart', $gettext('Heart')),
    personal('user', $gettext('Person')),
    personal('star', $gettext('Star')),
    personal('gift', $gettext('Gift')),
    personal('plane', $gettext('Travel')),
    personal('gamepad', $gettext('Games')),
    personal('cake-2', $gettext('Birthday')),
    personal('shopping-bag', $gettext('Shopping')),
    personal('graduation-cap', $gettext('School'))
  ]
}

// Teintes moyennes (Tailwind 500), lisibles sur fond clair comme sur fond sombre.
export function getPalette($gettext: Gettext): PaletteColor[] {
  return [
    { id: 'blue', label: $gettext('Blue'), hex: '#3b82f6' },
    { id: 'sky', label: $gettext('Sky blue'), hex: '#0ea5e9' },
    { id: 'teal', label: $gettext('Teal'), hex: '#14b8a6' },
    { id: 'green', label: $gettext('Green'), hex: '#22c55e' },
    { id: 'yellow', label: $gettext('Yellow'), hex: '#eab308' },
    { id: 'orange', label: $gettext('Orange'), hex: '#f97316' },
    { id: 'red', label: $gettext('Red'), hex: '#ef4444' },
    { id: 'pink', label: $gettext('Pink'), hex: '#ec4899' },
    { id: 'purple', label: $gettext('Purple'), hex: '#a855f7' },
    { id: 'grey', label: $gettext('Grey'), hex: '#6b7280' }
  ]
}

const identity: Gettext = (s) => s
const ICON_NAMES = new Set(getIcons(identity).map(({ name }) => name))
const COLOR_HEX = new Map(getPalette(identity).map(({ id, hex }) => [id, hex]))

/** Garde-fou : icônes du catalogue, couleurs de la palette ou PNG/WebP en data URL de taille bornée. */
export function isValidPreference(value: unknown): value is FolderIconPreference {
  if (!value || typeof value !== 'object') {
    return false
  }
  const { icon, color, image } = value as Record<string, unknown>
  if (image !== undefined) {
    return (
      icon === undefined &&
      color === undefined &&
      typeof image === 'string' &&
      image.length <= MAX_IMAGE_DATA_URL_LENGTH &&
      IMAGE_DATA_URL.test(image)
    )
  }
  if (typeof icon !== 'string' || !ICON_NAMES.has(icon)) {
    return false
  }
  return color === undefined || (typeof color === 'string' && COLOR_HEX.has(color))
}

/** Préférence → apparence à afficher. `undefined` (icône native) si la préférence est invalide. */
export function resolveFolderIcon(pref: unknown): ResolvedFolderIcon | undefined {
  if (!isValidPreference(pref)) {
    return undefined
  }
  if ('image' in pref) {
    return { kind: 'image', src: pref.image }
  }
  return { kind: 'icon', name: pref.icon, fillType: 'fill', color: COLOR_HEX.get(pref.color) ?? '' }
}
