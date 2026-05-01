<!--
  StreamloaderWhatsNewDialog.vue (Streamloader-fork)

  Small "What's new in Streamloader" overlay shown the first time a user
  runs a build whose `WHATS_NEW_VERSION` differs from the value they have
  stored under `streamloader-whats-new-version-seen` in localStorage.

  Behaviour contract:
    - The composable `useWhatsNewVersion()` owns the persistence: it
      decides whether to show on mount and writes the new version on
      "Got it". This component is a dumb v-model presenter.
    - Brand styling mirrors KeyboardShortcutsDialog + StreamloaderWelcomeTour
      (teal underline, mark watermark, gradient primary button) so the
      three streamloader overlays read as a family.
    - Body content is a hard-coded array — this fork ships from a single
      addon image with no CHANGELOG fetch, so we just bump the strings
      below at the same time as `WHATS_NEW_VERSION`.
-->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card
      class="swn-card"
      role="dialog"
      aria-labelledby="swn-title"
      aria-describedby="swn-body"
    >
      <img
        src="@/assets/streamloader-mark.svg"
        alt=""
        class="swn-card__mark"
        aria-hidden="true"
      />
      <v-card-title id="swn-title" class="swn-title">
        {{ t("streamloader.whats_new.title") }}
        <div class="swn-title-rule"></div>
      </v-card-title>
      <v-card-subtitle class="swn-version">{{
        t("streamloader.whats_new.version", { version: currentVersion })
      }}</v-card-subtitle>
      <v-card-text id="swn-body" class="swn-body">
        <ul class="swn-list">
          <li v-for="(item, idx) in items" :key="idx" class="swn-item">
            <span class="swn-item__bullet" aria-hidden="true"></span>
            <span class="swn-item__text">{{ item }}</span>
          </li>
        </ul>
      </v-card-text>
      <v-card-actions class="swn-footer">
        <v-spacer />
        <button type="button" class="swn-btn swn-btn--primary" @click="onGotIt">
          {{ t("streamloader.whats_new.got_it") }}
        </button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { WHATS_NEW_VERSION } from "@/composables/useWhatsNewVersion";

const { t } = useI18n();

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  acknowledged: [];
}>();

const currentVersion = WHATS_NEW_VERSION;

// Hand-curated highlights from recent batches. Keep to ~5–7 items —
// scanning a long list is its own friction and defeats the point of a
// brief overlay. Bump alongside WHATS_NEW_VERSION when this list changes.
const items = computed<ReadonlyArray<string>>(() => [
  t("streamloader.whats_new.item1"),
  t("streamloader.whats_new.item2"),
  t("streamloader.whats_new.item3"),
  t("streamloader.whats_new.item4"),
  t("streamloader.whats_new.item5"),
  t("streamloader.whats_new.item6"),
  t("streamloader.whats_new.item7"),
]);

const onGotIt = () => {
  // Parent owns the markSeen() call so the localStorage write stays
  // colocated with the version constant. We just signal + close.
  emit("acknowledged");
  emit("update:modelValue", false);
};
</script>

<style scoped>
.swn-card {
  position: relative;
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(45, 212, 191, 0.25);
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.15),
    0 18px 44px rgba(15, 118, 110, 0.28);
}

.swn-card__mark {
  position: absolute;
  top: 14px;
  right: 16px;
  width: 24px;
  height: 24px;
  opacity: 0.5;
  pointer-events: none;
  filter: drop-shadow(0 0 4px rgba(45, 212, 191, 0.4));
}

.swn-title {
  position: relative;
  padding: 22px 56px 14px 24px;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.25;
}

/* Brand-teal underline divider — same accent used on KeyboardShortcuts. */
.swn-title-rule {
  position: absolute;
  left: 24px;
  bottom: 6px;
  width: 36px;
  height: 2px;
  background: linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%);
  border-radius: 1px;
}

.swn-version {
  padding: 4px 24px 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #14b8a6;
  opacity: 0.95;
}

.swn-body {
  padding: 14px 24px 4px;
}

.swn-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.swn-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.92rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.92);
}

.swn-item__bullet {
  flex: 0 0 auto;
  margin-top: 0.55em;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2dd4bf 0%, #0f766e 100%);
  box-shadow: 0 0 6px rgba(45, 212, 191, 0.55);
}

.swn-item__text {
  min-width: 0;
}

.swn-footer {
  padding: 12px 20px 18px;
}

.swn-btn {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 9px 22px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    filter 150ms ease,
    box-shadow 150ms ease;
}

.swn-btn--primary {
  background: linear-gradient(135deg, #2dd4bf 0%, #0f766e 100%);
  color: #ffffff;
  border-color: rgba(45, 212, 191, 0.8);
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.4);
}

@media (hover: hover) {
  .swn-btn--primary:hover {
    filter: brightness(1.08);
    box-shadow: 0 6px 16px rgba(15, 118, 110, 0.55);
  }
}

.swn-btn:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .swn-btn {
    transition: none;
  }
}
</style>
