<template>
  <!-- Non-mobile: background gradient and player bar -->
  <template v-if="!useFloatingPlayer">
    <div class="mediacontrols-bg" :data-floating="useFloatingPlayer"></div>
    <div class="mediacontrols">
      <div class="mediacontrols-left">
        <PlayerTrackDetails
          :show-quality-details-btn="getBreakpointValue('bp9') ? true : false"
          :show-only-artist="getBreakpointValue('bp7') ? false : true"
          :color-palette="coverImageColorPalette"
          :primary-color="$vuetify.theme.current.dark ? '#fff' : '#000'"
        />
      </div>
      <div class="mediacontrols-bottom-center">
        <!-- player control buttons -->
        <PlayerControls
          :style="playIconStyle"
          :visible-components="{
            repeat: { isVisible: getBreakpointValue('bp3') },
            shuffle: { isVisible: getBreakpointValue('bp3') },
            play: {
              isVisible: true,
              icon: {
                staticWidth: '48px',
                staticHeight: '48px',
              },
            },
            previous: { isVisible: getBreakpointValue('bp3') },
            next: { isVisible: getBreakpointValue('bp3') },
          }"
        />
        <!-- progress bar -->
        <PlayerTimeline
          v-if="getBreakpointValue('bp6')"
          :is-progress-bar="false"
          :disabled="
            !store.activePlayerQueue?.active ||
            store.activePlayerQueue?.current_item?.media_item?.media_type !==
              MediaType.TRACK
          "
        />
      </div>
      <div class="mediacontrols-bottom-right">
        <div>
          <!-- player extended control buttons -->
          <PlayerExtendedControls
            :queue="{
              isVisible: getBreakpointValue('bp3'),
            }"
            :player="{
              isVisible: true,
            }"
            :volume="{
              isVisible: store.activePlayer != undefined,
              volumeSize: getBreakpointValue('bp8') ? '150px' : '130px',
            }"
          />
        </div>
      </div>
    </div>
  </template>

  <!-- Mobile: floating player with volume slider inside container -->
  <div v-else class="mediacontrols-mobile-container">
    <div class="mediacontrols-bg" :data-floating="useFloatingPlayer"></div>
    <div class="mediacontrols" :data-mobile="true">
      <div class="mediacontrols-left">
        <PlayerTrackDetails
          :show-quality-details-btn="false"
          :show-only-artist="true"
          :color-palette="coverImageColorPalette"
          :primary-color="$vuetify.theme.current.dark ? '#fff' : '#000'"
        />
      </div>
      <div class="mediacontrols-bottom-right">
        <div>
          <!-- player mobile control buttons -->
          <PlayerControls
            :style="[{ 'padding-right': '5px' }, playIconStyle]"
            :visible-components="{
              repeat: { isVisible: false },
              shuffle: { isVisible: false },
              play: {
                isVisible: true,
                icon: {
                  staticWidth: '44px',
                  staticHeight: '44px',
                },
              },
              previous: { isVisible: false },
              next: { isVisible: false },
            }"
          />
        </div>
      </div>
    </div>
    <div
      v-if="store.activePlayer"
      :class="[
        'volume-slider',
        { 'volume-slider--no-safe-area': store.isIngressSession },
      ]"
    >
      <PlayerVolume
        :player="store.activePlayer"
        width="100%"
        :prefer-group-volume="true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  imgCoverDark,
  imgCoverLight,
} from "@/components/QualityDetailsBtn.vue";
import {
  ImageColorPalette,
  getColorPalette,
  getMediaImageUrl,
} from "@/helpers/utils";
import { MediaType } from "@/plugins/api/interfaces";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { store } from "@/plugins/store";
import vuetify from "@/plugins/vuetify";
import { computed, ref, watch } from "vue";
import PlayerControls from "./PlayerControls.vue";
import PlayerExtendedControls from "./PlayerExtendedControls.vue";
import PlayerTimeline from "./PlayerTimeline.vue";
import PlayerTrackDetails from "./PlayerTrackDetails.vue";
import PlayerVolume from "./PlayerVolume.vue";

interface Props {
  useFloatingPlayer: boolean;
}
const props = defineProps<Props>();

// local refs
const coverImageColorPalette = ref<ImageColorPalette>({
  "0": "",
  "1": "",
  "2": "",
  "3": "",
  "4": "",
  "5": "",
  lightColor: "",
  darkColor: "",
});

// utility feature to extract the dominant colors from the cover image
// we use this color palette to colorize the playerbar/OSD
const img = new Image();
img.src = vuetify.theme.current.value.dark ? imgCoverDark : imgCoverLight;
img.crossOrigin = "Anonymous";
img.addEventListener("load", function () {
  coverImageColorPalette.value = getColorPalette(img);
});

const backgroundColor = computed(() => {
  if (vuetify.theme.current.value.dark) {
    if (coverImageColorPalette.value && coverImageColorPalette.value.darkColor)
      return coverImageColorPalette.value.darkColor;
    return "#CCCCCC26";
  }
  if (coverImageColorPalette.value && coverImageColorPalette.value.lightColor)
    return coverImageColorPalette.value.lightColor;
  return "#CCCCCC26";
});

const themeColor = computed(() =>
  vuetify.theme.current.value.dark ? "#fff" : "#000",
);

const playIconStyle = computed(() => ({
  "--play-icon-color": vuetify.theme.current.value.dark ? "#212121" : "#fff",
}));

