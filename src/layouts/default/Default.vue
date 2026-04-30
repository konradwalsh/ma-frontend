<template>
  <v-app>
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
  </v-app>
  <reload-prompt />
</template>

<script lang="ts" setup>
import MainView from "./View.vue";
import Footer from "./Footer.vue";
import ReloadPrompt from "./ReloadPrompt.vue";
import StreamloaderHealthPill from "@/components/StreamloaderHealthPill.vue";
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
</style>
