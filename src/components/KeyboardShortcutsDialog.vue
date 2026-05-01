<!--
  Streamloader-fork addition: keyboard-shortcut help dialog.

  Triggered by pressing "?" (Shift+/) anywhere outside an input.
  Closeable via Esc (Vuetify v-dialog default) or by clicking the
  scrim. Shortcut list comes from KEYBOARD_SHORTCUTS in
  useKeyboardShortcuts.ts so the handler and the dialog stay in
  sync — change a binding there and this dialog updates with it.

  Mounted once at the v-app root in src/layouts/default/Default.vue.
-->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="ksd-card">
      <v-card-title class="ksd-title">
        Keyboard Shortcuts
        <div class="ksd-title-rule" />
      </v-card-title>
      <v-card-text class="ksd-body">
        <div
          v-for="group in groupedShortcuts"
          :key="group.name"
          class="ksd-group"
        >
          <div class="ksd-group-label">{{ group.name }}</div>
          <table class="ksd-table" role="list">
            <tbody>
              <tr v-for="(sc, idx) in group.items" :key="idx" class="ksd-row">
                <td class="ksd-keys-cell">
                  <template v-for="(k, i) in sc.keys" :key="i">
                    <kbd class="ksd-kbd">{{ k }}</kbd>
                    <span v-if="i < sc.keys.length - 1" class="ksd-plus">
                      +
                    </span>
                  </template>
                </td>
                <td class="ksd-action-cell">{{ sc.action }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="ksd-footer">
        <span class="ksd-hint">
          Press <kbd class="ksd-kbd ksd-kbd-inline">Esc</kbd> to close
        </span>
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  KEYBOARD_SHORTCUTS,
  type KeyboardShortcut,
} from "@/composables/useKeyboardShortcuts";

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

// Preserve the declaration order of the source array within each group,
// so any future re-ordering in the composable is mirrored here.
const GROUP_ORDER: KeyboardShortcut["group"][] = [
  "Playback",
  "Volume",
  "View",
  "Help",
];

const groupedShortcuts = computed(() => {
  return GROUP_ORDER.map((name) => ({
    name,
    items: KEYBOARD_SHORTCUTS.filter((s) => s.group === name),
  })).filter((g) => g.items.length > 0);
});
</script>

<style scoped>
.ksd-card {
  background: rgb(var(--v-theme-surface));
  border-radius: 10px;
  overflow: hidden;
}

.ksd-title {
  position: relative;
  padding: 20px 24px 14px;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Brand-teal underline divider — same accent used on the skip-link
   and other focus-visible outlines across the fork. */
.ksd-title-rule {
  position: absolute;
  left: 24px;
  bottom: 8px;
  width: 36px;
  height: 2px;
  background: linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%);
  border-radius: 1px;
}

.ksd-body {
  padding: 8px 24px 4px;
  max-height: 70vh;
}

.ksd-group + .ksd-group {
  margin-top: 16px;
}

.ksd-group-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #14b8a6;
  margin-bottom: 6px;
  padding-left: 2px;
}

.ksd-table {
  width: 100%;
  border-collapse: collapse;
}

.ksd-row {
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.ksd-row:last-child {
  border-bottom: none;
}

.ksd-keys-cell {
  padding: 8px 12px 8px 0;
  white-space: nowrap;
  vertical-align: middle;
  width: 1%; /* shrink-to-fit so the action column gets the rest */
}

.ksd-action-cell {
  padding: 8px 0;
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.88);
  vertical-align: middle;
}

.ksd-kbd {
  display: inline-block;
  min-width: 1.75em;
  padding: 2px 8px;
  font-family:
    ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.92);
  background: rgba(20, 184, 166, 0.08);
  border: 1px solid rgba(20, 184, 166, 0.32);
  border-bottom-width: 2px;
  border-radius: 5px;
  line-height: 1.4;
  /* hover:none — kbd is presentational, not interactive */
}

.ksd-kbd-inline {
  margin: 0 2px;
}

.ksd-plus {
  display: inline-block;
  margin: 0 4px;
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.ksd-footer {
  padding: 12px 24px 16px;
}

.ksd-hint {
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

/* Focus-visible polish — matches the brand outline used elsewhere in
   the fork (skip-link, etc). The dialog itself receives focus on open
   for screen-reader announcement. */
.ksd-card :focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
