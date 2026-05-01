import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { translate } from "../i18n-mock";

// StreamloaderRecentlyPlayed reads from api.getRecentlyPlayedItems(limit)
// and subscribes to MEDIA_ITEM_PLAYED for live refresh. We hoist a
// mutable result + subscribe spy so each test can drive what the API
// returns and verify subscribe wiring without spinning up the websocket
// layer.
const { apiMock, routerPushMock, storeMock } = vi.hoisted(() => ({
  apiMock: {
    getRecentlyPlayedItems: vi.fn<(limit: number) => Promise<unknown[]>>(
      async () => [],
    ),
    subscribe: vi.fn(() => () => {}),
    providers: {} as Record<string, unknown>,
  },
  routerPushMock: vi.fn(),
  storeMock: {
    activePlayerQueue: undefined as unknown,
  },
}));

vi.mock("@/plugins/api", () => ({ default: apiMock }));
vi.mock("@/plugins/store", () => ({ store: storeMock }));

vi.mock("@/plugins/api/helpers", () => ({
  // Production helper inspects the item; for the grid render assertions
  // it's enough to claim everything is available so the prop wiring
  // doesn't depend on a real ItemMapping shape.
  itemIsAvailable: () => true,
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

// Resolve i18n keys against the real en.json so chip labels and the
// empty-state copy match what the user actually sees.
vi.mock("vue-i18n", async () => {
  const { vueI18nMock } = await import("../i18n-mock");
  return vueI18nMock();
});

// Stub the page chrome and child components — same rationale as the
// Stats test. PanelviewItemCompact pulls in MediaItemThumb + favorites
// helpers we don't care about here; the per-item render is asserted by
// counting stub instances instead.
//
// Each factory inlines its own `defineComponent` call because vi.mock
// factories are hoisted above any top-level helper, so referencing a
// shared constant here would throw ReferenceError at module-evaluation.
vi.mock("@/components/Toolbar.vue", async () => {
  const { defineComponent: dc, h: vh } = await import("vue");
  return {
    default: dc({
      name: "Toolbar",
      setup(_, { slots }) {
        return () => vh("div", { class: "toolbar" }, slots.default?.());
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
        return () => vh("div", { class: "container" }, slots.default?.());
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

vi.mock("@/components/PanelviewItemCompact.vue", async () => {
  const { defineComponent: dc, h: vh } = await import("vue");
  return {
    default: dc({
      name: "PanelviewItemCompact",
      props: ["item", "isAvailable"],
      setup(props) {
        return () =>
          vh("div", {
            class: "panel-item-stub",
            "data-uri": (props.item as { uri?: string })?.uri,
          });
      },
    }),
  };
});

vi.mock("@/components/StreamloaderEmptyState.vue", async () => {
  const { defineComponent: dc, h: vh } = await import("vue");
  return {
    default: dc({
      name: "StreamloaderEmptyState",
      props: ["icon", "title", "message", "ctaLabel", "ctaAction"],
      setup(props) {
        return () =>
          vh(
            "div",
            {
              class: "streamloader-empty-state-stub",
              "data-title": props.title,
            },
            [
              vh(
                "button",
                {
                  class: "empty-cta",
                  onClick: () => (props.ctaAction as () => void)?.(),
                },
                String(props.ctaLabel ?? ""),
              ),
            ],
          );
      },
    }),
  };
});

import StreamloaderRecentlyPlayed from "@/views/StreamloaderRecentlyPlayed.vue";

const makeItem = (uri: string) => ({
  uri,
  name: uri,
  media_type: "track",
  provider: "streamloader",
});

describe("StreamloaderRecentlyPlayed.vue", () => {
  beforeEach(() => {
    apiMock.getRecentlyPlayedItems.mockReset();
    apiMock.subscribe.mockClear();
    routerPushMock.mockReset();
    storeMock.activePlayerQueue = undefined;
  });

  it("renders one PanelviewItemCompact per loaded item", async () => {
    apiMock.getRecentlyPlayedItems.mockResolvedValueOnce([
      makeItem("uri:1"),
      makeItem("uri:2"),
      makeItem("uri:3"),
    ]);
    const wrapper = mount(StreamloaderRecentlyPlayed, {
      global: {
        // Templates use the global `$t` helper for the toolbar title and
        // chip aria-labels — wire it to the en.json-backed translator so
        // the rendered text matches what users see in production.
        mocks: {
          $t: (key: string, params?: Record<string, unknown>) =>
            translate(key, params),
        },
      },
    });
    await flushPromises();
    const cards = wrapper.findAll(".panel-item-stub");
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.attributes("data-uri"))).toEqual([
      "uri:1",
      "uri:2",
      "uri:3",
    ]);
    // The empty state must not render alongside results.
    expect(wrapper.find(".streamloader-empty-state-stub").exists()).toBe(false);
  });

  it("clipping by chip limit narrows visible items when 'Today' is selected", async () => {
    // Return 30 items so the 'Today' chip (limit 10) clips them.
    const items = Array.from({ length: 30 }, (_, i) => makeItem(`uri:${i}`));
    apiMock.getRecentlyPlayedItems.mockResolvedValueOnce(items);
    const wrapper = mount(StreamloaderRecentlyPlayed, {
      global: {
        // Templates use the global `$t` helper for the toolbar title and
        // chip aria-labels — wire it to the en.json-backed translator so
        // the rendered text matches what users see in production.
        mocks: {
          $t: (key: string, params?: Record<string, unknown>) =>
            translate(key, params),
        },
      },
    });
    await flushPromises();

    // Default chip is 'week' (limit 25).
    expect(wrapper.findAll(".panel-item-stub")).toHaveLength(25);

    // Click the first chip ("Today") and re-check.
    const chips = wrapper.findAll(".sl-rp-chip");
    expect(chips.length).toBeGreaterThanOrEqual(2);
    expect(chips[0].text()).toBe("Today");
    await chips[0].trigger("click");
    expect(wrapper.findAll(".panel-item-stub")).toHaveLength(10);
    // aria-selected flips correctly so the tablist stays accessible.
    expect(chips[0].attributes("aria-selected")).toBe("true");
  });

  it("renders the empty state (and not the grid) when the API yields no items", async () => {
    apiMock.getRecentlyPlayedItems.mockResolvedValueOnce([]);
    const wrapper = mount(StreamloaderRecentlyPlayed, {
      global: {
        // Templates use the global `$t` helper for the toolbar title and
        // chip aria-labels — wire it to the en.json-backed translator so
        // the rendered text matches what users see in production.
        mocks: {
          $t: (key: string, params?: Record<string, unknown>) =>
            translate(key, params),
        },
      },
    });
    await flushPromises();
    const empty = wrapper.find(".streamloader-empty-state-stub");
    expect(empty.exists()).toBe(true);
    expect(empty.attributes("data-title")).toBe("Nothing played yet");
    expect(wrapper.find(".sl-rp-grid").exists()).toBe(false);

    // Clicking the CTA delegates to router.push({ name: 'discover' }) — the
    // empty-state stub triggers ctaAction directly.
    await empty.find(".empty-cta").trigger("click");
    expect(routerPushMock).toHaveBeenCalledWith({ name: "discover" });
  });

  it("shows the streamloader spinner during the initial load", async () => {
    // Withhold the resolution so the loading branch stays mounted.
    let resolve: (v: unknown[]) => void = () => {};
    apiMock.getRecentlyPlayedItems.mockImplementationOnce(
      () =>
        new Promise<unknown[]>((r) => {
          resolve = r;
        }),
    );
    const wrapper = mount(StreamloaderRecentlyPlayed, {
      global: {
        // Templates use the global `$t` helper for the toolbar title and
        // chip aria-labels — wire it to the en.json-backed translator so
        // the rendered text matches what users see in production.
        mocks: {
          $t: (key: string, params?: Record<string, unknown>) =>
            translate(key, params),
        },
      },
    });
    // Initial render: loading branch is mounted, neither grid nor empty
    // state yet.
    expect(wrapper.find(".streamloader-spinner-stub").exists()).toBe(true);
    expect(wrapper.find(".sl-rp-grid").exists()).toBe(false);
    expect(wrapper.find(".streamloader-empty-state-stub").exists()).toBe(false);

    // Resolve and confirm the loading branch tears down.
    resolve([makeItem("uri:1")]);
    await flushPromises();
    expect(wrapper.find(".streamloader-spinner-stub").exists()).toBe(false);
    expect(wrapper.findAll(".panel-item-stub")).toHaveLength(1);
  });
});
