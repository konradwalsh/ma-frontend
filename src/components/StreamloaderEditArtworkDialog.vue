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
          aria-label="Apply artwork override"
          @click="apply"
        >
          Apply
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { toast } from "vue-sonner";

interface Props {
  modelValue: boolean;
  itemId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const STORAGE_KEY = "streamloader-artwork-overrides";

type OverrideSource = "url" | "upload";

interface ArtworkOverride {
  source: OverrideSource;
  value: string; // raw URL OR base64 data URL
  queued_at: string; // ISO timestamp
}

type OverrideMap = Record<string, ArtworkOverride>;

const activeTab = ref<"url" | "upload">("url");
const urlInput = ref("");
const urlPreviewError = ref(false);
const uploadPreviewSrc = ref<string | null>(null);
const isDragging = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

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
  const override: ArtworkOverride = {
    source: activeTab.value,
    value:
      activeTab.value === "url"
        ? (urlPreviewSrc.value as string)
        : (uploadPreviewSrc.value as string),
    queued_at: new Date().toISOString(),
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const map: OverrideMap = raw ? (JSON.parse(raw) as OverrideMap) : {};
    map[props.itemId] = override;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    // Quota exceeded (most likely from a very large base64 upload) is the
    // realistic failure mode here. Tell the user; don't silently drop.
    toast.error(
      "Could not save artwork override (browser storage may be full).",
    );
    void err;
    return;
  }
  toast.info("Artwork override saved. (Backend rollout pending.)");
  close();
};

const close = () => {
  emit("update:modelValue", false);
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
