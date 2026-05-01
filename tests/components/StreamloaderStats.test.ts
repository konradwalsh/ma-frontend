import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { TaskStatus } from "@/plugins/api/interfaces";
import { translate } from "../i18n-mock";
import type { ActivityEntry } from "@/composables/useStreamloaderActivityLog";

// StreamloaderStats consolidates four data sources into one page:
//   - store.libraryTracksCount / Artists / Albums (library card)
//   - api.providers (provider card — same logic as HealthDot/Pill)
//   - useStreamloaderActivityLog().entries (activity card)
//   - a static "Coming soon" storage placeholder
//
// We hoist mutable mock state for each so tests can dial in any combo
// without restubbing module-by-module.
const { storeMock, apiMock, activityState } = vi.hoisted(() => ({
  storeMock: {
    libraryTracksCount: undefined as number | undefined,
    libraryArtistsCount: undefined as number | undefined,
    libraryAlbumsCount: undefined as number | undefined,
  },
  apiMock: {
    providers: {} as Record<
      string,
      { domain: string; name: string; available: boolean }
    >,
  },
  activityState: {
    entries: [] as ActivityEntry[],
  },
}));

vi.mock("@/plugins/store", () => ({ store: storeMock }));
vi.mock("@/plugins/api", () => ({ default: apiMock }));

vi.mock("@/composables/useStreamloaderActivityLog", async () => {
  const { ref: vueRef } = await import("vue");
  return {
    useStreamloaderActivityLog: () => ({
      entries: vueRef(activityState.entries),
    }),
  };
});

// Resolve i18n keys against the real en.json — the Stats view doesn't
// actually call useI18n() today, but child components might (Toolbar
// passes through, HealthDot does), so the shared mock keeps assertions
// robust if any of those propagate keys to the rendered DOM.
vi.mock("vue-i18n", async () => {
  const { vueI18nMock } = await import("../i18n-mock");
  return vueI18nMock();
});

// Stub the heavy chrome — Toolbar pulls in v-toolbar/v-btn/breakpoint
// helpers that aren't relevant to the data-rendering assertions, and
// Container wraps a v-container. Both are passthrough surfaces for this
// page, so a no-op stub keeps the mount fast and isolated.
//
// Each factory inlines its own `defineComponent` call because vi.mock
// factories are hoisted above any top-level helper, so referencing a
// shared constant here would throw ReferenceError at module-evaluation
// time.
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

// HealthDot has its own dedicated tests; here we only need it to mount
// without crashing the parent.
vi.mock("@/components/StreamloaderHealthDot.vue", async () => {
  const { defineComponent: dc, h: vh } = await import("vue");
  return {
    default: dc({
      name: "StreamloaderHealthDot",
      setup() {
        return () => vh("div", { class: "streamloader-health-dot-stub" });
      },
    }),
  };
});

import StreamloaderStats from "@/views/StreamloaderStats.vue";

const makeEntry = (overrides: Partial<ActivityEntry> = {}): ActivityEntry => ({
  id: overrides.id ?? `e-${Math.random()}`,
  taskId: overrides.taskId ?? "task-1",
  kind: overrides.kind ?? "download",
  status: overrides.status ?? TaskStatus.SUCCESS,
  message: overrides.message ?? "Downloaded x",
  timestamp: overrides.timestamp ?? Date.now(),
});

