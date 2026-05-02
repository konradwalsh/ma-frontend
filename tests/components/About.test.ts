import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";

// About.vue lives at views/settings/About.vue but the streamloader-fork
// brand-card additions (batch 50) are the surface under test, so the
// peer test sits next to the rest of the streamloader component coverage
// in tests/components/. Same convention as StreamloaderSettings.test.ts.

// Hoisted mocks shared between vi.mock factories and the test cases.
const { apiMock, eventbusMock, storeMock } = vi.hoisted(() => ({
  apiMock: {
    serverInfo: {
      value: {
        server_version: "0.0.0-test",
        base_url: "http://test.local",
        homeassistant_addon: false,
      },
    },
    // Library-count getters fire from onMounted — return resolved promises so
    // the component can finish its mount lifecycle without unhandled rejects.
    getLibraryArtistsCount: vi.fn(() => Promise.resolve(0)),
    getLibraryAlbumsCount: vi.fn(() => Promise.resolve(0)),
    getLibraryTracksCount: vi.fn(() => Promise.resolve(0)),
    getLibraryPlaylistsCount: vi.fn(() => Promise.resolve(0)),
    getLibraryRadiosCount: vi.fn(() => Promise.resolve(0)),
    getLibraryGenresCount: vi.fn(() => Promise.resolve(0)),
  },
  eventbusMock: { emit: vi.fn() },
  storeMock: {
    libraryArtistsCount: 0,
    libraryAlbumsCount: 0,
    libraryTracksCount: 0,
    libraryPlaylistsCount: 0,
    libraryRadiosCount: 0,
    libraryGenresCount: 0,
  },
}));

vi.mock("@/plugins/api", () => ({ api: apiMock, default: apiMock }));
vi.mock("@/plugins/eventbus", () => ({ eventbus: eventbusMock }));
vi.mock("@/plugins/store", () => ({ store: storeMock }));

// Pin the fork version so test assertions don't drift with every release
// bump. Mirrors the trick used by StreamloaderWhatsNewDialog.test.ts.
vi.mock("@/composables/useWhatsNewVersion", () => ({
  WHATS_NEW_VERSION: "9999.7.42",
}));

// SVG asset URLs come back as strings from Vite's URL loader at runtime,
// but Vitest can't resolve the binary import — stub both to a flat path.
vi.mock("@/assets/streamloader-mark.svg", () => ({
  default: "/streamloader-mark.svg",
}));
vi.mock("@/assets/open-home-foundation-logo.svg", () => ({
  default: "/open-home-foundation-logo.svg",
}));

// Resolve i18n keys against the real en.json so the brand-tagline /
// what's-new / fork-version-label copy assertions stay honest.
vi.mock("vue-i18n", async () => {
  const { vueI18nMock } = await import("../i18n-mock");
  return vueI18nMock();
});

// Same shadcn/Container stubs as StreamloaderSettings.test.ts. The
// component's logic doesn't depend on these wrappers — they're purely
// layout primitives that we want to render their default slots.
vi.mock("@/components/Container.vue", () => ({
  default: defineComponent({
    name: "Container",
    setup(_, { slots }) {
      return () => h("div", { class: "container-stub" }, slots.default?.());
    },
  }),
}));

vi.mock("@/components/ui/card", () => {
  const passthrough = (name: string, tag: string, cls?: string) =>
    defineComponent({
      name,
      setup(_, { slots }) {
        return () => h(tag, cls ? { class: cls } : {}, slots.default?.());
      },
    });
  return {
    Card: passthrough("Card", "section", "card-stub"),
    CardHeader: passthrough("CardHeader", "header"),
    CardTitle: passthrough("CardTitle", "h2"),
    CardDescription: passthrough("CardDescription", "p"),
    CardContent: passthrough("CardContent", "div"),
  };
});

vi.mock("@/components/ui/item", () => {
  const passthrough = (name: string, cls?: string) =>
    defineComponent({
      name,
      setup(_, { slots }) {
        return () => h("div", cls ? { class: cls } : {}, slots.default?.());
      },
    });
  return {
    Item: passthrough("Item", "item-stub"),
    ItemContent: passthrough("ItemContent", "item-content-stub"),
    ItemTitle: passthrough("ItemTitle"),
  };
});

vi.mock("@/components/ui/badge", () => ({
  Badge: defineComponent({
    name: "Badge",
    setup(_, { slots }) {
      return () => h("span", { class: "badge-stub" }, slots.default?.());
    },
  }),
}));

