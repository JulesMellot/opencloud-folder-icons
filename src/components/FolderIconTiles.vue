<template>
  <!-- ResourceTiles native : seul le slot public `image` est utilisé. Quand il ne rend rien,
       la tuile garde son rendu natif (miniature, icône, badge d'état). -->
  <resource-tiles :resources="resources" v-bind="$attrs">
    <template v-for="name in passthroughSlots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
    <!-- Image importée : remplit l'aperçu comme une miniature (sans rognage). Icône du catalogue :
         taille des icônes de dossier natives. Rien d'autre dans ce slot (un commentaire compterait
         comme du contenu et masquerait l'aperçu natif). -->
    <template #image="{ resource }">
      <custom-folder-icon
        v-if="store.getIcon(resource)"
        :icon="store.getIcon(resource)"
        :size-class="iconSize"
        image-class="ext:size-full ext:p-3"
        :class="{ 'ext:pt-1': store.getIcon(resource).kind === 'icon' }"
      />
      <slot v-else-if="$slots.image" name="image" :resource="resource" />
    </template>
  </resource-tiles>
</template>

<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'
import { ResourceTiles } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { useFolderIconsStore } from '../composables/useFolderIconsStore'
import CustomFolderIcon from './CustomFolderIcon.vue'

defineOptions({ inheritAttrs: false })
defineProps<{ resources: Resource[] }>()

const store = useFolderIconsStore()
const slots = useSlots()
const attrs = useAttrs()
const passthroughSlots = computed(() => Object.keys(slots).filter((name) => name !== 'image'))

// Même correspondance taille de tuile → taille d'icône que ResourceTiles.vue (web-pkg 8.1).
// ponytail: ignore le plafonnement selon la largeur d'écran (viewSizeMax) ; sur écran étroit
// l'icône peut être un cran plus grande que l'icône native.
const SIZES: Record<number, string> = {
  1: 'size-12',
  2: 'size-12',
  3: 'size-22',
  4: 'size-22',
  5: 'size-42',
  6: 'size-42'
}
const iconSize = computed(() => SIZES[Number(attrs['view-size'] ?? attrs.viewSize)] ?? 'size-12')
</script>
