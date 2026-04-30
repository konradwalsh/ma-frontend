<template>
  <section>
    <InfoHeader :item="itemDetails" :active-provider="provider" />
    <!-- Streamloader fork: inline source classification pill so users can
         tell at a glance whether this track is local, cached via
         streamloader, or streamed from a remote provider. Self-contained
         (no extra HTTP) and renders nothing until the track loads. -->
    <div v-if="itemDetails" class="sl-source-badge-row">
      <StreamloaderSourceBadge :item="itemDetails" />
    </div>
    <ItemsListing
      v-if="itemDetails"
      itemtype="trackalbums"
      :parent-item="itemDetails"
      :show-provider="true"
      :show-favorites-only-filter="false"
      :show-library-only-filter="
        itemDetails.provider == 'library' && api.hasStreamingProviders.value
      "
      :show-track-number="false"
      :show-refresh-button="false"
      :load-items="loadTrackAlbums"
      :sort-keys="['name', 'sort_name', 'year', 'year_desc']"
      :title="$t('appears_on')"
      :path="provider + itemId"
      :allow-collapse="true"
    />
    <br />
    <ItemsListing
      v-if="itemDetails"
      itemtype="trackversions"
      :parent-item="itemDetails"
      :show-provider="true"
      :show-favorites-only-filter="false"
      :show-track-number="false"
      :load-items="loadTrackVersions"
      :sort-keys="['name', 'sort_name', 'duration']"
      :title="$t('other_versions')"
      :hide-on-empty="true"
      :path="provider + itemId"
      :allow-collapse="true"
      :show-refresh-button="false"
      :refresh-on-parent-update="true"
    />
    <br />
    <!-- provider mapping details -->
    <ProviderDetails v-if="itemDetails" :item-details="itemDetails" />
    <br />
  </section>
</template>

<script setup lang="ts">
import ItemsListing, { LoadDataParams } from "@/components/ItemsListing.vue";
import InfoHeader from "@/components/InfoHeader.vue";
import { onBeforeUnmount, onMounted, ref } from "vue";
import {
  EventMessage,
  EventType,
  MediaItemType,
  type Track,
} from "@/plugins/api/interfaces";
import { api } from "@/plugins/api";
import { watch } from "vue";
import ProviderDetails from "@/components/ProviderDetails.vue";
import StreamloaderSourceBadge from "@/components/StreamloaderSourceBadge.vue";

export interface Props {
  itemId: string;
  provider: string;
  album?: string;
}
const props = defineProps<Props>();
const itemDetails = ref<Track>();

const loadItemDetails = async function () {
  itemDetails.value = await api.getTrack(
    props.itemId,
    props.provider,
    props.album,
  );
};

watch(
  () => props.itemId,
  (val) => {
    if (val) loadItemDetails();
  },
  { immediate: true },
);

onMounted(() => {
  //signal if/when item updates
  const unsub = api.subscribe(
    EventType.MEDIA_ITEM_UPDATED,
    (evt: EventMessage) => {
      const updatedItem = evt.data as MediaItemType;
      // check if the updated item is the current item
      if (itemDetails.value?.uri == updatedItem.uri) {
        // update UI with the updated item
        itemDetails.value = updatedItem as Track;
      } else if ("provider_mappings" in updatedItem) {
        for (const provMap of updatedItem.provider_mappings) {
          if (
            provMap.item_id == props.itemId &&
            [provMap.provider_instance, provMap.provider_domain].includes(
              props.provider,
            )
          ) {
            itemDetails.value = updatedItem as Track;
            break;
          }
        }
      }
    },
  );
  onBeforeUnmount(unsub);
});

const loadTrackVersions = async function (params: LoadDataParams) {
  return await api.getTrackVersions(
    itemDetails.value!.item_id,
    itemDetails.value!.provider,
  );
};

const loadTrackAlbums = async function (params: LoadDataParams) {
  return await api.getTrackAlbums(
    props.itemId,
    props.provider,
    params.libraryOnly,
  );
};
</script>

<style scoped>
/* Streamloader: subtle page-level polish for the track view.
   The track hero (InfoHeader), appears-on + other-versions listings
   (ItemsListing) and provider details all handle their own internal
   styling. We only nudge the bottom of the page so the last section
   doesn't crowd the playerbar. */
section {
  padding-bottom: 16px;
}

/* Streamloader source badge: float against the right edge so it doesn't
   compete with the leading text of the first listing's heading. */
.sl-source-badge-row {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px 0;
}
</style>
