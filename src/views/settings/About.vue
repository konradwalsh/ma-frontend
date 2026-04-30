<template>
  <Container class="max-w-4xl mx-auto px-4 py-6 space-y-6">
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
import { api } from "@/plugins/api";
import { store } from "@/plugins/store";
import { computed, onMounted } from "vue";

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
</style>
