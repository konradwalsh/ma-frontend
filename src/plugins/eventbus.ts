// Global, simple eventbus

import { ContextMenuItem } from "@/layouts/default/ItemContextMenu.vue";
import mitt, { Emitter } from "mitt";
import {
  MediaItemType,
  MediaItemTypeOrItemMapping,
  Playlist,
  Radio,
  Track,
} from "./api/interfaces";

export type PlaylistDialogEvent = {
  items: MediaItemType[];
  parentItem?: MediaItemType;
};

export type ContextMenuDialogEvent = {
  items: ContextMenuItem[];
  posX?: number;
  posY?: number;
  showPlayMenuHeader?: boolean;
};

export type CreatePlaylistEvent = {
  queueId?: string;
  providerId?: string;
};

export type MergeGenreDialogEvent = {
  genreIds: string[];
  genreNames: string[];
};

export type DeleteGenreDialogEvent = {
  genreIds: string[];
  navigateBack?: boolean;
};

export type LinkGenreDialogEvent = {
  items: MediaItemType[];
};

export type ImportPlaylistEvent = {
  m3uData: string;
  playlistName: string;
};

// Streamloader-fork addition: per-action queue announcement payload.
// Emitted by api.playMedia / api.addPlaylistTracks so the global aria-live
// region in Default.vue can speak intent ("Added 3 songs to queue",
// "Playing next", "Added to playlist") instead of only the post-hoc
// length delta. `count` may be undefined when the action expands to an
// unknown number of tracks server-side (e.g. play-album).
export type QueueItemsAddedEvent = {
  count?: number;
  optionType: "add" | "next" | "play" | "replace" | "replace_next" | "playlist";
  targetName?: string;
};

export type Events = {
  contextmenu: ContextMenuDialogEvent;
  playlistdialog: PlaylistDialogEvent;
  createPlaylist: CreatePlaylistEvent;
  mergeGenreDialog: MergeGenreDialogEvent;
  deleteGenreDialog: DeleteGenreDialogEvent;
  linkGenreDialog: LinkGenreDialogEvent;
  importPlaylistDialog: ImportPlaylistEvent;
  editItemDialog: Radio | Track | Playlist;
  clearSelection: void;
  genreExcluded: void;
  "homescreen-edit-toggle": void;
  "mobile-sidebar-open": void;
  "queue:items-added": QueueItemsAddedEvent;
  // Streamloader-fork addition: re-trigger the first-run welcome tour
  // from the Streamloader Settings → About card. The tour component
  // (StreamloaderWelcomeTour.vue, mounted in Default.vue) listens for
  // this and re-opens itself, also clearing its localStorage flag.
  "sl-welcome-tour:show": void;
};

export const eventbus: Emitter<Events> = mitt<Events>();
