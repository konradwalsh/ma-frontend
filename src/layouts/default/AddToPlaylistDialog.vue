<!--
  Global dialog to add item(s) to a playlist.
  Because this dialog can be called from various places throughout the app,
  we steer its visibility through the centralized eventbus.
-->
<template>
  <Sheet v-model:open="show">
    <SheetContent side="bottom" class="h-[85vh] flex flex-col p-0">
      <SheetHeader
        class="dialog-header flex-row items-center gap-3 border-b px-4 py-3"
      >
        <ListPlus class="size-5 shrink-0 text-[#2dd4bf]" />
        <SheetTitle>{{ $t("add_playlist") }}</SheetTitle>
      </SheetHeader>
      <SheetDescription class="sr-only">
        {{ $t("add_playlist") }}
      </SheetDescription>

      <ScrollArea class="h-full max-h-full overflow-hidden flex-1">
        <div class="pt-2 pb-8">
          <button
            v-for="playlist of playlists"
            :key="playlist.item_id"
            type="button"
            class="playlist-row flex w-full items-center gap-3 px-4 py-2.5 text-left"
            :class="{ 'is-pending': pendingPlaylistId === playlist.item_id }"
            :disabled="pendingPlaylistId !== null"
            @click="addToPlaylist(playlist)"
          >
            <div class="shrink-0">
              <MediaItemThumb :item="playlist" :size="50" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium">
                {{ playlist.name }}
              </div>
              <div class="truncate text-xs text-muted-foreground">
                {{ playlist.owner }}
              </div>
            </div>
            <Loader2
              v-if="pendingPlaylistId === playlist.item_id"
              class="shrink-0 size-5 animate-spin text-[#2dd4bf]"
              :aria-label="$t('streamloader.player.playlist_adding_one')"
            />
            <provider-icon
              v-else-if="playlist.provider_mappings"
              :domain="playlist.provider_mappings[0].provider_domain"
              :size="20"
              class="shrink-0"
            />
          </button>

          <div class="py-4">
            <Separator />
          </div>

          <button
            v-for="providerId of createPlaylistProviders"
            :key="providerId"
            class="create-playlist-row flex w-full items-center gap-3 px-4 py-2.5 text-left"
            @click="newPlaylist(providerId)"
          >
            <div class="shrink-0">
              <provider-icon
                :domain="api.providers[providerId].domain"
                :size="50"
              />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium">
                {{ $t("new_playlist") }}
              </div>
              <div class="truncate text-xs text-muted-foreground">
                {{ $t("create_playlist_on", [api.providers[providerId].name]) }}
              </div>
            </div>
            <provider-icon
              :domain="api.providers[providerId].domain"
              :size="20"
              class="shrink-0"
            />
          </button>
        </div>
      </ScrollArea>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import MediaItemThumb from "@/components/MediaItemThumb.vue";
import ProviderIcon from "@/components/ProviderIcon.vue";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import api from "@/plugins/api";
import type {
  MediaItemType,
  MediaItemTypeOrItemMapping,
  Playlist,
} from "@/plugins/api/interfaces";
import { MediaType, ProviderFeature } from "@/plugins/api/interfaces";
import { eventbus, PlaylistDialogEvent } from "@/plugins/eventbus";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import { ListPlus, Loader2 } from "lucide-vue-next";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { toast } from "vue-sonner";

const show = ref<boolean>(false);
const playlists = ref<Playlist[]>([]);
const createPlaylistProviders = ref<string[]>([]);
const parentItem = ref<MediaItemType>();
const selectedItems = ref<MediaItemTypeOrItemMapping[]>([]);
// Streamloader-fork addition (batch 56 polish): tracks the playlist whose
// add request is currently in-flight, so the row can show a spinner and the
// rest of the rows can be disabled. Previously this dialog fired the API call
// fire-and-forget and closed instantly with no feedback — successful adds
// felt like nothing happened and failures were silent.
const pendingPlaylistId = ref<string | number | null>(null);

watch(show, (open) => {
  store.dialogActive = open;
});

onMounted(() => {
  eventbus.on("playlistdialog", async (evt: PlaylistDialogEvent) => {
    show.value = true;
    selectedItems.value = evt.items;
    parentItem.value = evt.parentItem;
    await fetchPlaylists();
  });
  onBeforeUnmount(() => {
    eventbus.off("playlistdialog");
  });
});