describe("StreamloaderStats.vue", () => {
  beforeEach(() => {
    storeMock.libraryTracksCount = undefined;
    storeMock.libraryArtistsCount = undefined;
    storeMock.libraryAlbumsCount = undefined;
    apiMock.providers = {};
    activityState.entries = [];
  });

  it("renders the library trio with formatted counts when store has values", () => {
    storeMock.libraryTracksCount = 12345;
    storeMock.libraryArtistsCount = 200;
    storeMock.libraryAlbumsCount = 999;
    const wrapper = mount(StreamloaderStats, {
      global: {
        // Templates use the global `$t` helper (not the composable) for
        // most strings. Wire it to the en.json-backed translator so the
        // rendered text matches what users see in production.
        mocks: {
          $t: (key: string, params?: Record<string, unknown>) =>
            translate(key, params),
        },
      },
    });
    const values = wrapper.findAll(".sl-stat-trio__value").map((n) => n.text());
    // 12345 -> "12k" (Math.round(12345/1000)), 200 stays "200", 999 stays "999".
    expect(values).toEqual(["12k", "200", "999"]);
    // The full title footer is the un-compacted, comma-grouped reference.
    expect(wrapper.text()).toContain("12,345 tracks");
    // Loading spinner should NOT render when counts are present.
    expect(wrapper.find(".streamloader-spinner-stub").exists()).toBe(false);
  });

  it("counts only download entries inside the 24h / 7d windows on the activity card", () => {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;
    activityState.entries = [
      // Inside 24h: counted in both 24h and 7d.
      makeEntry({ id: "1", kind: "download", timestamp: now - 2 * HOUR }),
      makeEntry({ id: "2", kind: "download", timestamp: now - 6 * HOUR }),
      // Outside 24h but inside 7d: counted only in 7d.
      makeEntry({ id: "3", kind: "download", timestamp: now - 3 * DAY }),
      // Wrong kind — should never be counted.
      makeEntry({ id: "4", kind: "scan", timestamp: now - 1 * HOUR }),
      // Outside 7d: ignored entirely.
      makeEntry({ id: "5", kind: "download", timestamp: now - 30 * DAY }),
    ];
    const wrapper = mount(StreamloaderStats, {
      global: {
        // Templates use the global `$t` helper (not the composable) for
        // most strings. Wire it to the en.json-backed translator so the
        // rendered text matches what users see in production.
        mocks: {
          $t: (key: string, params?: Record<string, unknown>) =>
            translate(key, params),
        },
      },
    });
    const pairValues = wrapper
      .findAll(".sl-stat-pair__value")
      .map((n) => n.text());
    expect(pairValues).toEqual(["2", "3"]);
    // "Tracked events" footer reflects the raw entries.length, not the
    // filtered windows — protects against accidentally hooking it to the
    // wrong source.
    expect(wrapper.text()).toContain("Tracked events");
    expect(wrapper.text()).toContain("5");
  });

  it("shows 'Online' on the provider card when streamloader is available", () => {
    apiMock.providers = {
      sl: { domain: "streamloader", name: "Streamloader", available: true },
    };
    const wrapper = mount(StreamloaderStats, {
      global: {
        // Templates use the global `$t` helper (not the composable) for
        // most strings. Wire it to the en.json-backed translator so the
        // rendered text matches what users see in production.
        mocks: {
          $t: (key: string, params?: Record<string, unknown>) =>
            translate(key, params),
        },
      },
    });
    const big = wrapper.findAll(".sl-stat-card__big").map((n) => n.text());
    // The provider card's big label is "Online" when available, the
    // storage card's big label is the muted "—" placeholder.
    expect(big).toContain("Online");
    expect(wrapper.text()).toContain("Streamloader");
  });

  it("renders the storage placeholder card with 'Coming soon' pill and pending footer", () => {
    const wrapper = mount(StreamloaderStats, {
      global: {
        // Templates use the global `$t` helper (not the composable) for
        // most strings. Wire it to the en.json-backed translator so the
        // rendered text matches what users see in production.
        mocks: {
          $t: (key: string, params?: Record<string, unknown>) =>
            translate(key, params),
        },
      },
    });
    const placeholder = wrapper.find(".sl-stat-card--placeholder");
    expect(placeholder.exists()).toBe(true);
    expect(placeholder.text()).toContain("Coming soon");
    expect(placeholder.text()).toContain("Pending backend support");
    // The muted big slot stays as the em-dash so we don't fabricate a value.
    expect(placeholder.find(".sl-stat-card__big--muted").text()).toBe("—");
  });
});
