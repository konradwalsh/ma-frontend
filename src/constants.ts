export const DEFAULT_MENU_ITEMS = [
  "discover",
  // Streamloader-fork addition: dedicated curated discover page (recently
  // added / random picks / recently active artists). Sits directly after
  // the upstream /discover entry so the two appear together near the top.
  "streamloaderdiscover",
  "search",
  "party",
  "artists",
  "albums",
  "tracks",
  "playlists",
  "audiobooks",
  "podcasts",
  "radios",
  "genres",
  "browse",
  // Streamloader-fork addition: top-level shortcut to the global play
  // history (otherwise buried in the fullscreen player's PLAYED tab).
  // Sits between the library nodes and the settings group so it reads
  // as "your activity" rather than a library or a system setting.
  "recentlyplayed",
  // Streamloader-fork addition: consolidated stats / insights page. Sits
  // directly after Recently Played and immediately before the streamloader
  // settings shortcut (added in getMenuItems.ts under the "settings" arm).
  "streamloaderstats",
  "settings",
];

export const SYNCGROUP_PREFIX = "syncgroup_";
