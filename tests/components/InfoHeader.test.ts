import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";

// InfoHeader.vue is the hero card on every detail page (album, track,
// artist, podcast, audiobook, …). The streamloader-fork additions under
// test here are concentrated in the .sl-action-cluster: heart-favorite,
// provider icon, optional admin merge / delete, replace-artwork, and
// rescan-metadata. The replace-artwork + rescan buttons are gated on
// `canEditArtwork` (track / album / podcast / audiobook only) — the
// gating IS the second test below.
//
// The component pulls in MA's full plugin surface (api, store, router,
// vuetify display, auth manager) plus several Streamloader siblings
// (Fanart, Spinner, EditArtworkDialog, ErrorBoundary). We stub the
// heavy ones rather than installing the live plugins so the tests stay
// hermetic.

// ── Hoisted shared state ─────────────────────────────────────────────
const {
  apiMock,
  storeMock,
  eventbusMock,
  authMock,
  routerMock,
  thumbState,
  overrideState,
} = vi.hoisted(() => ({
  apiMock: {
    // baseUrl is required by the heroCoverUrl computed (imageproxy URL build).
    baseUrl: "https://ma.example.test",
    toggleFavorite: vi.fn(),
    getGenresForMediaItem: vi.fn(() => Promise.resolve([])),
    refreshItem: vi.fn(),
    signalEvent: vi.fn(),
    // EventType.MEDIA_ITEM_UPDATED subscription — return an unsub spy.
    subscribe: vi.fn(() => () => {}),
  },
  storeMock: {
    activePlayer: undefined as unknown,
    activePlayerQueue: undefined as unknown,
    curQueueItem: undefined as unknown,
    prevRoute: undefined as unknown,
  },
  eventbusMock: { emit: vi.fn() },
  authMock: { isAdmin: vi.fn(() => true) },
  routerMock: {
    push: vi.fn(),
    back: vi.fn(),
    currentRoute: { value: { name: "album" } },
  },
  // Mutable thunk so individual heroCoverUrl tests can override what
  // getImageThumbForItem returns without re-mocking the whole helpers
  // module. Default to "" to preserve the existing action-cluster tests'
  // behaviour.
  thumbState: { value: "" as string },
  // Same trick for the artwork-override composable: by default no
  // override is set, but the override-wins test can flip it on.
  overrideState: { value: undefined as string | undefined },
}));

