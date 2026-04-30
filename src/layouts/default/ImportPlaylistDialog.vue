<!--
  Dialog for importing a playlist from an M3U/M3U8 file.
  Shows provider selection for library matching, then calls the import API.
  Triggered via eventbus from the playlists listing view.
-->
<template>
  <Dialog :key="dialogKey" v-model:open="showDialog">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle class="import-playlist-title mb-2">
          {{ $t("import_playlist_title") }}
        </DialogTitle>
        <DialogDescription>
          {{ playlistName }}
        </DialogDescription>

        <div v-if="musicProviders.length" class="flex flex-col gap-3 mt-4">
          <Label>{{ $t("import_playlist_search_providers") }}</Label>
          <div class="flex flex-col gap-2">
            <div
              v-for="provider in musicProviders"
              :key="provider.instance_id"
              class="flex items-center gap-2 import-provider-row"
              :class="{
                'import-provider-row--streamloader':
                  provider.domain === 'streamloader',
              }"
            >
              <Checkbox
                :id="`provider-${provider.instance_id}`"
                :checked="selectedProviders.includes(provider.instance_id)"
                @update:checked="toggleProvider(provider.instance_id)"
              />
              <Label :for="`provider-${provider.instance_id}`">
                {{ provider.name }}
              </Label>
            </div>
          </div>
        </div>

        <div
          v-if="importing"
          class="import-preview-skeleton mt-4"
          aria-hidden="true"
        >
          <div class="import-preview-skeleton__bar" />
          <div class="import-preview-skeleton__bar import-preview-skeleton__bar--short" />
          <div class="import-preview-skeleton__bar" />
        </div>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="ghost"
          class="import-playlist-cancel"
          :disabled="importing"
          @click="showDialog = false"
        >
          {{ $t("close") }}
        </Button>
        <Button
          variant="default"
          class="import-playlist-submit"
          :disabled="importing"
          @click="doImport"
        >
          {{ $t("import_playlist") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { toast } from "vue-sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import api from "@/plugins/api";
import { ProviderFeature, ProviderType } from "@/plugins/api/interfaces";
import { type ImportPlaylistEvent, eventbus } from "@/plugins/eventbus";
import { $t } from "@/plugins/i18n";
import router from "@/plugins/router";
import { store } from "@/plugins/store";

const showDialog = ref(false);
const dialogKey = ref(0);
const m3uData = ref("");
const playlistName = ref("");
const selectedProviders = ref<string[]>([]);
const importing = ref(false);

const musicProviders = computed(() => {
  return Object.values(api.providers)
    .filter(
      (x) =>
        x.available &&
        x.type === ProviderType.MUSIC &&
        x.supported_features.includes(ProviderFeature.SEARCH),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
});

watch(showDialog, (open) => {
  store.dialogActive = open;
});

onMounted(() => {
  eventbus.on("importPlaylistDialog", (evt: ImportPlaylistEvent) => {
    m3uData.value = evt.m3uData;
    playlistName.value = evt.playlistName;
    selectedProviders.value = musicProviders.value.map((p) => p.instance_id);
    importing.value = false;
    dialogKey.value++;
    showDialog.value = true;
  });
});

onBeforeUnmount(() => {
  eventbus.off("importPlaylistDialog");
});

const toggleProvider = (instanceId: string) => {
  const idx = selectedProviders.value.indexOf(instanceId);
  if (idx >= 0) {
    selectedProviders.value.splice(idx, 1);
  } else {
    selectedProviders.value.push(instanceId);
  }
};

const doImport = async () => {
  importing.value = true;
  try {
    const playlist = await api.importPlaylist(
      m3uData.value,
      true,
      selectedProviders.value.length < musicProviders.value.length
        ? selectedProviders.value
        : undefined,
    );
    showDialog.value = false;
    toast.success($t("playlist_created"), {
      action: {
        label: $t("open_playlist"),
        onClick: () => {
          store.showFullscreenPlayer = false;
          router.push({
            name: "playlist",
            params: {
              itemId: playlist.item_id,
              provider: playlist.provider,
            },
          });
        },
      },
    });
  } catch (e) {
    toast.error(getErrorMessage(e));
  } finally {
    importing.value = false;
  }
};

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return $t("error");
};
</script>

<style scoped>
.import-playlist-title {
  font-weight: 600;
  letter-spacing: -0.01em;
}

.import-playlist-cancel {
  color: var(--muted-foreground, hsl(var(--muted-foreground)));
}

.import-playlist-submit:not(:disabled) {
  box-shadow: 0 1px 0 rgba(45, 212, 191, 0.18);
}

.import-provider-row {
  padding: 0.25rem 0.375rem;
  border-radius: 0.375rem;
  transition: background-color 150ms ease;
}

.import-provider-row--streamloader {
  background: linear-gradient(
    90deg,
    rgba(45, 212, 191, 0.08) 0%,
    rgba(45, 212, 191, 0) 100%
  );
  box-shadow: inset 2px 0 0 0 #2dd4bf;
}

.import-preview-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.import-preview-skeleton__bar {
  height: 0.625rem;
  width: 100%;
  border-radius: 0.25rem;
  background: linear-gradient(
    90deg,
    rgba(45, 212, 191, 0.12) 0%,
    rgba(45, 212, 191, 0.28) 50%,
    rgba(45, 212, 191, 0.12) 100%
  );
  background-size: 200% 100%;
  animation: import-preview-shimmer 1.4s ease-in-out infinite;
}

.import-preview-skeleton__bar--short {
  width: 65%;
}

@keyframes import-preview-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
