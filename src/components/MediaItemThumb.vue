<template>
  <div class="media-item-thumb-wrapper">
    <v-img
      loading="lazy"
      :height="size || '100%'"
      :width="size || '100%'"
      aspect-ratio="1"
      :src="imgData"
      :class="{ rounded: rounded }"
      contain
      :lazy-src="theme.current.value.dark ? imgCoverDark : imgCoverLight"
      @error="onOverrideImgError"
    />
    <!-- In Library badge (hoisted from wrappers so it appears everywhere
         a cover is rendered: grid, list, carousels, search, etc.) -->
    <div
      v-if="
        !hideInLibraryBadge &&
        item &&
        'in_library' in item &&
        (item as any).in_library
      "
      class="in-library-badge"
      :title="$t('in_library')"
      role="img"
      :aria-label="$t('in_library')"
    >
      <v-icon size="12" color="white" aria-hidden="true"
        >mdi-bookmark-check</v-icon
      >
    </div>

    <!-- Streamloader source dot (compact). Tracks only — albums/artists
         have heterogeneous mappings that wouldn't classify cleanly. Sits
         bottom-LEFT to avoid colliding with the in-library bookmark dot
         that lives bottom-right. Hover/long-press reveals "Local /
         Streamloader / Streaming" via the badge's own title tooltip. -->
    <div
      v-if="
        !hideSourceBadge &&
        sourceBadgeGloballyEnabled &&
        item &&
        'media_type' in item &&
        item.media_type === MediaType.TRACK &&
        'provider_mappings' in item
      "
      class="source-badge-overlay"
    >
      <StreamloaderSourceBadge :item="item as any" compact />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type {
  ItemMapping,
  MediaItemType,
  QueueItem,
} from "@/plugins/api/interfaces";
import { ImageType, MediaType } from "@/plugins/api/interfaces";
import { useTheme } from "vuetify";
import {
  imgCoverDark,
  imgCoverLight,
  iconFolder,
} from "@/components/QualityDetailsBtn.vue";
import { getImageThumbForItem } from "@/helpers/utils";
import { useArtworkOverrideUrl } from "@/composables/useArtworkOverrides";
import StreamloaderSourceBadge from "@/components/StreamloaderSourceBadge.vue";
import { useStreamloaderPref } from "@/composables/streamloaderPrefs";

export interface Props {
  item?: MediaItemType | ItemMapping | QueueItem;
  size?: string | number;
  fallback?: string;
  rounded?: boolean;
  thumbnail?: boolean;
  hideInLibraryBadge?: boolean;
  hideSourceBadge?: boolean;
}

// Global "show source badge on cards" toggle from /settings/streamloader.
// Combines with the per-instance `hideSourceBadge` prop already exposed —
// instance opt-out wins, then global opt-out, otherwise badge renders.
const sourceBadgeGloballyEnabled = useStreamloaderPref("showSourceBadge");

const props = withDefaults(defineProps<Props>(), {
  item: undefined,
  size: "100%",
  fallback: undefined,
  rounded: true,
  thumbnail: true,
  hideInLibraryBadge: false,
  hideSourceBadge: false,
});

const theme = useTheme();

function getThumbSize() {
  if (typeof props.size == "number") {
    return props.size;
  } else if (props.thumbnail) return 256;
  else return 0;
}
const thumbSize = getThumbSize();

function getFallbackImage() {
  if (props.fallback) return props.fallback;
  if (
    props.item &&
    "media_type" in props.item &&
    props.item.media_type == MediaType.FOLDER
  )
    return iconFolder;
  if (!props.item) return "";
  if (!props.item.name) return "";
  return getAvatarImage(
    props.item.name,
    theme.current.value.dark,
    thumbSize || 256,
  );
}
const fallbackImage = getFallbackImage();

// Streamloader-fork addition (batch LLL3): resolve the override item_id.
// QueueItem wraps the underlying media item, so reach into media_item first;
// MediaItemType / ItemMapping carry item_id directly.
const overrideItemId = computed<string | undefined>(() => {
  const it = props.item as
    | (MediaItemType & { item_id?: string })
    | (ItemMapping & { item_id?: string })
    | (QueueItem & { media_item?: { item_id?: string } })
    | undefined;
  if (!it) return undefined;
  if ("media_item" in it && it.media_item?.item_id) return it.media_item.item_id;
  if ("item_id" in it && it.item_id) return it.item_id;
  return undefined;
});
const overrideUrl = useArtworkOverrideUrl(() => overrideItemId.value);

// Track whether the override URL itself failed to load. If so, fall back
// to the auto-detected pipeline rather than leaving the user staring at a
// broken image. The override is NOT removed from storage on a transient
// failure (network blip on a paste-URL override) — a future "Reset to
// default artwork" UX gives the user explicit control.
const overrideFailed = ref(false);

const imgData = computed(() => {
  if (overrideUrl.value && !overrideFailed.value) return overrideUrl.value;
  return props.item
    ? getImageThumbForItem(props.item, ImageType.THUMB, thumbSize) ||
        fallbackImage
    : fallbackImage;
});

const onOverrideImgError = () => {
  // Only flip the fallback latch if the failure was on the override URL —
  // otherwise the auto-detected URL itself is broken and v-img will surface
  // its own lazy/error state.
  if (overrideUrl.value && !overrideFailed.value) {
    overrideFailed.value = true;
  }
};
</script>

<script lang="ts">
//// utility functions for images

export const getAvatarImage = function (
  name: string,
  dark = false,
  size = 256,
): string {
  // get url to avatar image for a string or sentence
  if (dark)
    return `https://ui-avatars.com/api/?name=${name}&size=${
      size || 256
    }&bold=true&background=1d1d1d&color=383838`;
  else
    return `https://ui-avatars.com/api/?name=${name}&size=${
      size || 256
    }&bold=true&background=a0a0a0&color=cccccc`;
};
</script>

<style scoped>
.v-avatar.v-avatar--density-default {
  height: 100% !important;
  width: 100% !important;
}

.media-item-thumb-wrapper {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}

/* In-Library badge: small teal pill in the bottom-right corner of the cover.
   Appears on every MediaItemThumb render (grid, list, carousels, search). */
.in-library-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2dd4bf 0%, #0f766e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  z-index: 2;
}

/* Source-badge overlay: bottom-LEFT corner so it doesn't collide with the
   in-library bookmark on the right. Drop shadow lifts the dot off bright
   covers; pointer-events left enabled so the title tooltip works on
   hover. Tracks only — gated in template. */
.source-badge-overlay {
  position: absolute;
  bottom: -2px;
  left: -2px;
  z-index: 2;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
}
</style>