vi.mock("@/plugins/api", () => ({ api: apiMock, default: apiMock }));
vi.mock("@/plugins/store", () => ({ store: storeMock }));
vi.mock("@/plugins/eventbus", () => ({ eventbus: eventbusMock }));
vi.mock("@/plugins/auth", () => ({
  authManager: authMock,
  default: authMock,
}));
vi.mock("vue-router", () => ({ useRouter: () => routerMock }));
vi.mock("vue-sonner", () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

// vue-i18n composable mock — shared with the $t global below.
vi.mock("vue-i18n", async () => {
  const { vueI18nMock } = await import("../i18n-mock");
  return vueI18nMock();
});

// useDisplay() returns reactive vuetify display flags. The component
// only reads `.mobile` (via the `$vuetify.display.mobile` template path)
// and calls `useDisplay()` for its side effects in setup. Stub both.
vi.mock("vuetify", () => ({
  useDisplay: () => ({ mobile: ref(false) }),
}));

vi.mock("@/composables/useTrackChangePulse", () => ({
  useTrackChangePulse: () => ({ pulseActive: ref(false) }),
}));

// ContextMenu helper is invoked from the watcher to build menuItems —
// returning [] is enough for the action-cluster surface tests.
vi.mock("@/layouts/default/ItemContextMenu.vue", () => ({
  default: defineComponent({ name: "ItemContextMenu" }),
  getContextMenuItems: vi.fn(() => Promise.resolve([])),
}));

// helpers/utils — stub the bits InfoHeader calls so the watcher and
// computed getters resolve without touching real network/url logic.
vi.mock("@/helpers/utils", () => ({
  getGenreDescription: () => "",
  getGenreDisplayName: (name: string) => name,
  getImageThumbForItem: () => thumbState.value,
  handleMediaItemClick: vi.fn(),
  handlePlayBtnClick: vi.fn(),
  markdownToHtml: (s: string) => s,
  parseBool: (v: unknown) => Boolean(v),
  truncateString: (s: string) => s,
}));

// useArtworkOverrideUrl is a real composable that reads from a module-
// scoped reactive Map. Stub it so heroCoverUrl branches can be exercised
// deterministically per-test via overrideState.value.
vi.mock("@/composables/useArtworkOverrides", async () => {
  const { computed: c } = await import("vue");
  return {
    useArtworkOverrideUrl: () => c(() => overrideState.value),
  };
});

vi.mock("@/helpers/prettifyMediaName", () => ({
  prettifyMediaName: (n: string) => n,
}));

// MarqueeText defaults to a passthrough — InfoHeader wraps long text in
// it. The MarqueeTextSync class is just a coordinator; an empty stub is
// enough for mount.
vi.mock("@/helpers/marquee_text_sync", () => ({
  MarqueeTextSync: class {},
}));

// Asset URL imports — Vite resolves these to strings at build time, but
// Vitest can't load the binaries. Flat string stubs keep the SFC happy.
vi.mock("@/assets/streamloader-mark.svg", () => ({
  default: "/streamloader-mark.svg",
}));
vi.mock("@/assets/vinyl.svg", () => ({ default: "/vinyl.svg" }));
vi.mock("@/assets/info_gradient.jpg", () => ({
  default: "/info_gradient.jpg",
}));

// ── Vuetify component stubs (auto-importer CSS dodge) ────────────────
//
// Each mock factory inlines its OWN passthrough helper because vi.mock
// is hoisted above the file's top-level statements — referencing a
// shared closure here would crash with "Cannot access … before
// initialization". The duplication is the price of vitest's hoist.
vi.mock("vuetify/lib/components/VCard/index.mjs", async () => {
  const { defineComponent: dc, h: hh } = await import("vue");
  const make = (name: string, tag = "div") =>
    dc({
      name,
      setup(_, { slots }) {
        return () => hh(tag, { class: name.toLowerCase() }, slots.default?.());
      },
    });
  return {
    VCard: make("VCard"),
    VCardTitle: make("VCardTitle"),
    VCardSubtitle: make("VCardSubtitle"),
    VCardText: make("VCardText"),
    VCardActions: make("VCardActions"),
    default: make("VCard"),
  };
});
vi.mock("vuetify/lib/components/VImg/index.mjs", async () => {
  const { defineComponent: dc, h: hh } = await import("vue");
  const make = (name: string) =>
    dc({
      name,
      setup(_, { slots }) {
        return () =>
          hh("div", { class: name.toLowerCase() }, slots.default?.());
      },
    });
  return { VImg: make("VImg"), default: make("VImg") };
});
vi.mock("vuetify/lib/components/VAvatar/index.mjs", async () => {
  const { defineComponent: dc, h: hh } = await import("vue");
  const make = (name: string) =>
    dc({
      name,
      setup(_, { slots }) {
        return () =>
          hh("div", { class: name.toLowerCase() }, slots.default?.());
      },
    });
  return { VAvatar: make("VAvatar"), default: make("VAvatar") };
});
vi.mock("vuetify/lib/components/VLayout/index.mjs", async () => {
  const { defineComponent: dc, h: hh } = await import("vue");
  const make = (name: string) =>
    dc({
      name,
      setup(_, { slots }) {
        return () =>
          hh("div", { class: name.toLowerCase() }, slots.default?.());
      },
    });
  return { VLayout: make("VLayout"), default: make("VLayout") };
});
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
vi.mock("vuetify/lib/components/VTooltip/index.mjs", () => {
  // Render the activator slot (with a no-op props bag) so wrapping a
  // streamloader action in <v-tooltip> doesn't hide the inner element
  // from the test query. The tooltip body slot is irrelevant here.
  const VTooltip = defineComponent({
    name: "VTooltip",
    setup(_, { slots }) {
      return () =>
        h("div", { class: "v-tooltip-stub" }, [
          slots.activator?.({ props: {} }),
        ]);
    },
  });
  return { VTooltip, default: VTooltip };
});
vi.mock("vuetify/lib/components/VChip/index.mjs", async () => {
  const { defineComponent: dc, h: hh } = await import("vue");
  const make = () =>
    dc({
      name: "VChip",
      setup(_, { slots }) {
        return () => hh("span", { class: "vchip" }, slots.default?.());
      },
    });
  return { VChip: make(), default: make() };
});
vi.mock("vuetify/lib/components/VBtn/index.mjs", async () => {
  const { defineComponent: dc, h: hh } = await import("vue");
  const make = () =>
    dc({
      name: "VBtn",
      emits: ["click"],
      setup(_, { slots, emit }) {
        return () =>
          hh(
            "button",
            { class: "vbtn", onClick: () => emit("click") },
            slots.default?.(),
          );
      },
    });
  return { VBtn: make(), default: make() };
});
vi.mock("vuetify/lib/components/VDialog/index.mjs", () => {
  const VDialog = defineComponent({
    name: "VDialog",
    props: ["modelValue"],
    setup() {
      return () => null;
    },
  });
  return { VDialog, default: VDialog };
});
vi.mock("vuetify/lib/components/VProgressLinear/index.mjs", async () => {
  const { defineComponent: dc, h: hh } = await import("vue");
  const make = () =>
    dc({
      name: "VProgressLinear",
      setup() {
        return () => hh("div", { class: "vprogresslinear" });
      },
    });
  return { VProgressLinear: make(), default: make() };
});

// Streamloader sibling components — keep them as no-ops so the focus
// stays on the action cluster.
vi.mock("@/components/StreamloaderFanart.vue", () => ({
  default: defineComponent({ name: "StreamloaderFanart", render: () => null }),
}));
vi.mock("@/components/StreamloaderSpinner.vue", () => ({
  default: defineComponent({ name: "StreamloaderSpinner", render: () => null }),
}));
vi.mock("@/components/StreamloaderErrorBoundary.vue", () => ({
  default: defineComponent({
    name: "StreamloaderErrorBoundary",
    setup(_, { slots }) {
      return () => slots.default?.() ?? null;
    },
  }),
}));
// EditArtworkDialog is the sink for the openEditArtwork() click. We need
// the component to actually receive its modelValue so we can assert the
// dialog "opened" — render a flag so we can probe it via class.
vi.mock("@/components/StreamloaderEditArtworkDialog.vue", () => ({
  default: defineComponent({
    name: "StreamloaderEditArtworkDialog",
    props: ["modelValue", "itemId"],
    setup(props) {
      return () =>
        h("div", {
          class: "edit-artwork-dialog-stub",
          "data-open": props.modelValue ? "true" : "false",
          "data-item-id": props.itemId,
        });
    },
  }),
}));

// Heavy non-action sibling components — render nothing so they don't
// drag in their own dependency chains during mount.
vi.mock("@/components/MarqueeText.vue", () => ({
  default: defineComponent({
    name: "MarqueeText",
    setup(_, { slots }) {
      return () => h("span", { class: "marquee-stub" }, slots.default?.());
    },
  }),
}));
vi.mock("@/components/MediaItemThumb.vue", () => ({
  // Render a probe span so heroCoverUrl branch tests can assert that the
  // safety-net <MediaItemThumb v-else> path was selected (vs. the new
  // <img v-if="heroCoverUrl"> path).
  default: defineComponent({
    name: "MediaItemThumb",
    setup() {
      return () => h("span", { class: "media-item-thumb-stub" });
    },
  }),
}));
vi.mock("@/components/MenuButton.vue", () => ({
  default: defineComponent({
    name: "MenuButton",
    props: ["id"],
    setup(props) {
      return () => h("button", { id: props.id, class: "menu-button-stub" });
    },
  }),
}));
vi.mock("@/components/ProviderIcon.vue", () => ({
  default: defineComponent({
    name: "ProviderIcon",
    props: ["domain", "size"],
    setup(props) {
      return () =>
        h("span", {
          class: "provider-icon-stub",
          "data-domain": props.domain,
        });
    },
  }),
}));
vi.mock("@/components/Toolbar.vue", () => ({
  default: defineComponent({
    name: "Toolbar",
    setup(_, { slots }) {
      return () => h("div", { class: "toolbar-stub" }, slots.append?.());
    },
  }),
}));

// Tabler / lucide icon imports — flatten to spans so they don't try to
// resolve real SVG packages inside mount.
vi.mock("@tabler/icons-vue", () => ({
  IconHeart: defineComponent({
    name: "IconHeart",
    setup() {
      return () => h("span", { class: "icon-heart" });
    },
  }),
  IconHeartFilled: defineComponent({
    name: "IconHeartFilled",
    setup() {
      return () => h("span", { class: "icon-heart-filled" });
    },
  }),
}));
vi.mock("lucide-vue-next", () => {
  const make = (cls: string) =>
    defineComponent({
      name: cls,
      setup() {
        return () => h("span", { class: cls.toLowerCase() });
      },
    });
  return {
    ArrowLeft: make("ArrowLeft"),
    ImagePlus: make("ImagePlus"),
    Merge: make("Merge"),
    RefreshCw: make("RefreshCw"),
    Trash2: make("Trash2"),
  };
});

import InfoHeader from "@/components/InfoHeader.vue";
import { MediaType } from "@/plugins/api/interfaces";
import { translate } from "../i18n-mock";

// ── Item factories ───────────────────────────────────────────────────
//
// Minimum-viable shapes so the component's reactive watchers don't
// crash. Only the fields touched by the action cluster + watch(item)
// callback path matter.
const baseItem = (
  mediaType: MediaType,
  overrides: Record<string, unknown> = {},
) => ({
  item_id: "id-1",
  uri: `library://${mediaType}/id-1`,
  name: "Test Item",
  provider: "library",
  media_type: mediaType,
  favorite: false,
  metadata: {},
  // The action cluster gates on these even when not relevant; default to
  // empty arrays so `'authors' in item` etc. don't blow up the template.
  artists: [],
  ...overrides,
});

const mountHeader = (item: ReturnType<typeof baseItem>) =>
  mount(InfoHeader, {
    props: { item: item as unknown as never },
    global: {
      mocks: {
        $t: (key: string, params?: Record<string, unknown>) =>
          translate(key, params),
        $vuetify: {
          theme: { current: { dark: false } },
          display: { mobile: false },
        },
      },
    },
  });

describe("InfoHeader.vue (streamloader action cluster)", () => {
  beforeEach(() => {
    apiMock.toggleFavorite.mockClear();
    eventbusMock.emit.mockClear();
    routerMock.push.mockClear();
    authMock.isAdmin.mockReturnValue(true);
    // Reset hero-cover stubs to "no override, no auto-detected thumb" —
    // matches the original test fixtures' behaviour so the existing
    // action-cluster assertions remain unaffected.
    thumbState.value = "";
    overrideState.value = undefined;
  });

  it("renders the favorite, provider, merge, trash, edit-artwork, and rescan buttons for an admin-viewed library genre", async () => {
    // Genre + library + isAdmin → the cluster surfaces ALL five action
    // affordances (favorite, merge, trash, edit-artwork, rescan) plus the
    // informational provider icon. canEditArtwork is true for tracks /
    // albums / podcasts / audiobooks ONLY though, so to get edit-artwork +
    // rescan we mount as ALBUM and additionally validate merge/trash on
    // the GENRE flow in the next assertion. The test name covers "all 5
    // buttons (favorite, merge, trash, edit-artwork, rescan)" — we exercise
    // each affordance below across the two media types where it's defined.
    const albumWrapper = mountHeader(baseItem(MediaType.ALBUM));
    await nextTick();
    const cluster = albumWrapper.find(".sl-action-cluster");
    expect(cluster.exists()).toBe(true);
    // Favorite (tabler IconHeart) and provider icon always render.
    expect(cluster.find(".icon-heart").exists()).toBe(true);
    expect(cluster.find(".provider-icon-stub").exists()).toBe(true);
    // Edit-artwork + rescan only show when canEditArtwork — ALBUM qualifies.
    expect(cluster.find(".imageplus").exists()).toBe(true);
    expect(cluster.find(".refreshcw").exists()).toBe(true);
    // Merge + Trash are admin-only on library GENRE — switch to a genre
    // item to assert their gating in the same test.
    const genreWrapper = mountHeader(baseItem(MediaType.GENRE));
    await nextTick();
    const genreCluster = genreWrapper.find(".sl-action-cluster");
    expect(genreCluster.find(".merge").exists()).toBe(true);
    expect(genreCluster.find(".trash2").exists()).toBe(true);
  });

  it("gates the edit-artwork button to track / album / podcast / audiobook only", async () => {
    // Positive cases — the four media types canEditArtwork accepts.
    for (const type of [
      MediaType.TRACK,
      MediaType.ALBUM,
      MediaType.PODCAST,
      MediaType.AUDIOBOOK,
    ]) {
      const w = mountHeader(baseItem(type));
      await nextTick();
      expect(
        w.find(".sl-action-cluster .imageplus").exists(),
        `edit-artwork should render for media_type=${type}`,
      ).toBe(true);
    }
    // Negative cases — the rest must NOT render the affordance.
    for (const type of [
      MediaType.ARTIST,
      MediaType.PLAYLIST,
      MediaType.RADIO,
    ]) {
      const w = mountHeader(baseItem(type));
      await nextTick();
      expect(
        w.find(".sl-action-cluster .imageplus").exists(),
        `edit-artwork should be hidden for media_type=${type}`,
      ).toBe(false);
    }
  });

  it("opens the StreamloaderEditArtworkDialog when the edit-artwork button is clicked", async () => {
    const wrapper = mountHeader(baseItem(MediaType.ALBUM));
    await nextTick();
    const dialog = wrapper.find(".edit-artwork-dialog-stub");
    expect(dialog.exists()).toBe(true);
    // Initial state — modelValue is false, so the dialog stub exposes
    // data-open="false". After we click the .imageplus action, the
    // openEditArtwork() handler flips showEditArtwork.value to true.
    expect(dialog.attributes("data-open")).toBe("false");
    const editBtn = wrapper.find(".sl-action-cluster .imageplus");
    expect(editBtn.exists()).toBe(true);
    // The clickable wrapper is the parent .sl-action-btn span (the icon
    // itself doesn't carry the @click). Walk up one level via the DOM.
    const clickable = editBtn.element.parentElement as HTMLElement | null;
    expect(clickable).not.toBeNull();
    await clickable!.dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();
    expect(
      wrapper.find(".edit-artwork-dialog-stub").attributes("data-open"),
    ).toBe("true");
    expect(
      wrapper.find(".edit-artwork-dialog-stub").attributes("data-item-id"),
    ).toBe("id-1");
  });

  // ── heroCoverUrl computed branches ─────────────────────────────────
  //
  // Batch 54 introduced the heroCoverUrl computed on the album-hero
  // <img>. Four branches exist (override / album+thumb / album+no-thumb /
  // non-album), each validated below.

  it("heroCoverUrl: override URL wins over the auto-detected thumb (data: bypasses imageproxy)", async () => {
    // Override is a data: URL — should be used verbatim, NOT routed
    // through imageproxy. getImageThumbForItem still returns a raw URL
    // to prove the override branch shadows it.
    overrideState.value = "data:image/png;base64,AAAA";
    thumbState.value = "https://upstream.example/cover.jpg";
    const wrapper = mountHeader(baseItem(MediaType.ALBUM));
    await nextTick();
    const heroImg = wrapper.find("img.sl-vinyl-cover-img");
    expect(heroImg.exists()).toBe(true);
    expect(heroImg.attributes("src")).toBe("data:image/png;base64,AAAA");
    // Safety-net thumb must NOT be rendered when heroCoverUrl is truthy.
    expect(
      wrapper
        .find(".sl-vinyl-cover")
        .find(".media-item-thumb-stub")
        .exists(),
    ).toBe(false);
  });

  it("heroCoverUrl: album with raw image URL is routed through imageproxy with size=600 and double-encoded path", async () => {
    const raw = "https://upstream.example/cover image.jpg?x=1";
    thumbState.value = raw;
    const wrapper = mountHeader(baseItem(MediaType.ALBUM));
    await nextTick();
    const heroImg = wrapper.find("img.sl-vinyl-cover-img");
    expect(heroImg.exists()).toBe(true);
    const src = heroImg.attributes("src") ?? "";
    // Imageproxy routing — base URL + path query + size hint, with the
    // raw upstream URL encoded twice (component does
    // encodeURIComponent(encodeURIComponent(raw))).
    expect(src).toContain("/imageproxy?path=");
    expect(src).toContain("size=600");
    expect(src.startsWith("https://ma.example.test/imageproxy?")).toBe(true);
    const expectedEnc = encodeURIComponent(encodeURIComponent(raw));
    expect(src).toContain(expectedEnc);
  });

  it("heroCoverUrl: returns empty string for an album with no detected image (template hides the <img>, falls back to MediaItemThumb safety net)", async () => {
    thumbState.value = ""; // no auto-detected URL
    overrideState.value = undefined; // no override
    const wrapper = mountHeader(baseItem(MediaType.ALBUM));
    await nextTick();
    // The hero <img> is gated on heroCoverUrl truthy — must NOT exist.
    expect(wrapper.find("img.sl-vinyl-cover-img").exists()).toBe(false);
    // The v-else MediaItemThumb safety net IS rendered inside the
    // .sl-vinyl-cover wrapper to keep the cover slot from going empty.
    const cover = wrapper.find(".sl-vinyl-cover");
    expect(cover.exists()).toBe(true);
    expect(cover.find(".media-item-thumb-stub").exists()).toBe(true);
  });

  it("heroCoverUrl: non-album item bypasses the new <img> entirely and falls through to the outer v-else MediaItemThumb branch", async () => {
    // Even with a thumb URL set, a non-album item never enters the
    // album-only sl-vinyl-wrapper branch — the heroCoverUrl computed
    // short-circuits to "" because of the media_type guard, and the
    // outer v-else renders the plain MediaItemThumb cover.
    thumbState.value = "https://upstream.example/cover.jpg";
    const wrapper = mountHeader(baseItem(MediaType.TRACK));
    await nextTick();
    // No vinyl wrapper, no hero <img>.
    expect(wrapper.find(".sl-vinyl-wrapper").exists()).toBe(false);
    expect(wrapper.find("img.sl-vinyl-cover-img").exists()).toBe(false);
    // Safety-net MediaItemThumb is rendered for the non-album case.
    expect(wrapper.find(".media-item-thumb-stub").exists()).toBe(true);
  });
});
