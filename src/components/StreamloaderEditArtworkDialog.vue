<!--
  StreamloaderEditArtworkDialog.vue

  Streamloader-fork addition: lets the user override an item's auto-detected
  artwork when the upstream metadata match was wrong (e.g. Pearl Jam
  "Corduroy" pulling an unrelated 2000-released Asian album cover via a
  fuzzy "2000" year match).

  This is a UI STUB — there is no streamloader-backend endpoint yet to
  persist artwork overrides. To deliver immediate user-perceived value, we:

    1. Provide the full UI (paste-URL tab + upload-image tab, Apply / Cancel),
    2. On Apply, persist the user's input to localStorage under
       `streamloader-artwork-overrides` keyed by item_id, so when the
       backend ships in a follow-up batch we can post-hoc submit them,
    3. Show a vue-sonner toast explaining the rollout state.

  IMPORTANT: this component does NOT modify the artwork-rendering pipeline.
  Stored overrides are queued data only — visual replacement happens once
  the backend endpoint exists.

  Mounted from: InfoHeader.vue (track / album / podcast / audiobook
  detail pages — NOT artists).
-->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="540"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
    @keydown.esc="close"
  >
    <v-card class="sl-eaw-card" role="dialog" aria-labelledby="sl-eaw-title">
      <v-card-title id="sl-eaw-title" class="sl-eaw-title">
        Replace Artwork
        <div class="sl-eaw-title-rule"></div>
      </v-card-title>

      <v-card-text class="sl-eaw-body">
        <!-- ── EXISTING-OVERRIDE BANNER ─────────────────────────────────
             Surfaces the fact that an override is already active for this
             item and gives the user a one-click escape hatch. Without this
             a user who pasted a wrong URL has no in-app way to roll back.
        -->
        <div
          v-if="existingOverride"
          class="sl-eaw-banner"
          role="status"
          aria-live="polite"
        >
          <img
            :src="existingOverride.value"
            alt="Current override preview"
            class="sl-eaw-banner-thumb"
          />
          <div class="sl-eaw-banner-text">
            <div class="sl-eaw-banner-title">Currently overridden</div>
            <div class="sl-eaw-banner-sub">
              An override is currently set for this item.
            </div>
          </div>
          <v-btn
            ref="resetBtnRef"
            class="sl-eaw-reset"
            variant="outlined"
            size="small"
            aria-label="Reset to default artwork"
            @click="resetOverride"
          >
            Reset to default artwork
          </v-btn>
        </div>

        <v-tabs
          v-model="activeTab"
          color="primary"
          density="compact"
          class="sl-eaw-tabs"
        >
          <v-tab value="url" aria-label="Paste image URL">Paste URL</v-tab>
          <v-tab value="upload" aria-label="Upload image file"
            >Upload Image</v-tab
          >
        </v-tabs>

        <v-window v-model="activeTab" class="sl-eaw-window">
          <!-- ── URL TAB ─────────────────────────────────────────────── -->
          <v-window-item value="url">
            <div class="sl-eaw-pane">
              <label for="sl-eaw-url" class="sl-eaw-label"
                >Image URL (paste from clipboard or type)</label
              >
              <input
                id="sl-eaw-url"
                ref="urlInputRef"
                v-model.trim="urlInput"
                type="url"
                inputmode="url"
                class="sl-eaw-input"
                placeholder="https://example.com/cover.jpg"
                aria-label="Image URL"
                @paste="handleUrlPaste"
              />
              <div v-if="urlPreviewSrc" class="sl-eaw-preview-wrap">
                <img
                  :src="urlPreviewSrc"
                  alt="Preview of pasted artwork URL"
                  class="sl-eaw-preview"
                  @error="urlPreviewError = true"
                  @load="urlPreviewError = false"
                />
                <div v-if="urlPreviewError" class="sl-eaw-preview-error">
                  Could not load image from that URL.
                </div>
              </div>
            </div>
          </v-window-item>

          <!-- ── UPLOAD TAB ──────────────────────────────────────────── -->
          <v-window-item value="upload">
            <div
              class="sl-eaw-pane"
              :class="{ 'sl-eaw-drop-active': isDragging }"
              @dragenter.prevent="isDragging = true"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
            >
              <label for="sl-eaw-file" class="sl-eaw-label"
                >Choose an image file (JPG, PNG, WebP)</label
              >
              <input
                id="sl-eaw-file"
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="sl-eaw-file"
                aria-label="Upload image file"
                @change="handleFileChange"
              />
              <div
                class="sl-eaw-drop-hint"
                :class="{ 'sl-eaw-drop-hint--active': isDragging }"
              >
                or drop an image here
              </div>
              <div v-if="uploadPreviewSrc" class="sl-eaw-preview-wrap">
                <img
                  :src="uploadPreviewSrc"
                  alt="Preview of uploaded artwork"
                  class="sl-eaw-preview"
                />
              </div>
            </div>
          </v-window-item>
        </v-window>

        <p class="sl-eaw-footer-hint">
          Streamloader will use this image instead of the auto-detected one.
          (Backend endpoint coming soon — your input is queued.)
        </p>
      </v-card-text>

      <v-card-actions class="sl-eaw-footer">
        <v-spacer />
        <v-btn
          variant="text"
          class="sl-eaw-cancel"
          aria-label="Cancel and close dialog"
          @click="close"
        >
          Cancel
        </v-btn>
        <v-btn
          class="sl-eaw-apply"
          :disabled="!canApply"
          :aria-label="applyLabel === 'Apply' ? 'Apply artwork override' : 'Replace existing artwork override'"
          @click="apply"
        >
          {{ applyLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { toast } from "vue-sonner";
import {
  useArtworkOverrides,
  type OverrideEntry,
} from "@/composables/useArtworkOverrides";

interface Props {
  modelValue: boolean;
  itemId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

// Composable owns the storage layer — same `streamloader-artwork-overrides`
// localStorage key from batch 32, but now wrapped in a reactive Map so the
// renderer sites (PlayerFullscreen, MediaItemThumb, InfoHeader) re-render
// the moment Apply is clicked. Previously written overrides remain valid.
const { getOverride, setOverride, removeOverride } = useArtworkOverrides();

const activeTab = ref<"url" | "upload">("url");
const urlInput = ref("");
const urlPreviewError = ref(false);
const uploadPreviewSrc = ref<string | null>(null);
const isDragging = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const urlInputRef = ref<HTMLInputElement | null>(null);
// Vuetify v-btn refs are component instances; we only need .focus() so the
// loose ComponentPublicInstance shape is enough.
const resetBtnRef = ref<{ $el?: HTMLElement; focus?: () => void } | null>(
  null,
);

// Reactive snapshot of any override that already exists for this item.
// Recomputes whenever the dialog opens for a new item OR when the user resets.
// Note: getOverride reads the reactive Map from the composable, so this stays
// live without a manual subscription.
const existingOverride = computed<OverrideEntry | undefined>(() =>
  getOverride(props.itemId),
);

// When an override is already in place AND the user is typing a new URL,
// re-label Apply → "Replace override" so the destructive intent is obvious.
// Falls back to "Apply" when there's no existing override or the user is on
// the upload tab without a fresh selection.
const applyLabel = computed(() => {
  if (!existingOverride.value) return "Apply";
  return canApply.value ? "Replace override" : "Apply";
});

// Reset state every time the dialog opens. Avoids leaking stale input from
// a previous item across the same dialog instance.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      activeTab.value = "url";
      urlInput.value = "";
      urlPreviewError.value = false;
      uploadPreviewSrc.value = null;
      isDragging.value = false;
      if (fileInputRef.value) fileInputRef.value.value = "";
      // A11y: if the override-reset banner is present, send focus to the
      // Reset button so keyboard users land on the most-likely action.
      // Otherwise focus the URL input. Wait a tick for the v-dialog content
      // (lazy-mounted) to render before querying refs.
      void nextTick(() => {
        if (existingOverride.value) {
          // Vuetify v-btn exposes the underlying button via $el; fall back
          // to focus() in case the API surface ever shifts.
          const el = resetBtnRef.value?.$el as HTMLElement | undefined;
          if (el && typeof el.focus === "function") {
            el.focus();
          } else {
            resetBtnRef.value?.focus?.();
          }
        } else {
          urlInputRef.value?.focus();
        }
      });
    }
  },
);

