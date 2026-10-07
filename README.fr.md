# Folder Icons – extension OpenCloud Web (français)

Personnalisation individuelle des icônes de dossiers (icône + couleur) depuis l’interface web
d’OpenCloud, sans modification du cœur.

> **Version ciblée : OpenCloud 8.1.0 / OpenCloud Web 8.1.0** (dernière version stable au
> 2026-10-07, serveur publié le 2026-10-05). La compatibilité avec votre instance reste à vérifier
> si elle tourne sur une autre version.

## Sommaire

1. [Diagnostic](#diagnostic)
2. [Ce que fait l’extension](#ce-que-fait-lextension)
3. [Installation](#installation)
4. [Utilisation](#utilisation)
5. [Stockage et portée des préférences](#stockage-et-portée-des-préférences)
6. [Désinstallation et suppression des préférences](#désinstallation-et-suppression-des-préférences)
7. [Limites connues](#limites-connues)
8. [Intégration native : changement minimal du cœur proposé](#intégration-native--changement-minimal-du-cœur-proposé)
9. [Développement](#développement)
10. [Validation](#validation)

## Diagnostic

Sources examinées, toutes au tag `v8.1.0` :
[opencloud-eu/web](https://github.com/opencloud-eu/web),
[opencloud-eu/web-extensions](https://github.com/opencloud-eu/web-extensions) (conventions,
outillage, Docker Compose de dev) et la
[documentation d’installation des applications web](https://docs.opencloud.eu/docs/admin/configuration/web-applications).

| Question                                | Constat                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Outillage                               | pnpm 11, Vite 8, Vue 3.5, TypeScript 6, Vitest 5, `@opencloud-eu/extension-sdk` 8.1 (module federation). Repris tel quel.                                                                                                                                                                                                                                                                                                                                                        |
| Ajouter une action au menu contextuel   | **Possible** : extension `action` sur le point `global.files.context-actions` (même mécanisme que l’extension officielle _unzip_).                                                                                                                                                                                                                                                                                                                                               |
| Remplacer l’icône dans les vues natives | **Impossible sans toucher au cœur** (voir ci-dessous).                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Vue de dossiers personnalisée           | **Possible** : type d’extension public `folderView` (`packages/web-pkg/src/composables/piniaStores/extensionRegistry/types.ts`) et points `app.files.folder-views.*` (`packages/web-app-files/src/extensionPoints.ts`). `ResourceTable` (exporté par `@opencloud-eu/web-pkg`) expose un slot public `image`.                                                                                                                                                                     |
| Stockage serveur des préférences        | **Aucun mécanisme adapté** : le service _settings_ (`/api/v0/settings/values-save`) n’accepte que des réglages déclarés côté serveur (bundle + settingId), une extension web ne peut pas en créer. Les propriétés WebDAV seraient attachées au dossier, donc visibles par tous ceux qui y ont accès (pas une préférence personnelle). → stockage local (`localStorage`), comme le fait déjà OpenCloud Web pour ses propres préférences d’extensions (`extensionPreferences.ts`). |

### Pourquoi le rendu natif ne peut pas être remplacé

- `packages/web-pkg/src/components/FilesList/ResourceIcon.vue` choisit l’icône d’un dossier ainsi :
  `iconMappingInjection?.folderExtension?.[extension] ?? defaultFolderIcon`. Le seul paramètre
  est **l’extension du nom du dossier** (ex. `.vault`), pas son identifiant.
- Ce mapping est construit **une seule fois au démarrage** dans
  `packages/web-runtime/src/container/bootstrap.ts` (`announceApplicationsReady` →
  `app.provide(resourceIconMappingInjectionKey, mapping)`) à partir des `fileExtensions` déclarées
  par les applications : objet statique, non réactif, sans point d’extension.
- `ResourceListItem.vue` et `ResourceTile.vue` appellent `ResourceIcon` directement ; aucun
  point d’extension n’intervient entre la ressource et l’icône.
- Le point `global.files.resource-indicator` (type `resourceIndicator`) permet d’ajouter un
  **badge** à côté du nom, pas de remplacer l’icône : il n’a pas été retenu.

Modifier ce mapping à l’exécution, observer le DOM ou surcharger des sélecteurs CSS internes
serait fragile et a été exclu, conformément au cahier des charges.

## Ce que fait l’extension

1. **Action « Personnaliser l’icône »** dans le menu contextuel (clic droit / « ⋯ ») quand
   **un seul dossier** est sélectionné. Masquée pour les fichiers, les espaces, les sélections
   multiples et sans utilisateur connecté (liens publics).
2. **Fenêtre intégrée** (modale OpenCloud standard) :
   - catalogue de 66 icônes réparties en 8 catégories : Dossiers, Travail, Documents, Photos,
     Vidéos, Musique, Archives, Personnel ;
   - recherche (insensible à la casse et aux accents, sur le libellé traduit, le nom technique
     et la catégorie) ;
   - palette de 10 couleurs + « Couleur par défaut » (couleur du thème) ;
   - **import d’une image personnelle** (bouton « Importer une image ») : fichiers **PNG** ou
     **ICO**, 1 Mo maximum. L’image est décodée par le navigateur, redimensionnée en 64×64
     (proportions conservées, marges transparentes) et ré-encodée en PNG avant d’être stockée :
     seuls des pixels sont conservés, jamais le fichier d’origine. SVG, JPEG et fichiers
     illisibles sont refusés avec un message. La palette ne s’applique pas aux images ;
     choisir une icône du catalogue remplace l’image ;
   - aperçu immédiat ;
   - boutons **Annuler**, **Réinitialiser** (actif seulement si une personnalisation existe),
     **Enregistrer**. Échap et la croix ferment sans enregistrer.
3. **Affichage dans les vues de fichiers**, selon la configuration :
   - **Mode remplacement (recommandé)** : l’administrateur désactive les trois vues natives
     avec l’option officielle `WEB_OPTION_DISABLED_EXTENSIONS` (voir
     [Activer les icônes dans les vues de base](#activer-les-icônes-dans-les-vues-de-base)).
     L’extension enregistre alors à leur place des vues **de même nom** (`resource-tiles`,
     `resource-table`, `resource-table-condensed`) et de même libellé (Grille, Liste, Liste
     condensée). OpenCloud les traite comme ses vues de base : aperçus, curseur de taille des
     tuiles, navigation clavier, vue par défaut. Ce sont les composants natifs `ResourceTiles` et
     `ResourceTable` ; seule l’icône passe par leur slot public `image`.
   - **Mode par défaut (sans configuration)** : les vues natives restent inchangées et une vue
     supplémentaire **« Liste avec icônes personnalisées »** est ajoutée au sélecteur d’affichage.

   Dans les deux cas, tout le reste est conservé : tri, sélection, glisser-déposer, menu
   contextuel, actions rapides, pagination et **badges** (partage, lien, verrouillage,
   traitement, coffre…).

### Surfaces où les icônes personnalisées apparaissent effectivement

| Surface                                                                                                                                              | Mode remplacement      | Mode par défaut |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------- |
| Grille, Liste, Liste condensée : espaces (personnel, projets, partages), favoris, partagés avec moi / par lien / avec d’autres, recherche, corbeille | **Oui**                | Non             |
| Vue « Liste avec icônes personnalisées » (mêmes écrans, hors corbeille)                                                                              | n’existe pas (inutile) | **Oui**         |
| Panneau latéral, fil d’Ariane, sélecteur d’emplacement, recherche rapide (barre du haut)                                                             | Non                    | Non             |

Ces dernières surfaces appellent directement `ResourceIcon` sans point d’extension : seul le
changement du cœur décrit plus bas les couvrirait.

Les icônes des **fichiers** ne sont jamais personnalisées. En Grille, l’aperçu natif est
laissé intact pour tout ce qui n’est pas un dossier personnalisé. En Liste, `ResourceTable`
masque son icône dès qu’un slot `image` existe : l’extension rend alors le même composant
`ResourceIcon` ou la même miniature que la liste native.

### Accessibilité, thèmes, langues

- Catalogue et palette en `role="radiogroup"` / `role="radio"` avec `aria-checked`,
  libellés accessibles traduits, tabulation « roving » (un seul arrêt Tab par groupe, flèches
  pour se déplacer), focus visible, aperçu annoncé (`aria-live="polite"`).
- Couleurs de l’interface tirées des jetons du thème OpenCloud (`role-*`) : clair et sombre.
  Les couleurs de la palette sont des teintes moyennes lisibles sur les deux fonds.
- Chaînes sources en anglais (convention OpenCloud, `$gettext`), traduction française fournie
  dans `l10n/translations.json`.

## Installation

**Le plus simple** : télécharger `folder-icons-<version>.zip` depuis la
[dernière release](https://github.com/JulesMellot/opencloud-folder-icons/releases/latest), le
décompresser dans le dossier des applications web d’OpenCloud (il contient un dossier
`folder-icons/`, comme les extensions officielles) puis redémarrer OpenCloud :

```bash
unzip folder-icons-0.1.0.zip -d "$OC_DATA_DIR/web/assets/apps/"
```

Sinon, compiler depuis les sources :

Prérequis de compilation : Node.js 22 ou plus récent et pnpm 11 (ou `npx pnpm@11.28.5` à la place de
`pnpm` dans les commandes ci-dessous).

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm build
```

Le résultat est dans `dist/` (`manifest.json`, `js/`, `assets/`).

### Instance installée « à la main » (binaire ou paquet)

Procédure documentée par OpenCloud : copier le dossier de l’application dans
`$OC_DATA_DIR/web/assets/apps` (à créer s’il n’existe pas), puis redémarrer OpenCloud.

```bash
mkdir -p "$OC_DATA_DIR/web/assets/apps/folder-icons"
```

```bash
cp -R dist/. "$OC_DATA_DIR/web/assets/apps/folder-icons/"
```

Redémarrez ensuite le service OpenCloud.

### Avec opencloud-compose

Copier `dist/` dans `opencloud-compose/config/opencloud/apps/folder-icons/` (monté
automatiquement au bon endroit par opencloud-compose), puis :

```bash
docker compose restart
```

### Docker Compose (montage direct)

Extrait calqué sur le `docker-compose.yml` officiel du dépôt `web-extensions` v8.1
(`WEB_ASSET_APPS_PATH` + un volume par application). **Ce mécanisme n’a pas été exécuté pendant
le développement** (pas de moteur Docker disponible sur la machine) :

```yaml
services:
  opencloud:
    image: opencloudeu/opencloud-rolling:8.1.0
    environment:
      WEB_ASSET_APPS_PATH: /web/apps
    volumes:
      - ./dist:/web/apps/folder-icons:ro
```

Aucune configuration (`apps.yaml`) n’est nécessaire. Aucune ressource externe n’est chargée :
les icônes viennent du jeu Remix Icon servi par OpenCloud lui-même (`/icons/*.svg`), ce qui
ne demande aucune modification de la CSP.

### Activer les icônes dans les vues de base

Ajouter la variable suivante au service OpenCloud puis redémarrer (si la variable existe déjà,
ajouter ces trois identifiants à sa liste, séparés par des virgules) :

```bash
WEB_OPTION_DISABLED_EXTENSIONS=com.github.opencloud-eu.web.files.folder-view.resource-tiles,com.github.opencloud-eu.web.files.folder-view.resource-table,com.github.opencloud-eu.web.files.folder-view.resource-table-condensed
```

Avec Docker Compose ou opencloud-compose, dans la section `environment` du service `opencloud` :

```yaml
WEB_OPTION_DISABLED_EXTENSIONS: 'com.github.opencloud-eu.web.files.folder-view.resource-tiles,com.github.opencloud-eu.web.files.folder-view.resource-table,com.github.opencloud-eu.web.files.folder-view.resource-table-condensed'
```

Si OpenCloud Web est configuré par fichier (`WEB_UI_CONFIG_FILE`), l’équivalent est
`"options": { "disabledExtensions": [ … ] }` dans ce fichier (il est prioritaire sur les
variables `WEB_OPTION_*`).

> **Important** : tant que cette option est active, les vues de fichiers dépendent de
> l’extension. **Retirer l’option avant de désinstaller l’extension**, sinon les écrans de
> fichiers n’ont plus aucun mode d’affichage. On peut ne désactiver qu’une partie des vues : seules
> celles-là sont remplacées.

## Utilisation

1. Clic droit sur un dossier → **Personnaliser l’icône**.
2. Choisir une icône (recherche possible) et une couleur, puis **Enregistrer**.
3. En mode remplacement, l’icône apparaît aussitôt en Grille, Liste et Liste condensée. En mode
   par défaut, ouvrir les **options d’affichage** de la liste et choisir **Liste avec icônes
   personnalisées** (OpenCloud mémorise ce choix).
4. **Réinitialiser** dans la même fenêtre restaure l’icône d’origine.

## Stockage et portée des préférences

- **Personnel** : stocké dans le `localStorage` du navigateur, jamais envoyé au serveur ; les
  autres utilisateurs ne voient rien.
- **Clé de stockage** : `opencloud-folder-icons:<URL de l’instance>:<ID utilisateur>` → isolation
  entre comptes et entre instances dans un même navigateur.
- **Clé d’un dossier** : `<storageId>|<fileId>` (espace + identifiant stable du nœud), jamais le
  nom ni le chemin.
- **Format versionné** (version 2) :
  `{ "version": 2, "folders": { "<clé>": { "icon": "music", "color": "red" }, "<clé 2>": { "image": "data:image/png;base64,…" } } }`.
  Les données version 1 (sans images) sont relues telles quelles et réécrites en version 2 au
  prochain enregistrement. JSON illisible, version inconnue, icône retirée du catalogue, couleur
  inconnue, image qui n’est pas un PNG en `data:` ou dépasse 32 000 caractères → l’entrée
  est ignorée et l’icône native s’affiche. Des données écrites par une version plus récente ne
  sont jamais écrasées (l’enregistrement échoue avec un message).
- **Stockage indisponible** (navigation privée stricte, quota, stockage bloqué) : les icônes
  natives s’affichent, l’enregistrement affiche une erreur, l’accès aux fichiers n’est pas
  affecté.
- **Pas de synchronisation** entre navigateurs ni entre appareils. Vider les données du site
  efface les personnalisations.
- **Images importées** : environ 0,5 à 20 Ko chacune, stockées dans le même `localStorage`
  (quota du navigateur d’environ 5 Mo par site, partagé avec OpenCloud). Une même image
  utilisée pour plusieurs dossiers est stockée plusieurs fois. Quota atteint → message
  d’erreur, rien n’est perdu. L’image n’est jamais envoyée au serveur.
- Le stockage est isolé derrière l’interface `FolderIconStorage` (`src/storage.ts`) pour pouvoir
  passer à un stockage serveur si OpenCloud en propose un un jour.
- Aucun fichier caché n’est créé dans les dossiers, aucune métadonnée partagée n’est modifiée.

### Renommage et déplacement

| Opération                                        | Identifiant                                                                                      | Conséquence                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Renommer un dossier                              | inchangé                                                                                         | icône conservée                                                                                      |
| Déplacer dans le **même espace** (WebDAV `MOVE`) | inchangé                                                                                         | icône conservée                                                                                      |
| « Déplacer » vers **un autre espace**            | nouveau : OpenCloud Web fait une **copie puis suppression** (`transfer.ts`, `TransferType.COPY`) | icône perdue, à refaire ; l’ancienne entrée reste orpheline dans le stockage local (quelques octets) |
| Supprimer puis restaurer depuis la corbeille     | identifiant normalement conservé                                                                 | à vérifier sur une instance réelle                                                                   |

## Désinstallation et suppression des préférences

1. **D’abord**, si le mode remplacement est actif, retirer les trois identifiants de
   `WEB_OPTION_DISABLED_EXTENSIONS` (ou de `disabledExtensions`) et redémarrer : les vues natives
   reviennent.
2. Supprimer le dossier de l’application (`$OC_DATA_DIR/web/assets/apps/folder-icons`, ou le
   volume/dossier opencloud-compose correspondant) puis redémarrer OpenCloud.
3. Les préférences restent dans chaque navigateur. Pour les effacer, ouvrir OpenCloud, puis la
   console des outils de développement, et exécuter :

```js
Object.keys(localStorage)
  .filter((k) => k.startsWith('opencloud-folder-icons:'))
  .forEach((k) => localStorage.removeItem(k))
```

Effacer les données du site dans les réglages du navigateur produit le même effet (mais
supprime aussi les autres préférences locales d’OpenCloud). Si la vue « Liste avec icônes
personnalisées » était sélectionnée, OpenCloud revient à une vue native une fois l’extension
retirée.

## Limites connues

- Sans configuration, icônes visibles **uniquement dans la vue « Liste avec icônes
  personnalisées »**. Le mode remplacement demande l’accès administrateur (variable
  d’environnement + redémarrage). Pas de grille séparée en mode par défaut : OpenCloud Web 8.1
  compare en dur le nom `resource-tiles` (aperçus, taille des tuiles, navigation clavier :
  `useLoadPreview.ts`, `ViewOptions.vue`, `useKeyboardFileNavigation.ts`), c’est précisément
  pourquoi le mode remplacement réutilise les noms natifs.
- Mode remplacement : il repose sur les identifiants et noms des vues natives d’OpenCloud Web
  8.1. S’ils changent dans une version future, les vues natives réapparaîtraient à côté des
  vues de l’extension : à revérifier à chaque mise à jour d’OpenCloud.
- Vues **Liste** (remplacée ou séparée) : cliquer sur **l’icône** n’ouvre pas l’élément (le nom
  reste cliquable) et l’aperçu animé des _motion photos_ n’est pas affiché dans la colonne
  d’icône, y compris pour les fichiers. La Grille n’a pas cette limite.
- Grille : la taille de l’icône personnalisée suit le réglage de taille des tuiles, mais sur un
  écran étroit (où OpenCloud plafonne la taille) elle peut être un cran plus grande que les
  icônes natives.
- Préférences locales au navigateur (pas de synchronisation).
- Dossiers vus via « Partagés avec moi » : l’identifiant présenté au destinataire peut différer
  de celui vu à l’intérieur du partage ; une icône définie à un endroit peut ne pas apparaître à
  l’autre. À vérifier sur instance réelle.
- Images importées limitées au PNG et à l’ICO, réduites en 64×64 (pas d’image haute
  définition), non synchronisées, dupliquées si réutilisées sur plusieurs dossiers. Pas de
  bibliothèque d’images réutilisables.
- Décodage des `.ico` vérifié dans Chromium uniquement ; Firefox et Safari savent en principe
  les décoder, à confirmer.

## Intégration native : changement minimal du cœur proposé

**Non appliqué** (aucune modification du cœur sans votre accord). Le plus petit changement
permettant un affichage natif dans toutes les vues serait un point d’extension consulté par
`ResourceIcon.vue`, sur le modèle exact de `global.files.resource-indicator` :

```ts
// packages/web-pkg/src/composables/piniaStores/extensionRegistry/types.ts
export interface ResourceIconExtension extends Extension {
  type: 'resourceIcon'
  /** Retourne une icône pour la ressource, ou undefined pour garder l'icône par défaut. */
  getResourceIcon: (resource: Resource) => IconType | void
}

// packages/web-pkg/src/extensionPoints.ts
export const resourceIconExtensionPoint: ExtensionPoint<ResourceIconExtension> = {
  id: 'global.files.resource-icon',
  extensionType: 'resourceIcon',
  multiple: true
}
```

```ts
// packages/web-pkg/src/components/FilesList/ResourceIcon.vue — dans le computed `icon`
if (unref(isFolder)) {
  const fromExtension = extensionRegistry
    .requestExtensions(resourceIconExtensionPoint)
    .map((e) => e.getResourceIcon(resource))
    .find(Boolean)
  return (
    fromExtension ||
    iconMappingInjection?.folderExtension?.[unref(extension)] ||
    unref(fallbackIcon)
  )
}
```

Avec ce point d’extension, cette extension n’aurait plus besoin de sa vue dédiée : il suffirait
d’enregistrer `getResourceIcon: (r) => store.getIcon(r)`. Les badges ne seraient pas affectés
(ils sont rendus hors de `ResourceIcon`). Ce changement serait à proposer en amont
(opencloud-eu/web).

## Développement

```bash
pnpm install
```

```bash
pnpm build:w
```

| Commande                                  | Rôle                                      |
| ----------------------------------------- | ----------------------------------------- |
| `pnpm build`                              | compilation de production dans `dist/`    |
| `pnpm build:w`                            | compilation continue (mode développement) |
| `pnpm check:types`                        | typage (`vue-tsc`)                        |
| `pnpm lint`                               | ESLint (configuration OpenCloud)          |
| `pnpm format:check` / `pnpm format:write` | Prettier (configuration OpenCloud)        |
| `pnpm test:unit`                          | tests unitaires (Vitest + happy-dom)      |

Organisation du code :

| Fichier                                            | Rôle                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `src/index.ts`, `src/composables/useExtensions.ts` | intégration OpenCloud (action + vue)                               |
| `src/components/FolderIconPicker.vue`              | sélecteur d’icônes                                                 |
| `src/catalog.ts`                                   | catalogue, palette, validation et résolution de l’apparence        |
| `src/image.ts`                                     | import PNG/ICO : contrôles, redimensionnement 64×64, ré-encodage   |
| `src/storage.ts`                                   | persistance (interface + implémentation `localStorage` versionnée) |
| `src/composables/useFolderIconsStore.ts`           | état partagé (chargé une fois, lecture O(1) par ligne)             |
| `src/components/FolderIconTable.vue`               | vue liste (ResourceTable native + slot `image`)                    |
| `src/components/FolderIconTiles.vue`               | vue grille (ResourceTiles native + slot `image`)                   |
| `src/components/CustomFolderIcon.vue`              | rendu d’une icône personnalisée (glyphe ou image)                  |

## Validation

### Exécuté (sur la machine de développement, sans instance OpenCloud)

- `pnpm check:types`, `pnpm lint`, `pnpm format:check` : sans erreur.
- `pnpm build` : réussi (bundle module federation + `manifest.json`).
- `pnpm test:unit` : **53 tests réussis**. Ce sont des tests unitaires avec `localStorage`
  simulé (happy-dom) et `ResourceTable` remplacée par un composant de substitution ; ils
  **ne constituent pas une validation dans OpenCloud**. Ils couvrent : sélection,
  enregistrement, réinitialisation, persistance après rechargement (nouvelle instance de store),
  isolation entre deux comptes et deux instances, renommage et déplacement (même identifiant
  / nouvel identifiant), données corrompues, versions inconnues, stockage plein ou bloqué,
  fichiers et espaces jamais personnalisés, relais des slots (badges) par la vue, navigation
  clavier, recherche, visibilité de l’action et ouverture de la modale, import d’images
  (formats acceptés/refusés, taille, fichier illisible, aperçu, enregistrement, retour à une
  icône, migration du format version 1 vers 2, refus des `data:` non PNG ou trop longues),
  mode remplacement (vues enregistrées sous les noms natifs uniquement pour les vues
  désactivées, sur tous les points dont la corbeille ; vue séparée conservée sinon ; grille :
  aperçu natif conservé hors dossiers personnalisés, taille d’icône selon la taille de tuile,
  slot `image` du parent relayé, par ex. images d’espaces).
- Traitement d’image **dans un vrai navigateur (Chromium)**, via une page de test isolée
  chargeant `src/image.ts` compilé : un PNG 400×100 donne un PNG 64×64 centré avec marges
  transparentes ; un vrai fichier `.ico` (type MIME vide) est décodé ; un faux PNG est refusé
  (« illisible ») ; un SVG est refusé avant décodage.

### Restant à vérifier sur une instance OpenCloud 8.1 réelle

- [ ] L’application se charge (onglet Réseau : `manifest.json` puis `remoteEntry-*.mjs` en 200).
- [ ] « Personnaliser l’icône » apparaît au clic droit sur un dossier, pas sur un fichier.
- [ ] La vue « Liste avec icônes personnalisées » apparaît dans les options d’affichage.
- [ ] Enregistrer met à jour l’icône immédiatement ; Réinitialiser restaure l’icône d’origine.
- [ ] Persistance après rechargement (F5) et après déconnexion/reconnexion.
- [ ] Deux comptes dans le même navigateur : personnalisations distinctes.
- [ ] Renommer, déplacer dans le même espace (icône conservée), vers un autre espace (perdue).
- [ ] Badges partage / lien / verrou visibles dans la vue personnalisée.
- [ ] Icônes et miniatures des fichiers identiques à la liste native.
- [ ] Thème sombre, navigation clavier dans la modale, lecteur d’écran.
- [ ] Comportement dans « Partagés avec moi » et dans la recherche.
- [ ] Stockage bloqué (navigation privée stricte) : icônes natives, message d’erreur à l’enregistrement.
- [ ] Import PNG et ICO depuis la modale, affichage dans la vue liste en thème clair et sombre.
- [ ] Import `.ico` dans Firefox et Safari.
- [ ] Mode remplacement : avec `WEB_OPTION_DISABLED_EXTENSIONS`, le sélecteur affiche une seule
      fois Grille / Liste / Liste condensée, les icônes apparaissent dans les trois, les
      miniatures et le curseur de taille des tuiles fonctionnent, la liste des espaces projets
      et la corbeille s’affichent normalement.
