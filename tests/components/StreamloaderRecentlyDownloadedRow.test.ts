import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { EventType, type Track } from "@/plugins/api/interfaces";

// Reactive registry of streamloader-pref values — driven per test case
// (the rail only mounts when `showRecentlyDownloaded` is true).
const { prefStore, apiMock } = vi.hoisted(() => ({
  prefStore: { showRecentlyDownloaded: true },
  apiMock: {
    getLibraryTracks: vi.fn(),
    subscribe: vi.fn(),
  },
}));

// vue-i18n's useI18n() throws "Need to install with `app.use` function"
// when called outside an installed plugin. The recently-downloaded row
// added i18n strings mid-batch — mocking with an identity translator
// keeps this test isolated from the live i18n config.
vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, _params?: Record<string, unknown>) => key,
  }),
}));

vi.mock("@/composables/streamloaderPrefs", async () => {
  const { computed } = await import("vue");
  return {
    useStreamloaderPref: (key: keyof typeof prefStore) =>
      computed(() => prefStore[key]),
  };
});

vi.mock("@/plugins/api", () => ({ default: apiMock }));
vi.mock("@/plugins/api/helpers", () => ({
  itemIsAvailable: () => true,
}));

// Inner-component stubs — the rail just renders them, we don't need their
// real markup. Keeping Carousel stubbed lets us assert the rail attempted
// to render items rather than wrestling with swiper internals.
vi.mock("@/components/Carousel.vue", () => ({
  default: defineComponent({
    name: "Carousel",
    props: ["items", "itemKey"],
    setup(props) {
      return () =>
        h(
          "div",
          { class: "carousel-stub", "data-count": props.items?.length ?? 0 },
          (props.items ?? []).map((it: Track) =>
            h("div", { class: "carousel-stub__item" }, it.name ?? it.uri),
          ),
        );
    },
  }),
}));

vi.mock("@/components/PanelviewItemCompact.vue", () => ({
  default: defineComponent({
    name: "PanelviewItemCompact",
    props: ["item", "isAvailable"],
    setup() {
      return () => h("div", { class: "panel-stub" });
    },
  }),
}));

vi.mock("@/components/StreamloaderSpinner.vue", () => ({
  default: defineComponent({
    name: "StreamloaderSpinner",
    props: ["size", "label"],
    setup() {
      return () => h("div", { class: "spinner-stub" });
    },
  }),
}));

// VToolbar uses the auto-importer pipeline → CSS side-effect.
vi.mock("vuetify/lib/components/VToolbar/index.mjs", () => {
  const VToolbar = defineComponent({
    name: "VToolbar",
    setup(_, { slots }) {
      return () =>
        h("div", { class: "v-toolbar-stub" }, [
          slots.title?.(),
          slots.default?.(),
        ]);
    },
  });
  return { VToolbar, default: VToolbar };
});

import StreamloaderRecentlyDownloadedRow from "@/components/StreamloaderRecentlyDownloadedRow.vue";

const makeTrack = (id: string, withMapping = true): Track =>
  ({
    item_id: id,
    name: `Track ${id}`,
    uri: `library://track/${id}`,
    media_type: "track",
    provider: "library",
    provider_mappings: withMapping
      ? [{ provider_domain: "streamloader", provider_instance: "sl_inst" }]
      : [{ provider_domain: "tidal", provider_instance: "tidal_inst" }],
  }) as unknown as Track;

const VToolbarStub = defineComponent({
  name: "VToolbarStub",
  setup(_, { slots }) {
    return () =>
      h("div", { class: "v-toolbar-stub" }, [
        slots.title?.(),
        slots.default?.(),
      ]);
  },
});

const mountRow = () =>
  mount(StreamloaderRecentlyDownloadedRow, {
    global: {
      stubs: {
        "v-toolbar": VToolbarStub,
      },
    },
  });

describe("StreamloaderRecentlyDownloadedRow.vue", () => {
  beforeEach(() => {
    prefStore.showRecentlyDownloaded = true;
    apiMock.getLibraryTracks.mockReset();
    apiMock.subscribe.mockReset();
    apiMock.subscribe.mockReturnValue(() => {});
  });

  it("renders nothing when the load resolves with no items", async () => {
    apiMock.getLibraryTracks.mockResolvedValue([]);
    const wrapper = mountRow();
    await flushPromises();
    // Empty load -> rail must vanish completely (no header, no spinner,
    // no carousel). The component's contract is "render NOTHING" rather
    // than an empty state.
    expect(wrapper.find(".sl-recent-row").exists()).toBe(false);
  });

  it("renders the Carousel populated with the fetched tracks", async () => {
    apiMock.getLibraryTracks.mockResolvedValue([
      makeTrack("a"),
      makeTrack("b"),
      makeTrack("c"),
    ]);
    const wrapper = mountRow();
    await flushPromises();
    const carousel = wrapper.find(".carousel-stub");
    expect(carousel.exists()).toBe(true);
    expect(carousel.attributes("data-count")).toBe("3");
    expect(wrapper.findAll(".carousel-stub__item")).toHaveLength(3);
    expect(wrapper.text()).toContain("Track a");
  });

  it("re-fetches when MEDIA_ITEM_ADDED fires on the api subscription", async () => {
    apiMock.getLibraryTracks.mockResolvedValue([makeTrack("a")]);
    let captured: ((evt: unknown) => void) | undefined;
    apiMock.subscribe.mockImplementation(
      (eventType: EventType, cb: (evt: unknown) => void) => {
        // The component must subscribe to MEDIA_ITEM_ADDED specifically
        // — wider subscriptions would fire on every player update too.
        if (eventType === EventType.MEDIA_ITEM_ADDED) captured = cb;
        return () => {};
      },
    );
    mountRow();
    await flushPromises();
    expect(apiMock.getLibraryTracks).toHaveBeenCalledTimes(1);
    expect(captured).toBeDefined();

    // Fire the event — the handler should call loadData() again.
    captured!({ event: EventType.MEDIA_ITEM_ADDED });
    await flushPromises();
    expect(apiMock.getLibraryTracks).toHaveBeenCalledTimes(2);
  });
});

// Touch the imported `ref` so the linter doesn't strip it; kept available
// for future test additions that need to drive the pref reactively.
void ref;
