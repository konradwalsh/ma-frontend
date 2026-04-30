<template>
  <v-app>
    <!-- Skip-to-main-content link for keyboard users.
         Visually hidden until it receives focus, then anchors to the
         <v-main id="cont"> in View.vue so Tab from page-load lands a
         user past the sidebar straight onto page content. -->
    <a v-if="!store.frameless" href="#cont" class="sl-skip-link">
      Skip to main content
    </a>
    <MainView v-if="store.frameless" />
    <template v-else>
      <MainView />
      <Footer />
    </template>
    <!-- Streamloader-fork addition: ALACarte-style status pill anchored
         top-right, lives at v-app root so it overlays every page.
         Hidden in frameless (HA ingress companion) mode to avoid
         duplicating status indication when a host shell already
         provides its own. -->
    <StreamloaderHealthPill v-if="!store.frameless" />
    <!-- Streamloader-fork feature: live "what's happening right now"
         widget. Stacks beneath the health pill; renders nothing when
         there are no in-flight streamloader tasks (zero visual cost
         when idle). Same frameless-mode guard as the health pill. -->
    <StreamloaderActivityPulse v-if="!store.frameless" />
  </v-app>
  <reload-prompt />
</template>

<script lang="ts" setup>
import MainView from "./View.vue";
import Footer from "./Footer.vue";
import ReloadPrompt from "./ReloadPrompt.vue";
import StreamloaderHealthPill from "@/components/StreamloaderHealthPill.vue";
import StreamloaderActivityPulse from "@/components/StreamloaderActivityPulse.vue";
import { store } from "@/plugins/store";
import { watch } from "vue";
import api from "@/plugins/api";
import { useRoute } from "vue-router";

const route = useRoute();
watch(
  // make sure it's retriggered when players array is populated
  [() => route.query.player, () => Object.keys(api.players).length],
  ([newActivePlayer]) => {
    if (!newActivePlayer) return;
    const newPlayerString = newActivePlayer.toString().toLowerCase();
    // newActivePlayer can be either player id or player name
    const newPlayerId = Object.values(api.players).find((p) => {
      return (
        p.player_id.toLowerCase() === newPlayerString ||
        p.name.toLowerCase() === newPlayerString
      );
    })?.player_id;

    if (newPlayerId) {
      store.activePlayerId = newPlayerId;
    }
  },
  { immediate: true },
);
watch(
  () => route.query.showFullscreenPlayer,
  (showFullscreenPlayer) => {
    store.showFullscreenPlayer = !!showFullscreenPlayer;
  },
  { immediate: true },
);
watch(
  () => route.query.frameless,
  (frameless) => {
    if (frameless !== undefined) {
      store.frameless = true;
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.centeredoverlay :deep(.v-overlay__content) {
  left: 50%;
  right: 50%;
  top: 50%;
  bottom: 50%;
}

/* Skip-to-content link: WCAG 2.4.1 bypass-blocks. Hidden off-screen
   until focused, at which point it slides in at the top-left over the
   app shell. Brand teal pill so it matches the rest of the focus-visible
   styling sub-agents added across the surfaces. */
.sl-skip-link {
  position: absolute;
  top: -100px;
  left: 8px;
  z-index: 10000;
  background: #0f766e;
  color: #ffffff;
  padding: 10px 16px;
  border-radius: 6px;
  font-weight: 600;
  text-decoration: none;
  transition: top 0.18s ease;
}

.sl-skip-link:focus,
.sl-skip-link:focus-visible {
  top: 8px;
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}
</style>
