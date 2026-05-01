import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// StreamloaderDiscover composes three independent rails:
//   - "Recently Added"          ← api.getLibraryAlbums(order_by=timestamp_added DESC)
//   - "Random Picks"            ← api.getLibraryAlbums(order_by=sort_name) shuffled
//   - "Recently Active Artists" ← api.getRecentlyPlayedItems → filter ARTIST
//
// Both album fetches share the same api method, so we drive them by
// inspecting the order_by argument inside the mock implementation. The
// component also subscribes to MEDIA_ITEM_ADDED + MEDIA_ITEM_PLAYED for
// live refresh — the subscribe spy captures the callbacks so each test
// can fire them and confirm the matching loaders re-run.
const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    getLibraryAlbums: vi.fn(),
    getRecentlyPlayedItems: vi.fn(),
    // Type the spy explicitly so per-test mockImplementation() calls
    // match the `(eventType, cb) => unsubscribe` shape that the
    // production api.subscribe contract uses.
    subscribe: vi.fn<
      (eventType: unknown, cb: (evt: unknown) => void) => () => void
    >(() => () => {}),
    providers: {} as Record<string, unknown>,
  },
}));

vi.mock("@/plugins/api", () => ({ default: apiMock }));

vi.mock("@/plugins/api/helpers", () => ({
  // The render path passes every item through itemIsAvailable; we don't
  // care about its real provider-mapping logic for these assertions.
  itemIsAvailable: () => true,
}));

// Resolve i18n keys against the real en.json so section titles, the
// loading label, and the empty-state copy match what the user sees.
vi.mock("vue-i18n", async () => {
  const { vueI18nMock } = await import("../i18n-mock");
  return vueI18nMock();
});

// Stub all child components — same rationale as the RecentlyPlayed test.
// Each factory inlines its own `defineComponent` because vi.mock factories
// are hoisted above any top-level helper, so referencing a shared constant
// would throw ReferenceError at module-evaluation time.
vi.mock("@/components/Toolbar.vue", async () => {
  const { defineComponent: dc, h: vh } = await import("vue");
  return {
    default: dc({
      name: "Toolbar",
      setup(_, { slots }) {
        return () => vh("div", { class: "toolbar-stub" }, slots.default?.());
      },
    }),
  };
});

vi.mock("@/components/Container.vue", async () => {
  const { defineComponent: dc, h: vh } = await import("vue");
  return {
    default: dc({
      name: "Container",
      setup(_, { slots }) {
        return () => vh("div", { class: "container-stub" }, slots.default?.());
      },
    }),
  };
});

vi.mock("@/components/StreamloaderSpinner.vue", async () => {
  const { defineComponent: dc, h: vh } = await import("vue");
  return {
    default: dc({
      name: "StreamloaderSpinner",
      props: ["size", "label"],
      setup(props) {
        return () =>
          vh("div", {
            class: "streamloader-spinner-stub",
            "data-label": props.label,
          });
      },
    }),
  };
});

// Carousel is stubbed so we can count its instances per rail and read
// its item count via a data attribute, without pulling swiper internals.
vi.mock("@/components/Carousel.vue", async () => {
  const { defineComponent: dc, h: vh } = await import("vue");
  return {
    default: dc({
      name: "Carousel",
      props: ["items", "itemKey"],
      setup(props) {
        return () =>
          vh("div", {
            class: "carousel-stub",
            "data-count": String(
              (props.items as unknown[] | undefined)?.length ?? 0,
            ),
          });
      },
    }),
  };
});

vi.mock("@/components/PanelviewItemCompact.vue", async () => {
  const { defineComponent: dc, h: vh } = await import("vue");
  return {
    default: dc({
      name: "PanelviewItemCompact",
      props: ["item", "isAvailable"],
      setup() {
        return () => vh("div", { class: "panel-item-stub" });
      },
    }),
  };
});

