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
         provides its own. UX bug fix: this floating pill was overlapping
         page-level controls (hamburger / per-view header buttons), so it
         is now OFF by default. The new sidebar dot
         (StreamloaderHealthDot, mounted from NavMain.vue next to the
         "streamloader" item) provides the same status signal without
         occluding chrome. Users who want the old badge back can flip
         the toggle in Streamloader Settings → Player Display. -->
    <StreamloaderHealthPill v-if="!store.frameless && showFloatingHealthPill" />
    <!-- Streamloader-fork feature: live "what's happening right now"
         widget. Stacks beneath the health pill; renders nothing when
         there are no in-flight streamloader tasks (zero visual cost
         when idle). Same frameless-mode guard as the health pill. -->
    <StreamloaderActivityPulse v-if="!store.frameless" />
    <!-- Streamloader-fork addition: keyboard-shortcut help dialog.
         Triggered by "?" (Shift+/) — see useKeyboardShortcuts.ts.
         Mounted at v-app root so it's reachable from every route. -->
    <KeyboardShortcutsDialog v-model="store.showKeyboardShortcuts" />
    <!-- Streamloader-fork (batch 33): tasteful in-app install prompt
         that triggers only after the user has played at least one
         track. Replaces the browser-native infobar with a brand-styled
         toast. Renders nothing on browsers that don't support
         `beforeinstallprompt` (Safari/Firefox), and silently no-ops
         once the user has accepted or dismissed (localStorage flag).
         Same frameless guard as the health pill — when running inside
         a host shell (HA ingress), the host owns the install path. -->
    <StreamloaderInstallPrompt v-if="!store.frameless" />
    <!-- Streamloader-fork: bottom-right "Press ? for shortcuts" pill.
         Subtle discoverability hint for the existing keyboard shortcut
         dialog — most users never find the help binding without a
         passive prompt. Self-gates on touch-primary devices and a
         localStorage dismiss flag, so it appears at most once per
         browser. Hidden in frameless mode (host shells own chrome). -->
    <StreamloaderShortcutsHint v-if="!store.frameless" />
    <!-- Streamloader-fork (batch 34): first-run welcome tour. Self-gates
         on frameless mode + connection state + a localStorage flag, so
         it shows exactly once per browser unless re-triggered from the
         Streamloader Settings → About card. -->
    <StreamloaderWelcomeTour v-if="!store.frameless" />
    <!-- a11y: screen-reader-only live region announcing queue mutations
         (items added/cleared/length changes) on the active player. Pairs
         with PlayerTrackDetails' current-track aria-live (batch 27).
         Polite + atomic + debounced (700ms) so bulk adds don't fire 50
         announcements; debounce also rolls together rapid back-to-back
         changes into one summary message. -->
    <div
      v-if="!store.frameless && announceQueueChanges"
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
import StreamloaderInstallPrompt from "@/components/StreamloaderInstallPrompt.vue";
import StreamloaderShortcutsHint from "@/components/StreamloaderShortcutsHint.vue";
import StreamloaderWelcomeTour from "@/components/StreamloaderWelcomeTour.vue";
import { store } from "@/plugins/store";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import api from "@/plugins/api";
import { useRoute, useRouter } from "vue-router";
import { useKeyboardShortcuts } from "@/composables/useKeyboardShortcuts";
import { eventbus, type QueueItemsAddedEvent } from "@/plugins/eventbus";
import { useStreamloaderPref } from "@/composables/streamloaderPrefs";

// Streamloader settings page → "Announce queue actions to screen reader".
// When off we skip the live-region render AND short-circuit the speak()
// path so we don't churn aria-live state for users who opted out.
const announceQueueChanges = useStreamloaderPref("announceQueueChanges");

// Streamloader settings page → "Show floating health pill". Defaults to
// OFF; the sidebar StreamloaderHealthDot (rendered from NavMain.vue) is
// the new primary status indicator. This pref keeps the legacy floating
// pill available as an opt-in for users who preferred it.
const showFloatingHealthPill = useStreamloaderPref("showFloatingHealthPill");

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
// a11y: per-action announcements (emitted by api.playMedia /
// addPlaylistTracks) are *intent-rich* and should preempt the post-hoc
// length-delta watcher to avoid double-announcing the same mutation.
// We stamp the time of the most-recent per-action announcement; the
// signature watcher then suppresses any length change that arrives
// within SUPPRESS_LENGTH_AFTER_PER_ACTION_MS of it. Shuffle changes
// still announce normally (they are independent of length).
const PER_ACTION_SUPPRESS_MS = 2000;
let lastPerActionAt = 0;
// Coalesce bursts of per-action emissions (e.g. multiple AddToPlaylist
// clicks in quick succession) into a single SR announcement.
let perActionDebounce: ReturnType<typeof setTimeout> | undefined;
let pendingPerAction: QueueItemsAddedEvent[] = [];

