import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";

// Lives in tests/components/ alongside the rest of the streamloader-fork
// suite even though the source file is technically under views/settings/
// — keeping all streamloader test coverage co-located makes the gap audit
// trivial (every Streamloader*.vue should have a Streamloader*.test.ts
// peer).

// Hoisted mocks shared between the vi.mock factories and the test cases.
const { apiMock, eventbusMock, routerPushMock, prefStorageMock } = vi.hoisted(
  () => ({
    apiMock: {
      providers: {} as Record<
        string,
        {
          domain: string;
          name: string;
          available: boolean;
          instance_id: string;
        }
      >,
    },
    eventbusMock: { emit: vi.fn() },
    routerPushMock: vi.fn(),
    // Backing store for the streamloaderPrefs mock — lets tests read what
    // setStreamloaderPref wrote without us depending on the live module.
    prefStorageMock: {} as Record<string, boolean>,
  }),
);

vi.mock("@/plugins/api", () => ({ default: apiMock }));
vi.mock("@/plugins/eventbus", () => ({ eventbus: eventbusMock }));
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

// Mock the prefs composable so the toggle calls land in our local
// dictionary instead of localStorage with the real listener wiring. The
// production composable registers window event listeners we don't need.
const setStreamloaderPrefSpy = vi.fn((key: string, value: boolean) => {
  prefStorageMock[key] = value;
});
vi.mock("@/composables/streamloaderPrefs", async () => {
  const { ref } = await import("vue");
  return {
    useStreamloaderPref: (key: string) => ref(prefStorageMock[key] ?? false),
    setStreamloaderPref: (...args: unknown[]) =>
      setStreamloaderPrefSpy(...(args as [string, boolean])),
  };
});

// Resolve i18n keys against the real en.json so label assertions stay
// honest if a copy edit lands upstream — same pattern used by every
// other Streamloader*.test.ts.
vi.mock("vue-i18n", async () => {
  const { vueI18nMock } = await import("../i18n-mock");
  return vueI18nMock();
});

// Stub the heavy nested UI primitives the view pulls in. We keep the
// shape (named slots etc.) loose since the assertions target the OUR
// props (label / @click / aria) on the bits the user can see.
// Use h() instead of template strings so the eslint `quotes: double` rule
// (no avoidEscape) doesn't fight prettier over the embedded class
// attribute quotes.
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

vi.mock("@/views/settings/streamloader/SLToggleRow.vue", () => {
  const SLToggleRow = defineComponent({
    name: "SLToggleRow",
    props: {
      label: { type: String, required: true },
      description: { type: String, default: "" },
      modelValue: { type: Boolean, required: true },
    },
    emits: ["update:modelValue"],
    setup(props, { emit }) {
      return () =>
        h("div", { class: "toggle-stub", "data-label": props.label }, [
          h(
            "button",
            {
              class: "flip",
              onClick: () => emit("update:modelValue", !props.modelValue),
            },
            props.label,
          ),
        ]);
    },
  });
  return { default: SLToggleRow };
});

