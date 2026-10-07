import { defineWebApplication, useClientService } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import '@opencloud-eu/extension-sdk/tailwind.css'
import translations from '../l10n/translations.json'
import { useExtensions } from './composables/useExtensions'
import { SHARED_ICON_PROP } from './shared'

let sharedPropRegistered = false

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    // Demande l'icône partagée dans chaque PROPFIND (listes, recherche) : elle arrive avec les
    // fichiers, sans requête par dossier. Le client WebDAV est créé une seule fois par OpenCloud.
    if (!sharedPropRegistered) {
      useClientService().webdav.registerExtraProp(SHARED_ICON_PROP)
      sharedPropRegistered = true
    }

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
