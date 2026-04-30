<template>
  <section style="margin-bottom: 10px">
    <Toolbar
      :title="$t('mapped_providers')"
      :menu-items="toolbarMenuItems"
      @title-clicked="toggleExpand"
      class="provider-details-toolbar"
    />
    <v-divider />
    <Container v-if="expanded">
      <v-list>
        <ListItem
          v-for="providerMapping in itemDetails?.provider_mappings"
          :key="providerMapping.provider_instance"
          :disabled="
            !providerMapping.available ||
            !api.getProvider(providerMapping.provider_instance)
          "
          :class="{
            'provider-mapping-streamloader':
              providerMapping.provider_domain === 'streamloader',
          }"
          show-menu-btn
          @menu.stop="(evt) => onMenu(evt, providerMapping)"
        >
          <template #prepend>
            <ProviderIcon
              :domain="providerMapping.provider_domain"
              :size="30"
            />
          </template>
          <template #title>
            {{ getProviderName(providerMapping) }}
            <v-chip
              v-if="providerMapping.in_library"
              size="x-small"
              density="compact"
              class="ml-2 quality-pill"
              :title="$t('tooltip.in_provider_library')"
            >
              {{ $t("library") }}
            </v-chip>
            <v-chip
              v-if="
                providerMapping.audio_format &&
                providerMapping.audio_format.bit_depth > 16
              "
              size="x-small"
              density="compact"
              class="ml-2 quality-pill quality-pill-hires"
              :title="te('tooltip.hires_audio') ? $t('tooltip.hires_audio') : 'Hi-Res'"
            >
              Hi-Res
            </v-chip>
            <v-chip
              v-else-if="
                providerMapping.audio_format &&
                ['flac', 'alac', 'wav', 'aiff'].includes(
                  String(
                    providerMapping.audio_format.content_type,
                  ).toLowerCase(),
                )
              "
              size="x-small"
              density="compact"
              class="ml-2 quality-pill quality-pill-lossless"
              :title="te('tooltip.lossless_audio') ? $t('tooltip.lossless_audio') : 'Lossless'"
            >
              Lossless
            </v-chip>
          </template>
          <template #subtitle>
            <span
              v-if="
                itemDetails.media_type == MediaType.TRACK &&
                providerMapping.audio_format
              "
              >{{ providerMapping.audio_format.content_type }} |
              {{ providerMapping.audio_format.sample_rate / 1000 }}kHz/{{
                providerMapping.audio_format.bit_depth
              }}
              bits |
            </span>
            <a
              v-if="
                providerMapping.url &&
                !providerMapping.provider_domain.startsWith('file')
              "
              style="opacity: 0.4"
              :title="$t('tooltip.open_provider_link')"
              @click.prevent="openLinkInNewTab(providerMapping.url)"
              >{{ getProviderUri(providerMapping) }}</a
            >
            <span v-else style="opacity: 0.4" :title="$t('copy_uri')">{{
              getProviderUri(providerMapping)
            }}</span>
          </template>
          <template #append>
            <!-- hi res icon -->
            <v-img
              v-if="
                providerMapping.audio_format &&
                providerMapping.audio_format.bit_depth > 16
              "
              :src="iconHiRes"
              width="30"
              :class="
                $vuetify.theme.current.dark ? 'hiresicondark' : 'hiresicon'
              "
            />
            <!-- play sample button -->
            <div class="d-flex align-center ga-2">
              <v-btn
                v-if="
                  getBreakpointValue('bp1') &&
                  itemDetails.media_type == MediaType.TRACK
                "
                variant="plain"
                :icon="
                  demoPlayer[
                    `${providerMapping.provider_instance}.${providerMapping.item_id}`
                  ]
                    ? 'mdi-pause'
                    : 'mdi-play-circle'
                "
                :title="$t('tooltip.play_sample')"
                @click="playBtnClick(providerMapping)"
              />
            </div>
          </template>
        </ListItem>
        <!-- virtual mapping for library -->
        <ListItem
          v-if="itemDetails.provider == 'library'"
          show-menu-btn
          @menu.stop="
            (evt) =>
              onMenu(evt, {
                provider_instance: 'library',
                provider_domain: 'library',
                item_id: itemDetails.item_id,
                available: true,
              })
          "
        >
          <template #prepend>
            <ProviderIcon domain="library" :size="30" />
          </template>
          <template #title>{{ $t("music_assistant_library") }}</template>
          <template #subtitle>
            <span
              >library://{{ itemDetails.media_type }}/{{
                itemDetails.item_id
              }}</span
            >
          </template>
        </ListItem>
      </v-list>
    </Container>
  </section>
  <GenreExclusionManager
    v-if="
      itemDetails.provider === 'library' &&
      itemDetails.media_type !== MediaType.GENRE
    "
    :media-type="itemDetails.media_type"
    :media-id="itemDetails.item_id"
  />
</template>