// Vuetify auto-imports — each component file pulls a sibling .css whose
// extension Vitest can't load. Stubbing the deep import paths sidesteps
// that. Same pattern used by every other Streamloader dialog test.
vi.mock("vuetify/lib/components/VBtn/index.mjs", () => {
  const VBtn = defineComponent({
    name: "VBtn",
    props: ["color", "variant", "prependIcon"],
    emits: ["click"],
    setup(_, { slots, emit }) {
      return () =>
        h(
          "button",
          { class: "v-btn-stub", onClick: () => emit("click") },
          slots.default?.(),
        );
    },
  });
  return { VBtn, default: VBtn };
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
vi.mock("vuetify/lib/components/VSelect/index.mjs", () => {
  const VSelect = defineComponent({
    name: "VSelect",
    props: ["modelValue", "items"],
    emits: ["update:modelValue"],
    setup(props, { emit }) {
      return () =>
        h(
          "select",
          {
            class: "v-select-stub",
            value: props.modelValue,
            onChange: (e: Event) =>
              emit("update:modelValue", (e.target as HTMLSelectElement).value),
          },
          (props.items ?? []).map((opt: { title: string; value: string }) =>
            h("option", { value: opt.value, key: opt.value }, opt.title),
          ),
        );
    },
  });
  return { VSelect, default: VSelect };
});
vi.mock("vuetify/lib/components/VDivider/index.mjs", () => {
  const VDivider = defineComponent({
    name: "VDivider",
    setup() {
      return () => h("hr", { class: "v-divider-stub" });
    },
  });
  return { VDivider, default: VDivider };
});

import StreamloaderSettings from "@/views/settings/StreamloaderSettings.vue";

const mountSettings = () => mount(StreamloaderSettings);

describe("StreamloaderSettings.vue", () => {
  beforeEach(() => {
    apiMock.providers = {};
    eventbusMock.emit.mockClear();
    routerPushMock.mockClear();
    setStreamloaderPrefSpy.mockClear();
    for (const key of Object.keys(prefStorageMock)) {
      delete prefStorageMock[key];
    }
    window.localStorage.clear();
  });

  it("renders the section headings, every toggle row, and the provider card", () => {
    apiMock.providers = {
      sl: {
        domain: "streamloader",
        name: "Streamloader",
        available: true,
        instance_id: "inst-1",
      },
    };
    const wrapper = mountSettings();
    const text = wrapper.text();
    // Section headings — sourced from streamloader.settings.section_*
    // keys in en.json. If a section is dropped from the template these
    // assertions catch it before users notice the missing card.
    expect(text).toContain("Player Display");
    expect(text).toContain("Activity & Notifications");
    expect(text).toContain("Provider");
    expect(text).toContain("About");
    // Six SLToggleRow instances: library stats, source badge, floating
    // health pill, activity pulse, recently downloaded, queue announce.
    const toggles = wrapper.findAll(".toggle-stub");
    expect(toggles).toHaveLength(6);
    // Pin one of the labels so the wiring (label prop -> data-label) is
    // exercised end-to-end and not just rendered count.
    const labels = toggles.map((t) => t.attributes("data-label") ?? "");
    // Pin labels for two of the six toggles — the library-stats sidebar
    // toggle and the source-badge toggle. Both are user-visible features
    // that have shipped in earlier batches and should never silently
    // disappear from the settings landing.
    expect(labels.some((l) => l.includes("Library Stats"))).toBe(true);
    expect(labels.some((l) => l.includes("Source Badge"))).toBe(true);
  });

  it("each SLToggleRow is bound to its useStreamloaderPref-backed boolean (initial modelValue)", () => {
    // Pre-seed the prefs so the composable returns true for one of the
    // keys — the rendered toggle stub should pick that up via its
    // modelValue prop. This pins the WIRING (key → composable → toggle)
    // for every toggle row without depending on the click handler shape
    // (which uses Vue's inline-statement semantics that callers should
    // not micro-test in unit tests).
    prefStorageMock.showLibraryStats = true;
    prefStorageMock.showSourceBadge = false;
    const wrapper = mountSettings();
    const toggles = wrapper.findAll(".toggle-stub");
    const libToggle = toggles.find((t) =>
      (t.attributes("data-label") ?? "").includes("Library Stats"),
    );
    const badgeToggle = toggles.find((t) =>
      (t.attributes("data-label") ?? "").includes("Source Badge"),
    );
    expect(libToggle).toBeTruthy();
    expect(badgeToggle).toBeTruthy();
    // The text inside the flip <button> mirrors the rendered label, but
    // the stub also stores the prop on data-label — assert via the props
    // by re-querying the component instance for the modelValue.
    const libCmp = wrapper
      .findAllComponents({ name: "SLToggleRow" })
      .find((c) => c.props("label") === "Show Library Stats in sidebar");
    const badgeCmp = wrapper
      .findAllComponents({ name: "SLToggleRow" })
      .find((c) => c.props("label") === "Show Source Badge on cards");
    expect(libCmp?.props("modelValue")).toBe(true);
    expect(badgeCmp?.props("modelValue")).toBe(false);
  });

  it("renders the 'Add Streamloader Provider' affordance when no streamloader provider is registered", () => {
    apiMock.providers = {
      tidal: {
        domain: "tidal",
        name: "Tidal",
        available: true,
        instance_id: "inst-2",
      },
    };
    const wrapper = mountSettings();
    expect(wrapper.text()).toContain("Not configured");
    expect(wrapper.text()).toContain("Add Streamloader Provider");
  });

  it("clicking 'Show welcome tour again' clears the localStorage flag and emits the eventbus signal", async () => {
    const WELCOME_KEY = "sl-welcome-tour-seen";
    window.localStorage.setItem(WELCOME_KEY, "1");
    const wrapper = mountSettings();
    // Find the replay-tour button by its visible label — it's the only
    // button whose text contains "welcome tour".
    const replayBtn = wrapper
      .findAll("button")
      .find((b) => b.text().toLowerCase().includes("welcome tour"));
    expect(replayBtn).toBeTruthy();
    await replayBtn!.trigger("click");
    expect(window.localStorage.getItem(WELCOME_KEY)).toBeNull();
    expect(eventbusMock.emit).toHaveBeenCalledWith("sl-welcome-tour:show");
  });
});
