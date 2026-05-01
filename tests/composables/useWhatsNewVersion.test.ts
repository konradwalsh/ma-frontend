import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  useWhatsNewVersion,
  WHATS_NEW_VERSION,
} from "@/composables/useWhatsNewVersion";

const STORAGE_KEY = "streamloader-whats-new-version-seen";

describe("useWhatsNewVersion", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("sets shouldShow=true when localStorage is empty (first boot)", () => {
    const { shouldShow, currentVersion } = useWhatsNewVersion();
    expect(shouldShow.value).toBe(true);
    expect(currentVersion).toBe(WHATS_NEW_VERSION);
  });

  it("sets shouldShow=true when the stored version differs from current", () => {
    window.localStorage.setItem(STORAGE_KEY, "1900.1.0");
    const { shouldShow } = useWhatsNewVersion();
    expect(shouldShow.value).toBe(true);
  });

  it("sets shouldShow=false when the stored version matches current", () => {
    window.localStorage.setItem(STORAGE_KEY, WHATS_NEW_VERSION);
    const { shouldShow } = useWhatsNewVersion();
    expect(shouldShow.value).toBe(false);
  });

  it("markSeen() writes the current version to localStorage and flips shouldShow false", () => {
    const { shouldShow, markSeen } = useWhatsNewVersion();
    expect(shouldShow.value).toBe(true);

    markSeen();

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(WHATS_NEW_VERSION);
    expect(shouldShow.value).toBe(false);
  });

  it("reset() clears localStorage and re-arms shouldShow to true", () => {
    window.localStorage.setItem(STORAGE_KEY, WHATS_NEW_VERSION);
    const { shouldShow, reset } = useWhatsNewVersion();
    expect(shouldShow.value).toBe(false);

    reset();

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(shouldShow.value).toBe(true);
  });
});
