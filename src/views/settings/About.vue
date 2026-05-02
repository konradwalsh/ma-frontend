<template>
  <Container class="max-w-4xl mx-auto px-4 py-6 space-y-6">
    <!--
      Streamloader-fork brand card. Sits ABOVE the upstream MA section so
      the fork identity is the first thing the user sees, but the original
      MA About content below is preserved verbatim — we extend MA, we did
      not write it. Keep these two sections visually distinct so the
      attribution stays unambiguous.
    -->
    <Card class="streamloader-brand-card">
      <CardHeader>
        <div class="flex items-center gap-3">
          <div class="streamloader-mark-wrapper">
            <img
              :src="streamloaderMark"
              alt="streamloader"
              class="streamloader-mark"
            />
          </div>
          <div class="flex flex-col">
            <CardTitle class="streamloader-wordmark">streamloader</CardTitle>
            <CardDescription>
              {{ $t("streamloader.about.brand_tagline") }}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <p class="text-sm text-muted-foreground leading-relaxed">
          {{ $t("streamloader.about.fork_description") }}
        </p>

        <div class="space-y-2">
          <Item variant="outline" size="sm" class="justify-between">
            <ItemContent>
              <ItemTitle>
                {{ $t("streamloader.about.fork_version_label") }}
              </ItemTitle>
            </ItemContent>
            <ItemContent class="flex-none text-right">
              <span class="version-pill">
                {{ streamloaderForkVersion }}
              </span>
            </ItemContent>
          </Item>
          <Item variant="outline" size="sm" class="justify-between">
            <ItemContent>
              <ItemTitle>
                {{ $t("streamloader.about.last_update_label") }}
              </ItemTitle>
            </ItemContent>
            <ItemContent class="flex-none text-right">
              <span class="text-xs font-mono text-muted-foreground">
                {{ streamloaderLastUpdate }}
              </span>
            </ItemContent>
          </Item>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-1">
          <a
            href="https://github.com/konradwalsh/ma-frontend"
            target="_blank"
            rel="noopener noreferrer"
            class="sl-fork-link"
          >
            <v-icon icon="mdi-github" size="18" />
            <span class="flex flex-col leading-tight">
              <span class="text-sm font-medium">
                {{ $t("streamloader.about.github_title") }}
              </span>
              <span class="text-xs opacity-80">
                {{ $t("streamloader.about.github_sub") }}
              </span>
            </span>
            <v-icon icon="mdi-open-in-new" size="14" class="opacity-70" />
          </a>
          <button
            type="button"
            class="sl-whats-new-btn"
            :aria-label="$t('streamloader.about.whats_new_aria')"
            @click="onShowWhatsNew"
          >
            <v-icon icon="mdi-sparkles" size="16" />
            <span>{{ $t("streamloader.about.whats_new_button") }}</span>
          </button>
        </div>
      </CardContent>
    </Card>

    <!--
      Visual separator between the streamloader-fork section above and the
      untouched upstream MA section below. Subtle teal-tinted divider so the
      attribution boundary is obvious.
    -->
    <div class="sl-upstream-divider" role="separator" aria-hidden="true">
      <span class="sl-upstream-divider-label">
        {{ $t("streamloader.about.upstream_section_label") }}
      </span>
    </div>
    <p class="sl-upstream-note">
      {{ $t("streamloader.about.upstream_section_note") }}
    </p>

    <!-- Version Information -->
    <Card>
      <CardHeader>
        <div class="flex items-center gap-3">
          <div class="streamloader-mark-wrapper">
            <img
              :src="streamloaderMark"
              alt="streamloader"
              class="streamloader-mark"
            />
          </div>
          <div class="flex flex-col">
            <CardTitle class="streamloader-wordmark">streamloader</CardTitle>
            <CardDescription>
              {{ $t("settings.version_info") }}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-2">
        <Item variant="outline" size="sm" class="justify-between">
          <ItemContent>
            <ItemTitle>{{ $t("settings.server_version") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="version-pill">
              {{ api.serverInfo.value?.server_version }}
            </span>
          </ItemContent>
        </Item>

        <Item
          v-if="!api.serverInfo.value?.homeassistant_addon"
          variant="outline"
          size="sm"
          class="justify-between"
        >
          <ItemContent>
            <ItemTitle>{{ $t("settings.server_base_url") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-xs font-mono text-muted-foreground break-all">
              {{ api.serverInfo.value?.base_url }}
            </span>
          </ItemContent>
        </Item>

        <Item variant="outline" size="sm" class="justify-between">
          <ItemContent>
            <ItemTitle>{{ $t("settings.server_as_addon") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <Badge
              :variant="
                api.serverInfo.value?.homeassistant_addon
                  ? 'default'
                  : 'outline'
              "
            >
              {{
                api.serverInfo.value?.homeassistant_addon ? $t("yes") : $t("no")
              }}
            </Badge>
          </ItemContent>
        </Item>
      </CardContent>
    </Card>

    <!-- Open Home Foundation -->
    <Card
      as="a"
      href="https://www.openhomefoundation.org/"
      target="_blank"
      class="group cursor-pointer transition-all hover:border-primary/40 hover:shadow-lg"
    >
      <CardContent class="flex flex-col items-center text-center gap-4 py-8">
        <div
          class="text-sm font-medium text-muted-foreground uppercase tracking-wide"
        >
          {{ $t("settings.proud_part_of") }}
        </div>
        <div class="w-full max-w-xs">
          <img
            :src="openHomeFoundationLogo"
            alt="Open Home Foundation"
            class="w-full h-auto opacity-90 transition-opacity group-hover:opacity-100"
          />
        </div>
        <div class="streamloader-credit">
          streamloader is built on Music Assistant, a product from the Open Home
          Foundation
        </div>
      </CardContent>
    </Card>

    <!-- Library Statistics -->
    <Card>
      <CardHeader>
        <CardTitle>{{ $t("settings.library_stats") }}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2">
        <Item variant="outline" size="sm" class="justify-between">
          <ItemContent>
            <ItemTitle>{{ $t("settings.artists_in_library") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-sm font-medium">
              {{ (store.libraryArtistsCount || 0).toLocaleString() }}
            </span>
          </ItemContent>
        </Item>

        <Item variant="outline" size="sm" class="justify-between">
          <ItemContent>
            <ItemTitle>{{ $t("settings.albums_in_library") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-sm font-medium">
              {{ (store.libraryAlbumsCount || 0).toLocaleString() }}
            </span>
          </ItemContent>
        </Item>

        <Item variant="outline" size="sm" class="justify-between">
          <ItemContent>
            <ItemTitle>{{ $t("settings.tracks_in_library") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-sm font-medium">
              {{ (store.libraryTracksCount || 0).toLocaleString() }}
            </span>
          </ItemContent>
        </Item>

        <Item variant="outline" size="sm" class="justify-between">
          <ItemContent>
            <ItemTitle>{{ $t("settings.playlists_in_library") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-sm font-medium">
              {{ (store.libraryPlaylistsCount || 0).toLocaleString() }}
            </span>
          </ItemContent>
        </Item>

        <Item variant="outline" size="sm" class="justify-between">
          <ItemContent>
            <ItemTitle>{{ $t("settings.radio_in_library") }}</ItemTitle>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span class="text-sm font-medium">
              {{ (store.libraryRadiosCount || 0).toLocaleString() }}
            </span>
          </ItemContent>
        </Item>
      </CardContent>
    </Card>

    <!-- Links -->
    <Card>
      <CardHeader class="pb-2">
        <CardTitle>{{ $t("settings.links") }}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2 p-4">
        <a
          :href="changelogUrl"
          target="_blank"
          class="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50 no-underline"
        >
          <div class="flex items-center gap-4 flex-1">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500"
            >
              <v-icon icon="mdi-text-box-outline" size="24" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-primary underline">
                {{ $t("settings.changelog") }}
              </span>
              <span class="text-xs text-muted-foreground underline">
                github.com/music-assistant/server
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="text-primary shrink-0"
          />
        </a>

        <a
          :href="documentationUrl"
          target="_blank"
          class="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50 no-underline"
        >
          <div class="flex items-center gap-4 flex-1">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500"
            >
              <v-icon icon="mdi-bookshelf" size="24" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-primary underline">
                {{ $t("settings.documentation") }}
              </span>
              <span class="text-xs text-muted-foreground underline">
                music-assistant.io
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="text-primary shrink-0"
          />
        </a>

        <a
          v-if="apiDocsUrl"
          :href="apiDocsUrl"
          target="_blank"
          class="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50 no-underline"
        >
          <div class="flex items-center gap-4 flex-1">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500"
            >
              <v-icon icon="mdi-api" size="24" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-primary underline">
                {{ $t("settings.api_docs") }}
              </span>
              <span class="text-xs text-muted-foreground underline">
                {{ apiDocsUrl }}
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="text-primary shrink-0"
          />
        </a>

        <a
          href="https://github.com/orgs/music-assistant/discussions/categories/feature-requests-and-ideas"
          target="_blank"
          class="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50 no-underline"
        >
          <div class="flex items-center gap-4 flex-1">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500"
            >
              <v-icon icon="mdi-lightbulb-outline" size="24" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-primary underline">
                {{ $t("settings.feature_requests") }}
              </span>
              <span class="text-xs text-muted-foreground underline">
                GitHub Discussions
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="text-primary shrink-0"
          />
        </a>

        <a
          href="https://github.com/music-assistant/support"
          target="_blank"
          class="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50 no-underline"
        >
          <div class="flex items-center gap-4 flex-1">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500"
            >
              <v-icon icon="mdi-bug" size="24" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-primary underline">
                {{ $t("settings.bug_reports") }}
              </span>
              <span class="text-xs text-muted-foreground underline">
                GitHub Support repository
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="text-primary shrink-0"
          />
        </a>

        <a
          href="https://github.com/orgs/music-assistant/discussions"
          target="_blank"
          class="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50 no-underline"
        >
          <div class="flex items-center gap-4 flex-1">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500"
            >
              <v-icon icon="mdi-forum" size="24" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-primary underline">
                {{ $t("settings.discussion_forums") }}
              </span>
              <span class="text-xs text-muted-foreground underline">
                GitHub Discussions
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="text-primary shrink-0"
          />
        </a>

        <a
          href="https://github.com/music-assistant/server/blob/dev/LICENSE"
          target="_blank"
          class="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50 no-underline"
        >
          <div class="flex items-center gap-4 flex-1">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"
            >
              <v-icon icon="mdi-license" size="24" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-primary underline">
                {{ $t("settings.license") }}
              </span>
              <span class="text-xs text-muted-foreground underline">
                Apache 2.0 License
              </span>
            </div>
          </div>
          <v-icon
            icon="mdi-open-in-new"
            size="20"
            class="text-primary shrink-0"
          />
        </a>
      </CardContent>
    </Card>
  </Container>
</template>

<script setup lang="ts">
import openHomeFoundationLogo from "@/assets/open-home-foundation-logo.svg";
import streamloaderMark from "@/assets/streamloader-mark.svg";
import Container from "@/components/Container.vue";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { WHATS_NEW_VERSION } from "@/composables/useWhatsNewVersion";
import { api } from "@/plugins/api";
import { eventbus } from "@/plugins/eventbus";
import { store } from "@/plugins/store";
import { computed, onMounted } from "vue";

// Streamloader-fork brand-card metadata. The version mirrors
// useWhatsNewVersion's WHATS_NEW_VERSION (bumped per CLAUDE.md). The
// last-update string is derived from the same value's `YYYY.M` prefix —
// no extra dependency, no network fetch.
const streamloaderForkVersion = WHATS_NEW_VERSION;
const streamloaderLastUpdate = computed(() => {
  const match = WHATS_NEW_VERSION.match(/^(\d{4})\.(\d{1,2})/);
  if (!match) return WHATS_NEW_VERSION;
  const [, year, month] = match;
  const monthIndex = Math.max(0, Math.min(11, parseInt(month, 10) - 1));
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${monthNames[monthIndex]} ${year}`;
});

// Force-open the StreamloaderWhatsNewDialog (mounted in Default.vue)
// regardless of whether the user has already acknowledged the current
// WHATS_NEW_VERSION. Mirrors the equivalent button in StreamloaderSettings.vue.
const onShowWhatsNew = () => {
  eventbus.emit("sl-whats-new:show");
};

const changelogUrl = computed(() => {
  return "https://github.com/music-assistant/server/releases";
});

const documentationUrl = computed(() => {
  const version = api.serverInfo.value?.server_version || "";
  // Check if version contains 'beta' or starts with '0.' for nightly
  if (version.includes("beta") || version.startsWith("0.")) {
    return "https://beta.music-assistant.io";
  }
  return "https://music-assistant.io";
});

const apiDocsUrl = computed(() => {
  const baseUrl = api.serverInfo.value?.base_url || "";
  return `${baseUrl}/api-docs`;
});

onMounted(async () => {
  // Refresh/read the library counts
  store.libraryArtistsCount = await api.getLibraryArtistsCount();
  store.libraryAlbumsCount = await api.getLibraryAlbumsCount();
  store.libraryTracksCount = await api.getLibraryTracksCount();
  store.libraryPlaylistsCount = await api.getLibraryPlaylistsCount();
  store.libraryRadiosCount = await api.getLibraryRadiosCount();
  store.libraryGenresCount = await api.getLibraryGenresCount();
});
</script>

<style scoped>
.font-monospace {
  font-family: monospace;
  font-size: 0.9em;
}

.streamloader-mark-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(45, 212, 191, 0.12);
  border: 1px solid rgba(45, 212, 191, 0.25);
  flex-shrink: 0;
}

.streamloader-mark {
  width: 28px;
  height: 28px;
  display: block;
}

.streamloader-wordmark {
  font-weight: 600;
  letter-spacing: -0.01em;
  text-transform: lowercase;
}

.version-pill {
  display: inline-block;
  font-family: "JetBrains Mono", "Courier New", monospace;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(45, 212, 191, 0.12);
  color: rgb(15, 118, 110);
  border: 1px solid rgba(45, 212, 191, 0.3);
}

:global(.dark) .version-pill {
  color: rgb(45, 212, 191);
  background: rgba(45, 212, 191, 0.15);
  border-color: rgba(45, 212, 191, 0.35);
}

.streamloader-credit {
  margin-top: 12px;
  font-size: 0.75rem;
  color: rgba(120, 120, 130, 0.85);
  text-align: center;
  font-style: italic;
}

/* --- Streamloader-fork brand card (sits above upstream MA section) --- */
.streamloader-brand-card {
  border-color: rgba(45, 212, 191, 0.35);
  background: linear-gradient(
    135deg,
    rgba(45, 212, 191, 0.06) 0%,
    rgba(45, 212, 191, 0.02) 100%
  );
}

:global(.dark) .streamloader-brand-card {
  border-color: rgba(45, 212, 191, 0.4);
  background: linear-gradient(
    135deg,
    rgba(45, 212, 191, 0.08) 0%,
    rgba(45, 212, 191, 0.03) 100%
  );
}

/* GitHub fork link — teal-accented chip */
.sl-fork-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(45, 212, 191, 0.35);
  background: rgba(45, 212, 191, 0.08);
  color: rgb(15, 118, 110);
  text-decoration: none;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
}

.sl-fork-link:hover {
  background: rgba(45, 212, 191, 0.16);
  border-color: rgba(45, 212, 191, 0.55);
}

.sl-fork-link:active {
  transform: translateY(1px);
}

:global(.dark) .sl-fork-link {
  color: rgb(94, 234, 212);
  background: rgba(45, 212, 191, 0.12);
}

:global(.dark) .sl-fork-link:hover {
  background: rgba(45, 212, 191, 0.2);
}

/* What's-new button — solid teal accent so it reads as the primary action */
.sl-whats-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(45, 212, 191, 0.5);
  background: rgba(45, 212, 191, 0.18);
  color: rgb(15, 118, 110);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
}

.sl-whats-new-btn:hover {
  background: rgba(45, 212, 191, 0.28);
  border-color: rgba(45, 212, 191, 0.7);
}

.sl-whats-new-btn:focus-visible {
  outline: 2px solid rgba(45, 212, 191, 0.7);
  outline-offset: 2px;
}

.sl-whats-new-btn:active {
  transform: translateY(1px);
}

:global(.dark) .sl-whats-new-btn {
  color: rgb(94, 234, 212);
  background: rgba(45, 212, 191, 0.2);
}

:global(.dark) .sl-whats-new-btn:hover {
  background: rgba(45, 212, 191, 0.32);
}

/* Subtle teal divider that introduces the upstream MA section. The
   inline label keeps the attribution boundary explicit even at a glance. */
.sl-upstream-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.sl-upstream-divider::before,
.sl-upstream-divider::after {
  content: "";
  flex: 1 1 auto;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(45, 212, 191, 0.4),
    transparent
  );
}

.sl-upstream-divider-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(15, 118, 110, 0.85);
  white-space: nowrap;
}

:global(.dark) .sl-upstream-divider-label {
  color: rgba(94, 234, 212, 0.9);
}

.sl-upstream-note {
  margin-top: -8px;
  font-size: 0.75rem;
  color: var(--muted-foreground, rgba(120, 120, 130, 0.85));
  text-align: center;
  font-style: italic;
}
</style>