const speak = (msg: string) => {
  // Honor the global "Announce queue actions" toggle (Streamloader
  // settings → Activity & Notifications). Bail before mutating state so
  // we don't accidentally leave a stale message hanging in the ref.
  if (!announceQueueChanges.value) return;
  // Toggle to empty first so SR re-announces even if string is identical
  // to the previous announcement (some SRs suppress duplicates).
  queueAnnouncement.value = "";
  Promise.resolve().then(() => {
    queueAnnouncement.value = msg;
  });
};

const flushPerAction = () => {
  if (pendingPerAction.length === 0) return;
  // Group by optionType so "added 2 + added 3" → "Added 5 songs to queue"
  // rather than two separate sentences. Unknown counts contribute "items".
  const totals: Record<string, { count: number; unknown: boolean }> = {};
  for (const ev of pendingPerAction) {
    const bucket = totals[ev.optionType] || { count: 0, unknown: false };
    if (ev.count === undefined) bucket.unknown = true;
    else bucket.count += ev.count;
    totals[ev.optionType] = bucket;
  }
  pendingPerAction = [];
  const phrases: string[] = [];
  for (const [type, { count, unknown }] of Object.entries(totals)) {
    const noun = count === 1 && !unknown ? "song" : "songs";
    const qty = unknown ? "items" : `${count} ${noun}`;
    if (type === "add") phrases.push(`Added ${qty} to queue`);
    else if (type === "next") phrases.push(`Playing ${qty} next`);
    else if (type === "playlist") phrases.push(`Added ${qty} to playlist`);
    else if (type === "replace_next") phrases.push(`Up next: ${qty}`);
    else if (type === "play" || type === "replace")
      phrases.push(`Playing ${qty}`);
  }
  if (phrases.length === 0) return;
  lastPerActionAt = Date.now();
  speak(phrases.join(". "));
  // Re-baseline the length tracker so the signature watcher's pending
  // tick (if any) sees no delta and stays silent.
  const sig = queueSignature.value;
  if (sig) lastAnnouncedLength = sig.itemsLength;
};

const onQueueItemsAdded = (ev: QueueItemsAddedEvent) => {
  pendingPerAction.push(ev);
  if (perActionDebounce) clearTimeout(perActionDebounce);
  // Shorter debounce than the signature watcher (300ms vs 700ms) so the
  // intent-rich announcement wins when both fire for the same mutation.
  perActionDebounce = setTimeout(flushPerAction, 300);
};

onMounted(() => eventbus.on("queue:items-added", onQueueItemsAdded));
onBeforeUnmount(() => eventbus.off("queue:items-added", onQueueItemsAdded));

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
      const lengthChanged = next.itemsLength !== lastAnnouncedLength;
      const recentPerAction =
        Date.now() - lastPerActionAt < PER_ACTION_SUPPRESS_MS;
      if (lengthChanged && !recentPerAction) {
        if (next.itemsLength === 0) {
          parts.push("Queue cleared");
        } else {
          parts.push(`Queue updated: ${next.itemsLength} items`);
        }
      }
      lastAnnouncedLength = next.itemsLength;
      lastAnnouncedShuffle = next.shuffle;
      if (parts.length > 0) {
        speak(parts.join(". "));
      }
    }, 700);
  },
  { deep: true, immediate: true },
);

const route = useRoute();
const router = useRouter();

// a11y (batch 36): route-change focus reset. When the user navigates
// between pages (Library tabs, sidebar links, etc.) the previously-focused
// element (typically a sidebar item) often becomes detached or visually
// recedes, leaving SR users without context about where they landed. We
// move focus to the new page's main landmark on every route transition
// *after* the initial load. The first navigation is silently primed so
// boot doesn't snap focus away from whatever the user was doing.
let initialRouteSettled = false;
router.afterEach((to, from) => {
  if (!initialRouteSettled) {
    initialRouteSettled = true;
    return;
  }
  // Same-path query-only changes (e.g. ?player=… or ?showFullscreenPlayer=)
  // shouldn't yank focus — they're not real page changes.
  if (to.path === from.path) return;
  // Defer to next microtask + animation frame so the new view's mount has
  // happened and the target element is in the DOM.
  Promise.resolve().then(() => {
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        "[data-page-heading], main h1, #cont",
      );
      if (target) {
        target.focus({ preventScroll: false });
      }
    });
  });
});

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