// Vuetify VIcon — same auto-importer-CSS dodge as the other tests.
vi.mock("vuetify/lib/components/VIcon/index.mjs", () => {
  const VIcon = defineComponent({
    name: "VIcon",
    props: ["icon", "size"],
    setup(props, { slots }) {
      return () =>
        h(
          "i",
          { class: "v-icon-stub", "data-icon": props.icon },
          slots.default?.(),
        );
    },
  });
  return { VIcon, default: VIcon };
});

import About from "@/views/settings/About.vue";
import { translate } from "../i18n-mock";

// About.vue uses the template-global `$t` (Options API surface from
// vue-i18n's plugin) AND the imported `useI18n()` `t` — the latter is
// covered by our vi.mock above, but `$t` only exists when the i18n
// plugin is `app.use()`-installed. We don't want to install the real
// plugin (it'd compile en.json's AST nodes — see i18n-mock.ts header
// comment), so wire `$t` straight into globalProperties using the same
// translator the composable mock uses.
const mountAbout = () =>
  mount(About, {
    global: {
      mocks: {
        $t: (key: string, params?: Record<string, unknown>) =>
          translate(key, params),
      },
      stubs: {
        "v-icon": defineComponent({
          name: "VIconStub",
          props: ["icon", "size"],
          setup(props) {
            return () =>
              h("i", { class: "v-icon-stub", "data-icon": props.icon });
          },
        }),
      },
    },
  });

describe("About.vue (streamloader-fork brand additions)", () => {
  beforeEach(() => {
    eventbusMock.emit.mockClear();
  });

  it("renders the streamloader brand card at the top", () => {
    const wrapper = mountAbout();
    // The brand card carries the .streamloader-brand-card class — its
    // presence is the load-bearing signal that the fork header card mounted
    // ABOVE the upstream MA section. Also assert the wordmark + tagline copy
    // (resolved from en.json by the shared i18n mock) so a CSS rename and
    // an accidental copy regression both surface here.
    const brandCard = wrapper.find(".streamloader-brand-card");
    expect(brandCard.exists()).toBe(true);
    expect(brandCard.text()).toContain("streamloader");
    expect(brandCard.text()).toContain(
      "A streamloader-flavored fork of Music Assistant.",
    );
  });

  it("renders the fork version pill from WHATS_NEW_VERSION", () => {
    const wrapper = mountAbout();
    // The .version-pill chip inside the brand card mirrors WHATS_NEW_VERSION
    // verbatim. We pinned the constant to "9999.7.42" above so the assertion
    // is stable across release bumps.
    const brandCard = wrapper.find(".streamloader-brand-card");
    const pill = brandCard.find(".version-pill");
    expect(pill.exists()).toBe(true);
    expect(pill.text()).toBe("9999.7.42");
    // The "Last update" sibling line is derived from the same constant —
    // YYYY.M prefix → "<MonthName> <Year>". Confirm the derived label too.
    expect(brandCard.text()).toContain("July 9999");
  });

  it("emits sl-whats-new:show on the eventbus when What's new is clicked", async () => {
    const wrapper = mountAbout();
    const btn = wrapper.find(".sl-whats-new-btn");
    expect(btn.exists()).toBe(true);
    await btn.trigger("click");
    // The handler is a one-liner that emits the dialog-show signal — the
    // dialog itself lives in Default.vue, so the eventbus emit IS the
    // contract. Call args mirror the production EventbusEvents typing
    // (`"sl-whats-new:show": void`).
    expect(eventbusMock.emit).toHaveBeenCalledTimes(1);
    expect(eventbusMock.emit).toHaveBeenCalledWith("sl-whats-new:show");
  });

  it("renders the upstream MA cards below the divider", () => {
    const wrapper = mountAbout();
    // The teal divider with role="separator" marks the boundary — anything
    // below it must include the upstream "Version Information" card and
    // the Open Home Foundation credit. We assert via i18n-resolved copy
    // since the shadcn Card stubs don't carry distinguishing classes.
    const divider = wrapper.find(".sl-upstream-divider");
    expect(divider.exists()).toBe(true);
    expect(divider.attributes("role")).toBe("separator");
    const text = wrapper.text();
    // "settings.version_info" → "Version Information" (per en.json)
    expect(text).toContain("Version Information");
    // The Open Home Foundation credit blurb is hard-coded literal copy
    // in the upstream card — checking it confirms that block survived
    // the fork's brand-card insertion above.
    expect(text).toContain(
      "streamloader is built on Music Assistant, a product from the Open Home Foundation",
    );
    // Library Statistics card heading
    expect(text).toContain("Library Statistics");
  });
});

// Touch the unused-import lint silencer so the test file can import `ref`
// without ESLint complaining — `ref` is referenced here so future
// additions can use it without retouching the import block.
void ref;
