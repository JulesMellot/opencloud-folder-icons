<template>
  <!-- ResourceTable native : seules les icônes passent par le slot public `image`.
       Props, événements et autres slots (menu contextuel, actions rapides, badges…) sont relayés tels quels. -->
  <resource-table :resources="resources" v-bind="$attrs">
    <template v-for="name in passthroughSlots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
    <template #image="{ resource }">
      <!-- Dès qu'un slot `image` existe, ResourceTable masque son icône : on rend donc aussi le cas par défaut. -->
      <span v-if="store.getIcon(resource)" class="ext:inline-flex ext:shrink-0 ext:mr-2">
        <custom-folder-icon :icon="store.getIcon(resource)" size-class="size-6" />
      </span>
      <slot v-else-if="$slots.image" name="image" :resource="resource" />
      <span v-else class="ext:inline-flex ext:shrink-0 ext:mr-2">
        <oc-image
          v-if="resource.thumbnail"
          :src="resource.thumbnail"
          class="ext:rounded-xs ext:size-6 ext:object-cover"
          alt=""
          decoding="async"
        />
        <resource-icon v-else :resource="resource" size-class="size-6" aria-hidden="true" />
      </span>
    </template>
  </resource-table>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { ResourceIcon, ResourceTable } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { useFolderIconsStore } from '../composables/useFolderIconsStore'
import CustomFolderIcon from './CustomFolderIcon.vue'

defineOptions({ inheritAttrs: false })
defineProps<{ resources: Resource[] }>()

const store = useFolderIconsStore()
const slots = useSlots()
// `image` est géré ci-dessus : le relayer aussi l'écraserait (les slots dynamiques l'emportent).
const passthroughSlots = computed(() => Object.keys(slots).filter((name) => name !== 'image'))
</script>
