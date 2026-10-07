import { defineWebApplication } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import '@opencloud-eu/extension-sdk/tailwind.css'
import translations from '../l10n/translations.json'
import { useExtensions } from './composables/useExtensions'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    return {
      appInfo: {
        name: $gettext('Folder icons'),
        id: 'folder-icons'
      },
      translations,
      extensions: useExtensions()
    }
  }
})