<script setup lang="ts">
import Container from "@/components/Container.vue";
import GenreExclusionManager from "@/components/genre/GenreExclusionManager.vue";
import ListItem from "@/components/ListItem.vue";
import ProviderIcon from "@/components/ProviderIcon.vue";
import { iconHiRes } from "@/components/QualityDetailsBtn.vue";
import Toolbar from "@/components/Toolbar.vue";
import { copyToClipboard } from "@/helpers/utils";
import { api } from "@/plugins/api";
import {
  MediaType,
  ProviderMapping,
  type MediaItemType,
} from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { eventbus } from "@/plugins/eventbus";
import { computed, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

export interface Props {
  itemDetails: MediaItemType;
}
const props = defineProps<Props>();

const { t, te } = useI18n();
const expanded = ref(false);
const mappingSearchInProgress = ref(false);

const openLinkInNewTab = function (url: string) {
  window.open(url, "_blank");
};

const demoPlayer = reactive<{ [item_id: string]: HTMLAudioElement }>({});

const playBtnClick = function (providerMapping: ProviderMapping) {
  const key = `${providerMapping.provider_instance}.${providerMapping.item_id}`;
  const existing = demoPlayer[key];
  if (existing) {
    existing.load();
    delete demoPlayer[key];
  } else {
    const audio = new Audio(
      getPreviewUrl(providerMapping.provider_instance, providerMapping.item_id),
    );
    demoPlayer[key] = audio;
    audio.play();
  }
};
const getPreviewUrl = function (provider: string, item_id: string) {
  return `${
    api.baseUrl
  }/preview?item_id=${encodeURIComponent(item_id)}&provider=${provider}`;
};

const getProviderUri = function (mapping: ProviderMapping) {
  return `${mapping.provider_instance}://${props.itemDetails.media_type}/${mapping.item_id}`;
};

const copyUriToClipboard = async function (uri: string) {
  const success = await copyToClipboard(uri);
  if (success) {
    toast.success(t("uri_copied"));
  } else {
    toast.error(t("uri_copy_failed"));
  }
};

const getProviderName = function (providerMapping: ProviderMapping) {
  const providerInstance = api.getProvider(providerMapping.provider_instance);
  if (providerInstance) {
    return providerInstance.name;
  }
  const providerManifest = api.getProviderManifest(
    providerMapping.provider_domain,
  );
  if (providerManifest) {
    return `${providerManifest.name} (${providerMapping.provider_instance})`;
  }
  return providerMapping.provider_instance;
};

const toggleExpand = function () {
  expanded.value = !expanded.value;
};

const onMenu = function (evt: Event, providerMapping: ProviderMapping) {
  const mouseEvt = evt as MouseEvent;
  const menuItems = [
    {
      label: t("tooltip.copy_uri"),
      icon: "mdi-link",
      action: () => {
        if (providerMapping) {
          copyUriToClipboard(getProviderUri(providerMapping));
        }
      },
    },
  ];
  // visit website button
  if (
    providerMapping.url &&
    !providerMapping.provider_domain.startsWith("file")
  ) {
    menuItems.push({
      label: t("tooltip.open_provider_link"),
      icon: "mdi-open-in-new",
      action: () => {
        openLinkInNewTab(providerMapping.url!);
      },
    });
  }
  // remove mapping option (only for streaming provider mapping)
  if (
    authManager.isAdmin() &&
    api.providers[providerMapping.provider_instance]?.is_streaming_provider
  ) {
    menuItems.push({
      label: t("remove_provider_mapping"),
      icon: "mdi-delete",
      action: async () => {
        if (!confirm(t("remove_provider_mapping_confirm"))) return;
        await api.sendCommand("music/remove_provider_mapping", {
          media_type: props.itemDetails.media_type,
          db_id: props.itemDetails.item_id,
          mapping: providerMapping,
        });
      },
    });
  }

  // open the contextmenu by emitting the event
  eventbus.emit("contextmenu", {
    items: menuItems,
    posX: mouseEvt.clientX,
    posY: mouseEvt.clientY,
  });
};

const searchAllProviders = function () {
  if (!confirm(t("search_all_providers_confirm"))) return;
  mappingSearchInProgress.value = true;
  api
    .sendCommand("music/match_providers", {
      media_type: props.itemDetails.media_type,
      db_id: props.itemDetails.item_id,
    })
    .finally(() => {
      mappingSearchInProgress.value = false;
    });
};

const toolbarMenuItems = computed(() => {
  return [
    // search all providers option (only for library items when streaming providers are available)
    {
      label: "search_all_providers",
      icon: "mdi-database-search",
      action: searchAllProviders,
      overflowAllowed: false,
      disabled: mappingSearchInProgress.value,
      hide:
        props.itemDetails.provider != "library" ||
        !api.hasStreamingProviders.value ||
        !authManager.isAdmin(),
    },
    // toggle expand
    {
      label: "tooltip.collapse_expand",
      icon: expanded.value ? "mdi-chevron-up" : "mdi-chevron-down",
      action: toggleExpand,
      overflowAllowed: false,
    },
  ];
});
</script>

<style>
.hiresicon {
  margin-top: 5px;
  margin-right: 15px;
  margin-left: 15px;
  filter: invert(100%);
}

.hiresicondark {
  margin-top: 5px;
  margin-right: 15px;
  margin-left: 15px;
}

/* Section header typography polish */
.provider-details-toolbar :deep(.toolbar-title),
.provider-details-toolbar :deep(.v-toolbar-title) {
  font-weight: 600;
  letter-spacing: 0.2px;
}

/* Streamloader provider row — subtle teal accent matching Settings/Providers.vue */
.provider-mapping-streamloader {
  position: relative;
  background: linear-gradient(
    90deg,
    rgba(var(--v-theme-primary), 0.06) 0%,
    rgba(var(--v-theme-primary), 0) 60%
  );
  border-radius: 8px;
  transition: background 0.2s ease;
}

.provider-mapping-streamloader::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: rgb(var(--v-theme-primary));
  z-index: 1;
}

.provider-mapping-streamloader:hover {
  background: linear-gradient(
    90deg,
    rgba(var(--v-theme-primary), 0.1) 0%,
    rgba(var(--v-theme-primary), 0) 70%
  );
}

/* Quality / library pill styling — subtle teal-tinted */
.quality-pill.v-chip {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
}

.quality-pill-hires.v-chip {
  border-color: rgba(var(--v-theme-primary), 0.55);
  background: rgba(var(--v-theme-primary), 0.14);
}

.quality-pill-lossless.v-chip {
  border-color: rgba(var(--v-theme-primary), 0.4);
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>
