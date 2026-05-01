/**
 * useWhatsNewVersion.ts
 *
 * Streamloader-fork addition: tiny "have I seen this build's changelog?"
 * primitive used by StreamloaderWhatsNewDialog.vue.
 *
 * Each addon-restart pulls a new build, and users would otherwise have no
 * idea what changed. We compare a hard-coded "current" version string to
 * whatever's persisted under `streamloader-whats-new-version-seen` in
 * localStorage. When they differ (including the first-ever boot, where
 * nothing is stored) we flip `shouldShow` to true so the layout can mount
 * the dialog. `markSeen()` writes the current version back, suppressing
 * the dialog until the next version bump.
 *
 * The version string is intentionally hard-coded and bumped manually with
 * every release — there's no network fetch and no GitHub release lookup
 * (no new dependencies, fully offline). Format mirrors CLAUDE.md's
 * versioning rule: `YYYY.M.patch` (Home Assistant style).
 */
import { ref, type Ref } from "vue";

// Bump this string in lock-step with ma-driver's `__version__` whenever the
// changelog list below the dialog gets new entries.
export const WHATS_NEW_VERSION = "2026.5.0";

const STORAGE_KEY = "streamloader-whats-new-version-seen";

const readSeenVersion = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private mode / disabled storage — treat as already seen so we don't
    // re-pop the dialog on every navigation when we can't remember the user
    // dismissed it. Mirrors StreamloaderInstallPrompt's defensive fallback.
    return WHATS_NEW_VERSION;
  }
};

export interface UseWhatsNewVersion {
  shouldShow: Ref<boolean>;
  currentVersion: string;
  markSeen: () => void;
  reset: () => void;
}

export const useWhatsNewVersion = (): UseWhatsNewVersion => {
  const shouldShow = ref(readSeenVersion() !== WHATS_NEW_VERSION);

  const markSeen = () => {
    try {
      localStorage.setItem(STORAGE_KEY, WHATS_NEW_VERSION);
    } catch {
      // best-effort; ephemeral session is acceptable.
    }
    shouldShow.value = false;
  };

  // Used by the Settings → About "Show what's new" link to force-open the
  // dialog even when the user has already dismissed this version.
  const reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    shouldShow.value = true;
  };

  return { shouldShow, currentVersion: WHATS_NEW_VERSION, markSeen, reset };
};
