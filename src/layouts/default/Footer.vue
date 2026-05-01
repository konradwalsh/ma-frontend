import { store } from '@/plugins/store';

<template>
  <!-- gradient background panel to make the footer player more elevated (and hide content behind it)-->
  <div
    v-if="store.mobileLayout"
    :class="$vuetify.theme.current.dark ? 'gradient-dark' : 'gradient-light'"
    :style="`
      position: fixed;
      width: 100%;
      height: 180px;
      bottom: 0px;
      z-index: 999;
    `"
  ></div>

  <!-- bottom navigation for mobile layout -->
  <!-- add a tiny bit of bottom-padding to avoid overlap with (iOS) bottom bar -->
  <BottomNavigation
    v-if="store.mobileLayout"
    app
    class="streamloader-bottom-nav-wrap"
    style="height: 60px"
  />

  <v-footer
    app
    color="default"
    :class="`py-0 px-0 ${
      store.mobileLayout
        ? 'mediacontrols-player-float'
        : 'mediacontrols-player-default'
    }`"
    :style="[
      store.mobileLayout && store.showPlayersMenu
        ? 'z-index: 999 !important;'
        : '',
      store.isInPWAMode && !store.isIngressSession
        ? 'margin-bottom: 10px;'
        : '',
    ]"
  >
    <Player :use-floating-player="store.mobileLayout" />
  </v-footer>
</template>

<script setup lang="ts">
import BottomNavigation from "@/components/navigation/BottomNavigation.vue";
import { store } from "@/plugins/store";
import Player from "./PlayerOSD/Player.vue";
</script>

<style>
.mediacontrols-player-float {
  display: flex;
  flex-direction: column;
  margin: 5px;
  margin-bottom: 0px;
  width: calc(100% - 10px) !important;
  border-radius: 12px !important;
  /* streamloader: subtle teal halo on the floating mobile player */
  box-shadow:
    0 4px 20px rgba(45, 212, 191, 0.12),
    0 0 0 1px rgba(45, 212, 191, 0.08) !important;
}

/* streamloader: subtle teal 1px top border to anchor the desktop footer */
.mediacontrols-player-default {
  border-top: 1px solid rgba(45, 212, 191, 0.18) !important;
}

/* streamloader: a touch more breathing room around the player on desktop */
.v-footer.mediacontrols-player-default {
  padding-top: 2px !important;
  padding-bottom: 2px !important;
}

.gradient-dark {
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.9) 0%,
    rgba(0, 0, 0, 0.9) 75%,
    rgba(255, 255, 255, 0) 100%
  );
}
.gradient-light {
  background: linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.9) 75%,
    rgba(255, 255, 255, 0) 100%
  );
}

.v-bottom-navigation--active {
  box-shadow: none;
  z-index: 2000 !important;
}

/* streamloader: respect iOS home-indicator / notch on the mobile bottom nav.
   The wrapper class is applied in the template above; we extend the rendered
   height with the safe-area inset and add a hairline teal top border + soft
   glow so the nav reads as a separated chrome layer above the page content. */
.streamloader-bottom-nav-wrap.v-bottom-navigation {
  height: calc(60px + env(safe-area-inset-bottom, 0px)) !important;
  padding-bottom: env(safe-area-inset-bottom, 0px) !important;
  border-top: 1px solid rgba(45, 212, 191, 0.18) !important;
  box-shadow: 0 -2px 14px rgba(45, 212, 191, 0.08) !important;
}

.v-footer {
  z-index: 1000 !important;
}

.v-footer.mediacontrols-player-float {
  z-index: 2001 !important;
}
</style>
