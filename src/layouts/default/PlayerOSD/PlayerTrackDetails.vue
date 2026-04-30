<template>
  <!-- now playing media -->
  <v-list-item
    class="player-track-details"
    style="height: auto; margin: 0px; padding: 0px"
    lines="two"
  >
    <template #prepend>
      <div
        class="media-thumb player-media-thumb"
        :style="`cursor: pointer;height: ${
          getBreakpointValue({ breakpoint: 'phone' }) ? 60 : 64
        }px; width: ${
          getBreakpointValue({ breakpoint: 'phone' }) ? 60 : 64
        }px; `"
        @click="store.showFullscreenPlayer = true"
      >
        <!-- player.current_media has content loaded (will work for all sources)  -->
        <div
          v-if="
            store.activePlayer?.powered != false &&
            store.activePlayer?.current_media?.image_url
          "
        >
          <v-img
            class="media-thumb"
            style="border-radius: 4px"
            size="60"
            :src="getMediaImageUrl(store.activePlayer.current_media.image_url)"
          />
        </div>
        <!-- fallback: display player icon -->
        <div v-else class="icon-thumb">
          <v-icon
            size="32"
            :icon="
              store.activePlayer?.type == PlayerType.PLAYER &&
              store.activePlayer?.group_members.length
                ? 'mdi-speaker-multiple'
                : store.activePlayer?.icon || 'mdi-speaker'
            "
          />
        </div>
      </div>
    </template>

    <!-- title -->
    <template #title>
      <div
        :style="{
          cursor: 'pointer',
          color: primaryColor,
        }"
        class="d-flex align-center player-device-line"
      >
        <div
          v-if="store.activePlayer && store.activePlayer?.powered != false"
          class="player-device-name"
        >
          {{ getPlayerName(store.activePlayer) }}
        </div>
        <!-- player name as title if its powered off-->
        <div
          v-else-if="store.activePlayer?.powered == false"
          class="player-device-name player-device-name--off"
          @click="store.showPlayersMenu = true"
        >
          {{ store.activePlayer?.name }}
        </div>
        <!-- no player selected message -->
        <div
          v-else
          class="player-device-name player-device-name--off"
          @click="store.showPlayersMenu = true"
        >
          {{ $t("no_player") }}
        </div>
        <NowPlayingBadge
          v-if="
            store.activePlayer &&
            store.activePlayer?.powered != false &&
            store.activePlayer?.playback_state != PlaybackState.IDLE
          "
          :show-badge="false"
          :show-icon="true"
          icon-style="margin-left: 12px; margin-bottom: 4px;"
        />
      </div>
    </template>
    <!-- append chip(s): quality -->
    <template #append>
      <!-- format -->
      <div
        v-if="
          streamDetails?.audio_format.content_type &&
          !getBreakpointValue({ breakpoint: 'phone' }) &&
          showQualityDetailsBtn
        "
        class="pl-4"
      >
        <QualityDetailsBtn />
      </div>
    </template>
    <!-- subtitle -->
    <template #subtitle>
      <div
        :style="{
          cursor: 'pointer',
          color: primaryColor,
        }"
        class="player-track-meta"
        @click="store.showFullscreenPlayer = true"
      >
        <!-- player powered off -->
        <div v-if="store.activePlayer?.powered == false" class="track-artist">
          {{ $t("off") }}
        </div>
        <template v-else-if="store.activePlayer?.current_media?.title">
          <div class="ma-line-clamp-1 track-title">
            <MarqueeText :sync="marqueeSync">
              {{ store.activePlayer.current_media.title }}
            </MarqueeText>
          </div>
          <div class="ma-line-clamp-1 track-artist">
            <MarqueeText :sync="marqueeSync">
              <!-- artists(s) + album -->
              <span
                v-if="
                  store.activePlayer?.current_media?.artist &&
                  store.activePlayer?.current_media?.album &&
                  !props.showOnlyArtist
                "
              >
                {{ store.activePlayer?.current_media?.artist }}
                <span class="track-sep">•</span>
                <span class="track-album">{{
                  store.activePlayer?.current_media?.album
                }}</span>
              </span>
              <!-- artists(s) only -->
              <span v-else-if="store.activePlayer?.current_media?.artist">
                {{ store.activePlayer?.current_media?.artist }}
              </span>
              <!-- album only -->
              <span v-else-if="store.activePlayer?.current_media?.album">
                <span class="track-album">{{
                  store.activePlayer?.current_media?.album
                }}</span>
              </span>
            </MarqueeText>
          </div>
        </template>
        <!-- 3rd party source active -->
        <div
          v-else-if="
            store.activePlayer &&
            !store.activePlayerQueue &&
            store.activePlayer?.active_source
          "
          class="ma-line-clamp-1 track-artist"
        >
          {{
            $t("external_source_active", [getSourceName(store.activePlayer)])
          }}
        </div>
        <!-- queue empty message -->
        <div
          v-else-if="
            store.activePlayerQueue && store.activePlayerQueue.items == 0
          "
          class="ma-line-clamp-1 track-artist"
        >
          {{ $t("queue_empty") }}
        </div>
        <div v-else-if="store.activePlayer" class="track-artist">
          {{ store.activePlayer?.name }}
        </div>
      </div>
    </template>
  </v-list-item>
  <!-- a11y: screen-reader-only live region announcing the current track -->
  <div aria-live="polite" aria-atomic="true" class="sr-only">
    {{ announcedTrack }}
  </div>
  <PlayerFullscreen
    :show-fullscreen="store.showFullscreenPlayer"
    :color-palette="colorPalette"
  />
</template>

<script setup lang="ts">
import MarqueeText from "@/components/MarqueeText.vue";
import NowPlayingBadge from "@/components/NowPlayingBadge.vue";
import QualityDetailsBtn from "@/components/QualityDetailsBtn.vue";
import { MarqueeTextSync } from "@/helpers/marquee_text_sync";
import {
  ImageColorPalette,
  getMediaImageUrl,
  getPlayerName,
} from "@/helpers/utils";
import { getSourceName } from "@/plugins/api/helpers";
import { PlaybackState, PlayerType } from "@/plugins/api/interfaces";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { store } from "@/plugins/store";
import { computed, ref, watch } from "vue";
import PlayerFullscreen from "./PlayerFullscreen.vue";

const marqueeSync = new MarqueeTextSync();

// properties
interface Props {
  showOnlyArtist?: boolean;
  showQualityDetailsBtn?: boolean;
  colorPalette: ImageColorPalette;
  primaryColor: string;
}

const props = withDefaults(defineProps<Props>(), {
  showOnlyArtist: false,
  showQualityDetailsBtn: true,
  primaryColor: "",
});

// computed properties
const streamDetails = computed(() => {
  return store.activePlayerQueue?.current_item?.streamdetails;
});

// a11y: announce current track changes to screen readers via aria-live region.
// Only announces while actively playing; deduped to avoid repeats from reactivity churn.
const announcedTrack = ref("");
const currentTrackAnnouncement = computed(() => {
  const player = store.activePlayer;
  if (!player || player.powered === false) return "";
  if (player.playback_state !== PlaybackState.PLAYING) return "";
  const media = player.current_media;
  if (!media?.title) return "";
  return media.artist
    ? `${media.title} by ${media.artist}`
    : media.title;
});
watch(
  currentTrackAnnouncement,
  (next) => {
    if (next && next !== announcedTrack.value) {
      announcedTrack.value = next;
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.player-media-thumb {
  margin-right: 10px;
}

.player-track-content-type {
  height: 20px !important;
  padding: 5px !important;
  padding-right: 9px !important;
  padding-left: 9px !important;
  font-weight: 500;
  font-size: 10px !important;
  letter-spacing: 0.1em;
  border-radius: 2px;
  margin-right: 30px;
}

.icon-thumb {
  width: 60px;
  height: 60px;
  border-radius: 3px;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* "Now playing on [device]" line — small, slight teal accent on device name */
.player-device-line {
  font-size: 12px;
  letter-spacing: 0.02em;
}
.player-device-name {
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  transition: color 0.18s ease;
}
.player-device-name--off {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-weight: 400;
}
.player-device-name:hover {
  color: rgb(var(--v-theme-primary));
  filter: brightness(1.15);
}

/* track + artist hierarchy */
.player-track-meta {
  padding-top: 2px;
}
.track-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.005em;
  line-height: 1.25;
  color: rgba(var(--v-theme-on-surface), 0.95);
}
.track-artist {
  font-size: 12.5px;
  font-weight: 400;
  letter-spacing: 0.005em;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-top: 1px;
}
.track-sep {
  display: inline-block;
  margin: 0 6px;
  color: rgba(var(--v-theme-on-surface), 0.4);
}
.track-album {
  color: rgba(var(--v-theme-on-surface), 0.62);
  transition:
    color 0.18s ease,
    text-decoration-color 0.18s ease;
  text-decoration: underline transparent 1px;
  text-underline-offset: 2px;
}
.track-album:hover {
  color: rgb(var(--v-theme-primary));
  text-decoration-color: rgb(var(--v-theme-primary));
}
</style>

<style>
/* this fixes missing subtitle items on webkit*/
.player-track-details .v-list-item-subtitle {
  -webkit-line-clamp: unset !important;
  line-clamp: unset !important;
}
</style>
