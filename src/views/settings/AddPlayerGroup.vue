<template>
  <section class="add-player-group-view">
    <v-card-text>
      <!-- header -->
      <div class="add-player-group-inner">
        <v-card-title class="add-player-group-title">
          {{ $t("settings.add_group_player") }}
        </v-card-title>
        <v-card-subtitle
          v-if="providerDetails?.domain === 'universal_group'"
          class="add-player-group-subtitle"
          v-html="
            markdownToHtml($t('settings.add_group_player_desc_universal'))
          "
        />
        <v-card-subtitle
          v-else-if="providerDetails?.domain === 'sync_group'"
          class="add-player-group-subtitle"
          v-html="markdownToHtml($t('settings.add_group_player_desc_sync'))"
        />
        <v-card-subtitle
          v-else
          class="add-player-group-subtitle"
          v-html="
            markdownToHtml(
              $t('settings.add_group_player_desc', [providerDetails?.name]),
            )
          "
        />
        <br />
        <v-divider class="add-player-group-divider" />
        <br />
        <br />
        <v-form ref="form" v-model="valid" class="add-player-group-form">
          <!-- name field -->
          <v-text-field
            v-model="name"
            :label="$t('settings.player_name')"
            variant="outlined"
            color="primary"
            clearable
            required
            :rules="[(v) => v.length > 0 || $t('settings.invalid_input')]"
          />
          <!-- dropdown with group members -->
          <v-select
            v-model="members"
            clearable
            multiple
            color="primary"
            :items="syncPlayers"
            item-title="name"
            item-value="player_id"
            :label="$t('settings.group_members')"
          />
          <!-- dynamic mode -->
          <v-switch
            v-model="dynamic"
            color="primary"
            :label="$t('settings.dynamic_members.label')"
          />
          <v-card-subtitle
            v-if="providerDetails?.domain !== 'universal_group'"
            class="add-player-group-dynamic-desc"
          >
            {{ $t("settings.dynamic_members.description") }}
          </v-card-subtitle>
          <br />
          <v-btn
            block
            color="primary"
            class="add-player-group-save-btn"
            :disabled="!valid || (members.length == 0 && !dynamic)"
            @click="onSubmit"
          >
            {{ $t("settings.save") }}
          </v-btn>
        </v-form>
        <br />
        <v-btn
          block
          variant="outlined"
          class="add-player-group-cancel-btn"
          @click="router.back()"
        >
          {{ $t("close") }}
        </v-btn>
      </div>
    </v-card-text>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/plugins/api";
import { markdownToHtml } from "@/helpers/utils";
import { PlayerFeature, PlayerType } from "@/plugins/api/interfaces";

// global refs
const router = useRouter();
const name = ref<string>("");
const members = ref<string[]>([]);
const dynamic = ref<boolean>(true);
const valid = ref<boolean>(false);

// props
const props = defineProps<{
  provider: string;
}>();

// computed properties

const providerDetails = computed(() => {
  return api.getProvider(props.provider);
});

const syncPlayers = computed(() => {
  if (props.provider === "universal_group") {
    // for universal groups, show all available non-group players, regardless of provider
    return Object.values(api.players)
      .filter((x) => x.available && x.type != PlayerType.GROUP && !x.hide_in_ui)
      .sort((a, b) =>
        (a.name ?? "")
          .toUpperCase()
          .localeCompare((b.name ?? "").toUpperCase()),
      );
  }
  if (props.provider === "sync_group") {
    // for sync groups, show all available non-group players that are sync compatible
    return Object.values(api.players)
      .filter((x) => {
        if (!x.available || x.type === PlayerType.GROUP || x.hide_in_ui)
          return false;
        if (!x.supported_features.includes(PlayerFeature.SET_MEMBERS))
          return false;
        // If a player is temporarily synced, can_group_with will be empty.
        // In that case, use the sync leader's can_group_with as a proxy.
        let canGroupWith = x.can_group_with;
        if (
          canGroupWith.length === 0 &&
          x.synced_to &&
          api.players[x.synced_to]
        ) {
          canGroupWith = api.players[x.synced_to].can_group_with;
        }
        if (canGroupWith.length === 0) return false;
        if (members.value.length === 0) return true;
        if (members.value.includes(x.player_id)) return true;
        return members.value.some((m) => canGroupWith.includes(m));
      })
      .sort((a, b) =>
        (a.name ?? "")
          .toUpperCase()
          .localeCompare((b.name ?? "").toUpperCase()),
      );
  }
  return Object.values(api.players)
    .filter(
      (x) =>
        x.available &&
        x.type != PlayerType.GROUP &&
        !x.hide_in_ui &&
        x.provider == providerDetails.value?.instance_id,
    )
    .sort((a, b) =>
      (a.name ?? "").toUpperCase().localeCompare((b.name ?? "").toUpperCase()),
    );
});

// methods
const onSubmit = async function () {
  api.createPlayerGroup(
    props.provider,
    name.value,
    members.value,
    dynamic.value,
  );
  router.push({ name: "playersettings" });
};
</script>

<style scoped>
.add-player-group-view {
  /* page wrapper for the add player group view */
}

.add-player-group-inner {
  margin-left: -5px;
  margin-right: -5px;
}

.add-player-group-title {
  font-weight: 600;
  letter-spacing: 0.01em;
  color: rgb(var(--v-theme-on-surface));
  padding-bottom: 4px;
}

.add-player-group-subtitle {
  white-space: break-spaces;
  color: rgba(var(--v-theme-on-surface), 0.7);
  line-height: 1.45;
}

.add-player-group-divider {
  border-color: rgba(var(--v-theme-primary), 0.35);
  opacity: 1;
}

.add-player-group-form {
  margin-right: 10px;
}

.add-player-group-form :deep(.v-field--focused) {
  --v-field-border-opacity: 1;
}

.add-player-group-form :deep(.v-field--focused .v-field__outline__start),
.add-player-group-form :deep(.v-field--focused .v-field__outline__end),
.add-player-group-form :deep(.v-field--focused .v-field__outline__notch::before),
.add-player-group-form :deep(.v-field--focused .v-field__outline__notch::after) {
  border-color: rgb(var(--v-theme-primary));
}

.add-player-group-dynamic-desc {
  white-space: break-spaces;
  padding-left: 0;
  margin-top: -25px;
  margin-bottom: 35px;
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.add-player-group-save-btn {
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
}

.add-player-group-cancel-btn {
  text-transform: none;
}
</style>
