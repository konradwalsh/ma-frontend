import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

// Hoisted mocks shared between vi.mock factories and test cases. The
// store mock is the same shape useKeyboardShortcuts and other tests use,
// trimmed to just the field this component touches.
const { storeMock, resetStore, getShortcutKeyForMock } = vi.hoisted(() => {
  const storeMock = {
    showKeyboardShortcuts: false,
  };
  const resetStore = () => {
    storeMock.showKeyboardShortcuts = false;
  };
  // Default: pretend the help binding is "Shift + /" (matches the real
  // composable export — the hint translates this to "?" for display).
  const getShortcutKeyForMock = vi.fn(() => "Shift + /");
  return { storeMock, resetStore, getShortcutKeyForMock };
});

vi.mock("@/plugins/store", () => ({ store: storeMock }));
vi.mock("@/composables/useKeyboardShortcuts", () => ({
  getShortcutKeyFor: getShortcutKeyForMock,
}));

// matchMedia isn't implemented by happy-dom — provide a controllable
// stub so we can flip "touch primary" vs "desktop" between tests.
const setMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

import StreamloaderShortcutsHint from "@/components/StreamloaderShortcutsHint.vue";

describe("StreamloaderShortcutsHint.vue", () => {
  beforeEach(() => {
    resetStore();
    getShortcutKeyForMock.mockReturnValue("Shift + /");
    localStorage.clear();
    // Default: desktop (no touch-primary) — the hint should render.
    setMatchMedia(false);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders when not dismissed and not on a touch-primary device", async () => {
    const wrapper = mount(StreamloaderShortcutsHint, {
      attachTo: document.body,
    });
    await nextTick();
    const pill = wrapper.find(".sl-shortcuts-hint");
    expect(pill.exists()).toBe(true);
    // Display key collapses "Shift + /" → "?" for compactness.
    expect(wrapper.find(".sl-shortcuts-hint__kbd").text()).toBe("?");
    wrapper.unmount();
  });

  it("stays hidden when the dismissed flag is already in localStorage", async () => {
    localStorage.setItem("sl-shortcuts-hint-dismissed", "1");
    const wrapper = mount(StreamloaderShortcutsHint, {
      attachTo: document.body,
    });
    await nextTick();
    expect(wrapper.find(".sl-shortcuts-hint").exists()).toBe(false);
    wrapper.unmount();
  });

  it("stays hidden on a touch-primary (mobile) device", async () => {
    // The script-side guard uses `(hover: none) and (pointer: coarse)`
    // — make matchMedia return matches=true to simulate that.
    setMatchMedia(true);
    const wrapper = mount(StreamloaderShortcutsHint, {
      attachTo: document.body,
    });
    await nextTick();
    expect(wrapper.find(".sl-shortcuts-hint").exists()).toBe(false);
    wrapper.unmount();
  });

  it("dismiss button writes the localStorage flag and hides the pill", async () => {
    const wrapper = mount(StreamloaderShortcutsHint, {
      attachTo: document.body,
    });
    await nextTick();
    expect(wrapper.find(".sl-shortcuts-hint").exists()).toBe(true);
    await wrapper.find(".sl-shortcuts-hint__dismiss").trigger("click");
    await nextTick();
    expect(localStorage.getItem("sl-shortcuts-hint-dismissed")).toBe("1");
    expect(wrapper.find(".sl-shortcuts-hint").exists()).toBe(false);
    wrapper.unmount();
  });

  it("clicking the pill flips store.showKeyboardShortcuts to true", async () => {
    const wrapper = mount(StreamloaderShortcutsHint, {
      attachTo: document.body,
    });
    await nextTick();
    expect(storeMock.showKeyboardShortcuts).toBe(false);
    await wrapper.find(".sl-shortcuts-hint").trigger("click");
    expect(storeMock.showKeyboardShortcuts).toBe(true);
    // Clicking the pill must NOT auto-dismiss — only the × button does.
    expect(localStorage.getItem("sl-shortcuts-hint-dismissed")).toBeNull();
    wrapper.unmount();
  });
});
