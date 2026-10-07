<template>
  <img
    v-if="icon.kind === 'image'"
    :src="icon.src"
    :alt="$gettext('Custom folder icon')"
    class="ext:object-contain"
    :class="sizeClass"
    data-test-id="folder-icons-custom-image"
  />
  <oc-icon
    v-else
    :name="icon.name"
    :fill-type="icon.fillType"
    :color="icon.color"
    :accessible-label="$gettext('Custom folder icon')"
    :size-class="sizeClass"
    data-test-id="folder-icons-custom"
  />
</template>

<script setup lang="ts">
import { ResolvedFolderIcon } from '../catalog'

defineProps<{ icon: ResolvedFolderIcon; sizeClass: string }>()
</script>