// Lightweight URL validity check — full URL parser would reject relative
// paths or `data:` schemes that are still legitimate image sources.
const urlPreviewSrc = computed(() => {
  const v = urlInput.value;
  if (!v) return null;
  if (/^(https?:|data:image\/)/i.test(v)) return v;
  return null;
});

const canApply = computed(() => {
  if (activeTab.value === "url") {
    return !!urlPreviewSrc.value && !urlPreviewError.value;
  }
  return !!uploadPreviewSrc.value;
});

const handleUrlPaste = (evt: ClipboardEvent) => {
  // Reset stale error so the new paste gets a fresh load attempt.
  urlPreviewError.value = false;
  // Let the v-model bind the value naturally; this handler exists so
  // we can hook future validation/normalization without re-wiring.
  void evt;
};

const handleFileChange = (evt: Event) => {
  const target = evt.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) loadFile(file);
};

const handleDrop = (evt: DragEvent) => {
  isDragging.value = false;
  const file = evt.dataTransfer?.files?.[0];
  if (file) loadFile(file);
};

const loadFile = (file: File) => {
  if (!file.type.startsWith("image/")) {
    toast.error("That file is not an image.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    uploadPreviewSrc.value =
      typeof reader.result === "string" ? reader.result : null;
  };
  reader.onerror = () => {
    toast.error("Could not read that file.");
  };
  reader.readAsDataURL(file);
};

const apply = () => {
  if (!canApply.value) return;
  const value =
    activeTab.value === "url"
      ? (urlPreviewSrc.value as string)
      : (uploadPreviewSrc.value as string);
  // setOverride writes to both the reactive Map (so artwork swaps instantly
  // across all render sites) AND localStorage (so the choice survives a
  // reload). Returns false on quota exhaustion — most likely cause is a
  // multi-MB base64 upload pushing total storage past the browser limit.
  const ok = setOverride(props.itemId, activeTab.value, value);
  if (!ok) {
    toast.error(
      "Could not save artwork override (browser storage may be full).",
    );
    return;
  }
  toast.success("Artwork updated. (Saved locally — backend sync pending.)");
  close();
};

const close = () => {
  emit("update:modelValue", false);
};

// Wipes the stored override for this item so render sites fall back to the
// auto-detected artwork. Closes the dialog because there's nothing else to
// do here once the override is gone — the dialog's purpose is to set/replace
// an override, not to admire the absence of one.
const resetOverride = () => {
  const ok = removeOverride(props.itemId);
  if (!ok) {
    toast.error("Could not reset artwork override.");
    return;
  }
  toast.success("Default artwork restored.");
  close();
};
</script>

<style scoped>
/* Brand-teal dialog styling matches StreamloaderSourceDiagnostic and
   KeyboardShortcutsDialog so all streamloader-fork dialogs feel like
   one family. */

.sl-eaw-card {
  background: rgb(var(--v-theme-surface));
  border-radius: 10px;
  overflow: hidden;
}

.sl-eaw-title {
  position: relative;
  padding: 20px 24px 14px;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.sl-eaw-title-rule {
  position: absolute;
  left: 24px;
  bottom: 8px;
  width: 36px;
  height: 2px;
  background: linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%);
  border-radius: 1px;
}

.sl-eaw-body {
  padding: 8px 24px 4px;
}

/* Existing-override banner — teal-tinted, mirrors the dialog's brand
   gradient family. Sits above the tabs so it's the first thing the user
   sees when there's already an override to manage. */
.sl-eaw-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0 14px;
  padding: 10px 12px;
  background: linear-gradient(
    90deg,
    rgba(15, 118, 110, 0.12) 0%,
    rgba(45, 212, 191, 0.1) 100%
  );
  border: 1px solid rgba(45, 212, 191, 0.32);
  border-radius: 8px;
}

