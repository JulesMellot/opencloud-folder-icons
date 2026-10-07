import { nextTick } from 'vue'

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/**
 * Navigation aux flèches dans un groupe de boutons radio (tabulation « roving ») : sélectionne
 * l'élément voisin puis lui donne le focus. `attr` identifie les boutons dans `root`.
 */
export async function onArrowKey(
  event: KeyboardEvent,
  items: string[],
  current: string,
  select: (value: string) => void,
  attr: string,
  rootSelector = '.folder-icons-picker'
) {
  const step = STEPS[event.key]
  if (!step || !items.length) {
    return
  }
  event.preventDefault()
  const root = (event.currentTarget as HTMLElement).closest(rootSelector)
  const next = items[(Math.max(items.indexOf(current), 0) + step + items.length) % items.length]
  select(next)
  await nextTick()
  root?.querySelector<HTMLElement>(`[${attr}="${next}"]`)?.focus()
}
