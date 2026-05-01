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
    <!-- Streamloader-fork addition: keyboard-shortcut help dialog.
         Triggered by "?" (Shift+/) — see useKeyboardShortcuts.ts.
         Mounted at v-app root so it's reachable from every route. -->
    <KeyboardShortcutsDialog v-model="store.showKeyboardShortcuts" />
    <!-- a11y: screen-reader-only live region announcing queue mutations
         (items added/cleared/length changes) on the active player. Pairs
         with PlayerTrackDetails' current-track aria-live (batch 27).
         Polite + atomic + debounced (700ms) so bulk adds don't fire 50
         announcements; debounce also rolls together rapid back-to-back
         changes into one summary message. -->
    <div
      v-if="!store.frameless"
      aria-live="polite"
      aria-atomic="true"
      class="sl-queue-live-region"
    >
      {{ queueAnnouncement }}
    </div>
  </v-app>
  <reload-prompt />
</template>

<script lang="ts" setup>
import MainView from "./View.vue";
import Footer from "./Footer.vue";
import ReloadPrompt from "./ReloadPrompt.vue";
import StreamloaderHealthPill from "@/components/StreamloaderHealthPill.vue";
import StreamloaderActivityPulse from "@/components/StreamloaderActivityPulse.vue";
import KeyboardShortcutsDialog from "@/components/KeyboardShortcutsDialog.vue";
import { store } from "@/plugins/store";
import { computed, ref, watch } from "vue";
import api from "@/plugins/api";
import { useRoute } from "vue-router";
import { useKeyboardShortcuts } from "@/composables/useKeyboardShortcuts";

// Streamloader-fork addition: register global music-player keyboard shortcuts
// (Space/arrows/M/F/Esc). Composable handles input-bail + cleanup.
useKeyboardShortcuts();

// a11y: queue-change live-region state. We track the active player's queue
// item count and shuffle flag; when either changes we debounce-publish a
// short summary string that the aria-live region announces. Debouncing is
// critical — a "play album" action mutates items.length once per inserted
// track, which without coalescing would spam SR users with 30+ messages.
const queueAnnouncement = ref("");
const queueSignature = computed(() => {
  const q = store.activePlayerQueue;
  if (!q) return null;
  return {
    itemsLength: typeof q.items === "number" ? q.items : 0,
    shuffle: q.shuffle_enabled === true,
  };
});
let queueAnnounceTimer: ReturnType<typeof setTimeout> | undefined;
let lastAnnouncedShuffle: boolean | undefined;
let lastAnnouncedLength: number | undefined;
watch(
  queueSignature,
  (next) => {
    if (!next) return;
    // First observation primes the baseline silently — we only announce
    // *changes*, not the initial state on app boot.
    if (
      lastAnnouncedLength === undefined &&
      lastAnnouncedShuffle === undefined
    ) {
      lastAnnouncedLength = next.itemsLength;
      lastAnnouncedShuffle = next.shuffle;
      return;
    }
    if (queueAnnounceTimer) clearTimeout(queueAnnounceTimer);
    queueAnnounceTimer = setTimeout(() => {
      const parts: string[] = [];
      if (next.shuffle !== lastAnnouncedShuffle) {
        parts.push(next.shuffle ? "Shuffle on" : "Shuffle off");
      }
      if (next.itemsLength !== lastAnnouncedLength) {
        if (next.itemsLength === 0) {
          parts.push("Queue cleared");
        } else {
          parts.push(`Queue updated: ${next.itemsLength} items`);
        }
      }
      lastAnnouncedLength = next.itemsLength;
      lastAnnouncedShuffle = next.shuffle;
      if (parts.length > 0) {
        // Toggle to empty first so SR re-announces even if string is identical
        // to the previous announcement (some SRs suppress duplicates).
        queueAnnouncement.value = "";
        // microtask gap so DOM mutation is observed
        Promise.resolve().then(() => {
          queueAnnouncement.value = parts.join(". ");
        });
      }
    }, 700);
  },
  { deep: true, immediate: true },
);

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

/* a11y: visually hide the queue-change live region while keeping it
   discoverable to assistive tech. Mirrors the standard sr-only utility
   from Tailwind so we don't depend on the framework class scope here. */
.sl-queue-live-region {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
