# Changelog

## [0.3.0](https://github.com/JulesMellot/opencloud-folder-icons/releases/tag/v0.3.0) - 2026-10-08

### ✨ Features

- Uploaded images now fill the tile preview in the Grid (like thumbnails, without cropping) and follow the tile size slider
- Uploaded images are kept at up to 192 px (instead of 64 px), with their aspect ratio and without padding, encoded as WebP (PNG fallback) and shrunk step by step if needed to fit the storage limit

## [0.2.0](https://github.com/JulesMellot/opencloud-folder-icons/releases/tag/v0.2.0) - 2026-10-07

### ✨ Features

- Shared icons: choose **Everyone with access** to store the icon on the folder itself (WebDAV property), visible to every member of the space and synced across devices. Requires permission to edit the folder; your personal icon still takes precedence for you
- Shared icons are read from the regular folder listing (no extra request per folder) and validated as untrusted input

## [0.1.0](https://github.com/JulesMellot/opencloud-folder-icons/releases/tag/v0.1.0) - 2026-10-07

### ✨ Features

- "Customize icon" action in the folder context menu
- Icon picker: 66 icons in 8 categories with search, 10-color palette, live preview, save / cancel / reset
- Upload of custom PNG / ICO images (resized to 64×64 and re-encoded as PNG)
- Custom icons in the native Grid, List and Condensed list views when the built-in views are disabled with `WEB_OPTION_DISABLED_EXTENSIONS`, or in an extra "List with custom icons" view otherwise
- Personal preferences stored in versioned `localStorage`, isolated per instance, user, space and folder ID
- English and French translations
