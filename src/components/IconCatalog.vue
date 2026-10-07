<template>
  <div>
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
          @keydown="onArrowKey($event, flatIcons, modelValue, select, 'data-icon')"
        >
          <button
            v-for="icon in group.icons"
            :key="icon.name"
            type="button"
            role="radio"
            :aria-checked="active && icon.name === modelValue"
            :aria-label="icon.label"
            :title="icon.label"
            :tabindex="icon.name === focusableIcon ? 0 : -1"
            :data-icon="icon.name"
            class="ext:flex ext:items-center ext:justify-center ext:p-2 ext:rounded-md ext:border-2 ext:cursor-pointer ext:bg-transparent ext:hover:bg-role-surface-container ext:focus-visible:outline-2"
            :class="
              active && icon.name === modelValue
                ? 'ext:border-role-primary'
                : 'ext:border-transparent'
            "
            @click="select(icon.name)"
          >
            <oc-icon :name="icon.name" fill-type="fill" :color="color" size-class="size-6" />
          </button>
        </div>
      </section>
      <p v-if="!groups.length" class="ext:text-sm" v-text="$gettext('No icon found')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { getCategories, getIcons } from '../catalog'
import { onArrowKey } from '../rovingFocus'

const {
  modelValue,
  active = true,
  color = ''
} = defineProps<{
  modelValue: string
  /** `false` quand une image importée est sélectionnée : aucune icône n'est cochée. */
  active?: boolean
  color?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const { $gettext } = useGettext()
const icons = getIcons($gettext)
const categories = getCategories($gettext)
const search = ref('')

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
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
  unref(flatIcons).includes(modelValue) ? modelValue : unref(flatIcons)[0]
)

function select(name: string) {
  emit('update:modelValue', name)
}
</script>
