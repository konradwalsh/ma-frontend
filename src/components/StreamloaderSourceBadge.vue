<!--
  StreamloaderSourceBadge.vue

  Small inline pill that classifies WHERE a track is being served from:
    - "Local"        — at least one mapping is to a non-streaming (library
                        / file-system) provider, i.e. the bytes live on
                        this server
    - "Streamloader" — at least one mapping belongs to a provider with
                        domain "streamloader" (cached via the fork)
    - "Streaming"    — only remote streaming-provider mappings exist
                        (Spotify, Tidal, Qobuz, etc.)

  Why: Music Assistant abstracts source providers out of the UI; users
  often can't tell at a glance whether the track they're about to play is
  going to hit the local cache or stream from a federated remote. This
  pill gives the streamloader fork a one-glance answer that the upstream
  UI does not surface.

  Data: 100% client-side. Reads `track.provider_mappings[*]` plus the
  reactive `api.providers` map (already populated via the websocket bus).
  Zero extra HTTP — same pattern as StreamloaderHealthPill.

  Mounting: scoped to TrackDetails.vue for now (highest information
  value). Designed as a generic prop-driven component so it can later be
  reused on AlbumDetails or inside ListviewItem rows without changes.
-->
<template>
  <div
    v-if="classification"
    class="sl-source-badge"
    :class="[
      `sl-source-badge--${classification.tone}`,
      { 'sl-source-badge--compact': compact },
    ]"
    :title="`${classification.label} — ${classification.tooltip}`"
    role="status"
    :aria-label="`Source: ${classification.label}`"
  >
    <span class="sl-source-badge__dot" aria-hidden="true"></span>
    <span v-if="!compact" class="sl-source-badge__label">{{
      classification.label
    }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import api from "@/plugins/api";
import type { MediaItem } from "@/plugins/api/interfaces";

type Tone = "local" | "cached" | "streaming";

interface Classification {
  tone: Tone;
  label: string;
  tooltip: string;
}

const STREAMLOADER_DOMAIN = "streamloader";

const props = withDefaults(
  defineProps<{
    item?: MediaItem | null;
    /**
     * Compact mode renders a colored dot only (with the full label exposed
     * via the title tooltip and aria-label). Use this on dense surfaces
     * like grid cards / list rows where a full pill would be too noisy.
     */
    compact?: boolean;
  }>(),
  {
    item: null,
    compact: false,
  },
);

const classification = computed<Classification | null>(() => {
  const mappings = props.item?.provider_mappings;
  if (!mappings || mappings.length === 0) return null;

  const providerNames: string[] = [];
  let hasStreamloader = false;
  let hasLocal = false;
  let hasStreaming = false;

  for (const mapping of mappings) {
    const provider = api.providers[mapping.provider_instance];
    const name = provider?.name ?? mapping.provider_domain;
    if (name && !providerNames.includes(name)) providerNames.push(name);

    if (mapping.provider_domain === STREAMLOADER_DOMAIN) {
      hasStreamloader = true;
    } else if (provider?.is_streaming_provider) {
      hasStreaming = true;
    } else {
      // No is_streaming_provider flag and not streamloader -> file/library.
      hasLocal = true;
    }
  }

  // Priority: local cache > streamloader cache > pure streaming.
  // A track served from disk is the most "owned" state; streamloader is
  // a cached intermediate; pure streaming is fully remote.
  const sourceList = providerNames.join(", ");
  if (hasLocal) {
    return {
      tone: "local",
      label: "Local",
      tooltip: `Served from local library (${sourceList})`,
    };
  }
  if (hasStreamloader) {
    return {
      tone: "cached",
      label: "Streamloader",
      tooltip: `Cached via streamloader (${sourceList})`,
    };
  }
  if (hasStreaming) {
    return {
      tone: "streaming",
      label: "Streaming",
      tooltip: `Streamed live from ${sourceList}`,
    };
  }
  return null;
});
</script>

<style scoped>
/* Brand-teal cache tone matches the rest of the streamloader components.
   Local uses MA's library green; streaming uses a neutral slate so it
   doesn't compete with the cached/local positive states for attention. */
.sl-source-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  user-select: none;
  /* spring-y tactile transition matches other streamloader brand cues */
  transition:
    transform 180ms cubic-bezier(0.34, 1.36, 0.64, 1),
    filter 150ms ease;
}

.sl-source-badge:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

/* Touch devices: drop the hover lift — it lingers after tap and feels stuck. */
@media (hover: none) {
  .sl-source-badge:hover {
    transform: none;
    filter: none;
  }
}

.sl-source-badge:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

.sl-source-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex: 0 0 auto;
}

/* Compact mode: just the colored dot, no text. Used on dense card/row
   surfaces where the full pill would compete for attention. The label
   is still exposed via the title tooltip + aria-label for a11y. */
.sl-source-badge--compact {
  height: 14px;
  width: 14px;
  padding: 0;
  gap: 0;
  border-width: 1px;
  justify-content: center;
}

.sl-source-badge--compact .sl-source-badge__dot {
  width: 8px;
  height: 8px;
}

/* Local = library green (matches MA's existing "library" affordances) */
.sl-source-badge--local {
  background: rgba(22, 163, 74, 0.15);
  color: #4ade80;
  border-color: rgba(22, 163, 74, 0.4);
}

/* Cached = streamloader teal — the brand "this is ours" state */
.sl-source-badge--cached {
  background: rgba(45, 212, 191, 0.15);
  color: #2dd4bf;
  border-color: rgba(45, 212, 191, 0.4);
}

/* Streaming = neutral slate, a quiet info chip */
.sl-source-badge--streaming {
  background: rgba(100, 116, 139, 0.18);
  color: #94a3b8;
  border-color: rgba(100, 116, 139, 0.4);
}

/* Light theme: lift contrast — the dim tints disappear on white. */
:global(.v-theme--light) .sl-source-badge--local {
  color: #15803d;
  background: rgba(22, 163, 74, 0.12);
}
/* a11y (batch 36): light-mode cached label darkened from #0f766e to
   #0d6660 to meet WCAG AA 4.5:1 against the tinted-white badge
   background (#0f766e measured ~4.24:1, fractionally under). The
   border stays at the original tone — it's non-text and only needs
   3:1 (WCAG 1.4.11). */
:global(.v-theme--light) .sl-source-badge--cached {
  color: #0d6660;
  background: rgba(15, 118, 110, 0.12);
  border-color: rgba(15, 118, 110, 0.35);
}
:global(.v-theme--light) .sl-source-badge--streaming {
  color: #475569;
  background: rgba(100, 116, 139, 0.14);
}
</style>
