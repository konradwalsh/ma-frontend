import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

const STORAGE_KEY = "streamloader-artwork-overrides";

// Helper: reset module registry so the module-scope `overridesRef` is rebuilt
// from a fresh localStorage snapshot for each test that needs hydration.
async function loadComposable() {
  vi.resetModules();
  return import("@/composables/useArtworkOverrides");
}

describe("useArtworkOverrides", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("getOverride returns undefined when no override exists for the item", async () => {
    const { useArtworkOverrides } = await loadComposable();
    const { getOverride } = useArtworkOverrides();
    expect(getOverride("item-1")).toBeUndefined();
  });

  it("getOverride returns undefined when item id is missing/empty", async () => {
    const { useArtworkOverrides } = await loadComposable();
    const { getOverride } = useArtworkOverrides();
    expect(getOverride(undefined)).toBeUndefined();
    expect(getOverride("")).toBeUndefined();
  });

  it("setOverride writes to the in-memory map and persists to localStorage", async () => {
    const { useArtworkOverrides } = await loadComposable();
    const { setOverride, getOverride } = useArtworkOverrides();

    const ok = setOverride("item-1", "url", "https://example.com/cover.jpg");

    expect(ok).toBe(true);
    const entry = getOverride("item-1");
    expect(entry).toBeDefined();
    expect(entry?.source).toBe("url");
    expect(entry?.value).toBe("https://example.com/cover.jpg");
    expect(typeof entry?.queued_at).toBe("string");

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored["item-1"].value).toBe("https://example.com/cover.jpg");
    expect(stored["item-1"].source).toBe("url");
  });

  it("setOverride rejects empty itemId or empty value", async () => {
    const { useArtworkOverrides } = await loadComposable();
    const { setOverride } = useArtworkOverrides();

    expect(setOverride("", "url", "https://example.com/x.jpg")).toBe(false);
    expect(setOverride("item-1", "url", "")).toBe(false);
  });

  it("removeOverride clears the entry from the map and localStorage", async () => {
    const { useArtworkOverrides } = await loadComposable();
    const { setOverride, removeOverride, getOverride } = useArtworkOverrides();

    setOverride("item-1", "url", "https://example.com/cover.jpg");
    expect(getOverride("item-1")).toBeDefined();

    const ok = removeOverride("item-1");
    expect(ok).toBe(true);
    expect(getOverride("item-1")).toBeUndefined();

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored["item-1"]).toBeUndefined();
  });

  it("removeOverride is a no-op (returns true) when item has no override", async () => {
    const { useArtworkOverrides } = await loadComposable();
    const { removeOverride } = useArtworkOverrides();
    expect(removeOverride("never-set")).toBe(true);
  });

  it("hydrates from existing localStorage on init", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        "preexisting-1": {
          source: "upload",
          value: "data:image/png;base64,AAA",
          queued_at: "2026-01-01T00:00:00.000Z",
        },
      }),
    );

    const { useArtworkOverrides } = await loadComposable();
    const { getOverride } = useArtworkOverrides();
    const entry = getOverride("preexisting-1");
    expect(entry?.source).toBe("upload");
    expect(entry?.value).toBe("data:image/png;base64,AAA");
  });

  it("starts empty when localStorage payload is malformed JSON", async () => {
    window.localStorage.setItem(STORAGE_KEY, "not json {");
    const { useArtworkOverrides } = await loadComposable();
    const { getOverride } = useArtworkOverrides();
    expect(getOverride("anything")).toBeUndefined();
  });

  it("useArtworkOverrideUrl reactively updates when override is set/removed", async () => {
    const { useArtworkOverrides, useArtworkOverrideUrl } =
      await loadComposable();
    const { setOverride, removeOverride } = useArtworkOverrides();

    const urlRef = useArtworkOverrideUrl("item-1");
    expect(urlRef.value).toBeUndefined();

    setOverride("item-1", "url", "https://example.com/a.jpg");
    await nextTick();
    expect(urlRef.value).toBe("https://example.com/a.jpg");

    setOverride("item-1", "url", "https://example.com/b.jpg");
    await nextTick();
    expect(urlRef.value).toBe("https://example.com/b.jpg");

    removeOverride("item-1");
    await nextTick();
    expect(urlRef.value).toBeUndefined();
  });

  it("useArtworkOverrideUrl accepts a getter for a reactive item id", async () => {
    const { useArtworkOverrides, useArtworkOverrideUrl } =
      await loadComposable();
    const { setOverride } = useArtworkOverrides();
    setOverride("item-A", "url", "https://example.com/A.jpg");
    setOverride("item-B", "url", "https://example.com/B.jpg");

    const activeId = ref<string | undefined>("item-A");
    const urlRef = useArtworkOverrideUrl(() => activeId.value);
    expect(urlRef.value).toBe("https://example.com/A.jpg");

    activeId.value = "item-B";
    await nextTick();
    expect(urlRef.value).toBe("https://example.com/B.jpg");
  });
});
