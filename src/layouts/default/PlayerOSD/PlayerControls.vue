<template>
  <div v-if="visibleComponents" class="player-controls">
    <!-- shuffle button -->
    <div
      v-if="visibleComponents && visibleComponents.shuffle?.isVisible"
      class="player-controls-elements"
    >
      <ShuffleBtn
        :player-queue="store.activePlayerQueue"
        class="media-controls-item"
        :icon="visibleComponents.shuffle.icon"
      />
    </div>
    <!-- prev button -->
    <div
      v-if="visibleComponents && visibleComponents.previous?.isVisible"
      class="player-controls-elements"
    >
      <PreviousBtn
        :player="store.activePlayer"
        :player-queue="store.activePlayerQueue"
        class="media-controls-item"
        :icon="visibleComponents.previous.icon"
      />
    </div>
    <!-- play/pause button -->
    <div
      v-if="visibleComponents && visibleComponents.play?.isVisible"
      class="play-btn-wrapper"
    >
      <PlayBtn
        :player="store.activePlayer"
        :player-queue="store.activePlayerQueue"
        class="media-controls-item"
        :icon="visibleComponents.play.icon"
      />
    </div>
    <!-- next button -->
    <div
      v-if="visibleComponents && visibleComponents.next?.isVisible"
      class="player-controls-elements"
    >
      <NextBtn
        :player="store.activePlayer"
        :player-queue="store.activePlayerQueue"
        :icon="visibleComponents.next.icon"
        static-height="24px"
        static-width="24px"
      />
    </div>
    <!-- repeat button -->
    <div
      v-if="visibleComponents && visibleComponents.repeat?.isVisible"
      class="player-controls-elements"
    >
      <RepeatBtn
        :player-queue="store.activePlayerQueue"
        :icon="visibleComponents.repeat.icon"
        static-height="24px"
        static-width="24px"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconProps } from "@/components/Icon.vue";
import RepeatBtn from "@/layouts/default/PlayerOSD/PlayerControlBtn/RepeatBtn.vue";
import { store } from "@/plugins/store";
import NextBtn from "./PlayerControlBtn/NextBtn.vue";
import PlayBtn from "./PlayerControlBtn/PlayBtn.vue";
import PreviousBtn from "./PlayerControlBtn/PreviousBtn.vue";
import ShuffleBtn from "./PlayerControlBtn/ShuffleBtn.vue";

// properties
export interface Props {
  visibleComponents?: {
    repeat?: {
      isVisible?: boolean;
      icon?: IconProps;
    };
    shuffle?: {
      isVisible?: boolean;
      icon?: IconProps;
    };
    play?: {
      isVisible?: boolean;
      icon?: IconProps;
    };
    previous?: {
      isVisible?: boolean;
      icon?: IconProps;
    };
    next?: {
      isVisible?: boolean;
      icon?: IconProps;
    };
  };
}

withDefaults(defineProps<Props>(), {
  visibleComponents: () => ({
    repeat: { isVisible: true },
    shuffle: { isVisible: true },
    play: { isVisible: true },
    previous: { isVisible: true },
    next: { isVisible: true },
  }),
});
</script>

<style>
/* streamloader brand teal:
   #2dd4bf (dark mode) / #0f766e (light mode).
   PlayerControls is a thin wrapper around custom Icon-based control buttons
   (PlayBtn / PreviousBtn / NextBtn / ShuffleBtn / RepeatBtn). These render
   <Icon>, NOT <v-btn>, so the global vuetify.css v-btn[color="primary"]
   teal-glow rule does NOT apply automatically. We replicate the glow
   treatment here, scoped to the play button via the .play-btn-wrapper
   class defined in this file.

   Shuffle and Repeat already pass `color="primary"` to their inner v-icon
   when active (see ShuffleBtn.vue / RepeatBtn.vue) — that picks up Vuetify's
   primary palette (teal) for the glyph itself. No extra wiring needed. */

.player-controls {
  display: flex;
  justify-content: center;
}
.player-controls-elements {
  width: 46px;
  height: 46px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  /* subtle teal hover affordance for secondary controls (prev/next/shuffle/
     repeat) — mirrors the toolbar treatment from batch 6. Excludes the
     play button (which has its own glow halo below). */
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease;
}
.player-controls-elements:hover {
  background-color: rgba(45, 212, 191, 0.1);
}
.v-theme--light .player-controls-elements:hover {
  background-color: rgba(15, 118, 110, 0.1);
}

.play-btn-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  /* teal-glow halo for THE primary action (play/pause). Mirrors the global
     v-btn[color="primary"] treatment in plugins/vuetify.css but applied to
     the .play-btn-icon circle rendered by the nested PlayBtn component. */
  transition: box-shadow 220ms ease;
  box-shadow: 0 4px 16px rgba(45, 212, 191, 0.32);
}
.play-btn-wrapper:hover {
  box-shadow:
    0 6px 22px rgba(45, 212, 191, 0.5),
    0 0 0 2px rgba(45, 212, 191, 0.25);
}
.v-theme--light .play-btn-wrapper {
  box-shadow: 0 4px 16px rgba(15, 118, 110, 0.28);
}
.v-theme--light .play-btn-wrapper:hover {
  box-shadow:
    0 6px 22px rgba(15, 118, 110, 0.42),
    0 0 0 2px rgba(15, 118, 110, 0.22);
}

/* keep keyboard focus visible on the inner play button — the wrapper hover
   glow doesn't fire on :focus-visible, so add the same halo for keyboard
   users. The PlayBtn itself is the focusable element. */
.play-btn-wrapper:focus-within {
  box-shadow:
    0 6px 22px rgba(45, 212, 191, 0.5),
    0 0 0 2px rgba(45, 212, 191, 0.45);
}
.v-theme--light .play-btn-wrapper:focus-within {
  box-shadow:
    0 6px 22px rgba(15, 118, 110, 0.42),
    0 0 0 2px rgba(15, 118, 110, 0.4);
}

/* teal buffering spinner — when the play action is in flight, the
   v-progress-circular indicator inside PlayBtn should signal in brand color
   rather than the default neutral grey. */
.play-btn-wrapper .play-btn-spinner,
.play-btn-wrapper .play-btn-spinner .v-progress-circular__overlay,
.play-btn-wrapper .play-btn-spinner .v-progress-circular__underlay {
  color: #2dd4bf;
}
.v-theme--light .play-btn-wrapper .play-btn-spinner,
.v-theme--light
  .play-btn-wrapper
  .play-btn-spinner
  .v-progress-circular__overlay,
.v-theme--light
  .play-btn-wrapper
  .play-btn-spinner
  .v-progress-circular__underlay {
  color: #0f766e;
}
</style>