.sl-eaw-banner-thumb {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.sl-eaw-banner-text {
  flex: 1;
  min-width: 0;
}

.sl-eaw-banner-title {
  font-size: 0.84rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: -0.005em;
}

.sl-eaw-banner-sub {
  margin-top: 2px;
  font-size: 0.74rem;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

/* Reset button — outlined teal so it reads as a secondary destructive
   action distinct from the gradient-filled primary Apply button. */
.sl-eaw-reset {
  flex-shrink: 0;
  border-color: #2dd4bf !important;
  color: #2dd4bf !important;
  font-weight: 600;
  letter-spacing: 0.02em;
}

:global(.v-theme--light) .sl-eaw-reset {
  border-color: #0f766e !important;
  color: #0f766e !important;
}

.sl-eaw-reset:hover {
  background: rgba(45, 212, 191, 0.08) !important;
}

.sl-eaw-tabs {
  margin: 4px 0 12px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.sl-eaw-window {
  margin-top: 4px;
}

.sl-eaw-pane {
  padding: 12px 4px 4px;
  border-radius: 8px;
  transition:
    background 150ms ease,
    box-shadow 150ms ease;
}

.sl-eaw-drop-active {
  background: rgba(45, 212, 191, 0.08);
  box-shadow: inset 0 0 0 2px rgba(45, 212, 191, 0.4);
}

.sl-eaw-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: rgba(var(--v-theme-on-surface), 0.78);
}

.sl-eaw-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  font-size: 0.9rem;
  color: rgb(var(--v-theme-on-surface));
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  border-radius: 8px;
  outline: none;
  transition:
    border-color 150ms ease,
    background 150ms ease;
}

.sl-eaw-input:focus-visible {
  border-color: #2dd4bf;
  background: rgba(45, 212, 191, 0.06);
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

.sl-eaw-file {
  display: block;
  width: 100%;
  font-size: 0.86rem;
  color: rgba(var(--v-theme-on-surface), 0.85);
}

.sl-eaw-drop-hint {
  margin-top: 8px;
  padding: 10px 12px;
  font-size: 0.8rem;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.55);
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.22);
  border-radius: 8px;
  transition:
    color 150ms ease,
    border-color 150ms ease;
}

