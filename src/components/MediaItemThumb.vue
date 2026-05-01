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
import { computed } from "vue";
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
import StreamloaderSourceBadge from "@/components/StreamloaderSourceBadge.vue";

export interface Props {
  item?: MediaItemType | ItemMapping | QueueItem;
  size?: string | number;
  fallback?: string;
  rounded?: boolean;
  thumbnail?: boolean;
  hideInLibraryBadge?: boolean;
  hideSourceBadge?: boolean;
}

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

const imgData = computed(() =>
  props.item
    ? getImageThumbForItem(props.item, ImageType.THUMB, thumbSize) ||
      fallbackImage
    : fallbackImage,
);
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
