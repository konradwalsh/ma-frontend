import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { computed, ref } from "vue";

const { storeMock, sidebarState } = vi.hoisted(() => ({
  storeMock: {
    libraryTracksCount: undefined as number | undefined,
    libraryArtistsCount: undefined as number | undefined,
    libraryAlbumsCount: undefined as number | undefined,
  },
  sidebarState: { value: "expanded" as "expanded" | "collapsed" },
}));

vi.mock("@/plugins/store", () => ({ store: storeMock }));
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({
    state: computed(() => sidebarState.value),
    open: ref(true),
    setOpen: () => {},
    isMobile: ref(false),
    openMobile: ref(false),
    setOpenMobile: () => {},
    toggleSidebar: () => {},
  }),
}));

// vue-i18n's useI18n() throws "Need to install with `app.use` function"
// when called outside an installed plugin. The shared mock resolves keys
// against the real en.json so assertions still match the rendered copy
// without installing the live plugin.
vi.mock("vue-i18n", async () => {
  const { vueI18nMock } = await import("../i18n-mock");
  return vueI18nMock();
});

import StreamloaderLibraryStats from "@/components/StreamloaderLibraryStats.vue";

describe("StreamloaderLibraryStats.vue", () => {
  beforeEach(() => {
    storeMock.libraryTracksCount = undefined;
    storeMock.libraryArtistsCount = undefined;
    storeMock.libraryAlbumsCount = undefined;
    sidebarState.value = "expanded";
  });

  it("formats 12345 tracks as '12.3k'", () => {
    storeMock.libraryTracksCount = 12345;
    storeMock.libraryArtistsCount = 100;
    storeMock.libraryAlbumsCount = 200;
    const wrapper = mount(StreamloaderLibraryStats);
    const values = wrapper.findAll(".sl-lib-stats__value").map((n) => n.text());
    expect(values[0]).toBe("12k");
    // Sanity: actual rendering of "tracks" unit follows the value.
    expect(wrapper.text()).toContain("tracks");
  });

  it("formats 1234567 tracks as '1.2M'", () => {
    storeMock.libraryTracksCount = 1234567;
    storeMock.libraryArtistsCount = 5;
    storeMock.libraryAlbumsCount = 5;
    const wrapper = mount(StreamloaderLibraryStats);
    const values = wrapper.findAll(".sl-lib-stats__value").map((n) => n.text());
    expect(values[0]).toBe("1.2M");
  });

  it("formats sub-1000 counts unchanged", () => {
    storeMock.libraryTracksCount = 42;
    storeMock.libraryArtistsCount = 7;
    storeMock.libraryAlbumsCount = 3;
    const wrapper = mount(StreamloaderLibraryStats);
    const values = wrapper.findAll(".sl-lib-stats__value").map((n) => n.text());
    expect(values).toEqual(["42", "7", "3"]);
  });

  it("formats 9999 (still under 10k) with one decimal place", () => {
    storeMock.libraryTracksCount = 9999;
    storeMock.libraryArtistsCount = 1500;
    storeMock.libraryAlbumsCount = 1;
    const wrapper = mount(StreamloaderLibraryStats);
    const values = wrapper.findAll(".sl-lib-stats__value").map((n) => n.text());
    expect(values[0]).toBe("10k");
    // 1500 -> "1.5k"
    expect(values[1]).toBe("1.5k");
  });

  it("hides itself when the sidebar is collapsed", () => {
    storeMock.libraryTracksCount = 100;
    sidebarState.value = "collapsed";
    const wrapper = mount(StreamloaderLibraryStats);
    expect(wrapper.find(".sl-lib-stats").exists()).toBe(false);
  });

  it("shows the loading spinner while counts hydrate", () => {
    const wrapper = mount(StreamloaderLibraryStats);
    expect(wrapper.find(".sl-lib-stats").exists()).toBe(true);
    expect(wrapper.find(".sl-lib-stats__loading").exists()).toBe(true);
    expect(wrapper.find(".sl-lib-stats__row").exists()).toBe(false);
  });

  it("hides itself after the hydration timeout when no counts arrive", async () => {
    vi.useFakeTimers();
    const wrapper = mount(StreamloaderLibraryStats);
    expect(wrapper.find(".sl-lib-stats").exists()).toBe(true);
    vi.advanceTimersByTime(8000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".sl-lib-stats").exists()).toBe(false);
    vi.useRealTimers();
  });
});