vi.mock("@/components/StreamloaderEmptyState.vue", async () => {
  const { defineComponent: dc, h: vh } = await import("vue");
  return {
    default: dc({
      name: "StreamloaderEmptyState",
      props: ["icon", "title", "message"],
      setup(props) {
        return () =>
          vh("div", {
            class: "streamloader-empty-state-stub",
            "data-title": props.title,
          });
      },
    }),
  };
});

import StreamloaderDiscover from "@/views/StreamloaderDiscover.vue";
import { EventType, MediaType } from "@/plugins/api/interfaces";

const makeAlbum = (uri: string) => ({
  uri,
  name: uri,
  media_type: MediaType.ALBUM,
  provider: "library",
});

const makeArtistMapping = (uri: string) => ({
  uri,
  name: uri,
  media_type: MediaType.ARTIST,
});

// Drive both getLibraryAlbums callsites from a single helper. The
// component calls it twice per load — once with "timestamp_added DESC"
// (recently added) and once with "sort_name" (random pool).
const setAlbums = (recently: unknown[], randomPool: unknown[]) => {
  apiMock.getLibraryAlbums.mockImplementation(
    async (
      _favorite: unknown,
      _search: unknown,
      _limit: number,
      _offset: number,
      orderBy: string,
    ) => {
      if (orderBy === "timestamp_added DESC") return recently;
      return randomPool;
    },
  );
};