// watchers
watch(
  () => store.activePlayer?.current_media?.image_url,
  () => {
    // load cover image for the (new) QueueItem
    // make sure that the image selection is exactly the same as on the player OSD thumb
    if (store.activePlayer?.current_media?.image_url) {
      img.src = getMediaImageUrl(store.activePlayer.current_media.image_url);
    } else {
      img.src = "";
    }
  },
);
</script>

<style scoped lang="scss">
// streamloader brand teal
$sl-teal: #2dd4bf;
$sl-teal-dim: rgba(45, 212, 191, 0.18);
$sl-teal-track: rgba(45, 212, 191, 0.28);

.mediadetails-streamdetails .icon {
  opacity: 100;
}

.mediacontrols-mobile-container {
  position: relative;
  width: 100%;
  border-radius: 10px;
  // faint teal hairline border for streamloader floating player
  border: 1px solid $sl-teal-dim;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(45, 212, 191, 0.04);
  overflow: hidden;
  background-color: rgb(var(--v-theme-overlay));
}

.mediacontrols {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 15px;
  background-color: rgb(var(--v-theme-overlay));
  // hairline teal top border to separate the player bar from the page
  border-top: 1px solid $sl-teal-dim;
  .mediacontrols-bottom-center {
    flex: 0 1 40%;
    min-width: 0;
  }

  &[data-mobile="true"] {
    background-color: transparent;
    padding: 8px 10px;
    border-top: none;
    .mediacontrols-bottom-center {
      display: none;
    }
    .mediacontrols-left {
      flex: 1;
      min-width: 0;
      max-width: none;
    }
  }
}

// streamloader: subtle typography polish on track/artist text rendered by
// the nested PlayerTrackDetails component
.mediacontrols-left :deep(.mediadetails-title),
.mediacontrols-left :deep(.mediadetails-subtitle),
.mediacontrols-left :deep(.title),
.mediacontrols-left :deep(.subtitle) {
  letter-spacing: 0.01em;
  line-height: 1.25;
}

// streamloader: teal fill for the timeline (track-scrubbing) slider rendered
// by the nested PlayerTimeline component. Targets Vuetify v-slider internals.
.mediacontrols-bottom-center :deep(.v-slider-track__fill) {
  background-color: $sl-teal !important;
}
.mediacontrols-bottom-center :deep(.v-slider-thumb__surface) {
  background-color: $sl-teal !important;
}
.mediacontrols-bottom-center :deep(.v-slider-track__background) {
  background-color: $sl-teal-track !important;
  opacity: 1;
}
// also handle the custom data-slot variant used in the floating volume slider
// in case the timeline shares the same primitive
.mediacontrols-bottom-center :deep([data-slot="slider-range"]) {
  background-color: $sl-teal !important;
}
.mediacontrols-bottom-center :deep([data-slot="slider-thumb"])::before {
  background-color: $sl-teal !important;
}
.mediacontrols-bottom-center :deep([data-slot="slider-track"])::before {
  background-color: $sl-teal-track !important;
}

// streamloader: teal fill for the desktop volume slider in PlayerExtendedControls
.mediacontrols-bottom-right :deep(.v-slider-track__fill) {
  background-color: $sl-teal !important;
}
.mediacontrols-bottom-right :deep(.v-slider-thumb__surface) {
  background-color: $sl-teal !important;
}
.mediacontrols-bottom-right :deep(.v-slider-track__background) {
  background-color: $sl-teal-track !important;
  opacity: 1;
}
.mediacontrols-bottom-right :deep([data-slot="slider-range"]) {
  background-color: $sl-teal !important;
}
.mediacontrols-bottom-right :deep([data-slot="slider-thumb"])::before {
  background-color: $sl-teal !important;
}
.mediacontrols-bottom-right :deep([data-slot="slider-track"])::before {
  background-color: $sl-teal-track !important;
}

.mediacontrols-bg {
  height: 100%;
  position: absolute;
  width: 320px;
  left: 0px;
  top: 0px;
  background: linear-gradient(
    to right,
    v-bind("backgroundColor") 0%,
    transparent
  );

  &[data-floating="true"] {
    border-radius: 10px;
    width: 100%;
    background: v-bind("backgroundColor");
  }
}

.mediacontrols-top-right {
  display: table-row;
}

.mediacontrols-left {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  > div {
    padding: 0px !important;
    min-width: 0;
  }
}

.mediacontrols-bottom-right {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  > div {
    display: inline-flex;
    align-items: center;
  }
}

.volume-slider {
  width: calc(100% - 34px);
  margin: -4px 6px 6px 14px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

// streamloader: teal accent for the mobile floating volume slider
.volume-slider :deep([data-slot="slider-range"]) {
  background-color: $sl-teal !important;
}

.volume-slider :deep([data-slot="slider-thumb"])::before {
  background-color: $sl-teal !important;
}

.volume-slider :deep([data-slot="slider-track"])::before {
  background-color: $sl-teal-track !important;
}
// keep also Vuetify v-slider primitives covered for the mobile volume control
.volume-slider :deep(.v-slider-track__fill) {
  background-color: $sl-teal !important;
}
.volume-slider :deep(.v-slider-thumb__surface) {
  background-color: $sl-teal !important;
}
.volume-slider :deep(.v-slider-track__background) {
  background-color: $sl-teal-track !important;
  opacity: 1;
}

.volume-slider--no-safe-area {
  padding-bottom: 0 !important;
}
</style>
