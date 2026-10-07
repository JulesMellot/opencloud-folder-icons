# Folder Icons for OpenCloud

Give each folder its own icon in [OpenCloud](https://github.com/opencloud-eu/opencloud) Web:
pick one from a built-in catalog, choose a color, or upload your own PNG / ICO image.

_[Version française](README.fr.md)_

- **Right-click a folder → “Customize icon”**: icon catalog with search (66 icons in 8
  categories: folders, work, documents, photos, videos, music, archives, personal), 10-color
  palette, live preview, image upload, Save / Cancel / Reset.
- Icons show up in the **native Grid, List and Condensed list views** (see
  [Show icons in the default views](#show-icons-in-the-default-views)), with sharing / lock badges,
  thumbnails, sorting, drag & drop and keyboard navigation unchanged.
- **Personal**: each user customizes their own view; nothing is written to the folders or sent
  to the server.
- Light and dark themes, keyboard navigation, accessible labels, English and French UI.

> **Target version: OpenCloud 8.1.0** (OpenCloud Web 8.1.0). Other versions are untested.

## Contents

1. [Installation](#installation)
2. [Show icons in the default views](#show-icons-in-the-default-views)
3. [Usage](#usage)
4. [Where and how preferences are stored](#where-and-how-preferences-are-stored)
5. [Uninstall](#uninstall)
6. [Known limitations](#known-limitations)
7. [How it works](#how-it-works)
8. [Development](#development)
9. [Testing status](#testing-status)

## Installation

### From a release (recommended)

Download `folder-icons-<version>.zip` from the
[latest release](https://github.com/JulesMellot/opencloud-folder-icons/releases/latest) and unzip
it into OpenCloud’s web apps directory. The archive contains a `folder-icons/` folder, as the
official OpenCloud extensions do:

```bash
unzip folder-icons-0.1.0.zip -d "$OC_DATA_DIR/web/assets/apps/"
```

| Setup                                                                  | Web apps directory                                                                                          |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Binary / package                                                       | `$OC_DATA_DIR/web/assets/apps/` (create it if needed)                                                       |
| [opencloud-compose](https://github.com/opencloud-eu/opencloud-compose) | `opencloud-compose/config/opencloud/apps/`                                                                  |
| Any Docker setup                                                       | `<host path mounted on OC_BASE_DATA_PATH>/web/assets/apps/`, or mount the folder with `WEB_ASSET_APPS_PATH` |
| TrueNAS SCALE app                                                      | `<your OpenCloud data dataset>/web/assets/apps/`, then `chown -R 3001:3000` the `folder-icons` folder       |

Restart OpenCloud. No `apps.yaml` configuration is needed, and nothing is loaded from external
services: icons come from the Remix Icon set that OpenCloud already serves (`/icons/*.svg`).

Checksums are published with each release (`sha256sum.txt`):

```bash
shasum -a 256 -c sha256sum.txt
```

### From source

Requirements: Node.js 22+ and pnpm 11 (or use `npx pnpm@11.28.5` instead of `pnpm`).

```bash
git clone https://github.com/JulesMellot/opencloud-folder-icons.git
```

```bash
cd opencloud-folder-icons && pnpm install --frozen-lockfile && pnpm build
```

Then copy the contents of `dist/` into a `folder-icons/` folder of the web apps directory above:

```bash
mkdir -p "$OC_DATA_DIR/web/assets/apps/folder-icons" && cp -R dist/. "$OC_DATA_DIR/web/assets/apps/folder-icons/"
```

## Show icons in the default views

OpenCloud 8.1 has no extension point to change the icon of a folder in its built-in views (see
[How it works](#how-it-works)). The extension therefore supports two modes:

| Mode                           | How to enable                                                                                     | Where custom icons appear                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Replacement (recommended)**  | Disable the three built-in folder views with the official `WEB_OPTION_DISABLED_EXTENSIONS` option | Grid, List and Condensed list, everywhere they exist (spaces, favorites, shares, search, trash) |
| **Default** (no configuration) | Nothing                                                                                           | Only in an extra view, **“List with custom icons”**, available in the view options menu         |

To enable the replacement mode, add this environment variable to the **OpenCloud service** and
restart it (if the variable already exists, append these three IDs, comma-separated):

```bash
WEB_OPTION_DISABLED_EXTENSIONS=com.github.opencloud-eu.web.files.folder-view.resource-tiles,com.github.opencloud-eu.web.files.folder-view.resource-table,com.github.opencloud-eu.web.files.folder-view.resource-table-condensed
```

In a Docker Compose file, it goes under `services:` → `opencloud:` → `environment:`:

```yaml
WEB_OPTION_DISABLED_EXTENSIONS: 'com.github.opencloud-eu.web.files.folder-view.resource-tiles,com.github.opencloud-eu.web.files.folder-view.resource-table,com.github.opencloud-eu.web.files.folder-view.resource-table-condensed'
```

If OpenCloud Web is configured with a file (`WEB_UI_CONFIG_FILE`), use
`"options": { "disabledExtensions": [ … ] }` there instead.

**What this does:** OpenCloud stops using its own Grid / List / Condensed list views (nothing is
deleted). The extension detects it and registers views **with the exact same names and labels**,
built on the same OpenCloud components (`ResourceTiles`, `ResourceTable`) and only adding your
icons. OpenCloud treats them as its default views: previews, tile size slider, keyboard
navigation and default view all keep working. It only affects the web UI, not files, shares,
desktop or mobile clients.

> ⚠️ While this option is set, the file views depend on the extension. **Remove the variable
> before uninstalling the extension** (or if an old build of the extension is deployed), otherwise
> the file views have no display mode and look empty. Removing it restores the original views.

You can disable only some of the three views; only those are replaced.

## Usage

1. Right-click a folder (or use its “⋯” menu) → **Customize icon**.
2. Pick an icon (search works on names and categories) and a color, or click
   **Upload an image** to use your own PNG or ICO file (1 MB max.).
3. Click **Save**. The icon updates immediately.
4. **Reset** in the same dialog restores the default icon. **Cancel**, Esc or the close button
   leave without saving.

In default mode, open the **view options** of the file list and pick **List with custom icons**.

The action is only offered for a single selected folder: not for files, spaces, multiple
selections or public links.

### Uploaded images

The image is decoded by the browser, resized to 64×64 (aspect ratio kept, transparent padding)
and re-encoded as PNG before being stored. Only those pixels are kept, never the original file.
SVG, JPEG, oversized and unreadable files are rejected with a message. Colors do not apply to
uploaded images; picking a catalog icon replaces the image.

## Where and how preferences are stored

OpenCloud has no server-side store suitable for per-user preferences of a web extension (the
settings service only accepts settings declared server-side, and WebDAV properties would be
visible to everyone with access to the folder). Preferences are therefore stored in the
browser’s `localStorage`, like OpenCloud Web already does for its own extension preferences.

- **Personal**: other users never see your icons.
- **Isolated** per OpenCloud instance and per user: key
  `opencloud-folder-icons:<instance URL>:<user ID>`.
- **Per folder**: `<storageId>|<fileId>`, the space plus the stable node ID, never the name or
  path.
- **Versioned format** (version 2):
  `{ "version": 2, "folders": { "<key>": { "icon": "music", "color": "red" }, "<key 2>": { "image": "data:image/png;base64,…" } } }`.
  Invalid or unknown entries are ignored and the default icon is shown. Data written by a newer
  version is never overwritten.
- **If storage is unavailable or full** (strict private browsing, quota): default icons are
  shown, saving shows an error, file access is never affected.
- **No sync** between browsers or devices. Clearing the site data removes the customizations.
  An uploaded image takes about 0.5 to 20 KB of the browser’s ~5 MB quota for the site.

| Operation                  | Folder ID                                | Result                  |
| -------------------------- | ---------------------------------------- | ----------------------- |
| Rename                     | unchanged                                | icon kept               |
| Move inside the same space | unchanged                                | icon kept               |
| “Move” to another space    | new (OpenCloud Web copies, then deletes) | icon lost, set it again |

## Uninstall

1. If the replacement mode is enabled, **first** remove the three IDs from
   `WEB_OPTION_DISABLED_EXTENSIONS` and restart OpenCloud.
2. Delete the `folder-icons` folder from the web apps directory and restart OpenCloud.
3. To delete the stored preferences, open OpenCloud, open the browser developer console and run:

```js
Object.keys(localStorage)
  .filter((k) => k.startsWith('opencloud-folder-icons:'))
  .forEach((k) => localStorage.removeItem(k))
```

## Known limitations

- Not customized anywhere: sidebar, breadcrumbs, location picker, quick search in the top bar.
  They render OpenCloud’s `ResourceIcon` directly, with no extension point (see the core change
  proposal below).
- Without the replacement mode, icons only show in the “List with custom icons” view.
- The replacement mode relies on the IDs and names of the built-in views of OpenCloud Web 8.1.
  If they change in a future release, the built-in views would reappear next to the
  extension’s: check after each OpenCloud upgrade.
- List views: clicking the **icon** does not open the item (the name still does), and motion
  photo previews are not shown in the icon column, including for files. The Grid has no such
  limitation.
- Grid on narrow screens: a custom icon may be one size step larger than the native icons.
- Uploaded images: PNG and ICO only, 64×64, not synced, duplicated if reused on several folders.
  ICO decoding was verified in Chromium only.
- Folders under “Shared with me”: the ID shown to the recipient may differ from the one seen
  inside the share, so an icon set in one place may not appear in the other.

## How it works

Findings from the OpenCloud Web 8.1.0 sources:

- **Context menu action**: public `action` extension on `global.files.context-actions` (same
  mechanism as the official _unzip_ extension).
- **Why the built-in icon can’t simply be swapped**: `ResourceIcon.vue` picks a folder icon only
  from the folder name’s _extension_ (e.g. `.vault`), through a static mapping built once at
  startup in `web-runtime/src/container/bootstrap.ts`. There is no per-resource hook.
- **Views**: public `folderView` extension type and `app.files.folder-views.*` extension points;
  `ResourceTable` and `ResourceTiles` (exported by `@opencloud-eu/web-pkg`) expose a public
  `image` slot. The extension wraps them, forwards every prop, event and slot, and only fills the
  `image` slot. In the Grid, an empty slot falls back to the native preview, so files are
  untouched.
- **Replacement**: `options.disabledExtensions` (official option) removes the built-in views;
  the extension registers its views under the same names, which OpenCloud’s hard-coded checks
  (`resource-tiles`, …) rely on.
- No DOM manipulation, no MutationObserver, no monkey patching, no internal CSS selectors.

### Native integration: proposed minimal core change

A `resourceIcon` extension point read by `ResourceIcon.vue`, modeled on the existing
`global.files.resource-indicator` point, would make custom icons work everywhere (sidebar,
breadcrumbs, pickers) without replacing any view:

```ts
export interface ResourceIconExtension extends Extension {
  type: 'resourceIcon'
  getResourceIcon: (resource: Resource) => IconType | void
}
// In ResourceIcon.vue, for folders:
const fromExtension = extensionRegistry
  .requestExtensions(resourceIconExtensionPoint)
  .map((e) => e.getResourceIcon(resource))
  .find(Boolean)
```

This is not implemented here; it would need to be proposed upstream in
[opencloud-eu/web](https://github.com/opencloud-eu/web).

## Development

Built like the official [web-extensions](https://github.com/opencloud-eu/web-extensions)
(pnpm, Vite, Vue 3, TypeScript, Vitest, `@opencloud-eu/extension-sdk`).

| Command                                   | Purpose                         |
| ----------------------------------------- | ------------------------------- |
| `pnpm build`                              | production build into `dist/`   |
| `pnpm build:w`                            | watch build (development mode)  |
| `pnpm check:types`                        | type check (`vue-tsc`)          |
| `pnpm lint`                               | ESLint (OpenCloud config)       |
| `pnpm format:check` / `pnpm format:write` | Prettier (OpenCloud config)     |
| `pnpm test:unit`                          | unit tests (Vitest + happy-dom) |

| File                                                        | Role                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| `src/index.ts`, `src/composables/useExtensions.ts`          | OpenCloud integration (action, views, replacement mode)     |
| `src/components/FolderIconPicker.vue`                       | icon picker dialog                                          |
| `src/components/FolderIconTable.vue`, `FolderIconTiles.vue` | list / grid views (native components + `image` slot)        |
| `src/components/CustomFolderIcon.vue`                       | renders a custom icon (glyph or image)                      |
| `src/catalog.ts`                                            | catalog, palette, validation, appearance resolution         |
| `src/image.ts`                                              | PNG/ICO import: checks, 64×64 resize, PNG re-encoding       |
| `src/storage.ts`                                            | storage interface + versioned `localStorage` implementation |
| `src/composables/useFolderIconsStore.ts`                    | shared state, loaded once, O(1) lookup per row              |
| `l10n/translations.json`                                    | French translations                                         |

## Testing status

- `check:types`, `lint`, `format:check` and `build` pass; **53 unit tests** pass. They cover
  saving, resetting, persistence after reload, isolation between accounts and instances,
  rename / move, corrupted or unknown data, full or blocked storage, files and spaces never
  customized, badges and parent slots forwarded, keyboard navigation, search, image import and
  the replacement mode. They use a simulated `localStorage` and stubbed OpenCloud components:
  **they are not a validation inside OpenCloud**.
- Image processing was checked in a real browser (Chromium): a 400×100 PNG becomes a centered
  64×64 PNG with transparent padding, a real `.ico` file is decoded, broken files and SVGs are
  rejected.
- On a real OpenCloud 8.1 instance: the context menu action, the dialog and saving were confirmed.
  Still to confirm on a real instance: the replacement mode in all views, dark theme, screen
  readers, `.ico` in Firefox and Safari, and the “Shared with me” case.

## License

[AGPL-3.0](LICENSE), like OpenCloud Web and the official OpenCloud web extensions.
