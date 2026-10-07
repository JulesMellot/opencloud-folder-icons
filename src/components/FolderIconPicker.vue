<template>
  <div class="folder-icons-picker">
    <div class="ext:flex ext:items-center ext:gap-4 ext:mb-4" aria-live="polite">
      <span
        class="ext:inline-flex ext:items-center ext:justify-center ext:size-16 ext:rounded-lg ext:bg-role-surface-container"
        data-test-id="folder-icons-preview"
      >
        <img
          v-if="selectedImage"
          :src="selectedImage"
          alt=""
          class="ext:size-12 ext:object-contain"
          data-test-id="folder-icons-preview-image"
        />
        <oc-icon
          v-else
          :name="selectedIcon"
          fill-type="fill"
          :color="selectedHex"
          size-class="size-12"
        />
      </span>
      <div class="ext:min-w-0">
        <p class="ext:m-0 ext:truncate ext:font-semibold" v-text="resource.name" />
        <p class="ext:m-0 ext:text-sm" v-text="previewLabel" />
      </div>
    </div>

    <fieldset class="ext:border-0 ext:p-0 ext:m-0 ext:mb-4" data-test-id="folder-icons-scope">
      <legend class="ext:text-sm ext:font-semibold ext:mb-1">{{ $gettext('Apply to') }}</legend>
      <div class="ext:flex ext:flex-wrap ext:gap-x-4 ext:gap-y-1">
        <label class="ext:flex ext:items-center ext:gap-2 ext:cursor-pointer">
          <input v-model="scope" type="radio" value="me" data-test-id="folder-icons-scope-me" />
          {{ $gettext('Only me') }}
        </label>
        <label
          class="ext:flex ext:items-center ext:gap-2"
          :class="canShare ? 'ext:cursor-pointer' : 'ext:opacity-50 ext:cursor-not-allowed'"
        >
          <input
            v-model="scope"
            type="radio"
            value="all"
            :disabled="!canShare"
            data-test-id="folder-icons-scope-all"
          />
          {{ $gettext('Everyone with access') }}
        </label>
      </div>
      <p class="ext:text-sm ext:m-0 ext:mt-1" v-text="scopeHint" />
    </fieldset>

    <div class="ext:flex ext:flex-wrap ext:items-center ext:gap-2 ext:mb-4">
      <input
        ref="fileInput"
        type="file"
        class="ext:hidden"
        :accept="ACCEPT_ATTRIBUTE"
        data-test-id="folder-icons-file"
        @change="onFileSelected"
      />
      <oc-button
        size="small"
        class="folder-icons-upload"
        :disabled="isImporting"
        @click="fileInput?.click()"
      >
        <oc-icon name="image-add" fill-type="line" size-class="size-4" />
        {{ $gettext('Upload an image') }}
      </oc-button>
      <span class="ext:text-sm" v-text="$gettext('PNG or ICO, 1 MB max.')" />
    </div>

    <icon-catalog
      :model-value="selectedIcon"
      :active="!selectedImage"
      :color="selectedHex"
      @update:model-value="selectIcon"
    />

    <h3 id="folder-icons-colors" class="ext:text-sm ext:font-semibold ext:mt-4 ext:mb-1">
      {{ $gettext('Color') }}
    </h3>
    <p
      v-if="selectedImage"
      class="ext:text-sm ext:m-0 ext:mb-1"
      v-text="$gettext('Colors only apply to icons from the catalog.')"
    />
    <div
      role="radiogroup"
      aria-labelledby="folder-icons-colors"
      class="ext:flex ext:flex-wrap ext:gap-2"
      @keydown="onArrowKey($event, colorIds, selectedColor, selectColor, 'data-color')"
    >
      <button
        v-for="color in colors"
        :key="color.id"
        type="button"
        role="radio"
        :aria-checked="color.id === selectedColor"
        :aria-label="color.label"
        :title="color.label"
        :tabindex="color.id === selectedColor ? 0 : -1"
        :data-color="color.id"
        :disabled="!!selectedImage"
        class="ext:size-8 ext:rounded-full ext:border-2 ext:cursor-pointer ext:flex ext:items-center ext:justify-center ext:disabled:opacity-40 ext:disabled:cursor-not-allowed"
        :class="
          color.id === selectedColor ? 'ext:border-role-on-surface' : 'ext:border-role-outline'
        "
        :style="color.hex ? { backgroundColor: color.hex } : {}"
        @click="selectColor(color.id)"
      >
        <oc-icon v-if="color.id === selectedColor" name="check" size-class="size-4" />
      </button>
    </div>

    <teleport defer :to="`#${modalActionsTarget(modal)}`">
      <oc-button class="oc-modal-body-actions-cancel ext:ml-2" @click="$emit('cancel')">
        {{ $gettext('Cancel') }}
      </oc-button>
      <oc-button
        class="folder-icons-reset ext:ml-2"
        :disabled="!scopePreference || isSaving"
        @click="save(undefined)"
      >
        {{ $gettext('Reset') }}
      </oc-button>
      <oc-button
        class="oc-modal-body-actions-confirm ext:ml-2"
        appearance="filled"
        :disabled="isImporting || isSaving"
        :show-spinner="isSaving"
        @click="save(selection)"
      >
        {{ $gettext('Save') }}
      </oc-button>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  Modal,
  modalActionsTarget,
  useClientService,
  useMessages,
  useModals,
  useResourcesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { HttpError, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { FolderIconPreference, getIcons, getPalette } from '../catalog'
import { useFolderIconsStore } from '../composables/useFolderIconsStore'
import { ACCEPT_ATTRIBUTE, ImageImportError, imageFileToDataUrl } from '../image'
import { onArrowKey } from '../rovingFocus'
import { encodeSharedPreference, SHARED_ICON_PROP } from '../shared'
import IconCatalog from './IconCatalog.vue'

const { modal, space, resource } = defineProps<{
  modal: Modal
  space: SpaceResource
  resource: Resource
}>()
defineEmits<{ (e: 'cancel'): void }>()

const { $gettext } = useGettext()
const store = useFolderIconsStore()
const { removeModal } = useModals()
const { showMessage, showErrorMessage } = useMessages()
const clientService = useClientService()
const resourcesStore = useResourcesStore()
const userStore = useUserStore()

const icons = getIcons($gettext)
const colors = [{ id: '', label: $gettext('Default color'), hex: '' }, ...getPalette($gettext)]
const colorIds = colors.map(({ id }) => id)

const personalPreference = store.getPreference(resource)
const sharedPreference = store.getSharedPreference(resource)
// Écrire une métadonnée demande le même droit que téléverser dans le dossier (le serveur tranche).
const canShare = !!resource.canUpload?.({ user: userStore.user })
const scope = ref<'me' | 'all'>(!personalPreference && sharedPreference ? 'all' : 'me')
const scopePreference = computed(() =>
  unref(scope) === 'all' ? sharedPreference : personalPreference
)
const scopeHint = computed(() => {
  if (unref(scope) === 'all') {
    return $gettext('Everyone who can access this folder will see this icon.')
  }
  return canShare
    ? $gettext('Only you will see this icon, in this browser.')
    : $gettext(
        'Only you will see this icon, in this browser. Sharing it requires permission to edit this folder.'
      )
})

const initialPreference = personalPreference ?? sharedPreference
const savedIcon = initialPreference && 'icon' in initialPreference ? initialPreference : undefined
const selectedIcon = ref(savedIcon?.icon ?? 'folder')
const selectedColor = ref(savedIcon?.color ?? '')
const selectedImage = ref(
  initialPreference && 'image' in initialPreference ? initialPreference.image : ''
)
const isSaving = ref(false)
const isImporting = ref(false)
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

const selection = computed<FolderIconPreference>(() => {
  if (unref(selectedImage)) {
    return { image: unref(selectedImage) }
  }
  return { icon: unref(selectedIcon), ...(unref(selectedColor) && { color: unref(selectedColor) }) }
})

const selectedHex = computed(() => colors.find(({ id }) => id === unref(selectedColor))?.hex)
const previewLabel = computed(() => {
  if (unref(selectedImage)) {
    return $gettext('Custom image')
  }
  const icon = icons.find(({ name }) => name === unref(selectedIcon))?.label
  const color = colors.find(({ id }) => id === unref(selectedColor))?.label
  return `${icon} – ${color}`
})

function selectIcon(name: string) {
  selectedIcon.value = name
  selectedImage.value = ''
}
function selectColor(id: string) {
  selectedColor.value = id
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // permet de re-sélectionner le même fichier après une erreur
  if (!file) {
    return
  }
  isImporting.value = true
  try {
    selectedImage.value = await imageFileToDataUrl(file)
  } catch (e) {
    const reason = e instanceof ImageImportError ? e.reason : 'unreadable'
    const titles = {
      type: $gettext('Unsupported format: only PNG and ICO files are accepted'),
      size: $gettext('The image is too large (1 MB max.)'),
      unreadable: $gettext('The image could not be read')
    }
    showErrorMessage({ title: titles[reason], errors: [new Error(`image import: ${reason}`)] })
  } finally {
    isImporting.value = false
  }
}

async function saveShared(pref: FolderIconPreference | undefined) {
  const value = encodeSharedPreference(pref)
  await clientService.webdav.setProperties(
    space,
    { path: resource.path },
    { [SHARED_ICON_PROP]: value },
    { extraProps: [SHARED_ICON_PROP] }
  )
  resourcesStore.updateResourceField({
    id: resource.id,
    field: 'extraProps',
    value: { ...resource.extraProps, [SHARED_ICON_PROP]: value }
  })
  // Sinon l'icône personnelle, prioritaire, masquerait l'icône commune pour son auteur.
  if (pref && personalPreference) {
    try {
      store.setPreference(resource, undefined)
    } catch {
      // stockage local indisponible : l'icône commune est enregistrée quand même
    }
  }
}

async function save(pref: FolderIconPreference | undefined) {
  isSaving.value = true
  try {
    if (unref(scope) === 'all') {
      await saveShared(pref)
    } else {
      store.setPreference(resource, pref)
    }
  } catch (e) {
    const status = (e as HttpError)?.statusCode
    const titles: Record<number, string> = {
      403: $gettext('You are not allowed to change the icon of this folder for everyone'),
      423: $gettext('This folder is locked')
    }
    showErrorMessage({
      title: titles[status] ?? $gettext('The folder icon could not be saved'),
      errors: [new Error(`folder icon save failed${status ? ` (${status})` : ''}`)]
    })
    return
  } finally {
    isSaving.value = false
  }
  removeModal(modal.id)
  showMessage({
    title: pref ? $gettext('Folder icon saved') : $gettext('Folder icon reset')
  })
}
</script>