const fetchPlaylists = async function () {
  // get all (editable) playlists that are suitable as target
  playlists.value = [];
  createPlaylistProviders.value = [];
  const playlistResults = await api.getLibraryPlaylists(
    undefined,
    undefined,
    undefined,
  );
  let refItem = selectedItems.value.length ? selectedItems.value[0] : undefined;

  if (!refItem) return;
  if (!("provider_mappings" in refItem)) {
    // resolve itemmapping
    refItem = await api.getItem(
      refItem.media_type,
      refItem.item_id,
      refItem.provider,
    );
  }

  for (const playlist of playlistResults) {
    // skip unavailable playlists
    if (!playlist.provider_mappings.filter((x) => x.available).length) continue;
    // skip non-editable playlists
    if (!playlist.is_editable) continue;
    // skip playlist that is currently opened (=parentItem)
    if (
      parentItem.value &&
      parentItem.value.media_type === MediaType.PLAYLIST &&
      playlist.item_id === parentItem.value.item_id
    )
      continue;
    let _supported_mediatypes = playlist.supported_mediatypes;
    if (_supported_mediatypes.includes(MediaType.TRACK))
      // backend unwraps albums to individual tracks
      _supported_mediatypes.push(MediaType.ALBUM);
    if (!_supported_mediatypes.includes(refItem.media_type)) {
      // target playlist doesn't support media type
      continue;
    }

    const playListProvider =
      api.providers[playlist.provider_mappings[0].provider_instance];

    // either the refItem has a provider match or builtin provider or streaming provider
    if (
      playListProvider &&
      (playListProvider.domain == "builtin" ||
        playListProvider.is_streaming_provider ||
        refItem?.provider_mappings.filter(
          (x) => x.provider_instance == playListProvider.instance_id,
        ).length)
    ) {
      playlists.value.push(playlist);
    }
  }
  // determine which providers may be used to create a new playlist
  for (const provider of Object.values(api.providers)) {
    // filter suitable create provider base on media_type
    if (
      // album is unwrapped to individual tracks by backend
      (refItem.media_type == MediaType.TRACK ||
        refItem.media_type == MediaType.ALBUM) &&
      !provider.supported_features.includes(ProviderFeature.PLAYLIST_CREATE) &&
      !provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_TRACKS,
      )
    )
      continue;
    if (
      refItem.media_type == MediaType.AUDIOBOOK &&
      !provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_AUDIOBOOKS,
      )
    )
      continue;
    if (
      refItem.media_type == MediaType.PODCAST_EPISODE &&
      !provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_PODCAST_EPISODES,
      )
    )
      continue;
    if (
      refItem.media_type == MediaType.RADIO &&
      !provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_RADIOS,
      )
    )
      continue;
    if (
      !provider.supported_features.includes(
        ProviderFeature.PLAYLIST_TRACKS_EDIT,
      )
    )
      continue;
    // either the refItem has a provider match or builtin provider
    if (
      provider.domain == "builtin" ||
      provider.is_streaming_provider ||
      refItem?.provider_mappings.filter(
        (x) => x.provider_instance == provider.instance_id,
      ).length
    ) {
      createPlaylistProviders.value.push(provider.instance_id);
    }
  }
};
const addToPlaylist = async function (value: MediaItemType) {
  // Streamloader-fork polish (batch 56): await the request so we can show a
  // spinner on the chosen row + a success/error toast. The dialog stays open
  // until the request resolves so the user sees the spinner; on failure we
  // keep it open so they can retry on a different playlist.
  if (pendingPlaylistId.value !== null) return;
  pendingPlaylistId.value = value.item_id;
  const count = selectedItems.value.length;
  try {
    await api.addPlaylistTracks(
      value.item_id,
      selectedItems.value.map((x) => x.uri),
    );
    const successMsg =
      count === 1
        ? $t("streamloader.player.playlist_added_one", { playlist: value.name })
        : $t("streamloader.player.playlist_added_other", {
            count,
            playlist: value.name,
          });
    toast.success(successMsg);
    close();
  } catch {
    toast.error(
      $t("streamloader.player.playlist_add_failed", { playlist: value.name }),
    );
  } finally {
    pendingPlaylistId.value = null;
  }
};
const newPlaylist = async function (provId: string) {
  let refItem = selectedItems.value.length ? selectedItems.value[0] : undefined;
  if (!refItem) return;
  let provider = api.getProvider(provId);
  if (!provider) return;
  const name = prompt($t("new_playlist_name"));
  if (!name) return;

  let supportedMediaTypes: MediaType[] = [];
  if (
    provider.supported_features.includes(ProviderFeature.PLAYLIST_CREATE_MIXED)
  ) {
    // if the provider supports mixed playlists, we always create a playlist for all
    // supported media types
    if (
      provider.supported_features.includes(ProviderFeature.PLAYLIST_CREATE) ||
      provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_TRACKS,
      )
    )
      supportedMediaTypes.push(MediaType.TRACK);
    if (
      provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_AUDIOBOOKS,
      )
    )
      supportedMediaTypes.push(MediaType.AUDIOBOOK);
    if (
      provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_PODCAST_EPISODES,
      )
    )
      supportedMediaTypes.push(MediaType.PODCAST_EPISODE);
    if (
      provider.supported_features.includes(
        ProviderFeature.PLAYLIST_CREATE_RADIOS,
      )
    )
      supportedMediaTypes.push(MediaType.RADIO);
  } else {
    // otherwise the playlist must support the mediatype of the selected item
    supportedMediaTypes = [refItem.media_type];
  }
  const newPlaylist = await api.createPlaylist(
    name,
    provId,
    supportedMediaTypes,
  );
  addToPlaylist(newPlaylist);
};