.sl-eaw-drop-hint--active {
  color: #2dd4bf;
  border-color: #2dd4bf;
}

.sl-eaw-preview-wrap {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.sl-eaw-preview {
  width: 160px;
  height: 160px;
  object-fit: cover;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}

.sl-eaw-preview-error {
  font-size: 0.78rem;
  color: rgb(var(--v-theme-error));
}

.sl-eaw-footer-hint {
  margin: 16px 0 4px;
  font-size: 0.78rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.sl-eaw-footer {
  padding: 12px 24px 16px;
  gap: 8px;
}

/* Ghost-teal Cancel — minimal weight, teal hover. */
.sl-eaw-cancel {
  color: #2dd4bf;
  letter-spacing: 0.02em;
  font-weight: 600;
}

:global(.v-theme--light) .sl-eaw-cancel {
  color: #0f766e;
}

/* Brand-teal primary Apply, mirrors the .sl-src-diag__cta gradient. */
.sl-eaw-apply {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  background: linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%);
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition:
    filter 150ms ease,
    transform 180ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.sl-eaw-apply:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

@media (hover: none) {
  .sl-eaw-apply:hover:not(:disabled) {
    transform: none;
  }
}

.sl-eaw-apply:disabled {
  opacity: 0.5;
  filter: grayscale(0.4);
  cursor: not-allowed;
}

/* Shared focus ring for everything in the card. */
.sl-eaw-card :focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
