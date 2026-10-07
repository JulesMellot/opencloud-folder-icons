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

    <oc-text-input
      v-model="search"
      class="ext:mb-4"
      :label="$gettext('Search icons')"
      :clear-button-enabled="true"
      data-test-id="folder-icons-search"
    />

    <div class="ext:max-h-72 ext:overflow-y-auto ext:pr-1">
      <section v-for="group in groups" :key="group.id" class="ext:mb-3">
        <h3 :id="`folder-icons-cat-${group.id}`" class="ext:text-sm ext:font-semibold ext:mb-1">
          {{ group.label }}
        </h3>
        <div
          role="radiogroup"
          :aria-labelledby="`folder-icons-cat-${group.id}`"
          class="ext:grid ext:grid-cols-8 ext:gap-1"
          @keydown="onArrowKey($event, flatIcons, selectedIcon, selectIcon, 'data-icon')"
        >
          <button
            v-for="icon in group.icons"
            :key="icon.name"
            type="button"
            role="radio"
            :aria-checked="!selectedImage && icon.name === selectedIcon"
            :aria-label="icon.label"
            :title="icon.label"
            :tabindex="icon.name === focusableIcon ? 0 : -1"
            :data-icon="icon.name"
            class="ext:flex ext:items-center ext:justify-center ext:p-2 ext:rounded-md ext:border-2 ext:cursor-pointer ext:bg-transparent ext:hover:bg-role-surface-container ext:focus-visible:outline-2"
            :class="
              !selectedImage && icon.name === selectedIcon
                ? 'ext:border-role-primary'
                : 'ext:border-transparent'
            "
            @click="selectIcon(icon.name)"
          >
            <oc-icon :name="icon.name" fill-type="fill" :color="selectedHex" size-class="size-6" />
          </button>
        </div>
      </section>
      <p v-if="!groups.length" class="ext:text-sm" v-text="$gettext('No icon found')" />
    </div>

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
        :disabled="!currentPreference"
        @click="save(undefined)"
      >
        {{ $gettext('Reset') }}
      </oc-button>
      <oc-button
        class="oc-modal-body-actions-confirm ext:ml-2"
        appearance="filled"
        :disabled="isImporting"
        @click="save(selection)"
      >
        {{ $gettext('Save') }}
      </oc-button>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, unref, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import { Modal, modalActionsTarget, useMessages, useModals } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { FolderIconPreference, getCategories, getIcons, getPalette } from '../catalog'
import { useFolderIconsStore } from '../composables/useFolderIconsStore'
import { ACCEPT_ATTRIBUTE, ImageImportError, imageFileToDataUrl } from '../image'

const { modal, resource } = defineProps<{ modal: Modal; resource: Resource }>()
defineEmits<{ (e: 'cancel'): void }>()

const { $gettext } = useGettext()
const store = useFolderIconsStore()
const { removeModal } = useModals()
const { showMessage, showErrorMessage } = useMessages()

const icons = getIcons($gettext)
const categories = getCategories($gettext)
const colors = [{ id: '', label: $gettext('Default color'), hex: '' }, ...getPalette($gettext)]
const colorIds = colors.map(({ id }) => id)

const currentPreference = store.getPreference(resource)
const savedIcon = currentPreference && 'icon' in currentPreference ? currentPreference : undefined
const selectedIcon = ref(savedIcon?.icon ?? 'folder')
const selectedColor = ref(savedIcon?.color ?? '')
const selectedImage = ref(
  currentPreference && 'image' in currentPreference ? currentPreference.image : ''
)
const search = ref('')
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

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const groups = computed(() => {
  const term = normalize(unref(search).trim())
  return categories
    .map((category) => ({
      ...category,
      icons: icons.filter(
        (icon) =>
          icon.category === category.id &&
          (!term || normalize(`${icon.label} ${icon.name} ${category.label}`).includes(term))
      )
    }))
    .filter((group) => group.icons.length)
})
const flatIcons = computed(() => unref(groups).flatMap((g) => g.icons.map(({ name }) => name)))
// Tabulation « roving » : un seul bouton focalisable dans le catalogue, les flèches font le reste.
const focusableIcon = computed(() =>
  unref(flatIcons).includes(unref(selectedIcon)) ? unref(selectedIcon) : unref(flatIcons)[0]
)

function selectIcon(name: string) {
  selectedIcon.value = name
  selectedImage.value = ''
}
function selectColor(id: string) {
  selectedColor.value = id
}

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

async function onArrowKey(
  event: KeyboardEvent,
  items: string[],
  current: string,
  select: (value: string) => void,
  attr: 'data-icon' | 'data-color'
) {
  const step = STEPS[event.key]
  if (!step || !items.length) {
    return
  }
  event.preventDefault()
  const root = (event.currentTarget as HTMLElement).closest('.folder-icons-picker')
  const next = items[(Math.max(items.indexOf(current), 0) + step + items.length) % items.length]
  select(next)
  await nextTick()
  root?.querySelector<HTMLElement>(`[${attr}="${next}"]`)?.focus()
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

function save(pref: FolderIconPreference | undefined) {
  try {
    store.setPreference(resource, pref)
  } catch {
    showErrorMessage({
      title: $gettext('The folder icon could not be saved'),
      errors: [new Error('folder icon storage unavailable')]
    })
    return
  }
  removeModal(modal.id)
  showMessage({
    title: pref ? $gettext('Folder icon saved') : $gettext('Folder icon reset')
  })
}
</script>
