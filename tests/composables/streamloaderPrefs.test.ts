import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { mount } from "@vue/test-utils";

import {
  DEFAULT_STREAMLOADER_PREFS,
  DEFAULT_STREAMLOADER_STRING_PREFS,
  readMediaDisplayKind,
  readStreamloaderPref,
  setMediaDisplayKind,
  setStreamloaderPref,
  useMediaDisplayKind,
  useStreamloaderPref,
  type MediaDisplayKind,
} from "@/composables/streamloaderPrefs";

const STORAGE_PREFIX = "frontend.settings.streamloader.";

// Mount helper — the composable registers onMounted/onBeforeUnmount listeners
// so it must run inside a component instance to receive the custom-event sync.
function mountWithPref(key: keyof typeof DEFAULT_STREAMLOADER_PREFS) {
  const captured: { ref: ReturnType<typeof useStreamloaderPref> | null } = {
    ref: null,
  };
  const Comp = defineComponent({
    setup() {
      const pref = useStreamloaderPref(key);
      captured.ref = pref;
      return () => h("div", { "data-value": String(pref.value) });
    },
  });
  const wrapper = mount(Comp);
  return { wrapper, captured };
}

describe("streamloaderPrefs", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("useStreamloaderPref returns the default when no localStorage value is set", () => {
    const { captured } = mountWithPref("showLibraryStats");
    expect(captured.ref?.value).toBe(
      DEFAULT_STREAMLOADER_PREFS.showLibraryStats,
    );

    const { captured: cap2 } = mountWithPref("showFloatingHealthPill");
    expect(cap2.ref?.value).toBe(
      DEFAULT_STREAMLOADER_PREFS.showFloatingHealthPill,
    );
  });

  it("useStreamloaderPref reads an existing 'false' value from localStorage", () => {
    window.localStorage.setItem(`${STORAGE_PREFIX}showLibraryStats`, "false");
    const { captured } = mountWithPref("showLibraryStats");
    expect(captured.ref?.value).toBe(false);
  });

  it("useStreamloaderPref reads an existing 'true' value from localStorage", () => {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}showFloatingHealthPill`,
      "true",
    );
    const { captured } = mountWithPref("showFloatingHealthPill");
    expect(captured.ref?.value).toBe(true);
  });

  it("setStreamloaderPref writes the new value to localStorage", () => {
    setStreamloaderPref("showSourceBadge", false);
    expect(
      window.localStorage.getItem(`${STORAGE_PREFIX}showSourceBadge`),
    ).toBe("false");

    setStreamloaderPref("showSourceBadge", true);
    expect(
      window.localStorage.getItem(`${STORAGE_PREFIX}showSourceBadge`),
    ).toBe("true");
  });

  it("setStreamloaderPref triggers same-tab cross-component sync via custom event", async () => {
    const { captured } = mountWithPref("showActivityPulse");
    expect(captured.ref?.value).toBe(true); // default

    setStreamloaderPref("showActivityPulse", false);
    await nextTick();
    expect(captured.ref?.value).toBe(false);

    setStreamloaderPref("showActivityPulse", true);
    await nextTick();
    expect(captured.ref?.value).toBe(true);
  });

  it("custom event for an unrelated key does not change the watched ref", async () => {
    const { captured } = mountWithPref("showLibraryStats");
    expect(captured.ref?.value).toBe(true);

    setStreamloaderPref("announceQueueChanges", false);
    await nextTick();
    expect(captured.ref?.value).toBe(true);
  });

  it("readStreamloaderPref returns default when key is unset", () => {
    expect(readStreamloaderPref("showRecentlyDownloaded")).toBe(
      DEFAULT_STREAMLOADER_PREFS.showRecentlyDownloaded,
    );
  });

  it("readStreamloaderPref returns the persisted value", () => {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}showRecentlyDownloaded`,
      "false",
    );
    expect(readStreamloaderPref("showRecentlyDownloaded")).toBe(false);
  });
});

// Mount helper for the string-valued media-display-kind composable —
// same lifecycle gotcha (onMounted/onBeforeUnmount listeners) so the
// composable must run inside a real component instance.
function mountWithMediaKind() {
  const captured: { ref: ReturnType<typeof useMediaDisplayKind> | null } = {
    ref: null,
  };
  const Comp = defineComponent({
    setup() {
      const kind = useMediaDisplayKind();
      captured.ref = kind;
      return () => h("div", { "data-kind": kind.value });
    },
  });
  const wrapper = mount(Comp);
  return { wrapper, captured };
}

describe("streamloaderPrefs (media-display-kind)", () => {
  const KIND_KEY = `${STORAGE_PREFIX}media_display_kind`;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("default kind is 'vinyl' when nothing is persisted", () => {
    expect(DEFAULT_STREAMLOADER_STRING_PREFS.media_display_kind).toBe("vinyl");
    expect(readMediaDisplayKind()).toBe("vinyl");
    const { captured } = mountWithMediaKind();
    expect(captured.ref?.value).toBe("vinyl");
  });

  it("setMediaDisplayKind('cd') persists to localStorage and broadcasts to mounted refs", async () => {
    const { captured } = mountWithMediaKind();
    expect(captured.ref?.value).toBe("vinyl");

    setMediaDisplayKind("cd");
    expect(window.localStorage.getItem(KIND_KEY)).toBe("cd");
    await nextTick();
    expect(captured.ref?.value).toBe("cd");
  });

  it("readMediaDisplayKind returns the persisted value", () => {
    window.localStorage.setItem(KIND_KEY, "cassette");
    expect(readMediaDisplayKind()).toBe("cassette");
  });

  it("invalid persisted value coerces to the default ('vinyl')", () => {
    window.localStorage.setItem(KIND_KEY, "totally-bogus");
    expect(readMediaDisplayKind()).toBe("vinyl");
    const { captured } = mountWithMediaKind();
    expect(captured.ref?.value).toBe("vinyl");
  });

  it("all 5 kinds round-trip via setMediaDisplayKind + readMediaDisplayKind", async () => {
    const allKinds: MediaDisplayKind[] = [
      "vinyl",
      "vinyl-photo",
      "cd",
      "cassette",
      "none",
    ];
    const { captured } = mountWithMediaKind();
    for (const kind of allKinds) {
      setMediaDisplayKind(kind);
      expect(window.localStorage.getItem(KIND_KEY)).toBe(kind);
      expect(readMediaDisplayKind()).toBe(kind);
      await nextTick();
      expect(captured.ref?.value).toBe(kind);
    }
  });
});
