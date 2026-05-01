<!--
  StreamloaderSourceDiagnostic.vue

  Tiny info-icon affordance that sits next to StreamloaderSourceBadge on
  TrackDetails and answers the question users ask after they see a
  "Streaming" badge: "Why don't I have this locally? Can streamloader
  mirror it?"

  Renders nothing for already-local tracks (no diagnostic needed) but
  always renders for streamloader-cached and streaming-only tracks so
  the affordance is consistent for both "good news" and "actionable"
  states. Click opens a small Vuetify dialog with provider names + a
  friendly suggestion. No backend calls — same client-side classification
  as the sibling SourceBadge.

  Mounting: TrackDetails only (per design — too much surface to add to
  every card/row). See sl-source-badge-row in TrackDetails.vue.
-->
<template>
  <template v-if="diagnostic">
    <button
      type="button"
      class="sl-src-diag__btn"
      aria-label="Source information"
      :title="diagnostic.iconTitle"
      @click="dialogOpen = true"
    >
      <Info :size="16" aria-hidden="true" />
    </button>
    <v-dialog v-model="dialogOpen" max-width="460" scrollable>
      <v-card class="sl-src-diag__card">
        <v-card-title class="sl-src-diag__title">
          {{ diagnostic.title }}
          <div class="sl-src-diag__title-rule"></div>
        </v-card-title>
        <v-card-text class="sl-src-diag__body">
          <p class="sl-src-diag__lede">{{ diagnostic.body }}</p>
          <div
            v-if="diagnostic.providerNames.length"
            class="sl-src-diag__chips"
            aria-label="Source providers"
          >
            <span
              v-for="name in diagnostic.providerNames"
              :key="name"
              class="sl-src-diag__chip"
              >{{ name }}</span
            >
          </div>
          <p v-if="diagnostic.suggestion" class="sl-src-diag__suggestion">
            {{ diagnostic.suggestion }}
          </p>
        </v-card-text>
        <v-card-actions class="sl-src-diag__footer">
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false">Close</v-btn>
          <a
            v-if="diagnostic.showSettingsCta"
            class="sl-src-diag__cta"
            href="/#/settings/providers"
            @click="dialogOpen = false"
            >Open Streamloader Settings</a
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Info } from "lucide-vue-next";
import api from "@/plugins/api";
import type { MediaItem } from "@/plugins/api/interfaces";

type Tone = "local" | "cached" | "streaming";

interface Diagnostic {
  tone: Tone;
  title: string;
  iconTitle: string;
  body: string;
  suggestion: string;
  providerNames: string[];
  showSettingsCta: boolean;
}

const STREAMLOADER_DOMAIN = "streamloader";

const props = withDefaults(
  defineProps<{
    item?: MediaItem | null;
  }>(),
  { item: null },
);

const dialogOpen = ref(false);

const diagnostic = computed<Diagnostic | null>(() => {
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
    if (mapping.provider_domain === STREAMLOADER_DOMAIN) hasStreamloader = true;
    else if (provider?.is_streaming_provider) hasStreaming = true;
    else hasLocal = true;
  }

  // Same priority cascade as StreamloaderSourceBadge: local > cached > streaming.
  // Local tracks need no diagnostic — bytes already on disk, nothing to mirror.
  if (hasLocal) return null;

  const sourceList = providerNames.join(", ") || "the source provider";

  if (hasStreamloader) {
    return {
      tone: "cached",
      title: "Available offline",
      iconTitle: "Why this is offline-ready",
      body: `This track was downloaded by streamloader from ${sourceList}. It's available offline.`,
      suggestion: "",
      providerNames,
      showSettingsCta: false,
    };
  }

  if (hasStreaming) {
    // Heuristic: if the user already has a streamloader provider configured,
    // suggest playing the track to trigger a mirror; otherwise nudge them
    // to set one up. Same provider-map read used by StreamloaderHealthPill.
    const streamloaderConfigured = Object.values(api.providers).some(
      (p) => p.domain === STREAMLOADER_DOMAIN,
    );
    return {
      tone: "streaming",
      title: "Streaming only",
      iconTitle: "Why this is streaming only",
      body: `This track is only available from ${sourceList}.`,
      suggestion: streamloaderConfigured
        ? `Start a download by playing this track, then check Streamloader's settings to confirm it mirrored from ${sourceList}.`
        : `Configure streamloader to mirror tracks from ${sourceList} in Settings - Providers.`,
      providerNames,
      showSettingsCta: true,
    };
  }

  return null;
});
</script>

<style scoped>
/* Subtle info button — muted by default, brand-teal on hover/focus.
   Sits inline with the source badge so the click target is right next
   to the thing it explains. */
.sl-src-diag__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  margin-left: 6px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.55);
  cursor: pointer;
  transition:
    color 150ms ease,
    background 150ms ease,
    transform 180ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.sl-src-diag__btn:hover {
  color: #2dd4bf;
  background: rgba(45, 212, 191, 0.12);
  transform: translateY(-1px);
}

@media (hover: none) {
  .sl-src-diag__btn:hover {
    transform: none;
  }
}

.sl-src-diag__btn:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

.sl-src-diag__card {
  background: rgb(var(--v-theme-surface));
  border-radius: 10px;
  overflow: hidden;
}

.sl-src-diag__title {
  position: relative;
  padding: 20px 24px 14px;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Brand-teal underline accent — matches KeyboardShortcutsDialog and the
   batch 22-23 dialog patterns. */
.sl-src-diag__title-rule {
  position: absolute;
  left: 24px;
  bottom: 8px;
  width: 36px;
  height: 2px;
  background: linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%);
  border-radius: 1px;
}

.sl-src-diag__body {
  padding: 8px 24px 4px;
}

.sl-src-diag__lede {
  margin: 4px 0 12px;
  font-size: 0.92rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.88);
}

.sl-src-diag__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.sl-src-diag__chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(45, 212, 191, 0.14);
  color: #2dd4bf;
  border: 1px solid rgba(45, 212, 191, 0.38);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
}

:global(.v-theme--light) .sl-src-diag__chip {
  color: #0f766e;
  background: rgba(15, 118, 110, 0.12);
  border-color: rgba(15, 118, 110, 0.35);
}

.sl-src-diag__suggestion {
  margin: 0 0 8px;
  font-size: 0.86rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.sl-src-diag__footer {
  padding: 12px 24px 16px;
  gap: 8px;
}

/* Teal CTA — primary call to action for the streaming-only path */
.sl-src-diag__cta {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  background: linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%);
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: 0.01em;
  transition:
    filter 150ms ease,
    transform 180ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.sl-src-diag__cta:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

@media (hover: none) {
  .sl-src-diag__cta:hover {
    transform: none;
  }
}

.sl-src-diag__cta:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

/* Match the focus-ring polish from KeyboardShortcutsDialog so all
   streamloader dialogs share the same accent. */
.sl-src-diag__card :focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