const close = function () {
  show.value = false;
  // Reset pending state in case the dialog was closed via overlay click
  // while a request was in flight (the request still resolves; we just no
  // longer want a stale pending ref carried into the next open).
  pendingPlaylistId.value = null;
};
</script>

<style scoped>
/* Teal underline accent below dialog header */
.dialog-header {
  position: relative;
}
.dialog-header::after {
  content: "";
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: -1px;
  height: 2px;
  background: linear-gradient(
    90deg,
    rgba(45, 212, 191, 0.6),
    rgba(45, 212, 191, 0)
  );
  pointer-events: none;
}

/* Playlist row: teal wash on hover + active left-edge stripe */
.playlist-row {
  transition:
    background-color 180ms cubic-bezier(0.34, 1.36, 0.64, 1),
    box-shadow 180ms cubic-bezier(0.34, 1.36, 0.64, 1);
  box-shadow: inset 0 0 0 0 #2dd4bf;
}

@media (hover: hover) {
  .playlist-row:hover {
    background-color: rgba(45, 212, 191, 0.08);
    box-shadow: inset 3px 0 0 #2dd4bf;
  }
}

.playlist-row:focus-visible {
  outline: none;
  background-color: rgba(45, 212, 191, 0.1);
  box-shadow:
    inset 3px 0 0 #2dd4bf,
    0 0 0 2px rgba(45, 212, 191, 0.4);
}

.playlist-row:active {
  background-color: rgba(45, 212, 191, 0.14);
}

/* Streamloader-fork polish (batch 56): visual cue while a row's add request
   is in flight. Other rows are dimmed via :disabled below. */
.playlist-row.is-pending {
  background-color: rgba(45, 212, 191, 0.12);
  box-shadow: inset 3px 0 0 #2dd4bf;
}

.playlist-row:disabled {
  cursor: progress;
}

.playlist-row:disabled:not(.is-pending) {
  opacity: 0.55;
  pointer-events: none;
}

/* Create-new-playlist CTA: teal-leaning primary affordance */
.create-playlist-row {
  transition:
    background-color 180ms cubic-bezier(0.34, 1.36, 0.64, 1),
    box-shadow 180ms cubic-bezier(0.34, 1.36, 0.64, 1),
    color 180ms cubic-bezier(0.34, 1.36, 0.64, 1);
  border-left: 2px solid rgba(45, 212, 191, 0.35);
}

@media (hover: hover) {
  .create-playlist-row:hover {
    background-color: rgba(45, 212, 191, 0.1);
    border-left-color: #2dd4bf;
    color: #2dd4bf;
  }
}

.create-playlist-row:focus-visible {
  outline: none;
  background-color: rgba(45, 212, 191, 0.12);
  box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.45);
  border-left-color: #2dd4bf;
}
</style>