describe("StreamloaderDiscover.vue", () => {
  beforeEach(() => {
    apiMock.getLibraryAlbums.mockReset();
    apiMock.getRecentlyPlayedItems.mockReset();
    apiMock.subscribe.mockReset();
    apiMock.subscribe.mockReturnValue(() => {});
  });

  it("renders all three section rails when every data source returns items", async () => {
    setAlbums(
      [makeAlbum("uri:added:1"), makeAlbum("uri:added:2")],
      [makeAlbum("uri:pool:1"), makeAlbum("uri:pool:2")],
    );
    apiMock.getRecentlyPlayedItems.mockResolvedValueOnce([
      makeArtistMapping("uri:artist:1"),
      makeArtistMapping("uri:artist:2"),
    ]);

    const wrapper = mount(StreamloaderDiscover);
    await flushPromises();

    // Three rails → three section elements + three Carousel stubs.
    const sections = wrapper.findAll("section.sl-rail");
    expect(sections).toHaveLength(3);
    expect(wrapper.findAll(".carousel-stub")).toHaveLength(3);
    // The overall loading + empty-state branches must NOT render.
    expect(wrapper.find(".streamloader-spinner-stub").exists()).toBe(false);
    expect(wrapper.find(".streamloader-empty-state-stub").exists()).toBe(false);
    // Section titles match en.json copy.
    const titles = wrapper.findAll(".sl-rail__title").map((n) => n.text());
    expect(titles).toEqual([
      "Recently Added",
      "Random Picks",
      "Recently Active Artists",
    ]);
  });

  it("hides individual rails whose data source comes back empty", async () => {
    // Only "Recently Added" yields anything — the random pool and
    // recently-played API both return [], so those two rails must drop
    // out without affecting the surviving one.
    setAlbums([makeAlbum("uri:added:1")], []);
    apiMock.getRecentlyPlayedItems.mockResolvedValueOnce([]);

    const wrapper = mount(StreamloaderDiscover);
    await flushPromises();

    const sections = wrapper.findAll("section.sl-rail");
    expect(sections).toHaveLength(1);
    expect(sections[0].find(".sl-rail__title").text()).toBe("Recently Added");
    // Empty state stays hidden as long as ANY rail has data.
    expect(wrapper.find(".streamloader-empty-state-stub").exists()).toBe(false);
  });

  it("renders the overall empty state only when every rail is empty", async () => {
    setAlbums([], []);
    apiMock.getRecentlyPlayedItems.mockResolvedValueOnce([]);

    const wrapper = mount(StreamloaderDiscover);
    await flushPromises();

    expect(wrapper.findAll("section.sl-rail")).toHaveLength(0);
    const empty = wrapper.find(".streamloader-empty-state-stub");
    expect(empty.exists()).toBe(true);
    // Title resolves through the i18n-mock against the real en.json.
    expect(empty.attributes("data-title")).toBe("Nothing to discover yet");
  });

  it("re-fetches on MEDIA_ITEM_ADDED + MEDIA_ITEM_PLAYED subscriptions", async () => {
    setAlbums([makeAlbum("uri:added:1")], [makeAlbum("uri:pool:1")]);
    apiMock.getRecentlyPlayedItems.mockResolvedValue([
      makeArtistMapping("uri:artist:1"),
    ]);

    // Capture the two subscription callbacks so we can fire them by
    // hand. The component must subscribe to BOTH events for live
    // refresh to work — wider listeners would re-fetch on every player
    // tick, which we explicitly do not want here.
    const handlers: Partial<Record<EventType, (evt: unknown) => void>> = {};
    apiMock.subscribe.mockImplementation(
      (eventType: unknown, cb: (evt: unknown) => void) => {
        handlers[eventType as EventType] = cb;
        return () => {};
      },
    );

    mount(StreamloaderDiscover);
    await flushPromises();

    // Initial load: getLibraryAlbums called twice (recently + random),
    // getRecentlyPlayedItems called once.
    expect(apiMock.getLibraryAlbums).toHaveBeenCalledTimes(2);
    expect(apiMock.getRecentlyPlayedItems).toHaveBeenCalledTimes(1);
    expect(handlers[EventType.MEDIA_ITEM_ADDED]).toBeDefined();
    expect(handlers[EventType.MEDIA_ITEM_PLAYED]).toBeDefined();

    // Fire MEDIA_ITEM_ADDED → both album loaders re-run, recently-played
    // is untouched (the event isn't relevant to the artist rail).
    handlers[EventType.MEDIA_ITEM_ADDED]!({
      event: EventType.MEDIA_ITEM_ADDED,
    });
    await flushPromises();
    expect(apiMock.getLibraryAlbums).toHaveBeenCalledTimes(4);
    expect(apiMock.getRecentlyPlayedItems).toHaveBeenCalledTimes(1);

    // Fire MEDIA_ITEM_PLAYED → only the artists loader re-runs.
    handlers[EventType.MEDIA_ITEM_PLAYED]!({
      event: EventType.MEDIA_ITEM_PLAYED,
    });
    await flushPromises();
    expect(apiMock.getLibraryAlbums).toHaveBeenCalledTimes(4);
    expect(apiMock.getRecentlyPlayedItems).toHaveBeenCalledTimes(2);
  });

  it("shows the streamloader spinner during the initial load", async () => {
    // Withhold all in-flight resolutions so the loading branch stays
    // mounted. getLibraryAlbums is called twice in parallel (recently
    // added + random pool), so we collect every resolver and fire them
    // together instead of overwriting a single closure variable.
    const albumResolvers: Array<(v: unknown[]) => void> = [];
    let resolveRecent: (v: unknown[]) => void = () => {};
    apiMock.getLibraryAlbums.mockImplementation(
      () =>
        new Promise<unknown[]>((r) => {
          albumResolvers.push(r);
        }),
    );
    apiMock.getRecentlyPlayedItems.mockImplementation(
      () =>
        new Promise<unknown[]>((r) => {
          resolveRecent = r;
        }),
    );

    const wrapper = mount(StreamloaderDiscover);
    // Pre-resolution: spinner visible, no rails, no empty state.
    expect(wrapper.find(".streamloader-spinner-stub").exists()).toBe(true);
    expect(wrapper.findAll("section.sl-rail")).toHaveLength(0);
    expect(wrapper.find(".streamloader-empty-state-stub").exists()).toBe(false);

    // Resolve everything → spinner tears down, content branch mounts.
    albumResolvers.forEach((r) => r([makeAlbum("uri:added:1")]));
    resolveRecent([]);
    await flushPromises();
    expect(wrapper.find(".streamloader-spinner-stub").exists()).toBe(false);
    expect(wrapper.findAll("section.sl-rail").length).toBeGreaterThan(0);
  });
});
